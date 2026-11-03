# pi-plugins

A personal and community collection of plugins, extensions, and integrations created by [@1bharath-yadav](https://github.com/1bharath-yadav) and contributors for both:
- [**PI-Desktop**](https://github.com/vastsa/pi-desktop) — The Electron-based desktop application for AI chat, agent workflows, and generative UI.
- [**Pi**](https://github.com/earendil-works/pi) — The extensible agent runtime, CLI, and tool harness.

---

## Ecosystem Targets

| Target | Description | Repository |
| :--- | :--- | :--- |
| **PI-Desktop** | Desktop GUI environment supporting renderer slots, custom block renderers, panels, custom providers, and composer controls. | [`vastsa/pi-desktop`](https://github.com/vastsa/pi-desktop) |
| **Pi CLI / Agent** | Terminal agent runtime and sidecar engine supporting skills, custom extensions, and tool harnesses. | [`earendil-works/pi`](https://github.com/earendil-works/pi) |

---

## Available Plugins

> **Note**: Both current plugins in this repository are designed for **PI-Desktop** (with trusted Pi Agent extension support). Standalone Pi CLI plugins and agent skills will also be hosted here.

### 1. [OpenUI Render (`openui-render`)](./openui-render)
**Interactive generative UI, 3D WebGL scenes, and architecture diagramming for PI-Desktop.**
* **OpenUI Lang Engine**: Renders dynamic, component-driven generative UI blocks directly within chat conversations using `@openuidev/react-lang` and `@openuidev/react-ui`.
* **Three.js 3D Visualizations (`Three3D`)**: Interactive WebGL 3D scenes for biology, molecular structures, physics, geometry, and spatial concepts with orbit controls, labels, and rotation.
* **Draw.io Diagrams (`Drawio` / `Diagram`)**: Embedded architecture diagrams, system flows, and UML diagrams powered by diagrams.net with lightbox viewing and direct 1-click edit links.
* **Native Theme Adaptation**: Automatically synchronizes with PI-Desktop's active theme, providing seamless dark mode and high-contrast light mode.
* **Composer Controls**: In-chat module toggles to turn 3D or Draw.io generation on/off on the fly, dynamically updating agent instructions.

### 2. [Google Antigravity (`antigravity-de-plugin`)](./antigravity-de-plugin)
**First-class Google Antigravity & Cloud Code Assist provider, OAuth manager, and real-time quota dashboard.**
* **Provider Integration**: Brings Gemini 2.5/3.0 and Claude 3.5/3.7 models to PI-Desktop via Google accounts.
* **Native Google OAuth**: Secure host-owned OAuth flow (`onProviderOAuth`) with multi-account switching.
* **Real-time Quota Dashboard**: Live monitors for 5-hour sliding window quotas and weekly caps with countdown timers.
* **Pi Agent Extension**: Hooks into the Pi Agent sidecar process with SSE streaming, model discovery, and slash commands.

---

## Loading Development Plugins in PI-Desktop

1. Open **PI-Desktop**.
2. Click **Plugins** in the sidebar (or press `Ctrl/Cmd + Shift + P` and search for *Plugins*).
3. Select **Load development plugin**.
4. Choose the plugin directory (e.g., `/path/to/pi-plugins/openui-render` or `/path/to/pi-plugins/antigravity-de-plugin`).
5. Review and approve the declared permissions.

---

## Contributing & License

Contributions, bug reports, and plugin ideas are welcome!

MIT License © [Bharath Yadav](https://github.com/1bharath-yadav)
