import React from "react";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import {
  CodeBlock as OpenUICodeBlock,
  Steps as OpenUISteps,
  StepsItem as OpenUIStepsItem,
  MarkDownRenderer,
  Tag as OpenUITag,
  Carousel as OpenUICarousel,
  ListBlock as OpenUIListBlock,
  ListItem as OpenUIListItem,
  EntityList as OpenUIEntityList,
  RadioGroup as OpenUIRadioGroup,
  RadioItem as OpenUIRadioItem,
  CheckBoxGroup as OpenUICheckBoxGroup,
  SwitchGroup as OpenUISwitchGroup,
  Slider as OpenUISlider,
  MetricIndicatorInline as OpenUIMetricIndicatorInline,
} from "@openuidev/react-ui";
import { Lesson } from "./lesson";
import { Scene3D } from "./scene3d";

// 1. Resilient CodeBlock: CodeBlock(code) or CodeBlock(language, code)
export const CodeBlock = defineComponent({
  name: "CodeBlock",
  props: z.object({
    language: z.string().optional(),
    codeString: z.string().optional(),
  }),
  description: "Syntax-highlighted code block. Usage: CodeBlock(code) or CodeBlock(language, code)",
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

// 3. Resilient Steps & Stepper: Steps(items) or Steps(title, items)
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
    <div className="olr-steps-wrapper" style={{ margin: "8px 0" }}>
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
  description: "Step-by-step process guide. Usage: Steps(items) or Steps(title, items)",
  component: renderSteps,
});

export const Stepper = defineComponent({
  name: "Stepper",
  props: createStepsSchema(),
  description: "Alias for Steps. Usage: Stepper(items) or Stepper(title, items)",
  component: renderSteps,
});

// 4. Resilient Card: Card([children]), Card(header, [children]), or Card(singleChild)
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
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "12px 14px",
          background: "rgba(255, 255, 255, 0.03)",
          margin: "6px 0",
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

// 5. Resilient Text: Text(value) or Text(variant, value, subtext?)
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

// 6. Resilient Slider: Slider(name, min, max, step?, label?)
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
      <div style={{ margin: "6px 0" }}>
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
    <div className="openui-form-control" style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
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
    <div role="form" style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "8px 0" }}>
      {renderNode(props.fields)}
      {renderNode(props.buttons)}
    </div>
  ),
});

// 8. Resilient RadioItem & RadioGroup
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

export const RadioGroup = defineComponent({
  name: "RadioGroup",
  props: z.object({
    name: z.any().optional(),
    items: z.any().optional(),
    defaultValue: z.any().optional(),
  }),
  description: "Radio group: RadioGroup(name, items, defaultValue?)",
  component: ({ props, renderNode }) => {
    let items = Array.isArray(props.items) ? props.items : Array.isArray(props.name) ? props.name : [];
    let groupName = typeof props.name === "string" ? props.name : "radio-group";
    let defaultVal = Array.isArray(props.defaultValue) ? props.defaultValue[0] : (props.defaultValue ?? "");

    return (
      <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0" }}>
        {items.map((it: any, idx: number) => {
          const itemProps = it?.props ?? it ?? {};
          const label = itemProps.label ?? `Choice ${idx + 1}`;
          const val = itemProps.value ?? label;
          return (
            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#e4e4e7", cursor: "pointer" }}>
              <input type="radio" name={groupName} value={val} defaultChecked={val === defaultVal} style={{ accentColor: "#9333ea" }} />
              <div>
                <div>{label}</div>
                {itemProps.description && <div style={{ fontSize: "11px", color: "#a1a1aa" }}>{itemProps.description}</div>}
              </div>
            </label>
          );
        })}
      </div>
    );
  },
});

// 9. Resilient CheckBoxItem, CheckBoxGroup, SwitchItem, SwitchGroup
export const CheckBoxItem = defineComponent({
  name: "CheckBoxItem",
  props: z.object({
    name: z.any().optional(),
    label: z.any().optional(),
    defaultChecked: z.any().optional(),
    description: z.any().optional(),
  }),
  description: "Checkbox item: CheckBoxItem(name, label, defaultChecked?)",
  component: () => null,
});

export const CheckBoxGroup = defineComponent({
  name: "CheckBoxGroup",
  props: z.object({
    name: z.any().optional(),
    items: z.any().optional(),
    defaultValue: z.any().optional(),
  }),
  description: "Checkbox group: CheckBoxGroup(name, items)",
  component: ({ props, renderNode }) => {
    let items = Array.isArray(props.items) ? props.items : Array.isArray(props.name) ? props.name : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0" }}>
        {items.map((it: any, idx: number) => {
          const p = it?.props ?? it ?? {};
          return (
            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#e4e4e7", cursor: "pointer" }}>
              <input type="checkbox" defaultChecked={Boolean(p.defaultChecked ?? p.checked)} style={{ accentColor: "#9333ea" }} />
              <span>{p.label ?? p.name ?? `Item ${idx + 1}`}</span>
            </label>
          );
        })}
      </div>
    );
  },
});

export const SwitchItem = defineComponent({
  name: "SwitchItem",
  props: z.object({
    name: z.any().optional(),
    label: z.any().optional(),
    defaultChecked: z.any().optional(),
    description: z.any().optional(),
  }),
  description: "Switch item: SwitchItem(name, label, defaultChecked?)",
  component: () => null,
});

export const SwitchGroup = defineComponent({
  name: "SwitchGroup",
  props: z.object({
    name: z.any().optional(),
    items: z.any().optional(),
  }),
  description: "Switch group: SwitchGroup(name, items)",
  component: ({ props, renderNode }) => {
    let items = Array.isArray(props.items) ? props.items : Array.isArray(props.name) ? props.name : [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0" }}>
        {items.map((it: any, idx: number) => {
          const p = it?.props ?? it ?? {};
          const checked = typeof p.defaultChecked === "boolean" ? p.defaultChecked : typeof p.description === "boolean" ? p.description : false;
          return (
            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#e4e4e7", cursor: "pointer" }}>
              <input type="checkbox" role="switch" defaultChecked={checked} style={{ accentColor: "#9333ea" }} />
              <span>{p.label ?? p.name ?? `Switch ${idx + 1}`}</span>
            </label>
          );
        })}
      </div>
    );
  },
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
    title: z.any().optional(),
    sections: z.any().optional(),
    isFoldable: z.any().optional(),
  }),
  description: "Sections container: SectionBlock(sections) or SectionBlock(title, sections)",
  component: ({ props, renderNode }) => {
    let sections = Array.isArray(props.sections)
      ? props.sections
      : Array.isArray(props.title)
      ? props.title
      : Array.isArray(props.isFoldable)
      ? props.isFoldable
      : props.sections
      ? [props.sections]
      : [];
    let title = typeof props.title === "string" ? props.title : null;

    return (
      <div className="openui-section-block" style={{ margin: "10px 0" }}>
        {title && <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#f4f4f5", marginBottom: "6px" }}>{title}</h4>}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {sections.map((sec: any, idx: number) => {
            const p = sec?.props ?? sec ?? {};
            const trig = p.trigger ?? p.title ?? `Section ${idx + 1}`;
            return (
              <div
                key={idx}
                style={{
                  padding: "8px 12px",
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

// 11. Resilient Carousel
export const Carousel = defineComponent({
  name: "Carousel",
  props: z.object({
    children: z.array(z.any()),
    loop: z.boolean().optional(),
  }),
  description: "Swipeable carousel slides: Carousel([slide1, slide2])",
  component: ({ props, renderNode }) => {
    const slides = props.children ?? [];
    return (
      <div className="openui-carousel-wrap" style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "6px 0" }}>
        {slides.map((s: any, idx: number) => (
          <div key={idx} style={{ flex: "0 0 85%", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "12px" }}>
            {Array.isArray(s) ? renderNode(s) : renderNode([s])}
          </div>
        ))}
      </div>
    );
  },
});

// 12. Resilient TagBlock & Tag (supports TagBlock(items, size?, variant?))
export const Tag = defineComponent({
  name: "Tag",
  props: z.object({
    text: z.union([z.string(), z.any()]),
    icon: z.any().optional(),
    size: z.any().optional(),
    variant: z.string().optional(),
  }),
  description: "Small tag pill: Tag(text, icon?, size?, variant?)",
  component: ({ props }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "rgba(255, 255, 255, 0.08)", color: "#e4e4e7" }}>
      {String(props.text ?? "")}
    </span>
  ),
});

export const TagBlock = defineComponent({
  name: "TagBlock",
  props: z.object({
    items: z.union([z.array(z.any()), z.string()]),
    size: z.any().optional(),
    variant: z.any().optional(),
  }),
  description: "Block of tags: TagBlock(items, size?, variant?)",
  component: ({ props, renderNode }) => {
    let items = Array.isArray(props.items)
      ? props.items
      : typeof props.items === "string"
      ? props.items.split(",").map((s) => s.trim())
      : [];
    const size = props.size === "sm" ? "10px" : "11px";
    const pad = props.size === "sm" ? "1px 6px" : "2px 8px";
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "4px 0" }}>
        {items.map((it: any, idx: number) => (
          <span key={idx} style={{ display: "inline-flex", padding: pad, borderRadius: "12px", fontSize: size, background: "rgba(255, 255, 255, 0.08)", color: "#e4e4e7", fontWeight: 500 }}>
            {typeof it === "string" ? it : renderNode(it)}
          </span>
        ))}
      </div>
    );
  },
});

// 13. Resilient Image & ImageBlock (compact, eliminates empty waste space)
export const Image = defineComponent({
  name: "Image",
  props: z.object({
    src: z.string().optional(),
    alt: z.string().optional(),
    aspectRatio: z.string().optional(),
    scale: z.string().optional(),
  }),
  description: "Image with alt text: Image(src, alt)",
  component: ({ props }) => {
    const [error, setError] = React.useState(false);
    if (!props.src || error) {
      return (
        <div style={{ padding: "6px 10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.04)", fontSize: "11px", color: "#a1a1aa", display: "inline-flex", alignItems: "center", gap: "6px", margin: "4px 0" }}>
          <span>🖼️</span>
          <span>{props.alt || "Image preview"}</span>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: "100%", maxHeight: "240px", overflow: "hidden", borderRadius: "6px", margin: "6px 0" }}>
        <img
          src={props.src}
          alt={props.alt ?? ""}
          onError={() => setError(true)}
          style={{ width: "100%", maxHeight: "240px", objectFit: "cover", display: "block", borderRadius: "6px" }}
        />
      </div>
    );
  },
});

export const ImageBlock = defineComponent({
  name: "ImageBlock",
  props: z.object({
    src: z.string(),
    alt: z.string(),
    caption: z.any().optional(),
  }),
  description: "Framed image: ImageBlock(src, alt, caption?)",
  component: ({ props }) => {
    const [error, setError] = React.useState(false);
    if (error) {
      return (
        <div style={{ padding: "6px 10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.04)", fontSize: "11px", color: "#a1a1aa", margin: "4px 0" }}>
          🖼️ {props.alt || "Image"}
        </div>
      );
    }
    return (
      <div style={{ margin: "6px 0", maxWidth: "100%" }}>
        <img src={props.src} alt={props.alt} onError={() => setError(true)} style={{ maxWidth: "100%", maxHeight: "240px", objectFit: "cover", borderRadius: "6px", display: "block" }} />
        {props.caption && <p style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "4px" }}>{String(props.caption)}</p>}
      </div>
    );
  },
});

// 14. Resilient ListBlock
export const ListBlock = defineComponent({
  name: "ListBlock",
  props: z.object({
    items: z.any(),
    variant: z.string().optional(),
  }),
  description: "List of items: ListBlock(items, variant?)",
  component: ({ props, renderNode }) => {
    let items = Array.isArray(props.items) ? props.items : [];
    const isNumbered = props.variant === "number" || props.variant === "numbered";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0" }}>
        {items.map((it: any, idx: number) => {
          const p = it?.props ?? it ?? {};
          return (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              {isNumbered && (
                <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, flexShrink: 0 }}>
                  {idx + 1}
                </span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#f4f4f5" }}>{p.title ?? (typeof it === "string" ? it : "")}</div>
                {p.description && <div style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}>{String(p.description)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
});

// 15. Resilient MetricIndicatorInline & MetricIndicatorWithStrikethrough
export const MetricIndicatorInline = defineComponent({
  name: "MetricIndicatorInline",
  props: z.object({
    value: z.any(),
    subtext: z.any().optional(),
    trend: z.any().optional(),
  }),
  description: "Inline KPI metric with optional trend: MetricIndicatorInline(value, subtext?, trend?)",
  component: ({ props }) => (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
      <span style={{ fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>{String(props.value)}</span>
      {props.subtext && <span style={{ fontSize: "12px", color: "#a1a1aa" }}>{String(props.subtext)}</span>}
      {props.trend && (
        <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>
          {typeof props.trend === "string" ? props.trend : props.trend?.value ?? ""}
        </span>
      )}
    </div>
  ),
});

export const MetricIndicatorWithStrikethrough = defineComponent({
  name: "MetricIndicatorWithStrikethrough",
  props: z.object({
    value: z.any(),
    previousValue: z.any().optional(),
    trend: z.any().optional(),
    subtext: z.any().optional(),
  }),
  description: "Metric showing previous and current values: MetricIndicatorWithStrikethrough(value, previousValue, trend?, subtext?)",
  component: ({ props }) => (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
      {props.previousValue && (
        <span style={{ textDecoration: "line-through", color: "#71717a", fontSize: "13px" }}>
          {String(props.previousValue)}
        </span>
      )}
      <span style={{ fontSize: "16px", fontWeight: 700, color: "#f4f4f5" }}>{String(props.value)}</span>
      {props.trend && <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 600 }}>{String(props.trend)}</span>}
      {props.subtext && <span style={{ fontSize: "11px", color: "#a1a1aa" }}>{String(props.subtext)}</span>}
    </div>
  ),
});

// 16. Resilient OverviewCardItem & OverviewCardBlock
export const OverviewCardItem = defineComponent({
  name: "OverviewCardItem",
  props: z.object({
    id: z.string().optional(),
    top: z.any().optional(),
    bottom: z.any().optional(),
  }),
  description: "Overview card item: OverviewCardItem(id, top, bottom)",
  component: () => null,
});

export const OverviewCardBlock = defineComponent({
  name: "OverviewCardBlock",
  props: z.object({
    items: z.array(z.any()),
    layout: z.any().optional(),
    responsive: z.any().optional(),
    action: z.any().optional(),
    gap: z.any().optional(),
  }),
  description: "Overview cards block: OverviewCardBlock(items)",
  component: ({ props, renderNode }) => {
    const items = props.items ?? [];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", margin: "6px 0" }}>
        {items.map((it: any, idx: number) => {
          const p = it?.props ?? it ?? {};
          return (
            <div key={idx} style={{ padding: "12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column", gap: "6px" }}>
              {p.top && <div>{typeof p.top === "string" ? p.top : renderNode(p.top)}</div>}
              {p.bottom && <div>{typeof p.bottom === "string" ? p.bottom : renderNode(p.bottom)}</div>}
            </div>
          );
        })}
      </div>
    );
  },
});

// 17. Resilient CompositeCardItem & CompositeCardBlock
export const CompositeCardItem = defineComponent({
  name: "CompositeCardItem",
  props: z.object({
    id: z.any().optional(),
    header: z.any().optional(),
    body: z.any().optional(),
    footer: z.any().optional(),
  }),
  description: "Composite card item: CompositeCardItem(id, header, body, footer?)",
  component: () => null,
});

export const CompositeCardBlock = defineComponent({
  name: "CompositeCardBlock",
  props: z.object({
    items: z.array(z.any()),
    layout: z.any().optional(),
    responsive: z.any().optional(),
    action: z.any().optional(),
    gap: z.any().optional(),
  }),
  description: "Comparison card grid: CompositeCardBlock(items)",
  component: ({ props, renderNode }) => {
    const items = props.items ?? [];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", margin: "8px 0" }}>
        {items.map((it: any, idx: number) => {
          const p = it?.props ?? it ?? {};
          return (
            <div key={idx} style={{ padding: "12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column", gap: "6px" }}>
              {p.header && (
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#f4f4f5" }}>
                  {typeof p.header === "string" ? p.header : renderNode(p.header)}
                </div>
              )}
              {p.body && <div style={{ flex: 1 }}>{Array.isArray(p.body) ? renderNode(p.body) : renderNode([p.body])}</div>}
              {p.footer && <div>{renderNode([p.footer?.button ?? p.footer])}</div>}
            </div>
          );
        })}
      </div>
    );
  },
});

// 18. Resilient EntityList
export const EntityList = defineComponent({
  name: "EntityList",
  props: z.object({
    rows: z.array(z.any()).default([]),
    size: z.any().optional(),
    header: z.any().optional(),
    footer: z.any().optional(),
  }),
  description: "Two-column label/value list: EntityList(rows, size?, header?, footer?)",
  component: ({ props }) => {
    const rows = props.rows ?? [];
    return (
      <div style={{ margin: "6px 0", fontSize: "13px" }}>
        {props.header && <div style={{ fontWeight: 600, color: "#f4f4f5", marginBottom: "4px" }}>{String(props.header?.left ?? props.header)}</div>}
        {rows.map((r: any, idx: number) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ color: "#a1a1aa" }}>{String(r.left ?? "")}</span>
            <span style={{ color: "#f4f4f5", fontWeight: 500 }}>{String(r.right ?? "")}</span>
          </div>
        ))}
      </div>
    );
  },
});

// 19. Aliases: Header, Divider, ScatterPoint, MarkdownContent
export const Header = defineComponent({
  name: "Header",
  props: z.object({
    title: z.union([z.string(), z.any()]),
    subtitle: z.any().optional(),
  }),
  description: "Header section with title: Header(title, subtitle?)",
  component: ({ props }) => (
    <div style={{ marginBottom: "10px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0", color: "#f4f4f5" }}>
        {typeof props.title === "string" ? props.title : ""}
      </h3>
      {props.subtitle && <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>{String(props.subtitle)}</p>}
    </div>
  ),
});

export const Divider = defineComponent({
  name: "Divider",
  props: z.object({}).optional(),
  description: "Horizontal divider line",
  component: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)", margin: "10px 0" }} />,
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
    extra: z.any().optional(),
  }),
  description: "Markdown text block: MarkdownContent(text, extra?)",
  component: ({ props }) => <MarkDownRenderer textMarkdown={props.text} />,
});

// 20. Resilient Badge, Metric, StatCard
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
    <div className="openui-metric" style={{ padding: "6px 0" }}>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>{String(props.value)}</div>
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
    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
      <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>{props.title}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#f4f4f5" }}>{String(props.value)}</div>
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
delete baseComponents.RadioGroup;
delete baseComponents.CheckBoxItem;
delete baseComponents.CheckBoxGroup;
delete baseComponents.SwitchItem;
delete baseComponents.SwitchGroup;
delete baseComponents.Carousel;
delete baseComponents.TagBlock;
delete baseComponents.Tag;
delete baseComponents.Image;
delete baseComponents.ImageBlock;
delete baseComponents.ListBlock;
delete baseComponents.CompositeCardItem;
delete baseComponents.CompositeCardBlock;
delete baseComponents.OverviewCardItem;
delete baseComponents.OverviewCardBlock;
delete baseComponents.EntityList;
delete baseComponents.MetricIndicatorInline;
delete baseComponents.MetricIndicatorWithStrikethrough;

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
    RadioGroup,
    CheckBoxItem,
    CheckBoxGroup,
    SwitchItem,
    SwitchGroup,
    Carousel,
    TagBlock,
    Tag,
    Image,
    ImageBlock,
    ListBlock,
    CompositeCardItem,
    CompositeCardBlock,
    OverviewCardItem,
    OverviewCardBlock,
    EntityList,
    MetricIndicatorInline,
    MetricIndicatorWithStrikethrough,
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
