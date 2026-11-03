/**
 * OpenUI Render — Main Plugin Process entry (`local.openui-render`).
 *
 * Runs in a dedicated Node process under the PI-Desktop permission gateway.
 * CommonJS format required by PI-Desktop plugin host architecture.
 */

const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(__dirname, "dist", "config.json");
const legacyConfigPath = path.join(__dirname, "config.json");

function loadConfig() {
  try {
    const targetPath = fs.existsSync(configPath)
      ? configPath
      : fs.existsSync(legacyConfigPath)
      ? legacyConfigPath
      : null;
    if (targetPath) {
      const data = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      return {
        enabled: data.enabled !== false,
        enable3D: data.enable3D !== false,
        enableDrawio: data.enableDrawio !== false,
      };
    }
  } catch {}
  return { enabled: true, enable3D: true, enableDrawio: true };
}

function saveConfig(cfg) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.warn("[OpenUI] Failed to save config:", err);
  }
}

let currentConfig = loadConfig();

async function onLoad() {
  // Sync initial settings if host settings API is available (in-memory only, no disk write to avoid reload loop)
  if (typeof pi !== "undefined" && pi.plugin && typeof pi.plugin.getSettings === "function") {
    try {
      const hostSettings = await pi.plugin.getSettings();
      if (hostSettings) {
        if (typeof hostSettings.enable3D === "boolean") currentConfig.enable3D = hostSettings.enable3D;
        if (typeof hostSettings.enableDrawio === "boolean") currentConfig.enableDrawio = hostSettings.enableDrawio;
      }
    } catch {}
  }

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
 * ["openui.getConfig", "openui.setConfig", "openui.getMode", "openui.setMode", "study.getMode", "study.setMode"].
 */
async function onRendererCall(method, args) {
  switch (method) {
    case "openui.getConfig":
    case "openui.getMode":
    case "study.getMode":
      return currentConfig;

    case "openui.setConfig":
      currentConfig = {
        enabled: args?.enabled !== undefined ? Boolean(args.enabled) : currentConfig.enabled,
        enable3D: args?.enable3D !== undefined ? Boolean(args.enable3D) : currentConfig.enable3D,
        enableDrawio: args?.enableDrawio !== undefined ? Boolean(args.enableDrawio) : currentConfig.enableDrawio,
      };
      saveConfig(currentConfig);
      if (typeof pi !== "undefined" && pi.plugin && typeof pi.plugin.setSettings === "function") {
        pi.plugin.setSettings({
          enable3D: currentConfig.enable3D,
          enableDrawio: currentConfig.enableDrawio,
        }).catch(() => {});
      }
      return currentConfig;

    case "openui.setMode":
    case "study.setMode":
      currentConfig.enabled = Boolean(args?.enabled);
      saveConfig(currentConfig);
      return currentConfig;

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
