# Developer & Agent Guide: `antigravity-de-plugin`

This document serves as the primary technical specification, architecture reference, and maintenance guide for future AI agents and engineers working on **`antigravity-de-plugin`** (Google Antigravity & Cloud Code Assist provider for [PI-Desktop](https://github.com/vastsa/PI-Desktop) and the Pi CLI).

---

## 1. Plugin Overview & Mission

`antigravity-de-plugin` integrates Google's internal Cloud Code Assist / Antigravity service into PI-Desktop. It provides:
1. **Host-level Google OAuth**: Multi-account sign-in, token refresh, and account switching.
2. **Local OpenAI Bridge Server (`http://127.0.0.1:41789/v1`)**: Exposes an OpenAI-compatible HTTP proxy so PI-Desktop's native chat engine can stream completions directly from Antigravity backend endpoints.
3. **Interactive Dashboard View & Panel**: Embedded Webview UI (`renderer/index.html`) for monitoring 5-hour and weekly quotas for Gemini & Claude pools, managing accounts, and testing connectivity.
4. **Pi Agent Extension (`agent/extension.ts`)**: Trusted extension running in the Pi Agent sidecar process providing slash commands (`/antigravity.usage`, `/antigravity.accounts`, `/antigravity.models`, `/antigravity.refresh`) and grounded tools (`antigravity_search`, `antigravity_generate_image`).

---

## 2. Directory & Architecture Map

```text
antigravity-de-plugin/
├── AGENTS.md                # This guide for future agents
├── manifest.json            # PI-Desktop plugin manifest contract (v1)
├── main.cjs                 # Node.js plugin process: lifecycle, bridge server, OAuth, panel IPC
├── main.js                  # Entry alias
├── package.json             # Package configuration & scripts
├── tsconfig.json            # TypeScript configuration
├── agent/
│   └── extension.ts         # Pi Agent trusted extension entry (runs in Pi sidecar)
├── core/                    # Core TypeScript libraries
│   ├── auth/                # OAuth PKCE flow, token refresh, accounts store
│   ├── client/              # Cloud Code Assist API HTTP client & endpoints
│   ├── diagnostics/         # Latency, quota status, telemetry
│   ├── features/            # Google Search grounding & Imagen tools
│   ├── image/               # Image generation pipeline
│   ├── models/              # Model catalogs, dynamic discovery & thinking effort routing
│   ├── search/              # Search grounding client
│   ├── stream/              # Streaming SSE event parser
│   ├── types/               # TypeScript interfaces, enums, wire protocols
│   ├── usage/               # Quota calculations (5h sliding window + weekly quotas)
│   └── utils/               # Sanitization, token masking, crypto helpers
└── renderer/
    └── index.html           # Native Webview UI dashboard for panel and view slots
```

---

## 3. Core Subsystems

### A. The Local Bridge Server (`http://127.0.0.1:41789/v1`)

PI-Desktop communicates with AI providers via OpenAI-compatible REST endpoints. `main.cjs` runs a lightweight HTTP server on port **41789**:

- **Port**: `41789` (bound strictly to `127.0.0.1`).
- **Endpoint `GET /v1/models`**: Returns the list of registered models so PI-Desktop can validate model IDs.
- **Endpoint `POST /v1/chat/completions`**:
  1. Inspects the incoming OpenAI-format payload (`model`, `messages`, `stream`, etc.).
  2. Resolves the active Google account from the storage file (`~/.pi/agent/antigravity-accounts.json` or `~/.pi-desktop/secrets/antigravity-accounts.json`).
  3. Verifies and auto-refreshes the OAuth access token if expired.
  4. Translates OpenAI messages into Antigravity `v1internal` payload format.
  5. Maps the model ID using `MODEL_ROUTING` in `main.cjs` to Antigravity's internal model strings.
  6. Dispatches to the active Google API endpoint (e.g. `https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent`).
  7. Streams SSE back in OpenAI chunk format: `data: {"id":..., "choices":[{"delta":{"content":"..."}}]}\n\n`, ending with `data: [DONE]\n\n`.

> [!IMPORTANT]
> **Why both `manifest.json` models list and the bridge server are required:**
> PI-Desktop's model selector dropdown only displays models that are statically declared in `manifest.json` under `contributes.providers[0].models`. The `baseUrl: "http://127.0.0.1:41789/v1"` tells PI-Desktop to query our bridge server when that model is selected. Both must stay in sync!

---

### B. Manifest Specification (`manifest.json`)

The manifest contract dictates how PI-Desktop registers this plugin:

- **`schemaVersion`**: `1`.
- **`id`**: `local.antigravity-de`.
- **`main`**: `main.cjs` (Must be CommonJS; PI-Desktop loads this using Node's `require()`).
- **`contributes.providers`**:
  - `id`: `"antigravity"`
  - `baseUrl`: `"http://127.0.0.1:41789/v1"`
  - `apiStyle`: `"chat_completions"`
  - `authKind`: `"oauth"`
  - `models`: Array of model definitions (IDs, names, context windows, max tokens, thinking levels).
- **`contributes.views`**: Registers the sidebar panel view `antigravity-dashboard`.
- **`permissions`**: Required grants:
  - `agent.extension`: Allows running `agent/extension.ts` in the Pi Agent process.
  - `provider.register`: Allows contributing the Antigravity provider.
  - `provider.oauth`: Allows handling OAuth login callbacks.
  - `net.fetch`: Whitelists network calls to `*.googleapis.com`, `accounts.google.com`, `localhost`, `127.0.0.1`.
  - `ui.panel`, `ui.view`: Allows mounting `renderer/index.html`.
  - `notify`, `shell.openExternal`.

---

### C. OAuth & Multi-Account Management

- **Credentials Storage**:
  - Primary path: `~/.pi/agent/antigravity-accounts.json` (shared with Pi CLI).
  - Synced secondary path: `~/.pi-desktop/secrets/antigravity-accounts.json` (PI-Desktop local secrets).
- **Format**:
  ```json
  {
    "version": 1,
    "activeAccountId": "user@gmail.com",
    "accounts": {
      "user@gmail.com": {
        "accountId": "user@gmail.com",
        "email": "user@gmail.com",
        "refreshToken": "...",
        "accessToken": "...",
        "expiresAt": 1740000000000,
        "projectId": "...",
        "addedAt": 1730000000000
      }
    }
  }
  ```
- **Login Flow**:
  1. User triggers `antigravity.login` or clicks "Sign in with Google" in the dashboard.
  2. Plugin starts a temporary HTTP server on port `51121` (`http://localhost:51121/oauth-callback`).
  3. Generates PKCE challenge and opens Google consent screen in external browser.
  4. Google redirects to port `51121` with authorization code.
  5. Exchanges code for `access_token` and `refresh_token`, fetches user profile, saves account, and sets as active.

---

### D. Dashboard Webview (`renderer/index.html`)

- Self-contained HTML/CSS/JS webview loaded in PI-Desktop's docked view and panel slots.
- Communicates with `main.cjs` using `window.pi.invoke(method, payload)`:
  - `antigravity.getAccounts`: Returns linked accounts and active account.
  - `antigravity.switchAccount`: Switches active account by email/ID.
  - `antigravity.removeAccount`: Deletes an account.
  - `antigravity.login`: Triggers browser OAuth login.
  - `antigravity.getUsage`: Fetches live quota limits and reset countdowns.
  - `antigravity.getModels`: Lists dynamic runtime models.
- Auto-polls quota every 60 seconds while open.

---

## 4. Maintenance Guide: How to Make Common Modifications

### 1. Adding or Updating Models

When Google releases a new model (e.g. `gemini-3.9-pro` or updated Claude/Gemini checkpoints):

1. **Update `manifest.json`**:
   Add the model entry to `contributes.providers[0].models`:
   ```json
   {
     "id": "gemini-3.9-pro",
     "name": "Gemini 3.9 Pro (Antigravity)",
     "contextWindow": 1048576,
     "maxTokens": 65536,
     "thinkingLevels": ["low", "high"],
     "defaultThinkingLevel": "high",
     "supportsImages": true
   }
   ```
2. **Update `MODEL_ROUTING` in `main.cjs`**:
   Add the mapping from the manifest ID to the internal Antigravity model name:
   ```javascript
   const MODEL_ROUTING = {
     // ...
     "gemini-3.9-pro": "gemini-3.9-pro-high",
   };
   ```
3. **Update Core Catalog (`core/models/models.ts` & `core/models/discovery.ts`)**:
   Add the model definition and thinking routing table for CLI/dynamic discovery consistency.

---

### 2. Updating OAuth Scopes or API Endpoints

- **Endpoints**: Defined in `main.cjs` and `core/client/client.ts`.
  - Default: `https://daily-cloudcode-pa.googleapis.com`
  - Fallbacks: `https://daily-cloudcode-pa.sandbox.googleapis.com`, `https://cloudcode-pa.googleapis.com`
- **Network Permissions**: If adding a new endpoint domain, remember to update `net.domains` in `manifest.json`.

---

### 3. Adding New Panel IPC Methods

If you add a new feature to the Webview dashboard (`renderer/index.html`):
1. In `renderer/index.html`, call:
   ```javascript
   const res = await window.pi.invoke("antigravity.yourNewMethod", { ...args });
   ```
2. In `main.cjs`, add a case inside `onPanelInvoke(method, args)`:
   ```javascript
   case "antigravity.yourNewMethod":
     return await handleYourNewMethod(args);
   ```

---

### 4. Adding Slash Commands

To add an in-chat command for the agent:
1. In `manifest.json`, declare under `contributes.commands`:
   ```json
   {
     "id": "antigravity.mycommand",
     "title": "Antigravity: My Command",
     "category": "Antigravity"
   }
   ```
2. In `agent/extension.ts` (or `core/index.ts`), register the slash command using `pi.commands.register(...)`.
3. In `main.cjs`, handle the command in `onCommand(cmdId)`.

---

## 5. Verification & Testing Workflow

Before committing changes, verify the plugin following these steps:

1. **TypeScript Typecheck**:
   ```bash
   cd antigravity-de-plugin
   npm run typecheck
   ```
2. **Test Bridge Server Endpoints**:
   ```bash
   # Check model listing
   curl -s http://127.0.0.1:41789/v1/models | jq .

   # Test completion (requires an active linked account)
   curl -X POST http://127.0.0.1:41789/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gemini-2.5-flash",
       "messages": [{"role": "user", "content": "Hello!"}],
       "stream": false
     }'
   ```
3. **Verify in PI-Desktop**:
   - Reload PI-Desktop (`Ctrl+R` or restart).
   - Verify the provider dropdown lists the models under **Google Antigravity**.
   - Verify the **Antigravity** view in the sidebar opens and displays linked accounts and quotas.

---

## 6. Critical Invariants & Rules for Agents

- ⚠️ **Preserve CommonJS in `main.cjs`**: PI-Desktop runs `main.cjs` directly in a Node.js child process using `require()`. Do not convert `main.cjs` to ES module syntax (`import`/`export`).
- ⚠️ **Never Remove `manifest.json` Provider Models**: Do not rely solely on dynamic discovery for PI-Desktop's model dropdown. PI-Desktop requires the static array in `manifest.json`.
- ⚠️ **Port 41789 Invariant**: Keep the bridge server on port `41789` unless making a synchronized change across `manifest.json` and `main.cjs`.
- ⚠️ **Zero Credential Leaks**: Never print raw access or refresh tokens to stdout, stderr, or UI logs. Always use `redactSecrets()` or `maskEmail()`.
- ⚠️ **127.0.0.1 Binding**: The bridge server must never listen on `0.0.0.0`. It must always bind to `127.0.0.1` for local machine security.
