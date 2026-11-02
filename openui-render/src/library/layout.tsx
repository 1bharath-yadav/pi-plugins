import { defineComponent } from "@openuidev/react-lang"
import type { CSSProperties } from "react"
import { z } from "zod/v4"
import { children, cx, space } from "./style"

const align = z.enum(["start", "center", "end", "stretch"])
const justify = z.enum(["start", "center", "end", "between"])
const FLEX: Record<string, string> = { start: "flex-start", end: "flex-end", center: "center", stretch: "stretch", between: "space-between" }

type FlexProps = { gap?: number; align?: string; justify?: string; wrap?: boolean }
const flexStyle = (p: FlexProps, column = false): CSSProperties => ({
  gap: space(p.gap),
  alignItems: p.align ? FLEX[p.align] : undefined,
  justifyContent: p.justify ? FLEX[p.justify] : undefined,
  flexWrap: p.wrap ? "wrap" : undefined,
  textAlign: column && (p.align === "center" || p.align === "end") ? p.align : undefined,
})

export const ColProps = z.object({
  children,
  gap: z.number().optional(),
  align: align.optional(),
  justify: justify.optional(),
})
export const Col = defineComponent({
  name: "Col",
  props: ColProps,
  description: "Vertical layout; items stack in order.",
  component: ({ props, renderNode }) => (
    <div className="olr-col" style={flexStyle(props, true)}>
      {renderNode(props.children)}
    </div>
  ),
})

export const RowProps = z.object({
  children,
  gap: z.number().optional(),
  align: align.optional(),
  justify: justify.optional(),
  wrap: z.boolean().optional(),
})
export const Row = defineComponent({
  name: "Row",
  props: RowProps,
  description: "Horizontal layout; items are vertically centered. Use wrap for chips and controls so a narrow panel never overflows.",
  component: ({ props, renderNode }) => (
    <div className="olr-row" style={flexStyle(props)}>
      {renderNode(props.children)}
    </div>
  ),
})

export const GridProps = z.object({
  children,
  columns: z.number().optional(),
  minChildWidth: z.number().optional(),
  gap: z.number().optional(),
})
export const Grid = defineComponent({
  name: "Grid",
  props: GridProps,
  description: "Equal columns (default 2). With minChildWidth (px) the columns drop on a narrow panel.",
  component: ({ props, renderNode }) => {
    const columns = Math.min(6, Math.max(1, Math.round(props.columns ?? 2)))
    const gap = space(props.gap) ?? "12px"
    const min = props.minChildWidth
      ? `max(${Math.min(600, Math.max(0, props.minChildWidth))}px, calc((100% - ${columns - 1} * ${gap}) / ${columns}))`
      : null
    return (
      <div
        className="olr-grid"
        style={{
          gap,
          gridTemplateColumns: min
            ? `repeat(auto-fill, minmax(min(100%, ${min}), 1fr))`
            : `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {renderNode(props.children)}
      </div>
    )
  },
})

export const CardProps = z.object({
  children,
  variant: z.string().optional(),
  padding: z.number().optional(),
  gap: z.number().optional(),
})
export const Card = defineComponent({
  name: "Card",
  props: CardProps,
  description: "Panel with a border; soft is a filled panel for summaries and callouts.",
  component: ({ props, renderNode }) => (
    <section
      className={cx("olr-card", props.variant === "soft" && "olr-card-soft", props.gap == null && "olr-flow")}
      style={{ padding: space(props.padding), gap: space(props.gap) }}
    >
      {renderNode(props.children)}
    </section>
  ),
})

export const DividerProps = z.object({})
export const Divider = defineComponent({
  name: "Divider",
  props: DividerProps,
  description: "Thin horizontal line separating sections.",
  component: () => <hr className="olr-divider" />,
})

export const SpacerProps = z.object({})
export const Spacer = defineComponent({
  name: "Spacer",
  props: SpacerProps,
  description: "Fills the free space in a Row.",
  component: () => <div className="olr-spacer" aria-hidden />,
})

export const layoutComponents = [Col, Row, Grid, Card, Divider, Spacer]
