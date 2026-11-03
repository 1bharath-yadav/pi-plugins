# Google Antigravity Plugin for PI-Desktop (`antigravity-de-plugin`)

First-class **Google Antigravity & Cloud Code Assist** provider, OAuth manager, and real-time quota dashboard for [PI-Desktop](https://github.com/vastsa/PI-Desktop).

Bridges Google's internal Antigravity endpoints into PI-Desktop: giving you access to **Gemini 3.8 / 3.7 / 3.6 / 3.5 / 3.1**, **Gemini 2.5 Pro / Flash**, **Claude Sonnet 4.6**, **Claude Opus 4.6**, and **GPT-OSS 120B** backed by your Google accounts.

---

## Features

- 🔑 **Host-Owned Google OAuth Integration (`onProviderOAuth`)**: Full native PI-Desktop provider row with Google sign-in and encrypted credential storage.
- 📊 **Interactive Dashboard Panel & Docked View**: Visual dashboard docked into PI-Desktop's work panel or opened as a companion panel (`antigravity.open`).
- ⚡ **Real-Time Quota Monitors**: Track shared quota pools (5-hour sliding window & weekly quotas) for both **Gemini** and **Claude / GPT** pools with live countdown timers.
- 👥 **Multi-Account Switching**: Link multiple Google accounts; seamlessly switch or remove active accounts in 1 click. Accounts sync with `~/.pi/agent/antigravity-accounts.json` from the Pi CLI.
- 🤖 **Trusted Pi Agent Extension (`agent.extension`)**: Runs directly in the Pi Agent sidecar process with SSE streaming, prompt routing, dynamic model discovery, and slash commands.
- 🔍 **Google Search Grounding & Imagen**: Built-in `antigravity_search` and `antigravity_generate_image` tools.

---

## Directory Structure

```text
antigravity-de-plugin/
├── manifest.json            # PI-Desktop plugin manifest (v1)
├── main.cjs                 # Node plugin host entry (OAuth, commands, bridge)
├── main.js                  # Entry alias
├── package.json             # Package metadata
├── tsconfig.json            # TypeScript configuration
├── agent/
│   └── extension.ts         # Pi Agent trusted extension (runs in Pi sidecar)
├── core/                    # Core Antigravity TypeScript modules
│   ├── auth/                # Google OAuth, PKCE, accounts storage
│   ├── client/              # Cloud Code Assist API client & endpoints
│   ├── diagnostics/         # Request telemetry & latency tracking
│   ├── features/            # Search & image generation tools
│   ├── models/              # Static & dynamic catalog discovery
│   ├── stream/              # Streaming SSE completion engine
│   └── usage/               # Quota usage and pool breakdown
└── renderer/
    └── index.html           # Native UI Dashboard for PI-Desktop panel/view
```

---

## Installation in PI-Desktop

1. Open **PI-Desktop**.
2. Go to **Plugins** in the left sidebar (or press `Cmd/Ctrl + Shift + P` -> *Plugins*).
3. Click **Load development plugin**.
4. Select the `antigravity-de-plugin` folder:
   ```text
   /path/to/pi-plugins/antigravity-de-plugin
   ```
5. Approve the declared permissions (`agent.extension`, `provider.register`, `provider.oauth`, `net.fetch`, `ui.panel`, `ui.view`).

---

## How to Use

### 1. Connect Your Google Account
- From the **Command Palette**: Run `Antigravity: Sign in with Google` (`antigravity.login`).
- Or open the **Antigravity Dashboard**: Run `Antigravity: Open Dashboard` (`antigravity.open`) and click **+ Add Google Account**.
- Your browser will open the standard Google OAuth consent screen. Sign in to authorize Antigravity.

### 2. Select Models in PI-Desktop
- Open **Settings** -> **Models / Providers** in PI-Desktop.
- Choose **Google Antigravity** as your active provider.
- Select your preferred model:
  - `gemini-2.5-pro` (1M context + Thinking)
  - `gemini-2.5-flash` (High speed)
  - `gemini-3-flash` (Next-generation speed)
  - `gemini-3-pro` (Next-generation reasoning)
  - `claude-3-7-sonnet` (Hybrid thinking via Antigravity)

### 3. In-Chat Slash Commands
When interacting with the Agent in PI-Desktop:
- `/antigravity.usage` — Show remaining 5-hour and weekly quota for Gemini and Claude pools.
- `/antigravity.accounts` — View, switch, or remove linked Google accounts.
- `/antigravity.models` — List all dynamic runtime models.
- `/antigravity.refresh` — Force refresh the catalog and quota status.

---

## License

MIT © [Bharath Yadav](https://github.com/1bharath-yadav)
