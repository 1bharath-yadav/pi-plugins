# OpenUI Render — Agent Engineering & Maintenance Guide (`AGENTS.md`)

This document serves as the authoritative guide for AI coding assistants and developers maintaining, debugging, or extending the **`openui-render`** plugin for **PI-Desktop** (`local.openui-render`).

---

## 1. Architectural Overview & Runtimes

The plugin operates across **three distinct runtime environments** managed by PI-Desktop:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Electron Renderer (ESM)                                                  │
│    • Entry: dist/renderer.mjs (built from src/renderer.tsx via Vite)        │
│    • Role: Registers slot "blockRenderer" for local.openui-render:openui    │
│    • UI: Live generative UI cards, Three.js 3D canvas, Draw.io iframes,     │
│          theme detection (dark/light), error boundary, Source/Preview tabs  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ RPC: pi.dispatch("plugin.call", ...)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Node Plugin Process (CommonJS)                                           │
│    • Entry: main.cjs (mirrored by main.js)                                  │
│    • Grant: Declared in manifest.json with rendererCallMethods whitelist    │
│    • Role: Manages persistent settings via dist/config.json                  │
│    • Methods: openui.getConfig, openui.setConfig, openui.getMode, setMode   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ Reads dist/config.json on startup
┌──────────────────────────────────────┴──────────────────────────────────────┐
│ 3. Pi Agent Sidecar Extension (TypeScript)                                  │
│    • Entry: agent/extension.ts                                              │
│    • Grant: permissions: ["agent.extension"]                                │
│    • Role: Hooks `before_agent_start` to dynamically compile and inject     │
│      OpenUI Lang component signatures and prompt rules into model context   │
│    • Slash Commands: Registers `/openui` and `/study`                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Critical Invariants & Hard-Learned Traps

### ⚠️ Trap 1: The Dev Watcher Infinite Reload Loop
* **The Mechanism**: PI-Desktop recursively watches the plugin directory (`fs.watch`) in development mode to hot-reload changes. It ignores ONLY `["node_modules", ".git", "dist", "target"]` and temporary editor files.
* **The Failure**: If any process writes a file into the plugin root (e.g., `openui-render/config.json`):
  1. The watcher detects the change.
  2. The watcher unloads and reloads the plugin.
  3. During reload, custom block renderers are unregistered, causing chat messages to collapse into raw code blocks (`local.openui-render:openui`).
  4. If `onLoad()` also writes to disk, it creates an **infinite 300ms reload loop**!
* **The Law**:
  1. **NEVER** write runtime config, cache, or state into the plugin root.
  2. Runtime config **MUST ALWAYS** be saved in `dist/config.json` (inside the ignored `dist` directory).
  3. **NEVER** invoke `saveConfig()` inside `onLoad()`. `onLoad()` should only read or update in-memory state.

### ⚠️ Trap 2: Zod 4 Schema Introspection & `.optional()`
* **The Mechanism**: `@openuidev/lang-core` uses Zod 4 (`import { z } from "zod/v4"`). When generating system prompts, `analyzeFields()` inspects `comp.props.shape` to extract arguments.
* **The Failure**: If a component schema wraps the top-level object in `.optional()` (e.g., `props: z.object({}).optional()`), `comp.props.shape` is `undefined`, causing `TypeError: Object.entries requires that input parameter not be null or undefined` during prompt compilation!
* **The Law**:
  1. Component `props` **MUST ALWAYS** be a bare `z.object({ ... })`.
  2. If all props are optional, define optional fields *inside* the object: `z.object({ title: z.string().optional() })`, never wrap the object itself in `.optional()`.

### ⚠️ Trap 3: "Undefined — Description" in Prompt Generation
* **The Mechanism**: Calling `@openuidev/lang-core`'s `generateSystemPrompt({ library: openuiLibrary, ... })` directly with `@openuidev/react-ui`'s uncompiled library will fail to compute component signatures. In `openuiLibrary.components`, `comp.signature` is not yet populated.
* **The Result**: The agent receives prompts like:
  ```
  undefined — Flex container. direction: "row"|"column"...
  undefined — Step-by-step guide
  undefined — Syntax-highlighted code block
  ```
  The LLM has to guess argument names, leading to fatal schema diagnostics like `Steps takes 1 arg(s), got 2` or `missing required field "/codeString"`.
* **The Law**:
  1. **ALWAYS** use `activeLibrary.prompt(options)` (or `createLibrary(...).prompt(...)`).
  2. `createLibrary()` executes `buildComponentSpecs()` internally, generating complete, explicit signatures (e.g. `Three3D(objects?, height?, title?, showAxes?, showGrid?, autoRotate?)`).

### ⚠️ Trap 4: Positional Arguments & Flexible Unions
* **The Mechanism**: OpenUI Lang assigns function call arguments **positionally** based on the order of keys defined in the Zod schema.
  * E.g., for `Steps(title, items)`: `title` is argument 0, `items` is argument 1.
  * However, LLMs often call `Steps([step1, step2])` (passing items as argument 0) OR `Steps("Title", "Step 1 text")` (passing a string instead of an array).
* **The Law**:
  1. For components accepting collections (`Steps`, `TagBlock`, `ListBlock`, `SectionBlock`), always make schemas resilient:
     ```ts
     const createStepsSchema = () =>
       z.object({
         title: z.union([z.string(), z.array(z.any())]).optional(),
         items: z.union([z.array(z.any()), z.string(), z.any()]).optional(),
       });
     ```
  2. In the component implementation, normalize gracefully:
     ```ts
     let items = Array.isArray(props.title)
       ? props.title
       : Array.isArray(props.items)
       ? props.items
       : props.items
       ? [props.items]
       : [];
     ```

### ⚠️ Trap 5: Light Mode Text Invisibility
* **The Mechanism**: PI-Desktop runs in both dark and light modes. If hardcoded colors (like `#f4f4f5` or `#18181b`) are used without theme context, text becomes white-on-white or dark-on-dark.
* **The Law**:
  1. `readHostColorScheme()` in `src/renderer.tsx` inspects `host.theme`, class names, and computed luminance (`> 150` for light).
  2. `data-theme={hostTheme}` **MUST** be bound directly to `<div className="pi-openui-card" data-theme={hostTheme}>`.
  3. In `src/renderer.css`, `.pi-openui-card[data-theme="light"]` enforces:
     * `--openui-background: #ffffff !important;`
     * `--openui-foreground: #18181b !important;`
     * `color: #18181b !important;` on all headings, paragraphs, and tags.

---

## 3. Key Files & Directory Layout

```text
openui-render/
├── manifest.json              # PI-Desktop plugin contract (manifest v1)
├── main.cjs                   # Node host process (CommonJS) - handles openui.* RPC
├── main.js                    # Alias to main.cjs
├── package.json               # Dependencies (@openuidev/react-ui, three, pako, katex, zod v4)
├── vite.config.ts             # Bundler compiling src/renderer.tsx -> dist/renderer.mjs
├── AGENTS.md                  # This maintenance guide
├── README.md                  # User-facing plugin documentation
├── dist/                      # IGNORED BY DEV WATCHER (Safe for runtime writes & bundles)
│   ├── config.json            # Persistent user toggles (enabled, enable3D, enableDrawio)
│   └── renderer.mjs           # Compiled standalone ESM renderer bundle
├── agent/
│   └── extension.ts           # Pi Agent sidecar hook injecting system prompt
├── src/
│   ├── renderer.tsx           # React OpenUI card renderer, ThemeProvider, composer button
│   ├── renderer.css           # Container, header, error boundary, and theme styles
│   ├── openui-prompt.ts       # Dynamic prompt compiler with 3D/Draw.io filtering & examples
│   ├── extract-openui.ts      # Markdown fence extractor for local.openui-render:openui
│   ├── icon.tsx               # OpenUI vector branding icon
│   └── library/
│       ├── index.tsx          # Master component catalog with resilient overrides
│       ├── three3d.tsx        # Three.js WebGL 3D visualization component
│       ├── drawio.tsx         # Draw.io / diagrams.net interactive diagram component
│       ├── scene3d.tsx        # Fallback SVG 3D engine (backwards compatibility)
│       ├── lesson.tsx         # Study/Lesson mode root container
│       ├── layout.tsx         # Container schemas and helpers
│       ├── chart.tsx          # Data chart definitions
│       └── panel.css          # Lesson mode styling
└── tests/                     # 35 Bun test suites
    ├── manifest.test.ts       # Validates plugin contract and declared permissions
    ├── plugin-process.test.ts # Tests main.cjs RPC calls and dist/config.json persistence
    ├── agent-extension.test.ts# Tests before_agent_start hook and dynamic prompt toggles
    ├── extract-openui.test.ts # Tests code block regex and streaming extractors
    └── openui-render.test.ts  # Tests AST parsing, resilient components, 3D, and Drawio
```

---

## 4. How to Add or Modify Components

When introducing a new component or modifying an existing one:

### Step 1: Define with Zod 4 Schema
Always use `import { z } from "zod/v4"`:
```tsx
import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";

export const MyComponent = defineComponent({
  name: "MyComponent",
  props: z.object({
    title: z.union([z.string(), z.any()]),
    data: z.union([z.array(z.any()), z.any()]).optional(),
  }),
  description: "Short, precise description for LLM system prompt: MyComponent(title, data?)",
  component: ({ props, renderNode }) => {
    return (
      <div style={{ color: "var(--openui-foreground, currentColor)" }}>
        {props.title}
      </div>
    );
  },
});
```

### Step 2: Register in `src/library/index.tsx`
If overriding a stock `@openuidev/react-ui` component:
1. Delete it from `baseComponents`:
   ```ts
   delete baseComponents.MyComponent;
   ```
2. Add the custom component to `renderLibrary`:
   ```ts
   export const renderLibrary = createLibrary({
     root: "Stack",
     components: [
       ...Object.values(baseComponents),
       MyComponent,
       ...
     ],
   });
   ```

### Step 3: Add Prompt Guidance in `src/openui-prompt.ts`
1. If the component represents a major concept (like `Drawio` or `Three3D`), add an explicit instruction in `additionalRules`.
2. Add a short, realistic example in `examples` so the model understands the exact syntax without hallucinating nonexistent arguments.

### Step 4: Add Unit Tests
Add a test case in `tests/openui-render.test.ts` verifying that OpenUI Lang can parse and materialize the component:
```ts
it("supports MyComponent", () => {
  const code = `
root = Stack([item])
item = MyComponent("Demo Title", [1, 2, 3])
  `.trim();
  const res = parseAndMaterialize(code);
  expect(res.errors).toHaveLength(0);
});
```

---

## 5. Build, Test, and Verification Workflow

Whenever making code changes:

```bash
# 1. Run all unit and contract tests (must pass 35/35)
bun test

# 2. Build the production renderer bundle
bun run build

# 3. Check live PI-Desktop logs for steady state (zero reload loops)
tail -f ~/.pi-desktop/logs/app/plugin.log
```

---

## 6. Commit & Repository Guidelines

* **Author Attribution**: Repository authorship is maintained by [@1bharath-yadav](https://github.com/1bharath-yadav) (`https://github.com/1bharath-yadav/pi-plugins`).
* **Secrets Policy**: NEVER commit raw Google OAuth Client Secrets (`GOCSPX-...`). If public fallbacks are needed, decode base64 representations at runtime or read from environment variables.
* **Preserve Dist Bundle**: Always ensure `dist/renderer.mjs` is compiled and tracked in git so PI-Desktop can load the plugin directly from the repository.
