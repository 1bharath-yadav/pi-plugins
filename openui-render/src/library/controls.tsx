import {
  action,
  defineComponent,
  reactive,
  useFormName,
  useIsStreaming,
  useStateField,
  useTriggerAction,
} from "@openuidev/react-lang"
import { useId, useState } from "react"
import { z } from "zod/v4"
import { inline, MarkdownBlocks } from "./markdown"
import { cx, num, str } from "./style"

type Plan = Parameters<ReturnType<typeof useTriggerAction>>[2]

/**
 * Runs an action prop (@Set, @Reset, ...). A Button without an action does nothing: unlike a chat app, this panel has no
 * assistant turn to send a label to, so every control must change something shown on the page.
 */
function useRunAction() {
  const trigger = useTriggerAction()
  const formName = useFormName()
  return (message: string, plan: unknown) => {
    if (plan) void trigger(message, formName, plan as Plan)
  }
}

/** The state key of a control: its label, its statement name, or a generated id. */
function useFieldName(label: unknown, statementId?: string) {
  const id = useId()
  return (typeof label === "string" && label) || statementId || id
}

const numberText = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 3 })

export const ButtonProps = z.object({
  label: z.string(),
  action: action().optional(),
  variant: z.enum(["solid", "outline", "soft", "ghost"]).optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  disabled: z.boolean().optional(),
})
export const Button = defineComponent({
  name: "Button",
  props: ButtonProps,
  description: "Runs its action when pressed, such as @Set($epochs, $epochs + 100). Every Button needs an action.",
  component: ({ props }) => {
    const run = useRunAction()
    const streaming = useIsStreaming()
    return (
      <button
        type="button"
        className={cx("olr-button", `olr-button-${props.variant ?? "solid"}`, `olr-button-${props.size ?? "md"}`)}
        disabled={!!props.disabled || streaming}
        onClick={() => run(str(props.label), props.action)}
      >
        {str(props.label)}
      </button>
    )
  },
})

export const SliderProps = z.object({
  value: reactive(z.number()),
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
})
export const Slider = defineComponent({
  name: "Slider",
  props: SliderProps,
  description: "Slider bound to a $variable, e.g. Slider($c, 0.1, 100, 0.1, \"C\"). Shows label and value; everything computed from the variable updates live.",
  component: function SliderView({ props, statementId }) {
    const field = useStateField(useFieldName(props.label, statementId), props.value)
    const min = Number.isFinite(props.min) ? props.min : 0
    const max = Number.isFinite(props.max) && props.max > min ? props.max : min + 100
    const step = props.step && props.step > 0 ? props.step : (max - min) / 100
    const value = Math.min(max, Math.max(min, num(field.value, min)))
    const unit = props.unit ?? ""
    const readout = /^[$€£¥₹]/.test(unit) ? `${unit}${numberText(value)}` : `${numberText(value)}${unit}`
    const id = useId()
    return (
      <div className="olr-slider">
        {(props.label || props.unit) && (
          <div className="olr-slider-head">
            <label htmlFor={id}>{props.label}</label>
            <output htmlFor={id}>{readout}</output>
          </div>
        )}
        <input
          id={id}
          className="olr-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={props.label ? undefined : "Value"}
          aria-valuetext={readout}
          onChange={(event) => field.setValue(Number(event.target.value))}
        />
      </div>
    )
  },
})

const option = z.union([z.string(), z.object({ value: z.string(), label: z.string() })])
type Option = z.infer<typeof option>
const optionList = (value: unknown) =>
  (Array.isArray(value) ? (value.flat() as Option[]) : []).filter((o) => o != null).map((o) => (typeof o === "string" ? { value: o, label: o } : o))

export const SegmentedControlProps = z.object({ value: reactive(z.string()), options: z.array(option) })
export const SegmentedControl = defineComponent({
  name: "SegmentedControl",
  props: SegmentedControlProps,
  description: "2 to 4 short mutually exclusive choices in a row, bound to a $variable.",
  component: function SegmentedView({ props, statementId }) {
    const field = useStateField(useFieldName(undefined, statementId), props.value)
    const value = field.value == null ? "" : String(field.value)
    return (
      <div className="olr-segmented" role="radiogroup">
        {optionList(props.options).map((o, i) => (
          <button key={`${o.value}-${i}`} type="button" role="radio" aria-checked={o.value === value} className={cx(o.value === value && "is-selected")} onClick={() => field.setValue(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    )
  },
})

export const CheckboxProps = z.object({ checked: reactive(z.boolean()), label: z.string() })
export const Checkbox = defineComponent({
  name: "Checkbox",
  props: CheckboxProps,
  description: "A labelled checkbox bound to a $variable, e.g. to show or hide a margin, a layer or a hint.",
  component: ({ props, statementId }) => {
    const field = useStateField(useFieldName(props.label, statementId), props.checked)
    return (
      <label className="olr-check">
        <input type="checkbox" checked={field.value === true} onChange={(event) => field.setValue(event.target.checked)} />
        <span>{inline(str(props.label))}</span>
      </label>
    )
  },
})

export const QuizProps = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2).max(5),
  answerIndex: z.number().int().min(0),
  explanation: z.string(),
})
export const Quiz = defineComponent({
  name: "Quiz",
  props: QuizProps,
  description: "One multiple-choice check of understanding with instant feedback. answerIndex is the zero-based index of the correct option.",
  component: function QuizView({ props }) {
    const [selected, setSelected] = useState<number>()
    const options = (Array.isArray(props.options) ? props.options : []).map(str)
    const valid = Number.isInteger(props.answerIndex) && props.answerIndex >= 0 && props.answerIndex < options.length
    const correct = valid && selected === props.answerIndex
    return (
      <section className="olr-card olr-quiz">
        <div className="olr-title olr-title-sm" role="heading" aria-level={4}>
          Check your understanding
        </div>
        <div className="olr-markdown">
          <MarkdownBlocks text={str(props.question)} />
        </div>
        <div className="olr-quiz-options" role="radiogroup">
          {options.map((text, index) => (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={selected === index}
              disabled={selected !== undefined}
              className={cx("olr-quiz-option", selected === index && (correct ? "is-correct" : "is-wrong"), selected !== undefined && valid && index === props.answerIndex && "is-answer")}
              onClick={() => setSelected(index)}
            >
              {inline(text)}
            </button>
          ))}
        </div>
        {selected !== undefined && (
          <div role="status" className="olr-quiz-result">
            <strong>{!valid ? "No answer key." : correct ? "Correct." : "Not quite."}</strong> {inline(str(props.explanation))}
          </div>
        )}
      </section>
    )
  },
})

export const controlComponents = [Button, Slider, SegmentedControl, Checkbox, Quiz]
