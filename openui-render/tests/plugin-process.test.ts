import { describe, expect, it } from "bun:test";
import path from "node:path";

const mainPath = path.resolve(import.meta.dir, "../main.cjs");

describe("CommonJS Plugin Process (main.cjs)", () => {
  it("loads as a valid CommonJS module and exports lifecycle hooks", async () => {
    const main = await import(mainPath);
    expect(typeof main.onLoad).toBe("function");
    expect(typeof main.onUnload).toBe("function");
    expect(typeof main.onRendererCall).toBe("function");
  });

  it("handles openui.getMode and openui.setMode via onRendererCall", async () => {
    const main = await import(mainPath);

    // Initial mode is true
    const initial = await main.onRendererCall("openui.getMode");
    expect(initial).toEqual({ enabled: true });

    // Set mode to false
    const updated = await main.onRendererCall("openui.setMode", { enabled: false });
    expect(updated).toEqual({ enabled: false });

    // Verify persisted
    const checked = await main.onRendererCall("openui.getMode");
    expect(checked).toEqual({ enabled: false });

    // Also supports study.getMode alias
    const studyChecked = await main.onRendererCall("study.getMode");
    expect(studyChecked).toEqual({ enabled: false });

    // Reset back to true
    await main.onRendererCall("openui.setMode", { enabled: true });
    expect(await main.onRendererCall("openui.getMode")).toEqual({ enabled: true });
  });

  it("rejects undeclared methods with error code", async () => {
    const main = await import(mainPath);
    try {
      await main.onRendererCall("invalid.method");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("PLUGIN_UNKNOWN_METHOD");
    }
  });
});
