import { describe, expect, it } from "bun:test";
import { createParser } from "@openuidev/lang-core";
import { renderLibrary } from "../src/library/index";

describe("OpenUI Lang Component Library & Parser", () => {
  it("parses and validates a complete Lesson program", () => {
    const program = [
      'xs = @Linspace(-4, 4, 41)',
      'root = Lesson("Quadratic functions", "Connect the equation, the graph, and the vertex.", [',
      '  Row([Badge("Mathematics", "purple"), Badge("Function graph", "success")], 2, "center", "start", true),',
      '  Math("f(x) = x^2 - 4x + 3"),',
      '  Markdown("Factor the polynomial to find its roots. The vertex identifies the minimum of this upward-opening parabola."),',
      '  Chart("line", @Each(xs, "x", {x: x, y: x * x - 4 * x + 3}), "x", ["y"], "x", "f(x)", 260),',
      '  Card([Title("Key property", "lg"), Text("The vertex is at x = 2; the minimum value is -1.")], "soft")',
      '])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root).toBeDefined();
    expect(result.root?.typeName).toBe("Lesson");
  });

  it("supports interactive controls (Slider, SegmentedControl, Quiz)", () => {
    const program = [
      'val = 5',
      'opt = "A"',
      'root = Lesson("Interactive Controls", "Testing interactivity", [',
      '  Slider(val, 0, 10, 1, "Scale factor"),',
      '  SegmentedControl(opt, ["A", "B", "C"]),',
      '  Quiz("What is the slope of y = 2x + 1?", ["1", "2", "3"], 1, "The coefficient of x is the slope.")',
      '])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Lesson");
  });

  it("supports 3D spatial scenes (Scene3D)", () => {
    const program = [
      'pts = [{x: 0, y: 0, z: 0}, {x: 1, y: 1, z: 1}]',
      'root = Lesson("3D Geometry", "Visualize points in 3D", [',
      '  Scene3D(pts, { w: [0, 1, 0], b: 0 }, 45, 30)',
      '])',
    ].join("\n");

    const parser = createParser(renderLibrary.toJSONSchema(), renderLibrary.root);
    const result = parser.parse(program);
    expect(result.meta.errors).toEqual([]);
    expect(result.root?.typeName).toBe("Lesson");
  });
});
