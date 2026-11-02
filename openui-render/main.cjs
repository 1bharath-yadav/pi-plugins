/**
 * OpenUI Render — Main Plugin Process entry (`local.openui-render`).
 *
 * Runs in a dedicated Node process under the PI-Desktop permission gateway.
 * CommonJS format required by PI-Desktop plugin host architecture.
 */

let openuiMode = true;

async function onLoad() {
  if (typeof pi !== "undefined" && pi.commands && typeof pi.commands.register === "function") {
    try {
      await pi.commands.register({
        id: "openui.insertTemplate",
        title: "Insert OpenUI Template",
        keywords: ["openui", "render", "ui", "template", "lesson"],
        category: "OpenUI",
        run: async () => {},
      });
    } catch {
      // Command already registered or ignored
    }
  }
}

async function onUnload() {
  if (typeof pi !== "undefined" && pi.commands && typeof pi.commands.unregister === "function") {
    try {
      await pi.commands.unregister("openui.insertTemplate");
    } catch {
      // Ignore
    }
  }
}

/**
 * Handles calls dispatched from the renderer module via `pi.dispatch("plugin.call", ...)`.
 * Whitelisted in manifest.rendererCallMethods:
 * ["openui.getMode", "openui.setMode", "study.getMode", "study.setMode"].
 */
async function onRendererCall(method, args) {
  switch (method) {
    case "openui.getMode":
    case "study.getMode":
      return { enabled: openuiMode };
    case "openui.setMode":
    case "study.setMode":
      openuiMode = Boolean(args?.enabled);
      return { enabled: openuiMode };
    default:
      throw Object.assign(new Error(`Unknown OpenUI method: ${method}`), {
        code: "PLUGIN_UNKNOWN_METHOD",
      });
  }
}

module.exports = {
  onLoad,
  onUnload,
  onRendererCall,
};
