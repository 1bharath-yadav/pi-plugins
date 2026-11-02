import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pluginDir = path.resolve(import.meta.dir, "..");
const manifestPath = path.join(pluginDir, "manifest.json");

describe("PI-Desktop Plugin Manifest Contract", () => {
  it("exists and is valid JSON", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);
    expect(manifest).toBeObject();
  });

  it("satisfies schemaVersion and identity requirements", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.id).toBe("local.openui-render");
    expect(/^[a-z0-9]+(\.[a-z0-9_-]+)+$/.test(manifest.id)).toBe(true);
    expect(typeof manifest.name).toBe("string");
    expect(typeof manifest.version).toBe("string");
    expect(typeof manifest.description).toBe("string");
  });

  it("points to existing main and renderer files", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(["main.js", "main.cjs"]).toContain(manifest.main);
    expect(fs.existsSync(path.join(pluginDir, manifest.main))).toBe(true);

    expect(manifest.renderer).toBe("dist/renderer.mjs");
    expect(fs.existsSync(path.join(pluginDir, manifest.renderer))).toBe(true);
  });

  it("declares necessary permissions for renderer and agent extensions", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.permissions).toContain("renderer.extension");
    expect(manifest.permissions).toContain("agent.extension");
  });

  it("declares valid renderer actions and call methods", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(Array.isArray(manifest.rendererActions)).toBe(true);
    expect(manifest.rendererActions.length).toBeLessThanOrEqual(16);
    expect(manifest.rendererActions).toContain("plugin.call");
    expect(manifest.rendererActions).toContain("composer.insertText");

    expect(Array.isArray(manifest.rendererCallMethods)).toBe(true);
    expect(manifest.rendererCallMethods.length).toBeLessThanOrEqual(32);
    expect(manifest.rendererCallMethods).toContain("study.getMode");
    expect(manifest.rendererCallMethods).toContain("study.setMode");
  });

  it("declares existing agentExtension files", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.contributes?.agentExtensions).toBeArray();
    expect(manifest.contributes.agentExtensions.length).toBeGreaterThan(0);
    for (const file of manifest.contributes.agentExtensions) {
      expect(fs.existsSync(path.join(pluginDir, file))).toBe(true);
    }
  });

  it("declares valid commands", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const commands = manifest.contributes?.commands;
    expect(Array.isArray(commands)).toBe(true);
    for (const cmd of commands) {
      expect(typeof cmd.id).toBe("string");
      expect(typeof cmd.title).toBe("string");
    }
  });
});
