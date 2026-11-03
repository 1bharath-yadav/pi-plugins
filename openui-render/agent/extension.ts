import fs from "node:fs";
import path from "node:path";
import { getOpenuiSystemPrompt } from "../src/openui-prompt";

interface OpenUIConfig {
  enabled: boolean;
  enable3D: boolean;
  enableDrawio: boolean;
}

function readPluginConfig(): OpenUIConfig {
  try {
    const configPath = path.resolve(__dirname, "../config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return {
        enabled: data.enabled !== false,
        enable3D: data.enable3D !== false,
        enableDrawio: data.enableDrawio !== false,
      };
    }
  } catch (err) {
    console.warn("[OpenUI] Failed to read config.json:", err);
  }
  return { enabled: true, enable3D: true, enableDrawio: true };
}

/**
 * Pi Agent Harness Trusted Extension for OpenUI Render.
 * Runs in the Pi Agent sidecar process under the agent.extension grant.
 */
export default function (pi: any) {
  // 1. Hook before_agent_start to dynamically inject OpenUI system prompt based on user settings
  pi.on("before_agent_start", (event: any) => {
    const config = readPluginConfig();
    const existing = event?.systemPrompt || "";

    // If disabled globally, skip prompt injection
    if (!config.enabled) {
      return { systemPrompt: existing };
    }

    if (existing.includes("local.openui-render:openui")) {
      return { systemPrompt: existing };
    }

    // Generate prompt with active toggles (3D and Drawio included only if enabled)
    const prompt = getOpenuiSystemPrompt({
      enable3D: config.enable3D,
      enableDrawio: config.enableDrawio,
    });

    return {
      systemPrompt: existing ? `${existing}\n\n${prompt}` : prompt,
    };
  });

  // 2. Register /openui slash command
  pi.registerCommand("openui", {
    description: "Generate an interactive OpenUI interface or visualization",
    async handler(args: string, ctx: any) {
      const topic = args?.trim();
      if (!topic) {
        if (ctx?.ui?.input) {
          const inputTopic = await ctx.ui.input("What interface, 3D scene, or diagram would you like to render with OpenUI?");
          if (inputTopic && inputTopic.trim()) {
            if (typeof ctx.sendUserMessage === "function") {
              ctx.sendUserMessage(
                `Create an interactive OpenUI interface about ${inputTopic.trim()} using local.openui-render:openui.`
              );
            } else if (ctx?.ui?.notify) {
              ctx.ui.notify(`Rendering OpenUI for ${inputTopic.trim()}...`);
            }
          }
        }
      } else {
        if (typeof ctx?.sendUserMessage === "function") {
          ctx.sendUserMessage(
            `Create an interactive OpenUI interface about ${topic} using local.openui-render:openui.`
          );
        } else if (ctx?.ui?.notify) {
          ctx.ui.notify(`Rendering OpenUI for ${topic}...`);
        }
      }
    },
  });

  // 3. Register /study as an alias
  pi.registerCommand("study", {
    description: "Start an interactive OpenUI lesson on a topic",
    async handler(args: string, ctx: any) {
      const topic = args?.trim() || "the requested topic";
      if (typeof ctx?.sendUserMessage === "function") {
        ctx.sendUserMessage(
          `Teach me about ${topic} with an interactive OpenUI lesson using local.openui-render:openui.`
        );
      } else if (ctx?.ui?.notify) {
        ctx.ui.notify(`Generating OpenUI lesson for ${topic}...`);
      }
    },
  });
}
