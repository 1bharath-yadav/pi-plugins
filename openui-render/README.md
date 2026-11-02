# OpenUI Render for PI-Desktop

Interactive **OpenUI Lang** renderer and generative UI plugin for **PI-Desktop**. It turns Pi-generated OpenUI code blocks into live interactive UI components directly inside chat conversations.

## Features

- **Inline Rendering**: Fenced blocks (`local.openui-render:openui` / `local.openui-render:openui-lang`) transform into interactive UI in the conversation thread.
- **Assistant Fallback**: Automatically renders un-prefixed `openui-lang` blocks in assistant replies via `entryExtra`.
- **Composer Toolbar Toggle**: Borderless `OpenUi` toggle with live state indicators (active/inactive) aligned with native composer chips.
- **Pi Agent Sidecar Extension**: Trusted extension hooking `before_agent_start` to inject OpenUI syntax and component specifications into the model prompt.
- **Slash Commands**: `/openui <prompt>` to request an interface or visualization.
- **Component Library**: Includes Math (KaTeX), Charts (line, bar, scatter), Svg, 3D Spatial Scenes (Scene3D), Cards, Grids, and interactive Controls (Slider, SegmentedControl, Quiz).

## Architecture

| Component | Runtime | Role |
|---|---|---|
| [`manifest.json`](manifest.json) | Host | Declares identity, `renderer.extension` & `agent.extension` permissions, and slot registrations. |
| [`main.cjs`](main.cjs) | Node (CommonJS) | Headless plugin process handling `onRendererCall` for `openui.getMode` / `openui.setMode`. |
| [`agent/extension.ts`](agent/extension.ts) | Agent Sidecar | Pi `ExtensionAPI` module registering `/openui` and system prompt injection. |
| [`src/renderer.tsx`](src/renderer.tsx) | Electron (ESM) | Renderer extension compiled to `dist/renderer.mjs`; uses host import map React. |

## Quick Start

```bash
# Install dependencies
bun install

# Run unit and contract tests (26 tests)
bun test

# Build production ES-module bundle
bun run build
```

## Usage

When OpenUI is active, prompt the agent:
```text
/openui Create an interactive quadratic function graph with a slider
```

The agent outputs:
````markdown
```local.openui-render:openui
xs = @Linspace(-4, 4, 41)
root = Lesson("Quadratic functions", "Connect the equation and the graph", [
  Math("f(x) = x^2 - 4x + 3"),
  Chart("line", @Each(xs, "x", {x: x, y: x * x - 4 * x + 3}), "x", ["y"]),
  Card([Title("Vertex", "md"), Text("Minimum at (2, -1)")])
])
```
````
PI-Desktop immediately renders the code block as an interactive UI card.
