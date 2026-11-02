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

  it("supports Steps, Step, and CodeBlock with flexible argument signatures", () => {
    const program = [
      'root = Stack([title, steps, equation])',
      'title = TextContent("Photosynthesis Steps", "large-heavy")',
      'steps = Steps("Process Guide", [step1, step2])',
      'step1 = Step("1 · Light enters", "Sunlight is absorbed.")',
      'step2 = Step("2 · Sugar is built", "Glucose is produced.")',
      'equation = CodeBlock("6 CO2 + 6 H2O -> C6H12O6 + 6 O2")',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports Stepper alias and 2-arg CodeBlock", () => {
    const program = [
      'root = Stack([stepper, code])',
      'stepper = Stepper([s1])',
      's1 = StepsItem("Step 1", "Details")',
      'code = CodeBlock("python", "print(\'photosynthesis\')")',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports Header, Divider, ScatterPoint, MarkdownContent, and flexible Slider/Text", () => {
    const program = [
      'root = Stack([h, d, sl, txt, sp, md])',
      'h = Header("System Architecture", "Overview of components")',
      'd = Divider()',
      'sl = Slider("threshold", 32, 100)',
      'txt = Text("A compact plan for a small team.")',
      'sp = ScatterPoint(10, 20, "Point A")',
      'md = MarkdownContent("Markdown prose text here")',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports SectionBlock, SectionItem, Badge, Metric, and StatCard", () => {
    const program = [
      'root = Stack([sec, b, m, sc])',
      'sec = SectionBlock("Details", [item1])',
      'item1 = SectionItem("Section 1", "Content of section 1")',
      'b = Badge("Active", "success")',
      'm = Metric(1250, "Total Users", "+12%")',
      'sc = StatCard("Revenue", "$45,000", "+8%", "Compared to last month")',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Stack");
  });

  it("supports conversational Card containers with string headers", () => {
    const program = [
      'root = Card("System Status", [callout])',
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
