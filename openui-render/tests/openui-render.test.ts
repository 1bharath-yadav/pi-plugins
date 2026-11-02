import { describe, expect, it } from "bun:test";
import { createParser } from "@openuidev/lang-core";
import { renderLibrary } from "../src/library/index";

describe("OpenUI Lang Component Library & Parser", () => {
  it("parses and validates default Stack-based OpenUI programs", () => {
    const program = [
      'root = Stack([title, chart, tbl])',
      'title = TextContent("Q4 Performance", "large-heavy")',
      'chart = BarChart(labels, [s1], "grouped")',
      'labels = ["Oct", "Nov", "Dec"]',
      's1 = Series("Revenue", [100, 150, 200])',
      'tbl = Table([Col("Month", labels), Col("Revenue", [100, 150, 200])])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root).toBeDefined();
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports Form, FormControl, Input, and Buttons", () => {
    const program = [
      'root = Stack([title, form])',
      'title = TextContent("Account Settings", "large-heavy")',
      'form = Form("settings", btns, [nameField, emailField])',
      'nameField = FormControl("Full Name", Input("name", "Enter name", "text"))',
      'emailField = FormControl("Email Address", Input("email", "you@example.com", "email"))',
      'btns = Buttons([Button("Save Changes", @ToAssistant("Save"), "primary")])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports conversational Card containers", () => {
    const program = [
      'root = Card([header, callout])',
      'header = CardHeader("System Notice", "Operational")',
      'callout = Callout("info", "All systems normal", "All agents operational.")',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), "Card");
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Card");
  });

  it("supports 3D spatial scenes (Scene3D) and Lesson for backwards compatibility", () => {
    const program = [
      'pts = [{x: 0, y: 0, z: 0, label: "Center"}, {x: 1, y: 1, z: 1, label: "Target"}]',
      'root = Lesson("3D Geometry", "Visualize points in 3D", [',
      '  Scene3D(pts, { w: [0, 1, 0], b: 0 }, 45, 30)',
      '])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), "Lesson");
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Lesson");
  });
});
