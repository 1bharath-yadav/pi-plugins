import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pluginDir = path.resolve(__dirname, "..");
const rendererDir = path.join(pluginDir, "renderer");
const htmlPath = path.join(rendererDir, "index.html");
const bootPath = path.join(rendererDir, "appearance-boot.js");
const appearancePath = path.join(rendererDir, "appearance.js");
const mainPath = path.join(pluginDir, "main.cjs");

describe("Antigravity Panel UI & PI Desktop Theme Derivation", () => {
  it("includes appearance pre-paint boot script in renderer directory", () => {
    expect(fs.existsSync(bootPath)).toBe(true);
    const bootContent = fs.readFileSync(bootPath, "utf-8");
    expect(bootContent).toContain("__appearanceBoot");
    expect(bootContent).toContain("applyAppearance");
  });

  it("includes appearance runtime script in renderer directory", () => {
    expect(fs.existsSync(appearancePath)).toBe(true);
    const appearanceContent = fs.readFileSync(appearancePath, "utf-8");
    expect(appearanceContent).toContain("__appearance");
    expect(appearanceContent).toContain("app.getAppearance");
    expect(appearanceContent).toContain("appearance:changed");
  });

  it("configures renderer/index.html with v3 chrome, cache key, and appearance scripts", () => {
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, "utf-8");

    // Chrome specification
    expect(html).toContain('<meta name="pi-plugin-chrome" content="v3" />');

    // Appearance cache key and boot script in head
    expect(html).toContain('window.__APPEARANCE_CACHE_KEY = "pi.antigravity.appearance.v1"');
    expect(html).toContain('<script src="./appearance-boot.js"></script>');

    // Appearance runtime script and initialization
    expect(html).toContain('<script src="./appearance.js"></script>');
    expect(html).toContain("window.__appearance.init(bridge)");
  });

  it("defines PI Desktop theme tokens for dark and light themes in CSS", () => {
    const html = fs.readFileSync(htmlPath, "utf-8");

    // Dark theme / default tokens
    expect(html).toContain("--bg: #111111;");
    expect(html).toContain("--group: #1c1c1e;");
    expect(html).toContain("--separator:");
    expect(html).toContain("--track:");
    expect(html).toContain("--thumb:");
    expect(html).toContain("--accent: #ffffff;");
    expect(html).toContain("--on-accent: #111111;");

    // Light theme tokens
    expect(html).toContain(':root[data-theme="light"]');
    expect(html).toContain(':root[data-base="light"]');
    expect(html).toContain("--bg: #f2f3f5;");
    expect(html).toContain("--group: #ffffff;");
    expect(html).toContain("--accent: #1a1c1f;");
    expect(html).toContain("--on-accent: #ffffff;");
  });

  it("handles app.getAppearance channel in main.cjs onPanelInvoke", async () => {
    const main = require(mainPath);
    expect(typeof main.onPanelInvoke).toBe("function");

    const appearance = await main.onPanelInvoke("app.getAppearance");
    // Under test environment without PI host, returns null safely without throwing
    expect(appearance === null || typeof appearance === "object").toBe(true);
  });

  it("preserves existing antigravity panel invoke channels", async () => {
    const main = require(mainPath);
    const res = await main.onPanelInvoke("antigravity.getAccounts");
    expect(res).toBeDefined();
    expect(Array.isArray(res.accounts)).toBe(true);
  });
});
