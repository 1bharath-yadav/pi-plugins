import { describe, expect, it } from "bun:test";
import agentExtension from "../agent/extension";
import { getOpenuiSystemPrompt } from "../src/openui-prompt";

describe("Pi Agent Harness Trusted Extension (agent/extension.ts)", () => {
  it("registers before_agent_start hook and slash commands", () => {
    const handlers: Record<string, Function[]> = {};
    const commands: Record<string, any> = {};

    const mockPi = {
      on(event: string, handler: Function) {
        handlers[event] = handlers[event] || [];
        handlers[event].push(handler);
      },
      registerCommand(name: string, config: any) {
        commands[name] = config;
      },
    };

    agentExtension(mockPi);

    // Verify before_agent_start is registered
    expect(handlers["before_agent_start"]).toBeDefined();
    expect(handlers["before_agent_start"].length).toBe(1);

    // Verify commands registered
    expect(commands["openui"]).toBeDefined();
    expect(typeof commands["openui"].handler).toBe("function");
    expect(commands["study"]).toBeDefined();
    expect(typeof commands["study"].handler).toBe("function");
  });

  it("injects OpenUI system prompt on before_agent_start", () => {
    const handlers: Record<string, Function[]> = {};
    const mockPi = {
      on(event: string, handler: Function) {
        handlers[event] = handlers[event] || [];
        handlers[event].push(handler);
      },
      registerCommand() {},
    };

    agentExtension(mockPi);
    const beforeAgentStart = handlers["before_agent_start"][0];

    // Case 1: Fresh prompt
    const res1 = beforeAgentStart({ systemPrompt: "You are a helpful coding assistant." });
    expect(res1.systemPrompt).toContain("You are a helpful coding assistant.");
    expect(res1.systemPrompt).toContain("OpenUI Lang");
    expect(res1.systemPrompt).toContain("local.openui-render:openui");

    // Case 2: Already injected
    const res2 = beforeAgentStart({ systemPrompt: res1.systemPrompt });
    expect(res2.systemPrompt).toBe(res1.systemPrompt);
  });

  it("dynamically configures 3D and Drawio prompt injection", () => {
    // Both enabled
    const fullPrompt = getOpenuiSystemPrompt({ enable3D: true, enableDrawio: true });
    expect(fullPrompt).toContain("Three3D");
    expect(fullPrompt).toContain("Drawio");

    // Disable 3D
    const no3D = getOpenuiSystemPrompt({ enable3D: false, enableDrawio: true });
    expect(no3D).not.toContain("Three3D");
    expect(no3D).toContain("Drawio");

    // Disable Drawio
    const noDrawio = getOpenuiSystemPrompt({ enable3D: true, enableDrawio: false });
    expect(noDrawio).toContain("Three3D");
    expect(noDrawio).not.toContain("Drawio");
  });

  it("handles /openui command with args", async () => {
    let sentMessage = "";
    const commands: Record<string, any> = {};
    const mockPi = {
      on() {},
      registerCommand(name: string, config: any) {
        commands[name] = config;
      },
    };

    agentExtension(mockPi);
    const openuiCmd = commands["openui"];

    const ctx = {
      sendUserMessage(msg: string) {
        sentMessage = msg;
      },
    };

    await openuiCmd.handler("Interactive Physics Simulation", ctx);
    expect(sentMessage).toContain("Interactive Physics Simulation");
    expect(sentMessage).toContain("local.openui-render:openui");
  });

  it("handles /study command as alias", async () => {
    let sentMessage = "";
    const commands: Record<string, any> = {};
    const mockPi = {
      on() {},
      registerCommand(name: string, config: any) {
        commands[name] = config;
      },
    };

    agentExtension(mockPi);
    const studyCmd = commands["study"];

    const ctx = {
      sendUserMessage(msg: string) {
        sentMessage = msg;
      },
    };

    await studyCmd.handler("Calculus derivatives", ctx);
    expect(sentMessage).toContain("Calculus derivatives");
    expect(sentMessage).toContain("local.openui-render:openui");
  });
});
