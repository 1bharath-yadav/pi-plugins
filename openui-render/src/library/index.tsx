import React from "react";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { Steps as OpenUISteps, StepsItem as OpenUIStepsItem } from "@openuidev/react-ui/Steps";
import { CodeBlock as OpenUICodeBlock } from "@openuidev/react-ui/CodeBlock";
import { MarkDownRenderer } from "@openuidev/react-ui/MarkDownRenderer";
import { Lesson } from "./lesson";
import { Scene3D } from "./scene3d";

// 1. Resilient CodeBlock supporting CodeBlock(code) or CodeBlock(language, code)
export const CodeBlock = defineComponent({
  name: "CodeBlock",
  props: z.object({
    language: z.string().optional(),
    codeString: z.string().optional(),
  }),
  description: "Syntax-highlighted code block. CodeBlock(code) or CodeBlock(language, code)",
  component: ({ props }) => {
    const code = props.codeString ?? props.language ?? "";
    const lang = props.codeString ? (props.language ?? "text") : "text";
    return <OpenUICodeBlock language={lang} codeString={code} />;
  },
});

// 2. Resilient Step & StepsItem
const createStepItemSchema = () =>
  z.object({
    title: z.union([z.string(), z.any()]),
    details: z.union([z.string(), z.any()]).optional(),
    number: z.number().optional(),
  });

export const StepsItem = defineComponent({
  name: "StepsItem",
  props: createStepItemSchema(),
  description: "One step in a multi-step sequence: StepsItem(title, details?)",
  component: () => null,
});

export const Step = defineComponent({
  name: "Step",
  props: createStepItemSchema(),
  description: "Alias for StepsItem: Step(title, details?)",
  component: () => null,
});

// 3. Resilient Steps & Stepper
function renderSteps({ props, renderNode }: { props: any; renderNode: any }) {
  let items: any[] = [];
  let title: string | null = null;

  if (Array.isArray(props.title)) {
    items = props.title;
  } else if (typeof props.title === "string") {
    title = props.title;
    if (Array.isArray(props.items)) items = props.items;
  } else if (Array.isArray(props.items)) {
    items = props.items;
  }

  return (
    <div className="olr-steps-wrapper" style={{ margin: "10px 0" }}>
      {title && (
        <div className="olr-steps-title" style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px", color: "#f4f4f5" }}>
          {title}
        </div>
      )}
      <OpenUISteps>
        {items.map((item, i) => {
          const itemProps = item?.props ?? item ?? {};
          const stepTitle = itemProps.title ?? (typeof item === "string" ? item : `Step ${i + 1}`);
          const details = itemProps.details ?? itemProps.description;
          const detailsContent =
            typeof details === "string" ? (
              <MarkDownRenderer textMarkdown={details} />
            ) : details ? (
              renderNode(details)
            ) : null;
          return <OpenUIStepsItem key={i} number={itemProps.number ?? i + 1} title={String(stepTitle)} details={detailsContent} />;
        })}
      </OpenUISteps>
    </div>
  );
}

const createStepsSchema = () =>
  z.object({
    title: z.union([z.string(), z.array(z.any())]).optional(),
    items: z.array(z.any()).optional(),
  });

export const Steps = defineComponent({
  name: "Steps",
  props: createStepsSchema(),
  description: "Step-by-step process guide. Steps(items) or Steps(title, items)",
  component: renderSteps,
});

export const Stepper = defineComponent({
  name: "Stepper",
  props: createStepsSchema(),
  description: "Alias for Steps. Stepper(items) or Stepper(title, items)",
  component: renderSteps,
});

// 4. Resilient Card supporting Card([children]), Card(header, [children]), or Card(singleChild)
export const Card = defineComponent({
  name: "Card",
  props: z.object({
    header: z.union([z.string(), z.any()]).optional(),
    children: z.union([z.array(z.any()), z.any()]).optional(),
    variant: z.string().optional(),
  }),
  description: "Card container. Card([children]) or Card(header, [children])",
  component: ({ props, renderNode }) => {
    const headerText = typeof props.header === "string" ? props.header : null;
    let childElements: any[] = [];
    if (Array.isArray(props.children)) {
      childElements = props.children;
    } else if (props.children) {
      childElements = [props.children];
    } else if (Array.isArray(props.header)) {
      childElements = props.header;
    }

    return (
      <div
        className="openui-card"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          padding: "14px",
          background: "rgba(255, 255, 255, 0.03)",
          margin: "8px 0",
        }}
      >
        {headerText && (
          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", color: "#f4f4f5" }}>
            {headerText}
          </div>
        )}
        {typeof props.header === "object" && props.header !== null && !Array.isArray(props.header) && (
          <div style={{ marginBottom: "8px" }}>{renderNode(props.header)}</div>
        )}
        {renderNode(childElements)}
      </div>
    );
  },
});

// 5. Resilient Text supporting Text(value) or Text(variant, value, subtext?)
export const Text = defineComponent({
  name: "Text",
  props: z.object({
    variant: z.union([z.string(), z.number()]).optional(),
    value: z.string().optional(),
    subtext: z.string().optional(),
    subtextVariant: z.string().optional(),
    size: z.string().optional(),
  }),
  description: "Text label or value: Text(value) or Text(variant, value, subtext?)",
  component: ({ props }) => {
    const textVal = props.value ?? (typeof props.variant === "string" ? props.variant : String(props.variant ?? ""));
    return (
      <span className="openui-text" style={{ fontSize: "13px", color: "var(--openui-foreground, #f4f4f5)" }}>
        {textVal}
      </span>
    );
  },
});

// 6. Resilient Slider supporting Slider(name, min, max, step?, label?)
export const Slider = defineComponent({
  name: "Slider",
  props: z.object({
    name: z.string(),
    variant: z.union([z.string(), z.number()]).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    defaultValue: z.any().optional(),
    label: z.string().optional(),
  }),
  description: "Slider control: Slider(name, min, max, step?, label?)",
  component: ({ props }) => {
    let min = props.min ?? 0;
    let max = props.max ?? 100;
    if (typeof props.variant === "number") {
      min = props.variant;
      if (typeof props.min === "number") max = props.min;
    }
    return (
      <div style={{ margin: "8px 0" }}>
        {props.label && <div style={{ fontSize: "12px", color: "#d4d4d8", marginBottom: "4px" }}>{props.label}</div>}
        <input
          type="range"
          min={min}
          max={max}
          step={props.step ?? 1}
          defaultValue={Array.isArray(props.defaultValue) ? props.defaultValue[0] : (props.defaultValue ?? min)}
          style={{ width: "100%", accentColor: "#9333ea" }}
        />
      </div>
    );
  },
});

// 7. Resilient FormControl & Form
export const FormControl = defineComponent({
  name: "FormControl",
  props: z.object({
    label: z.string(),
    input: z.any().optional(),
    hint: z.string().optional(),
  }),
  description: "Form field wrapper: FormControl(label, input, hint?)",
  component: ({ props, renderNode }) => (
    <div className="openui-form-control" style={{ margin: "10px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "#d4d4d8" }}>{props.label}</label>
      {props.input && renderNode(props.input)}
      {props.hint && <span style={{ fontSize: "11px", color: "#71717a" }}>{props.hint}</span>}
    </div>
  ),
});

export const Form = defineComponent({
  name: "Form",
  props: z.object({
    name: z.string(),
    buttons: z.any().optional(),
    fields: z.array(z.any()).default([]),
  }),
  description: "Form container with fields and buttons: Form(name, buttons, fields)",
  component: ({ props, renderNode }) => (
    <div role="form" style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "10px 0" }}>
      {renderNode(props.fields)}
      {renderNode(props.buttons)}
    </div>
  ),
});

// 8. Resilient RadioItem
export const RadioItem = defineComponent({
  name: "RadioItem",
  props: z.object({
    label: z.string(),
    description: z.string().optional(),
    value: z.string().optional(),
  }),
  description: "Radio button item: RadioItem(label, description?, value?)",
  component: () => null,
});

// 9. Aliases: Header, Divider, ScatterPoint, MarkdownContent
export const Header = defineComponent({
  name: "Header",
  props: z.object({
    title: z.union([z.string(), z.any()]),
    subtitle: z.string().optional(),
  }),
  description: "Header section with title: Header(title, subtitle?)",
  component: ({ props }) => (
    <div style={{ marginBottom: "12px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#f4f4f5" }}>
        {typeof props.title === "string" ? props.title : ""}
      </h3>
      {props.subtitle && <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>{props.subtitle}</p>}
    </div>
  ),
});

export const Divider = defineComponent({
  name: "Divider",
  props: z.object({}).optional(),
  description: "Horizontal divider line",
  component: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)", margin: "14px 0" }} />,
});

export const ScatterPoint = defineComponent({
  name: "ScatterPoint",
  props: z.object({
    x: z.number(),
    y: z.number(),
    label: z.any().optional(),
  }),
  description: "Scatter plot point: ScatterPoint(x, y, label?)",
  component: () => null,
});

export const MarkdownContent = defineComponent({
  name: "MarkdownContent",
  props: z.object({
    text: z.string(),
  }),
  description: "Markdown text block: MarkdownContent(text)",
  component: ({ props }) => <MarkDownRenderer textMarkdown={props.text} />,
});

// 10. Resilient SectionBlock & SectionItem
const SectionItemSchema = z.object({
  trigger: z.union([z.string(), z.any()]).optional(),
  title: z.union([z.string(), z.any()]).optional(),
  content: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
  value: z.string().optional(),
});

export const SectionItem = defineComponent({
  name: "SectionItem",
  props: SectionItemSchema,
  description: "Section item: SectionItem(title, content)",
  component: () => null,
});

export const SectionBlock = defineComponent({
  name: "SectionBlock",
  props: z.object({
    title: z.union([z.string(), z.array(z.any())]).optional(),
    sections: z.union([z.array(z.any()), z.any()]).optional(),
    isFoldable: z.boolean().optional(),
  }),
  description: "Sections container: SectionBlock(sections) or SectionBlock(title, sections)",
  component: ({ props, renderNode }) => {
    let sections = Array.isArray(props.sections)
      ? props.sections
      : Array.isArray(props.title)
      ? props.title
      : props.sections
      ? [props.sections]
      : [];
    let title = typeof props.title === "string" ? props.title : null;

    return (
      <div className="openui-section-block" style={{ margin: "12px 0" }}>
        {title && <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#f4f4f5", marginBottom: "8px" }}>{title}</h4>}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sections.map((sec: any, idx: number) => {
            const p = sec?.props ?? sec ?? {};
            const trig = p.trigger ?? p.title ?? `Section ${idx + 1}`;
            return (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#e4e4e7", marginBottom: "4px" }}>
                  {typeof trig === "string" ? trig : renderNode(trig)}
                </div>
                <div>{typeof p.content === "string" ? p.content : renderNode(p.content)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
});

// 11. Resilient Badge, Metric, StatCard
export const Badge = defineComponent({
  name: "Badge",
  props: z.object({
    text: z.union([z.string(), z.any()]),
    color: z.string().optional(),
    variant: z.string().optional(),
  }),
  description: "Badge tag: Badge(text, color?)",
  component: ({ props }) => (
    <span
      className="openui-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        background: "rgba(168, 85, 247, 0.15)",
        color: "#c084fc",
        border: "1px solid rgba(168, 85, 247, 0.3)",
      }}
    >
      {String(props.text ?? "")}
    </span>
  ),
});

export const Metric = defineComponent({
  name: "Metric",
  props: z.object({
    value: z.union([z.string(), z.number()]),
    label: z.string().optional(),
    trend: z.union([z.string(), z.any()]).optional(),
  }),
  description: "Metric readout: Metric(value, label?, trend?)",
  component: ({ props }) => (
    <div className="openui-metric" style={{ padding: "8px 0" }}>
      <div style={{ fontSize: "24px", fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>{String(props.value)}</div>
      {props.label && <div style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}>{props.label}</div>}
      {props.trend && (
        <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px" }}>
          {typeof props.trend === "string" ? props.trend : JSON.stringify(props.trend)}
        </div>
      )}
    </div>
  ),
});

export const StatCard = defineComponent({
  name: "StatCard",
  props: z.object({
    title: z.string(),
    value: z.union([z.string(), z.number()]),
    change: z.union([z.string(), z.any()]).optional(),
    description: z.string().optional(),
  }),
  description: "Statistic card: StatCard(title, value, change?, description?)",
  component: ({ props }) => (
    <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
      <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>{props.title}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#f4f4f5" }}>{String(props.value)}</div>
      {props.change && <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px" }}>{String(props.change)}</div>}
      {props.description && <div style={{ fontSize: "11px", color: "#71717a", marginTop: "4px" }}>{props.description}</div>}
    </div>
  ),
});

// Clone base components and override strict components with resilient versions
const baseComponents = { ...openuiLibrary.components };
delete baseComponents.Steps;
delete baseComponents.StepsItem;
delete baseComponents.CodeBlock;
delete baseComponents.Card;
delete baseComponents.Text;
delete baseComponents.Slider;
delete baseComponents.FormControl;
delete baseComponents.Form;
delete baseComponents.RadioItem;

export const renderLibrary = createLibrary({
  root: "Stack",
  components: [
    ...Object.values(baseComponents),
    Card,
    Text,
    Slider,
    FormControl,
    Form,
    RadioItem,
    CodeBlock,
    Steps,
    Stepper,
    StepsItem,
    Step,
    Header,
    Divider,
    ScatterPoint,
    MarkdownContent,
    SectionBlock,
    SectionItem,
    Badge,
    Metric,
    StatCard,
    Lesson,
    Scene3D,
  ],
});

export { openuiLibrary };
export * from "./lesson";
export * from "./scene3d";
