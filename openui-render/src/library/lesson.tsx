import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"
import { inline } from "./markdown"
import { children, str } from "./style"

// The panel root. Deliberately generic: a title plus any mix of the library's blocks (Col, Row, Card, Text,
// Markdown, Math, Chart, Scene3D, List, controls, Quiz, ...), the same "Node[]" children every container in this
// library accepts. A fixed sections/equations/checkpoint shape would only let the model produce prose; this lets it
// compose a real page, matching what the target lessons look like.

export const LessonProps = z.object({
  title: z.string(),
  objective: z.string().optional(),
  children,
})

export const Lesson = defineComponent({
  name: "Lesson",
  props: LessonProps,
  description:
    "The root of every response: a title, an optional one-sentence objective, and the lesson body as a free mix of this library's components (Col, Row, Grid, Card, Title, Text, Markdown, List, Math, Chart, Svg, Scene3D, Slider, SegmentedControl, Checkbox, Button, Quiz, ...). Compose the body the way a real page would be laid out, not as one long Markdown block.",
  component: ({ props, renderNode }) => (
    <article className="olr-lesson">
      <header className="olr-lesson-head">
        <div className="olr-title olr-title-2xl" role="heading" aria-level={1}>
          {inline(str(props.title))}
        </div>
        {props.objective ? <p className="olr-lesson-objective">{inline(str(props.objective))}</p> : null}
      </header>
      <div className="olr-lesson-body olr-flow">{renderNode(props.children)}</div>
    </article>
  ),
})
