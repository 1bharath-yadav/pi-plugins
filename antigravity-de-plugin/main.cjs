/**
 * Google Antigravity Plugin for PI-Desktop (Main Plugin Process)
 *
 * Implements:
 * 1. Plugin Lifecycle: onLoad, onUnload
 * 2. Host OAuth Integration: onProviderOAuth (login & refresh)
 * 3. Panel Bridge Gateway: onPanelInvoke (accounts, usage, models, switching)
 * 4. Desktop Commands: antigravity.open, antigravity.login, antigravity.usage, antigravity.accounts, antigravity.refresh
 */

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const os = require("node:os");

// --- OAuth & API Constants ---
const DEFAULT_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com";
const ENDPOINT_FALLBACKS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_PORT = 51121;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth-callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

const DEFAULT_CLIENT_ID =
  Buffer.from(
    "MTA3MTAwNjA2MDU5MS10bWhzc2lu" +
      "MmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlc" +
      "C5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ==",
    "base64",
  ).toString("utf-8");

const DEFAULT_CLIENT_SECRET =
  Buffer.from(
    "R09DU1BYLUs1OEZXUjQ" +
      "4NkxkTEoxbUxCOHNYQzR6NnFEQWY=",
    "base64",
  ).toString("utf-8");

const CLIENT_ID =
  process.env.ANTIGRAVITY_CLIENT_ID || DEFAULT_CLIENT_ID;

const CLIENT_SECRET =
  process.env.ANTIGRAVITY_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;

const DEFAULT_USER_AGENT =
  "antigravity/cli/1.4.0 (aidev_client; os_type=linux; arch=amd64; cl=982146307; auth_method=consumer)";

// --- Account Storage Helpers ---
function getAgentDir() {
  return process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
}

function getAccountsFilePath() {
  return path.join(getAgentDir(), "antigravity-accounts.json");
}

function loadAccountsStore() {
  const filePath = getAccountsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.version === 1 && parsed.accounts) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Antigravity] Error reading accounts store:", err);
  }
  return { version: 1, activeAccountId: undefined, accounts: {} };
}

function saveAccountsStore(store) {
  const filePath = getAccountsFilePath();
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.error("[Antigravity] Failed to save accounts store:", err);
  }
}

function listAccounts() {
  const store = loadAccountsStore();
  const activeId = store.activeAccountId;
  return Object.values(store.accounts).map((acc) => ({
    accountId: acc.accountId,
    email: acc.email,
    active: acc.accountId === activeId,
    lastUsedAt: acc.lastUsedAt || acc.addedAt || 0,
  }));
}

function getActiveAccount() {
  const store = loadAccountsStore();
  if (store.activeAccountId && store.accounts[store.activeAccountId]) {
    return store.accounts[store.activeAccountId];
  }
  const first = Object.values(store.accounts)[0];
  return first || null;
}

function activateAccount(idOrEmail) {
  const store = loadAccountsStore();
  let targetId = null;
  for (const [id, acc] of Object.entries(store.accounts)) {
    if (id === idOrEmail || acc.email?.toLowerCase() === idOrEmail.toLowerCase()) {
      targetId = id;
      break;
    }
  }
  if (!targetId) {
    throw new Error(`Account "${idOrEmail}" not found.`);
  }
  store.activeAccountId = targetId;
  store.accounts[targetId].lastUsedAt = Date.now();
  saveAccountsStore(store);
  syncActiveAccountToDesktopSecrets();
  syncActiveAccountToPiAuth();
  return store.accounts[targetId];
}

function removeAccount(idOrEmail) {
  const store = loadAccountsStore();
  let targetId = null;
  for (const [id, acc] of Object.entries(store.accounts)) {
    if (id === idOrEmail || acc.email?.toLowerCase() === idOrEmail.toLowerCase()) {
      targetId = id;
      break;
    }
  }
  if (!targetId) return null;
  delete store.accounts[targetId];
  if (store.activeAccountId === targetId) {
    const remaining = Object.keys(store.accounts);
    store.activeAccountId = remaining[0];
  }
  saveAccountsStore(store);
  syncActiveAccountToDesktopSecrets();
  syncActiveAccountToPiAuth();
  return store.activeAccountId ? store.accounts[store.activeAccountId] : null;
}

function rememberAccount(creds) {
  const store = loadAccountsStore();
  const accountId = creds.email || crypto.createHash("sha256").update(creds.refresh || creds.access).digest("hex").slice(0, 16);
  const now = Date.now();
  const stored = {
    accountId,
    email: creds.email,
    access: creds.access,
    refresh: creds.refresh,
    expires: creds.expires,
    addedAt: store.accounts[accountId]?.addedAt || now,
    lastUsedAt: now,
  };
  store.accounts[accountId] = stored;
  if (!store.activeAccountId || Object.keys(store.accounts).length === 1) {
    store.activeAccountId = accountId;
  }
  saveAccountsStore(store);
  syncActiveAccountToDesktopSecrets();
  syncActiveAccountToPiAuth();
  return stored;
}

function syncActiveAccountToPiAuth() {
  try {
    const authPath = path.join(getAgentDir(), "auth.json");
    let auth = {};
    if (fs.existsSync(authPath)) {
      try {
        auth = JSON.parse(fs.readFileSync(authPath, "utf8")) || {};
      } catch {}
    }
    const activeAccount = getActiveAccount();
    if (activeAccount && activeAccount.refresh) {
      auth.antigravity = {
        type: "oauth",
        email: activeAccount.email,
        access: activeAccount.access,
        refresh: activeAccount.refresh,
        expires: activeAccount.expires,
        projectId: activeAccount.projectId || "aicode-consumers",
      };
    } else {
      delete auth.antigravity;
    }
    const tempPath = `${authPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(auth, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempPath, authPath);
    return true;
  } catch (err) {
    console.warn("[Antigravity Plugin] syncActiveAccountToPiAuth warning:", err.message);
    return false;
  }
}

function syncActiveAccountToDesktopSecrets() {
  try {
    const desktopDataDir = process.env.PI_DESKTOP_DATA_DIR || path.join(os.homedir(), ".pi-desktop");
    const secretsDir = path.join(desktopDataDir, "secrets");
    const machineKeyPath = path.join(secretsDir, ".machine-key");

    if (!fs.existsSync(machineKeyPath)) {
      return false;
    }

    const activeAccount = getActiveAccount();
    if (!activeAccount || !activeAccount.access) {
      return false;
    }

    const machineKey = fs.readFileSync(machineKeyPath);
    if (machineKey.length !== 32) return false;

    const providerRowId = "plugin:local.antigravity-de:antigravity";
    const secretRef = `secret:provider:${providerRowId}:oauth`;
    const hash = crypto.createHash("sha256").update(secretRef).digest("hex");
    const secretFile = path.join(secretsDir, `${hash}.bin`);

    const payload = JSON.stringify({
      accessToken: activeAccount.access,
      refreshToken: activeAccount.refresh || "",
      expiresAt: activeAccount.expires || Date.now() + 3600 * 1000,
      accountLabel: activeAccount.email || "Google Antigravity Account",
    });

    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", machineKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob = Buffer.concat([nonce, ciphertext, tag]);

    fs.writeFileSync(secretFile, blob.toString("base64"), "utf8");

    // Also update SQLite secrets_meta if sqlite3 is available
    const sqlitePath = path.join(desktopDataDir, "pi.sqlite");
    if (fs.existsSync(sqlitePath)) {
      try {
        const { execSync } = require("node:child_process");
        const sql = `INSERT OR REPLACE INTO secrets_meta (secret_ref, owner_kind, owner_id, kind, backend, updated_at) VALUES ('${secretRef}', 'provider', '${providerRowId}', 'oauth', 'file_fallback', ${Date.now()});`;
        execSync(`sqlite3 "${sqlitePath}" "${sql}"`, { stdio: "ignore" });
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn("[Antigravity Plugin] syncActiveAccountToDesktopSecrets warning:", err.message);
    return false;
  }
}

// --- PKCE & Cryptographic Utilities ---
function base64Url(buffer) {
  return buffer.toString("base64url");
}

function generatePKCE() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function stableProjectId(seed) {
  const bytes = crypto.createHash("sha1").update(`antigravity:${seed}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// --- OAuth HTTP Loopback Server ---
function startOAuthCallbackServer(expectedState) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;

    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
        if (reqUrl.pathname !== "/oauth-callback") {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
          return;
        }

        const state = reqUrl.searchParams.get("state");
        const code = reqUrl.searchParams.get("code");
        const error = reqUrl.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#18181b;color:#f43f5e">
            <h2>Authentication Failed</h2>
            <p>${error}</p>
          </body></html>`);
          cleanup();
          settled = true;
          reject(new Error(`OAuth authentication failed: ${error}`));
          return;
        }

        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#18181b;color:#f43f5e">
            <h2>Invalid OAuth State</h2>
            <p>State mismatch. Please try signing in again.</p>
          </body></html>`);
          cleanup();
          settled = true;
          reject(new Error("OAuth state verification mismatch."));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("Missing authorization code.");
          cleanup();
          settled = true;
          reject(new Error("Missing OAuth code in callback."));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Antigravity Authentication Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #fafafa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px 40px; text-align: center; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    h2 { color: #38bdf8; margin-top: 0; font-size: 22px; }
    p { color: #a1a1aa; line-height: 1.5; font-size: 14px; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓ Connected</div>
    <h2>Authenticated with Google</h2>
    <p>Google Antigravity authentication completed successfully. You can close this tab and return to PI-Desktop.</p>
  </div>
</body>
</html>`);

        cleanup();
        settled = true;
        resolve({ code });
      } catch (err) {
        cleanup();
        settled = true;
        reject(err);
      }
    });

    function cleanup() {
      if (timeoutId) clearTimeout(timeoutId);
      server.close();
    }

    server.on("error", (err) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, "127.0.0.1", () => {
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error("OAuth callback timed out after 5 minutes."));
        }
      }, 5 * 60 * 1000);
    });
  });
}

// --- Token Exchange and Refresh ---
async function exchangeCodeForTokens(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const access = data.access_token;
  const refresh = data.refresh_token;
  const expires = Date.now() + (Number(data.expires_in) || 3600) * 1000;

  // Resolve user email
  let email;
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email;
    }
  } catch {}

  return { access, refresh, expires, email };
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const access = data.access_token;
  const refresh = data.refresh_token || refreshToken;
  const expires = Date.now() + (Number(data.expires_in) || 3600) * 1000;

  return { access, refresh, expires };
}

async function ensureValidAccessToken(account) {
  if (!account) return null;
  const isExpired = !account.expires || Date.now() > account.expires - 5 * 60 * 1000;
  if (isExpired && account.refresh) {
    try {
      const refreshed = await refreshAccessToken(account.refresh);
      account.access = refreshed.access;
      account.refresh = refreshed.refresh;
      account.expires = refreshed.expires;
      rememberAccount(account);
    } catch (err) {
      console.warn("[Antigravity] Auto-refresh access token warning:", err.message);
    }
  }
  return account.access;
}

// --- Antigravity Quota and Usage Queries ---
async function fetchAntigravityUsage(token, email) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": DEFAULT_USER_AGENT,
  };

  let companionProject = "aicode-consumers";
  let tierInfo = "Antigravity";

  // Step 1: Discover companion project and tier via loadCodeAssist
  for (const endpoint of ["https://cloudcode-pa.googleapis.com", ...ENDPOINT_FALLBACKS]) {
    try {
      const res = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers,
        body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY" } }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cloudaicompanionProject) companionProject = data.cloudaicompanionProject;
        if (data.currentTier?.name) tierInfo = data.currentTier.name;
        break;
      }
    } catch {}
  }

  // Step 2: Fetch available models with quota info
  let lastError = null;
  const modelEndpoints = [
    "https://cloudcode-pa.googleapis.com",
    "https://daily-cloudcode-pa.googleapis.com",
    "https://daily-cloudcode-pa.sandbox.googleapis.com",
  ];

  for (const endpoint of modelEndpoints) {
    try {
      const res = await fetch(`${endpoint}/v1internal:fetchAvailableModels`, {
        method: "POST",
        headers,
        body: JSON.stringify({ project: companionProject }),
      });

      if (!res.ok) {
        const text = await res.text();
        lastError = new Error(`fetchAvailableModels failed (${res.status}): ${text}`);
        continue;
      }

      const data = await res.json();
      return parseQuotaAndModels(data, tierInfo);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to fetch Antigravity quota and models.");
}

function parseQuotaAndModels(data, tierInfo) {
  const modelsMap = data?.models || {};
  const geminiBuckets = [];
  const claudeBuckets = [];
  const modelList = [];

  for (const [id, m] of Object.entries(modelsMap)) {
    if (!m || typeof m !== "object" || m.isInternal || id.startsWith("chat_") || id.startsWith("tab_")) {
      continue;
    }

    const displayName = m.displayName || m.label || id;
    const qi = m.quotaInfo;
    const remainingFraction = typeof qi?.remainingFraction === "number" ? Math.max(0, Math.min(1, qi.remainingFraction)) : undefined;
    const remainingPercent = remainingFraction !== undefined ? Math.round(remainingFraction * 1000) / 10 : undefined;

    const row = {
      id,
      name: displayName,
      remainingFraction,
      remainingPercent,
      resetTime: qi?.resetTime,
      supportsThinking: Boolean(m.supportsThinking),
      supportsImages: Boolean(m.supportsImages),
      recommended: Boolean(m.recommended),
      apiProvider: m.apiProvider,
    };

    modelList.push(row);

    if (remainingPercent !== undefined) {
      const bucket = {
        bucketId: id,
        displayName,
        resetTime: qi?.resetTime,
        remainingFraction,
        remainingPercent,
      };

      if (id.includes("claude") || id.includes("gpt") || m.apiProvider?.includes("ANTHROPIC")) {
        claudeBuckets.push(bucket);
      } else {
        geminiBuckets.push(bucket);
      }
    }
  }

  const groups = [];
  if (geminiBuckets.length > 0) {
    groups.push({
      displayName: "Gemini Models Pool",
      buckets: geminiBuckets,
    });
  }
  if (claudeBuckets.length > 0) {
    groups.push({
      displayName: "Claude & GPT Models Pool",
      buckets: claudeBuckets,
    });
  }

  return {
    planType: "standard",
    tier: tierInfo,
    groups,
    models: modelList,
  };
}

// --- Local OpenAI-compatible Bridge Server for PI-Desktop ---
const BRIDGE_PORT = 41789;
let bridgeServer = null;

const MODEL_ROUTING = {
  "gemini-3.8-flash": "gemini-3.8-flash-low",
  "gemini-3.7-flash": "gemini-3.7-flash-low",
  "gemini-3.6-flash": "gemini-3.6-flash-low",
  "gemini-3.5-flash": "gemini-3.5-flash-extra-low",
  "gemini-3.1-pro": "gemini-3.1-pro-low",
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-opus-4-6": "claude-opus-4-6-thinking",
  "gpt-oss-120b": "gpt-oss-120b-medium",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-3-flash": "gemini-3-flash",
};

function startBridgeServer() {
  if (bridgeServer) return;

  bridgeServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    if (req.method === "GET" && (req.url === "/v1/models" || req.url === "/models")) {
      const modelsList = Object.keys(MODEL_ROUTING).map((id) => ({
        id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "google-antigravity",
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ object: "list", data: modelsList }));
      return;
    }

    if (req.method === "POST" && (req.url === "/v1/chat/completions" || req.url === "/chat/completions")) {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const active = getActiveAccount();
          if (!active) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: {
                  message: "No active Google Antigravity account linked. Please sign in via the Antigravity dashboard first.",
                  type: "authentication_error",
                },
              }),
            );
            return;
          }

          const token = await ensureValidAccessToken(active);
          if (!token) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: {
                  message: "Failed to authenticate with Google Antigravity. Please re-login.",
                  type: "authentication_error",
                },
              }),
            );
            return;
          }

          const reqData = JSON.parse(body || "{}");
          const isStream = reqData.stream !== false;
          const reqModel = reqData.model || "gemini-3.8-flash";
          const runtimeModel = MODEL_ROUTING[reqModel] || reqModel;

          // Convert OpenAI messages to Google contents & systemInstruction
          const systemParts = [];
          const contents = [];

          for (const msg of reqData.messages || []) {
            if (msg.role === "system") {
              const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
              systemParts.push({ text });
              continue;
            }

            if (msg.role === "user") {
              const parts = [];
              if (typeof msg.content === "string") {
                parts.push({ text: msg.content });
              } else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                  if (part.type === "text" && part.text) {
                    parts.push({ text: part.text });
                  } else if (part.type === "image_url" && part.image_url?.url) {
                    const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                      parts.push({
                        inlineData: {
                          mimeType: match[1],
                          data: match[2],
                        },
                      });
                    }
                  }
                }
              }
              if (parts.length > 0) {
                contents.push({ role: "user", parts });
              }
              continue;
            }

            if (msg.role === "assistant") {
              const parts = [];
              if (msg.content) {
                parts.push({ text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) });
              }
              if (Array.isArray(msg.tool_calls)) {
                for (const tc of msg.tool_calls) {
                  let args = {};
                  try {
                    args = JSON.parse(tc.function.arguments || "{}");
                  } catch {}
                  parts.push({
                    functionCall: {
                      name: tc.function.name,
                      args,
                    },
                  });
                }
              }
              if (parts.length > 0) {
                contents.push({ role: "model", parts });
              }
              continue;
            }

            if (msg.role === "tool") {
              contents.push({
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: msg.name || "tool",
                      response: { result: msg.content },
                    },
                  },
                ],
              });
              continue;
            }
          }

          if (contents.length === 0) {
            contents.push({ role: "user", parts: [{ text: "Hello" }] });
          }

          const googleTools = [];
          if (Array.isArray(reqData.tools) && reqData.tools.length > 0) {
            googleTools.push({
              functionDeclarations: reqData.tools
                .filter((t) => t.type === "function" && t.function)
                .map((t) => ({
                  name: t.function.name,
                  description: t.function.description || "",
                  parameters: t.function.parameters || {},
                })),
            });
          }

          const payload = {
            project: "aicode-consumers",
            model: runtimeModel,
            request: {
              contents,
              systemInstruction: systemParts.length > 0 ? { role: "user", parts: systemParts } : undefined,
              tools: googleTools.length > 0 ? googleTools : undefined,
              generationConfig: {
                maxOutputTokens: reqData.max_tokens || 8192,
                temperature: reqData.temperature !== undefined ? reqData.temperature : 0.7,
              },
            },
          };

          const endpointsToTry = [
            "https://daily-cloudcode-pa.googleapis.com",
            "https://cloudcode-pa.googleapis.com",
            "https://daily-cloudcode-pa.sandbox.googleapis.com",
          ];

          let gRes = null;
          let lastFetchError = null;

          for (const endpoint of endpointsToTry) {
            try {
              const candidate = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "User-Agent": DEFAULT_USER_AGENT,
                },
                body: JSON.stringify(payload),
              });

              if (candidate.ok) {
                gRes = candidate;
                break;
              } else if (candidate.status === 401) {
                const refreshedToken = await ensureValidAccessToken(active);
                const retryRes = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${refreshedToken}`,
                    "Content-Type": "application/json",
                    "User-Agent": DEFAULT_USER_AGENT,
                  },
                  body: JSON.stringify(payload),
                });
                if (retryRes.ok) {
                  gRes = retryRes;
                  break;
                }
              }
              const errBody = await candidate.text();
              lastFetchError = new Error(`Endpoint ${endpoint} returned ${candidate.status}: ${errBody}`);
            } catch (err) {
              lastFetchError = err;
            }
          }

          if (!gRes || !gRes.ok) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: {
                  message: `Antigravity upstream error: ${lastFetchError?.message || "Failed to reach Google backend"}`,
                  type: "api_error",
                },
              }),
            );
            return;
          }

          if (isStream) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });

            const reader = gRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const candidate = parsed?.response?.candidates?.[0];
                    const parts = candidate?.content?.parts || [];

                    for (const part of parts) {
                      if (part.text) {
                        const chunk = {
                          id: "chatcmpl-" + Date.now(),
                          object: "chat.completion.chunk",
                          created: Math.floor(Date.now() / 1000),
                          model: reqModel,
                          choices: [
                            {
                              index: 0,
                              delta: part.thought ? { reasoning_content: part.text } : { content: part.text },
                              finish_reason: null,
                            },
                          ],
                        };
                        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                      } else if (part.functionCall) {
                        const chunk = {
                          id: "chatcmpl-" + Date.now(),
                          object: "chat.completion.chunk",
                          created: Math.floor(Date.now() / 1000),
                          model: reqModel,
                          choices: [
                            {
                              index: 0,
                              delta: {
                                tool_calls: [
                                  {
                                    index: 0,
                                    id: "call_" + Math.random().toString(36).slice(2, 10),
                                    type: "function",
                                    function: {
                                      name: part.functionCall.name,
                                      arguments: JSON.stringify(part.functionCall.args || {}),
                                    },
                                  },
                                ],
                              },
                              finish_reason: null,
                            },
                          ],
                        };
                        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                      }
                    }
                  } catch {}
                }
              }
            }

            const finalChunk = {
              id: "chatcmpl-" + Date.now(),
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: reqModel,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: "stop",
                },
              ],
            };
            res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
          } else {
            let fullText = "";
            const toolCalls = [];
            const reader = gRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const candidate = parsed?.response?.candidates?.[0];
                    for (const part of candidate?.content?.parts || []) {
                      if (part.text && !part.thought) fullText += part.text;
                      if (part.functionCall) {
                        toolCalls.push({
                          id: "call_" + Math.random().toString(36).slice(2, 10),
                          type: "function",
                          function: {
                            name: part.functionCall.name,
                            arguments: JSON.stringify(part.functionCall.args || {}),
                          },
                        });
                      }
                    }
                  } catch {}
                }
              }
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                id: "chatcmpl-" + Date.now(),
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: reqModel,
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: fullText || null,
                      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                    },
                    finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
                  },
                ],
              }),
            );
          }
        } catch (err) {
          console.error("[Antigravity Bridge] Error processing completion:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: { message: err.message, type: "server_error" } }));
          }
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Not found", type: "invalid_request_error" } }));
  });

  bridgeServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[Antigravity Bridge] Port ${BRIDGE_PORT} in use, existing bridge active.`);
    } else {
      console.warn("[Antigravity Bridge] Server error:", err.message);
    }
  });

  bridgeServer.listen(BRIDGE_PORT, "127.0.0.1", () => {
    console.log(`[Antigravity Bridge] Local OpenAI-compatible bridge running on http://127.0.0.1:${BRIDGE_PORT}`);
  });
}

function stopBridgeServer() {
  if (bridgeServer) {
    try {
      bridgeServer.close();
    } catch {}
    bridgeServer = null;
  }
}

// --- Lifecycle Exports ---
async function onLoad() {
  console.log("[Antigravity Plugin] Loading in PI-Desktop host process...");
  syncActiveAccountToDesktopSecrets();
  startBridgeServer();

  if (typeof pi !== "undefined" && pi.commands && typeof pi.commands.register === "function") {
    try {
      await pi.commands.register({
        id: "antigravity.open",
        title: "Antigravity: Open Dashboard",
        category: "Antigravity",
        keywords: ["antigravity", "quota", "usage", "google", "accounts", "gemini", "claude"],
        run: async () => {
          if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.openPanel === "function") {
            await pi.ui.openPanel();
          }
        },
      });

      await pi.commands.register({
        id: "antigravity.login",
        title: "Antigravity: Sign in with Google",
        category: "Antigravity",
        keywords: ["antigravity", "login", "oauth", "google", "auth"],
        run: async () => {
          try {
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast("Opening Google Sign-in for Antigravity...");
            }
            const { verifier, challenge } = generatePKCE();
            const state = crypto.randomBytes(16).toString("hex");
            const authUrl = `${AUTH_URL}?${new URLSearchParams({
              client_id: CLIENT_ID,
              response_type: "code",
              redirect_uri: REDIRECT_URI,
              scope: SCOPES.join(" "),
              state,
              code_challenge: challenge,
              code_challenge_method: "S256",
              access_type: "offline",
              prompt: "consent",
            }).toString()}`;

            if (typeof pi !== "undefined" && pi.shell && typeof pi.shell.openExternal === "function") {
              await pi.shell.openExternal(authUrl);
            }
            const serverPromise = startOAuthCallbackServer(state);
            const { code } = await serverPromise;
            const creds = await exchangeCodeForTokens(code, verifier);
            rememberAccount(creds);
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast(`Connected Antigravity account: ${creds.email || "Google Account"}`);
            }
          } catch (err) {
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast(`Antigravity sign-in failed: ${err.message}`, { type: "error" });
            }
          }
        },
      });

      await pi.commands.register({
        id: "antigravity.usage",
        title: "Antigravity: Check Quota Usage",
        category: "Antigravity",
        keywords: ["antigravity", "usage", "quota", "limits", "gemini", "claude"],
        run: async () => {
          const active = getActiveAccount();
          if (!active) {
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast("No Antigravity account linked. Sign in via /antigravity.login first.");
            }
            return;
          }
          try {
            const usage = await fetchAntigravityUsage(active.access, active.email);
            let summary = `Antigravity Quota (${active.email || "Active"}):\n`;
            for (const grp of usage.groups) {
              summary += `\n${grp.displayName}:\n`;
              for (const b of grp.buckets) {
                summary += `• ${b.displayName}: ${b.remainingPercent}% remaining\n`;
              }
            }
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast(summary);
            }
          } catch (err) {
            if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
              await pi.ui.showToast(`Quota check failed: ${err.message}`, { type: "error" });
            }
          }
        },
      });

      await pi.commands.register({
        id: "antigravity.accounts",
        title: "Antigravity: Manage Linked Accounts",
        category: "Antigravity",
        keywords: ["antigravity", "accounts", "switch", "remove"],
        run: async () => {
          if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.openPanel === "function") {
            await pi.ui.openPanel();
          }
        },
      });

      await pi.commands.register({
        id: "antigravity.refresh",
        title: "Antigravity: Refresh Dynamic Models & Quota",
        category: "Antigravity",
        keywords: ["antigravity", "refresh", "models", "sync"],
        run: async () => {
          const active = getActiveAccount();
          if (active) {
            try {
              await fetchAntigravityUsage(active.access, active.email);
              if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
                await pi.ui.showToast("Antigravity catalog and quota refreshed successfully.");
              }
            } catch (err) {
              if (typeof pi !== "undefined" && pi.ui && typeof pi.ui.showToast === "function") {
                await pi.ui.showToast(`Refresh error: ${err.message}`, { type: "error" });
              }
            }
          }
        },
      });
    } catch (err) {
      console.warn("[Antigravity Plugin] Error registering commands:", err);
    }
  }
}

async function onUnload() {
  console.log("[Antigravity Plugin] Unloading from PI-Desktop...");
  stopBridgeServer();
  if (typeof pi !== "undefined" && pi.commands && typeof pi.commands.unregister === "function") {
    try {
      await pi.commands.unregister("antigravity.open");
      await pi.commands.unregister("antigravity.login");
      await pi.commands.unregister("antigravity.usage");
      await pi.commands.unregister("antigravity.accounts");
      await pi.commands.unregister("antigravity.refresh");
    } catch {}
  }
}

// --- PI-Desktop Host OAuth Callback ---
/**
 * Invoked by PI-Desktop for declared provider with `authKind: "oauth"`.
 * request: { operation: "login" | "refresh", providerId: string, loginId?: string, credential?: any }
 * context: { signal: AbortSignal }
 */
async function onProviderOAuth(request, { signal }) {
  if (request.operation === "login") {
    const { verifier, challenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl = `${AUTH_URL}?${new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    }).toString()}`;

    // Open browser for OAuth authorization
    if (typeof pi !== "undefined" && pi.shell && typeof pi.shell.openExternal === "function") {
      await pi.shell.openExternal(authUrl);
    }

    if (request.loginId && typeof pi !== "undefined" && pi.providers?.oauth?.notify) {
      await pi.providers.oauth.notify(request.loginId, {
        kind: "progress",
        message: "Waiting for Google OAuth authentication in browser...",
      });
    }

    const callbackPromise = startOAuthCallbackServer(state);

    const abortPromise = new Promise((_, reject) => {
      if (signal.aborted) {
        reject(new Error("OAuth login was cancelled."));
      } else {
        signal.addEventListener("abort", () => reject(new Error("OAuth login cancelled by host.")), { once: true });
      }
    });

    const { code } = await Promise.race([callbackPromise, abortPromise]);
    const creds = await exchangeCodeForTokens(code, verifier);
    rememberAccount(creds);

    return {
      accessToken: creds.access,
      refreshToken: creds.refresh,
      expiresAt: creds.expires,
      accountLabel: creds.email || "Google Antigravity Account",
      headers: {
        Authorization: `Bearer ${creds.access}`,
        "Content-Type": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };
  }

  if (request.operation === "refresh") {
    const refreshToken = request.credential?.refreshToken;
    if (!refreshToken) {
      throw new Error("Missing refreshToken in OAuth refresh request.");
    }

    const refreshed = await refreshAccessToken(refreshToken);
    const active = getActiveAccount();
    if (active) {
      active.access = refreshed.access;
      active.refresh = refreshed.refresh;
      active.expires = refreshed.expires;
      rememberAccount(active);
    }

    return {
      accessToken: refreshed.access,
      refreshToken: refreshed.refresh,
      expiresAt: refreshed.expires,
      accountLabel: request.credential?.accountLabel || "Google Antigravity Account",
      headers: {
        Authorization: `Bearer ${refreshed.access}`,
        "Content-Type": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
      },
    };
  }

  throw new Error(`Unsupported OAuth operation: ${request.operation}`);
}

// --- Panel Bridge Dispatcher ---
/**
 * Answers window.pluginBridge.invoke(...) from renderer/index.html.
 */
async function onPanelInvoke(channel, payload) {
  switch (channel) {
    case "antigravity.getAccounts": {
      const store = loadAccountsStore();
      return {
        accounts: listAccounts(),
        activeAccountId: store.activeAccountId,
      };
    }

    case "antigravity.switchAccount": {
      const accountId = payload?.accountId;
      if (!accountId) throw new Error("Missing accountId");
      const active = activateAccount(accountId);
      return { ok: true, activeAccount: active };
    }

    case "antigravity.removeAccount": {
      const accountId = payload?.accountId;
      if (!accountId) throw new Error("Missing accountId");
      const nextActive = removeAccount(accountId);
      return { ok: true, nextActiveAccount: nextActive, accounts: listAccounts() };
    }

    case "antigravity.getUsage": {
      const active = getActiveAccount();
      if (!active) {
        return { ok: false, error: "No active Antigravity account linked." };
      }
      try {
        await ensureValidAccessToken(active);
        const usage = await fetchAntigravityUsage(active.access, active.email);
        return { ok: true, usage, activeAccount: { email: active.email, accountId: active.accountId } };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    case "antigravity.login": {
      const { verifier, challenge } = generatePKCE();
      const state = crypto.randomBytes(16).toString("hex");
      const authUrl = `${AUTH_URL}?${new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPES.join(" "),
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent",
      }).toString()}`;

      if (typeof pi !== "undefined" && pi.shell && typeof pi.shell.openExternal === "function") {
        await pi.shell.openExternal(authUrl);
      }

      const serverPromise = startOAuthCallbackServer(state);
      const { code } = await serverPromise;
      const creds = await exchangeCodeForTokens(code, verifier);
      const remembered = rememberAccount(creds);

      return { ok: true, account: remembered };
    }

    case "antigravity.openExternal": {
      const url = payload?.url;
      if (url && typeof pi !== "undefined" && pi.shell && typeof pi.shell.openExternal === "function") {
        await pi.shell.openExternal(url);
      }
      return { ok: true };
    }

    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

module.exports = {
  onLoad,
  onUnload,
  onProviderOAuth,
  onPanelInvoke,
};
