import { defineComponent } from "@openuidev/react-lang"
import { Fragment, useState } from "react"
import { z } from "zod/v4"
import { renderLatex } from "../latex"
import { inline, MarkdownBlocks } from "./markdown"
import { children, color, cx, fg, str, webUrl } from "./style"

const HEADING_LEVEL: Record<string, number> = { "3xl": 1, "2xl": 2, xl: 2, lg: 2, md: 3, sm: 4 }

export const TitleProps = z.object({
  text: z.string(),
  size: z.enum(["sm", "md", "lg", "xl", "2xl", "3xl"]).optional(),
  color: color.optional(),
})
export const Title = defineComponent({
  name: "Title",
  props: TitleProps,
  description: "Heading. 2xl for the page title, lg for a section, md for a card title.",
  component: ({ props }) => {
    const sizeName = props.size ?? "md"
    return (
      <div role="heading" aria-level={HEADING_LEVEL[sizeName] ?? 3} className={`olr-title olr-title-${sizeName}`} style={{ color: fg(props.color) }}>
        {inline(str(props.text))}
      </div>
    )
  },
})

/** Text, or a run of strings and inline components such as Badge, Math or Link. */
const richText = z.union([z.string(), children])
const isNode = (value: unknown) => !!value && typeof value === "object" && (value as { type?: unknown }).type === "element"

export const TextProps = z.object({
  text: richText,
  size: z.enum(["xs", "sm", "md", "lg"]).optional(),
  color: color.optional(),
  weight: z.enum(["normal", "medium", "semibold"]).optional(),
  italic: z.boolean().optional(),
  tabularNums: z.boolean().optional(),
})
export const Text = defineComponent({
  name: "Text",
  props: TextProps,
  description:
    'Paragraph; supports **bold**, *italic*, `code`, [links](https://…) and inline math like $x_1$. text may be a list mixing strings and inline components: ["Slope ", Math("m = \\\\frac{y_2-y_1}{x_2-x_1}", true)].',
  component: ({ props, renderNode }) => (
    <p
      className={cx("olr-text", props.size && `olr-text-${props.size}`, props.weight && `olr-weight-${props.weight}`)}
      style={{ color: fg(props.color), fontStyle: props.italic ? "italic" : undefined, fontVariantNumeric: props.tabularNums ? "tabular-nums" : undefined }}
    >
      {Array.isArray(props.text)
        ? (props.text as unknown[]).flat().map((part, i) =>
            isNode(part) ? <span key={i} className="olr-inline">{renderNode(part)}</span> : <Fragment key={i}>{inline(str(part), `t${i}`)}</Fragment>,
          )
        : inline(str(props.text))}
    </p>
  ),
})

export const CaptionProps = z.object({ text: z.string(), color: color.optional() })
export const Caption = defineComponent({
  name: "Caption",
  props: CaptionProps,
  description: "Small secondary text, such as a figure caption or a unit note.",
  component: ({ props }) => (
    <p className="olr-caption" style={{ color: fg(props.color) }}>
      {inline(str(props.text))}
    </p>
  ),
})

export const BadgeProps = z.object({
  text: z.string(),
  color: z.enum(["neutral", "info", "success", "warning", "danger", "purple", "pink"]).optional(),
})
export const Badge = defineComponent({
  name: "Badge",
  props: BadgeProps,
  description: "Small pill tag for a topic, a level or a class label.",
  component: ({ props }) => <span className={`olr-badge olr-badge-${props.color ?? "neutral"}`}>{str(props.text)}</span>,
})

export const LinkProps = z.object({ text: z.string(), url: z.string() })
export const Link = defineComponent({
  name: "Link",
  props: LinkProps,
  description: "Opens an absolute http(s) URL in the browser.",
  component: ({ props }) => {
    const href = webUrl(props.url)
    if (!href) return <span>{str(props.text)}</span>
    return (
      <a className="olr-link" href={href} target="_blank" rel="noopener noreferrer">
        {str(props.text) || new URL(href).hostname}
      </a>
    )
  },
})

type ItemElement = { type: "element"; typeName: string; props: Record<string, unknown> }
const isItem = (value: unknown): value is ItemElement =>
  !!value && typeof value === "object" && (value as ItemElement).type === "element" && (value as ItemElement).typeName === "ListItem"

export const ListItemProps = z.object({
  title: z.string(),
  description: z.string().optional(),
  marker: z.string().optional(),
  children: children.optional(),
})
export const ListItem = defineComponent({
  name: "ListItem",
  props: ListItemProps,
  description: "One list entry: a title, an optional description (Markdown and $math$ allowed) and optional extra blocks. marker replaces the bullet or number.",
  component: ({ props, renderNode }) => (
    <div className="olr-list-body">
      <div className="olr-list-title">{inline(str(props.title))}</div>
      {props.description ? (
        <div className="olr-list-description">
          <MarkdownBlocks text={str(props.description)} />
        </div>
      ) : null}
      {props.children ? <div className="olr-list-children">{renderNode(props.children)}</div> : null}
    </div>
  ),
})

export const ListProps = z.object({
  items: z.array(z.union([z.string(), ListItem.ref])),
  marker: z.enum(["bullet", "number", "none"]).optional(),
  timeline: z.boolean().optional(),
})
export const List = defineComponent({
  name: "List",
  props: ListProps,
  description: "Bulleted or numbered list. number puts each step in a numbered circle; timeline joins the markers with a line.",
  component: ({ props, renderNode }) => {
    const items = (Array.isArray(props.items) ? props.items.flat() : []) as unknown[]
    const marker = props.marker ?? "bullet"
    const Tag = marker === "number" ? "ol" : "ul"
    return (
      <Tag className={cx("olr-list", `olr-list-${marker}`, props.timeline && "olr-timeline")}>
        {items.map((item, i) => {
          if (item == null) return null
          const custom = isItem(item) && typeof item.props.marker === "string" && item.props.marker ? item.props.marker : null
          const rich = isItem(item) && (!!item.props.description || !!item.props.children)
          return (
            <li key={i} className={cx(rich && "olr-list-rich")}>
              <span className={cx("olr-list-marker", marker === "number" && "olr-list-marker-chip")} aria-hidden={!custom && marker !== "number"}>
                {custom ?? (marker === "number" ? i + 1 : null)}
              </span>
              {isItem(item) ? renderNode(item) : <div className="olr-list-body">{inline(str(item))}</div>}
            </li>
          )
        })}
      </Tag>
    )
  },
})

export const MarkdownProps = z.object({ text: z.string() })
export const Markdown = defineComponent({
  name: "Markdown",
  props: MarkdownProps,
  description: "Prose with headings, lists, quotes, code, tables and math ($x^2$ inline, $$ on its own lines for display).",
  component: ({ props }) => (
    <div className="olr-markdown">
      <MarkdownBlocks text={str(props.text)} />
    </div>
  ),
})

export const QuoteProps = z.object({ text: z.string(), cite: z.string().optional() })
export const Quote = defineComponent({
  name: "Quote",
  props: QuoteProps,
  description: "A callout or quotation with a side rule: a key idea, a warning, a definition. cite names the source.",
  component: ({ props }) => (
    <blockquote className="olr-quote">
      <p>{inline(str(props.text))}</p>
      {props.cite ? <cite>{inline(str(props.cite))}</cite> : null}
    </blockquote>
  ),
})

export const CodeProps = z.object({ code: z.string(), language: z.string().optional() })
export const Code = defineComponent({
  name: "Code",
  props: CodeProps,
  description: "Code block with a copy button. Displays code only; nothing in it is executed.",
  component: function CodeView({ props }) {
    const [copied, setCopied] = useState(false)
    const code = str(props.code)
    const copy = () =>
      void navigator.clipboard?.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    return (
      <div className="olr-codeblock">
        <div className="olr-codeblock-head">
          <span>{str(props.language) || "code"}</span>
          <button type="button" onClick={copy} aria-label="Copy code">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    )
  },
})

export const MathBlockProps = z.object({ tex: z.string(), inline: z.boolean().optional() })
export const MathBlock = defineComponent({
  name: "Math",
  props: MathBlockProps,
  description:
    'LaTeX formula typeset with KaTeX, e.g. Math("\\\\int_0^1 x^2\\\\,dx = \\\\frac{1}{3}"). Display style by default; inline true to sit inside a Text list. No dollar signs.',
  component: ({ props }) => {
    const html = renderLatex(str(props.tex), !!props.inline)
    // KaTeX escapes its input and runs with trust: false, so \href, \url, \includegraphics and \htmlData are inert.
    return props.inline ? (
      <span className="olr-math" dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <div className="olr-math is-block" dangerouslySetInnerHTML={{ __html: html }} />
    )
  },
})

export const textComponents = [Title, Text, Caption, Badge, Link, ListItem, List, Markdown, Quote, Code, MathBlock]
