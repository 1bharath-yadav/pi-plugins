import { describe, expect, it } from "bun:test";
import { extractOpenUILang, hasOpenUIBlock } from "../src/extract-openui";

describe("OpenUI Block Extraction", () => {
  it("extracts from local.openui-render:openui fence", () => {
    const text = `Here is your lesson:
\`\`\`local.openui-render:openui
root = Lesson("Sample", "Objective", [Text("Hello")])
\`\`\`
Hope this helps!`;
    const extracted = extractOpenUILang(text);
    expect(extracted).toBe('root = Lesson("Sample", "Objective", [Text("Hello")])');
    expect(hasOpenUIBlock(text)).toBe(true);
  });

  it("extracts from local.openui-render:openui-lang fence", () => {
    const text = `\`\`\`local.openui-render:openui-lang
root = Lesson("Sample", "Objective", [Text("Hello")])
\`\`\``;
    const extracted = extractOpenUILang(text);
    expect(extracted).toBe('root = Lesson("Sample", "Objective", [Text("Hello")])');
  });

  it("extracts from openui-lang and openui fences", () => {
    const text1 = `\`\`\`openui-lang
root = Lesson("Sample", "Objective", [Text("Hello")])
\`\`\``;
    expect(extractOpenUILang(text1)).toBe('root = Lesson("Sample", "Objective", [Text("Hello")])');

    const text2 = `\`\`\`openui
root = Lesson("Sample 2", "Objective 2", [Text("World")])
\`\`\``;
    expect(extractOpenUILang(text2)).toBe('root = Lesson("Sample 2", "Objective 2", [Text("World")])');
  });

  it("extracts from unclosed streaming fence", () => {
    const streaming = `Generating lesson...
\`\`\`local.openui-render:openui
root = Lesson("Streaming Lesson", "Testing streaming", [
  Row([Badge("Math", "purple")])`;
    const extracted = extractOpenUILang(streaming);
    expect(extracted).toContain('root = Lesson("Streaming Lesson"');
    expect(extracted).toContain('Row([Badge("Math", "purple")])');
  });

  it("extracts unfenced OpenUI code starting with root = Lesson", () => {
    const code = `xs = @Linspace(0, 10, 50)
root = Lesson("Unfenced", "Direct code", [Text("Works")])`;
    const extracted = extractOpenUILang(code);
    expect(extracted).toBe(code);
  });

  it("returns empty string when no OpenUI content present", () => {
    const text = "This is just ordinary conversation with no openui blocks.";
    expect(extractOpenUILang(text)).toBe("");
  });
});
