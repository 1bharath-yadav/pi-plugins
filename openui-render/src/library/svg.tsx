import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"
import { children, color, fg, length, size } from "./style"

// Every attribute is validated here: numbers are finite, point lists and paths match strict patterns, transforms are
// rebuilt from a function allow-list. Nothing can load a resource, reference a URL or run code.
const n = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined)
const opacity = (value: unknown) => (n(value) === undefined ? undefined : Math.min(1, Math.max(0, value as number)))
const POINTS = /^[\d\s,.eE+-]*$/
const PATH = /^[MmLlHhVvCcSsQqTtAaZz\d\s,.eE+-]*$/
// Each transform function with a valid argument count, so a value built from state that is not set yet
// (like "rotate( 90 80)") is dropped instead of being sent to the DOM.
const TRANSFORM_ARGS: Record<string, number[]> = { translate: [1, 2], rotate: [1, 3], scale: [1, 2], skewX: [1], skewY: [1], matrix: [6] }
function transform(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 500) return undefined
  const parts = [...value.matchAll(/\s*([a-zA-Z]+)\(([^()]*)\)\s*/g)]
  if (!parts.length || parts.map((p) => p[0]).join("") !== value) return undefined
  const valid = parts.every(([, name, args]) => {
    const numbers = (args ?? "").trim().split(/\s*,\s*|\s+/).filter(Boolean)
    return (TRANSFORM_ARGS[name ?? ""]?.includes(numbers.length) ?? false) && numbers.every((v) => Number.isFinite(Number(v)))
  })
  return valid ? value.trim() : undefined
}
const ok = (value: unknown, pattern: RegExp) => (typeof value === "string" && value.length < 20000 && pattern.test(value) ? value : undefined)

const paint = { fill: color.optional(), stroke: color.optional(), strokeWidth: z.number().optional(), opacity: z.number().optional() }
type Paint = { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number; dash?: string }

/** Filled shapes default to the text color; with only a stroke they stay unfilled. */
const paintAttrs = (p: Paint, filled: boolean) => ({
  fill: p.fill !== undefined ? (fg(p.fill) ?? "none") : filled && p.stroke === undefined ? "currentColor" : "none",
  stroke: p.stroke !== undefined ? fg(p.stroke) : filled ? undefined : "currentColor",
  strokeWidth: n(p.strokeWidth) ?? (filled ? undefined : 2),
  opacity: opacity(p.opacity),
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
})

export const SvgProps = z.object({ children, viewBox: z.string(), width: length.optional(), height: length.optional() })
export const Svg = defineComponent({
  name: "Svg",
  props: SvgProps,
  description: "A drawing for diagrams, geometry, free-body figures, graphs and mechanisms. Scales to its width; shape arguments accept expressions, so $variables can move them.",
  component: ({ props, renderNode }) => {
    const viewBox = ok(props.viewBox, /^\s*[-\d.]+(\s*[\s,]\s*[-\d.]+){3}\s*$/) ?? "0 0 100 100"
    const natural = Number(viewBox.trim().split(/[\s,]+/)[2])
    const maxWidth = props.width == null && natural > 0 ? `${Math.max(280, natural * 1.5)}px` : undefined
    return (
      <svg className="olr-svg" viewBox={viewBox} style={{ width: size(props.width) ?? "100%", maxWidth, height: size(props.height) }} role="img" preserveAspectRatio="xMidYMid meet">
        {renderNode(props.children)}
      </svg>
    )
  },
})

export const CircleProps = z.object({ cx: z.number(), cy: z.number(), r: z.number(), ...paint })
export const Circle = defineComponent({
  name: "Circle",
  props: CircleProps,
  description: "",
  component: ({ props }) => <circle cx={n(props.cx)} cy={n(props.cy)} r={Math.max(0, n(props.r) ?? 0)} {...paintAttrs(props, true)} />,
})

export const EllipseProps = z.object({ cx: z.number(), cy: z.number(), rx: z.number(), ry: z.number(), ...paint })
export const Ellipse = defineComponent({
  name: "Ellipse",
  props: EllipseProps,
  description: "",
  component: ({ props }) => <ellipse cx={n(props.cx)} cy={n(props.cy)} rx={Math.max(0, n(props.rx) ?? 0)} ry={Math.max(0, n(props.ry) ?? 0)} {...paintAttrs(props, true)} />,
})

export const RectProps = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number(), ...paint, rx: z.number().optional() })
export const Rect = defineComponent({
  name: "Rect",
  props: RectProps,
  description: "",
  component: ({ props }) => (
    <rect x={n(props.x)} y={n(props.y)} width={Math.max(0, n(props.width) ?? 0)} height={Math.max(0, n(props.height) ?? 0)} rx={n(props.rx)} {...paintAttrs(props, true)} />
  ),
})

export const LineProps = z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), stroke: color.optional(), strokeWidth: z.number().optional(), opacity: z.number().optional(), dashed: z.boolean().optional() })
export const Line = defineComponent({
  name: "Line",
  props: LineProps,
  description: "dashed draws a dashed line.",
  component: ({ props }) => (
    <line x1={n(props.x1)} y1={n(props.y1)} x2={n(props.x2)} y2={n(props.y2)} strokeDasharray={props.dashed ? "5 4" : undefined} {...paintAttrs(props, false)} />
  ),
})

export const PathProps = z.object({ d: z.string(), ...paint })
export const Path = defineComponent({
  name: "Path",
  props: PathProps,
  description: "d uses M L H V C S Q T A Z commands with numbers only.",
  component: ({ props }) => <path d={ok(props.d, PATH)} {...paintAttrs(props, props.fill !== undefined)} />,
})

export const PolylineProps = z.object({ points: z.string(), stroke: color.optional(), strokeWidth: z.number().optional(), fill: color.optional(), opacity: z.number().optional() })
export const Polyline = defineComponent({
  name: "Polyline",
  props: PolylineProps,
  description: 'points like "0,0 10,5 20,0". Build a curve from data with @Join(@Each(xs, "x", x + "," + f), " ").',
  component: ({ props }) => <polyline points={ok(props.points, POINTS)} {...paintAttrs(props, false)} />,
})

export const PolygonProps = z.object({ points: z.string(), ...paint })
export const Polygon = defineComponent({
  name: "Polygon",
  props: PolygonProps,
  description: "",
  component: ({ props }) => <polygon points={ok(props.points, POINTS)} {...paintAttrs(props, true)} />,
})

export const GProps = z.object({ children, transform: z.string().optional(), opacity: z.number().optional() })
export const G = defineComponent({
  name: "G",
  props: GProps,
  description: 'Group; transform like "rotate(30 50 50)" or "translate(10 0)".',
  component: ({ props, renderNode }) => (
    <g transform={transform(props.transform)} opacity={opacity(props.opacity)}>
      {renderNode(props.children)}
    </g>
  ),
})

export const SvgTextProps = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  size: z.number().optional(),
  fill: color.optional(),
  anchor: z.enum(["start", "middle", "end"]).optional(),
  weight: z.enum(["normal", "medium", "semibold"]).optional(),
})
export const SvgText = defineComponent({
  name: "SvgText",
  props: SvgTextProps,
  description: "A label inside an Svg. Plain text only.",
  component: ({ props }) => (
    <text
      x={n(props.x)}
      y={n(props.y)}
      fontSize={n(props.size) ?? 12}
      fill={fg(props.fill) ?? "currentColor"}
      textAnchor={props.anchor ?? "start"}
      fontWeight={props.weight === "semibold" ? 640 : props.weight === "medium" ? 560 : 440}
      fontFamily="var(--ol-font)"
    >
      {String(props.text ?? "")}
    </text>
  ),
})

export const svgComponents = [Svg, Circle, Ellipse, Rect, Line, Path, Polyline, Polygon, G, SvgText]
