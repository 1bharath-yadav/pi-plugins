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
  description: "Syntax-highlighted code block. Usage: CodeBlock(code) or CodeBlock(language, code)",
  component: ({ props }) => {
    const code = props.codeString ?? props.language ?? "";
    const lang = props.codeString ? (props.language ?? "text") : "text";
    return <OpenUICodeBlock language={lang} codeString={code} />;
  },
});

// 2. Resilient Step & StepsItem with separate schema instances to avoid Zod registry collisions
const createStepItemSchema = () =>
  z.object({
    title: z.string(),
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

// 3. Resilient Steps & Stepper supporting Steps(items) or Steps(title, items)
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
        <div className="olr-steps-title" style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
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
          return <OpenUIStepsItem key={i} number={itemProps.number ?? i + 1} title={stepTitle} details={detailsContent} />;
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

// Clone base components and override strict ones with resilient implementations
const baseComponents = { ...openuiLibrary.components };
delete baseComponents.Steps;
delete baseComponents.StepsItem;
delete baseComponents.CodeBlock;

export const renderLibrary = createLibrary({
  root: "Stack",
  components: [
    ...Object.values(baseComponents),
    CodeBlock,
    Steps,
    Stepper,
    StepsItem,
    Step,
    Lesson,
    Scene3D,
  ],
});

export { openuiLibrary };
export * from "./lesson";
export * from "./scene3d";
