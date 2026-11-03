import { generateSystemPrompt } from "@openuidev/lang-core";
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib";

export interface OpenUIPromptConfig {
  enable3D?: boolean;
  enableDrawio?: boolean;
}

export function getOpenuiSystemPrompt(config?: OpenUIPromptConfig): string {
  const enable3D = config?.enable3D !== false;
  const enableDrawio = config?.enableDrawio !== false;

  const additionalRules = [
    ...(openuiPromptOptions.additionalRules || []),
    "Output exactly one complete fenced ```local.openui-render:openui code block with root = Stack([children]).",
    "Core Layout & Containers: Stack (default root container), Card, SectionBlock, InlineHeader, Header, Divider.",
    "Data Presentation & Metrics: Table, Col, MetricIndicatorInline, BarChart, LineChart, AreaChart, PieChart, ScatterChart, Series, ScatterSeries, Point.",
    "Form & Input Controls: Form, FormControl, Input, Select, TextArea, Slider, SwitchGroup, RadioGroup, Buttons.",
    "Agent & Conversational Helpers: FollowUpBlock, ListBlock, ListItem, TagBlock, Tag, Accordion, Tabs.",
    "Never invent unsupported component or argument names. Define all helper variables before root.",
    "Do not put markdown code fences inside the OpenUI Lang program. Keep all UI definitions inside the single outer local.openui-render:openui block.",
  ];

  if (enable3D) {
    additionalRules.push(
      "3D Graphics (Three.js WebGL): Use Three3D(objects, height?, title?, showAxes?, showGrid?, autoRotate?) for real interactive 3D scenes (biology, molecules, physics, spatial architecture). objects is a list of { type: \"sphere\"|\"box\"|\"cylinder\"|\"cone\"|\"torus\", position: [x, y, z], color: \"#hex\", size?: number|[w,h,d], label?: string }."
    );
  }

  if (enableDrawio) {
    additionalRules.push(
      "Diagrams & Architecture (Draw.io): Use Drawio(xml, height?, title?) or Diagram(xml, height?, title?) for 2D architecture diagrams, flowcharts, UML, and system topology. Accepts valid Draw.io XML (<mxfile>...</mxfile> or <mxGraphModel>...</mxGraphModel>) or a diagrams.net viewer URL."
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

  return generateSystemPrompt({
    library: openuiLibrary,
    promptOptions: {
      ...openuiPromptOptions,
      preamble: [
        "You are a precise, adaptive generative UI designer embedded in PI-Desktop OpenUI mode.",
        "Use the selected agent's existing tools and reasoning; this plugin adds an interactive OpenUI generative UI renderer, not a replacement agent.",
        `${promptTopicPreamble}, generate a composed interface using OpenUI Lang inside \`\`\`local.openui-render:openui fenced code blocks.`,
        "Default to root = Stack([children]) as the root container. Compose children using Card, Container, SectionBlock, Table, Charts, Form controls, and helper blocks.",
      ].join("\n"),
      inlineMode: true,
      additionalRules,
    },
  });
}

export const openuiSystemPrompt = getOpenuiSystemPrompt({ enable3D: true, enableDrawio: true });
