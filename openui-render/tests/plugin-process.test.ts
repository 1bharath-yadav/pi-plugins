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
    expect(initial.enabled).toBe(true);

    // Set mode to false
    const updated = await main.onRendererCall("openui.setMode", { enabled: false });
    expect(updated.enabled).toBe(false);

    // Verify persisted
    const checked = await main.onRendererCall("openui.getMode");
    expect(checked.enabled).toBe(false);

    // Reset back to true
    await main.onRendererCall("openui.setMode", { enabled: true });
    expect((await main.onRendererCall("openui.getMode")).enabled).toBe(true);
  });

  it("handles openui.getConfig and openui.setConfig with 3D and Drawio toggles", async () => {
    const main = await import(mainPath);

    // Read config
    const config = await main.onRendererCall("openui.getConfig");
    expect(typeof config.enabled).toBe("boolean");
    expect(typeof config.enable3D).toBe("boolean");
    expect(typeof config.enableDrawio).toBe("boolean");

    // Update config to disable 3D
    const updated = await main.onRendererCall("openui.setConfig", { enable3D: false, enableDrawio: true });
    expect(updated.enable3D).toBe(false);
    expect(updated.enableDrawio).toBe(true);

    // Verify persisted in getConfig
    const verified = await main.onRendererCall("openui.getConfig");
    expect(verified.enable3D).toBe(false);

    // Reset back to true
    await main.onRendererCall("openui.setConfig", { enable3D: true, enableDrawio: true });
    expect((await main.onRendererCall("openui.getConfig")).enable3D).toBe(true);
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
