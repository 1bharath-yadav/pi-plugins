# OpenUI Render for PI-Desktop

Interactive **OpenUI Lang** renderer, **Three.js 3D graphics**, and **Draw.io architecture diagramming** plugin for **PI-Desktop**, authored by [@1bharath-yadav](https://github.com/1bharath-yadav). It turns Pi-generated OpenUI code blocks into live interactive UI components directly inside chat conversations.

## Features

- **Inline Rendering**: Fenced blocks (`local.openui-render:openui` / `local.openui-render:openui-lang`) transform into interactive UI in the conversation thread.
- **Dynamic PI-Desktop Theme Matching**: Automatically adapts to PI-Desktop's active theme (dark, light, or system) using host design tokens (`--ds-bg-primary`, `--gray-0`, `--gray-300`, `--border-subtle`, `--accent-400`).
- **Interactive 3D with Three.js (`Three3D`)**: WebGL 3D scenes with spheres, boxes, cylinders, toruses, 3D billboard text labels, orbit rotation, and auto-rotate.
- **Architecture Diagrams with Draw.io (`Drawio` & `Diagram`)**: Embeds diagrams.net viewers with raw XML compression, remote URLs, and an "Edit in Draw.io ↗" launch button.
- **Modular Feature Toggles**: Configurable 3D and Draw.io switches in the composer `⚙` menu and plugin settings; instructions are only injected into the agent prompt when enabled.
- **Assistant Fallback**: Automatically renders un-prefixed `openui-lang` blocks in assistant replies via `entryExtra`.
- **Composer Toolbar Toggle**: Borderless `OpenUi` toggle with live state indicators (active/inactive) aligned with native composer chips.
- **Pi Agent Sidecar Extension**: Trusted extension hooking `before_agent_start` to inject OpenUI syntax and component specifications into the model prompt.
- **Slash Commands**: `/openui <prompt>` to request an interface, 3D scene, or diagram.
- **Complete Component Catalog**: Built on `@openuidev/react-ui` (`Stack` root, `Card`, `Table`, `Col`, `BarChart`, `LineChart`, `AreaChart`, `PieChart`, `ScatterChart`, `Form`, `FormControl`, `Input`, `Select`, `Slider`, `Buttons`, `Tabs`, `Accordion`, `Steps`).

## Architecture

| Component | Runtime | Role |
|---|---|---|
| [`manifest.json`](manifest.json) | Host | Declares identity, `renderer.extension` & `agent.extension` permissions, settings, and slot registrations. |
| [`main.cjs`](main.cjs) | Node (CommonJS) | Headless plugin process handling `onRendererCall` for configuration (`openui.getConfig`, `openui.setConfig`, `openui.getMode`). |
| [`agent/extension.ts`](agent/extension.ts) | Agent Sidecar | Pi `ExtensionAPI` module registering `/openui` and conditional prompt injection based on active settings. |
| [`src/renderer.tsx`](src/renderer.tsx) | Electron (ESM) | Renderer extension compiled to `dist/renderer.mjs`; uses host import map React and dynamic theme matching. |
| [`src/library/`](src/library/) | OpenUI Catalog | Standard `@openuidev/react-ui` components plus `Three3D` (Three.js WebGL) and `Drawio` (diagrams.net). |

## Quick Start

```bash
# Install dependencies
bun install

# Run unit and contract tests (35 tests)
bun test

# Build production ES-module bundle
bun run build
```

## Usage

When OpenUI is active, prompt the agent:
```text
/openui Create an interactive performance dashboard with charts and form controls
```

The agent outputs:
````markdown
```local.openui-render:openui
root = Stack([title, chart, form])
title = TextContent("Dashboard", "large-heavy")
chart = BarChart(labels, [s1], "grouped")
labels = ["Jan", "Feb", "Mar"]
s1 = Series("Revenue", [120, 150, 180])
form = Form("demo", btns, [inputField])
inputField = FormControl("Email", Input("email", "user@example.com", "email"))
btns = Buttons([Button("Submit", @ToAssistant("Submit"), "primary")])
```
````
PI-Desktop immediately renders the code block as an interactive, theme-matched UI card.
