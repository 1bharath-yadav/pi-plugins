import { OPENUI_SYSTEM_PROMPT } from "./prompt";

/**
 * Pi Agent Harness Trusted Extension for OpenUI Render.
 * Runs in the Pi Agent sidecar process under the agent.extension grant.
 */
export default function (pi: any) {
  // 1. Hook before_agent_start to inject the OpenUI system prompt
  pi.on("before_agent_start", (event: any) => {
    const existing = event?.systemPrompt || "";
    if (existing.includes("local.openui-render:openui")) {
      return { systemPrompt: existing };
    }
    return {
      systemPrompt: existing
        ? `${existing}\n\n${OPENUI_SYSTEM_PROMPT}`
        : OPENUI_SYSTEM_PROMPT,
    };
  });

  // 2. Register /openui slash command (primary)
  pi.registerCommand("openui", {
    description: "Generate an interactive OpenUI interface or visualization",
    async handler(args: string, ctx: any) {
      const topic = args?.trim();
      if (!topic) {
        if (ctx?.ui?.input) {
          const inputTopic = await ctx.ui.input("What interface or visualization would you like to render with OpenUI?");
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

  // 3. Register /study as an alias for convenience
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
