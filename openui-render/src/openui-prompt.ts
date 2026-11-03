import { createLibrary } from "@openuidev/react-lang";
import { openuiPromptOptions } from "@openuidev/react-ui/genui-lib";
import { renderLibrary } from "./library/index";

export interface OpenUIPromptConfig {
  enable3D?: boolean;
  enableDrawio?: boolean;
}

export function getOpenuiSystemPrompt(config?: OpenUIPromptConfig): string {
  const enable3D = config?.enable3D !== false;
  const enableDrawio = config?.enableDrawio !== false;

  // Filter components based on active user toggles
  const allComponents = Object.values(renderLibrary.components);
  const activeComponents = allComponents.filter((comp) => {
    if (!enable3D && (comp.name === "Three3D" || comp.name === "Scene3D")) return false;
    if (!enableDrawio && (comp.name === "Drawio" || comp.name === "Diagram")) return false;
    return true;
  });

  const activeLibrary = createLibrary({
    root: "Stack",
    components: activeComponents,
  });

  const additionalRules = [
    ...(openuiPromptOptions.additionalRules || []),
    "Output exactly one complete fenced ```local.openui-render:openui code block with root = Stack([children]).",
    "Core Layout & Containers: Stack (default root container), Card, SectionBlock, InlineHeader, Header, Divider.",
    "Data Presentation & Metrics: Table, Col, MetricIndicatorInline, BarChart, LineChart, AreaChart, PieChart, ScatterChart, Series, ScatterSeries, Point.",
    "Form & Input Controls: Form, FormControl, Input, Select, TextArea, Slider, SwitchGroup, RadioGroup, Buttons.",
    "Step Guides & Processes: Steps([Step(title, details)...]) or Steps(items).",
    "Never invent unsupported component or argument names. Define all helper variables before root.",
    "Do not put markdown code fences inside the OpenUI Lang program. Keep all UI definitions inside the single outer local.openui-render:openui block.",
    "Avoid excessive vertical space: default Stack to vertical direction 'column' with gap 'm', align 'stretch', justify 'start'. Do NOT set large container heights or justify='between' on vertical stacks.",
  ];

  const examples = [...(openuiPromptOptions.examples || [])];

  if (enableDrawio) {
    additionalRules.push(
      "Diagrams & Architecture (Draw.io): When asked for 2D architecture diagrams, flowcharts, data flows, sequence diagrams, mind maps, or system design, ALWAYS use Drawio(xml, height?, title?) or Diagram(xml, height?, title?). Provide valid Draw.io XML (<mxfile><diagram><mxGraphModel>...</mxGraphModel></diagram></mxfile>) with boxes, connectors, and labels to render an interactive diagram."
    );
    examples.push(
      `Example 7 — Architecture Diagram (Draw.io):

root = Stack([diag])
diag = Drawio("<mxfile><diagram name=\\"Arch\\"><mxGraphModel><root><mxCell id=\\"0\\"/><mxCell id=\\"1\\" parent=\\"0\\"/><mxCell id=\\"2\\" value=\\"Frontend (React)\\" style=\\"rounded=1;fillColor=#60a5fa;strokeColor=#2563eb;fontColor=#ffffff;\\" vertex=\\"1\\" parent=\\"1\\"><mxGeometry x=\\"40\\" y=\\"80\\" width=\\"140\\" height=\\"50\\" as=\\"geometry\\"/></mxCell><mxCell id=\\"3\\" value=\\"API Gateway\\" style=\\"rounded=1;fillColor=#a855f7;strokeColor=#7e22ce;fontColor=#ffffff;\\" vertex=\\"1\\" parent=\\"1\\"><mxGeometry x=\\"240\\" y=\\"80\\" width=\\"130\\" height=\\"50\\" as=\\"geometry\\"/></mxCell><mxCell id=\\"4\\" value=\\"Microservices\\" style=\\"rounded=1;fillColor=#22c55e;strokeColor=#15803d;fontColor=#ffffff;\\" vertex=\\"1\\" parent=\\"1\\"><mxGeometry x=\\"430\\" y=\\"80\\" width=\\"130\\" height=\\"50\\" as=\\"geometry\\"/></mxCell><mxCell id=\\"5\\" edge=\\"1\\" source=\\"2\\" target=\\"3\\" parent=\\"1\\"><mxGeometry relative=\\"1\\" as=\\"geometry\\"/></mxCell><mxCell id=\\"6\\" edge=\\"1\\" source=\\"3\\" target=\\"4\\" parent=\\"1\\"><mxGeometry relative=\\"1\\" as=\\"geometry\\"/></mxCell></root></mxGraphModel></diagram></mxfile>", 360, "System Architecture")`
    );
  }

  if (enable3D) {
    additionalRules.push(
      "3D Graphics & Models (Three.js WebGL): When asked for 3D visualizations, molecular structures, physics, geometry, spatial models, or 3D labels, ALWAYS use Three3D(objects, height?, title?, showAxes?, showGrid?, autoRotate?). objects is a list of { type: \"sphere\"|\"box\"|\"cylinder\"|\"cone\"|\"torus\", position: [x, y, z], color: \"#hex\", size?: number|[w,h,d], label?: string }."
    );
    examples.push(
      `Example 8 — 3D Interactive Scene (Three.js WebGL):

root = Stack([scene])
scene = Three3D(objs, 380, "Photosynthesis 3D Model", true, true, true)
objs = [sun, leaf, chloroplast, glucose]
sun = { type: "sphere", position: [-2.5, 2.0, 0], color: "#facc15", size: 0.6, label: "Sunlight (Energy)" }
leaf = { type: "box", position: [0, 0, 0], color: "#16a34a", size: [3.2, 0.3, 2.0], label: "Leaf Surface" }
chloroplast = { type: "cylinder", position: [0, 0.6, 0], color: "#22c55e", size: [0.8, 0.4, 0.8], label: "Chloroplast" }
glucose = { type: "sphere", position: [2.2, 0.5, 0], color: "#f97316", size: 0.45, label: "Glucose (C6H12O6)" }`
    );
  }

  let promptTopicPreamble = "When asked to create, render, explain, or visualize UI";
  if (enable3D && enableDrawio) {
    promptTopicPreamble += ", 3D scenes, or architecture diagrams";
  } else if (enable3D) {
    promptTopicPreamble += " or 3D scenes";
  } else if (enableDrawio) {
    promptTopicPreamble += " or architecture diagrams";
  }

  const suggestedComponents = ["Card", "SectionBlock", "Table", "Charts", "Form controls"];
  if (enable3D) suggestedComponents.push("Three3D");
  if (enableDrawio) suggestedComponents.push("Drawio");

  const preamble = [
    "You are a precise, adaptive generative UI designer embedded in PI-Desktop OpenUI mode.",
    "Use the selected agent's existing tools and reasoning; this plugin adds an interactive OpenUI generative UI renderer, not a replacement agent.",
    `${promptTopicPreamble}, generate a composed interface using OpenUI Lang inside \`\`\`local.openui-render:openui fenced code blocks.`,
    `Default to root = Stack([children]) as the root container. Compose children using ${suggestedComponents.join(", ")}.`,
  ].join("\n");

  return activeLibrary.prompt({
    ...openuiPromptOptions,
    preamble,
    inlineMode: true,
    examples,
    additionalRules,
  });
}

export const openuiSystemPrompt = getOpenuiSystemPrompt({ enable3D: true, enableDrawio: true });
