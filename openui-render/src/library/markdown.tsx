import { Fragment, type ReactNode } from "react"
import { renderLatex } from "../latex"
import { webUrl } from "./style"

// A small Markdown renderer that builds React elements and never injects model-authored HTML.
// Inline: **bold**, *italic*, ~~strike~~, `code`, [text](https://...), $math$.
// Blocks: paragraphs, # headings, - and 1. lists, > quotes, ``` code, ---, | tables |, $$ display math $$.
// The only dangerouslySetInnerHTML is KaTeX output (trust: false, see latex.ts).

const INLINE =
  /(\$\$[^$\n]+\$\$)|(\$(?=[^\s$])[^$\n]*?[^\s$]\$(?!\d)|\$[^\s$]\$(?!\d))|(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(~~[^~\n]+?~~)|(\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_)|(\[[^\]\n]+\]\([^)\s]+\))/

export function InlineMath({ tex, display = false }: { tex: string; display?: boolean }) {
  return display ? (
    <div className="olr-math is-block" dangerouslySetInnerHTML={{ __html: renderLatex(tex, false) }} />
  ) : (
    <span className="olr-math" dangerouslySetInnerHTML={{ __html: renderLatex(tex, true) }} />
  )
}

export function inline(text: string, key = "i"): ReactNode {
  const out: ReactNode[] = []
  let rest = text
  let n = 0
  while (rest) {
    const m = INLINE.exec(rest)
    if (!m) {
      out.push(rest)
      break
    }
    if (m.index) out.push(rest.slice(0, m.index))
    const token = m[0]
    const k = `${key}-${n++}`
    if (m[1]) out.push(<InlineMath key={k} tex={token.slice(2, -2)} />)
    else if (m[2]) out.push(<InlineMath key={k} tex={token.slice(1, -1)} />)
    else if (m[3]) out.push(<code key={k} className="olr-code">{token.slice(1, -1)}</code>)
    else if (m[4]) out.push(<strong key={k}>{inline(token.slice(2, -2), k)}</strong>)
    else if (m[5]) out.push(<s key={k}>{inline(token.slice(2, -2), k)}</s>)
    else if (m[6]) out.push(<em key={k}>{inline(token.slice(1, -1), k)}</em>)
    else {
      const close = token.indexOf("](")
      const label = token.slice(1, close)
      const href = webUrl(token.slice(close + 2, -1))
      out.push(
        href ? (
          <a key={k} className="olr-link" href={href} target="_blank" rel="noopener noreferrer">
            {inline(label, k)}
          </a>
        ) : (
          <Fragment key={k}>{inline(label, k)}</Fragment>
        ),
      )
    }
    rest = rest.slice(m.index + token.length)
  }
  return out.length === 1 ? out[0] : out
}

type Block =
  | { kind: "p" | "quote"; text: string }
  | { kind: "h"; level: number; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "math"; text: string }
  | { kind: "hr" }
  | { kind: "table"; head: string[]; rows: string[][] }

const LIST_ITEM = /^\s{0,3}([-*+]|(\d+)[.)])\s+(.*)$/
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
const BLOCK_START = /^(#{1,4})\s|^\s*```|^\s*>|^\s*\$\$/

export function blocks(source: string): Block[] {
  const lines = source.replace(/\\r\\n?/g, "\\n").split("\\n")
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (/^\s*```/.test(line)) {
      const body: string[] = []
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) body.push(lines[i])
      out.push({ kind: "code", text: body.join("\n") })
      i++
      continue
    }
    const display = /^\s*\$\$(.*)$/.exec(line)
    if (display) {
      const first = display[1] ?? ""
      const single = /^(.*)\$\$\s*$/.exec(first)
      if (single) {
        out.push({ kind: "math", text: (single[1] ?? "").trim() })
        i++
        continue
      }
      const body: string[] = first.trim() ? [first] : []
      for (i++; i < lines.length && !/\$\$\s*$/.test(lines[i] ?? ""); i++) body.push(lines[i] ?? "")
      if (i < lines.length) body.push((lines[i] ?? "").replace(/\$\$\s*$/, ""))
      out.push({ kind: "math", text: body.join("\n").trim() })
      i++
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      out.push({ kind: "h", level: heading[1]!.length, text: heading[2]! })
      i++
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push({ kind: "hr" })
      i++
      continue
    }
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1]!)) {
      const head = cells(line)
      const rows: string[][] = []
      for (i += 2; i < lines.length && lines[i]!.includes("|") && lines[i]!.trim(); i++) rows.push(cells(lines[i]!))
      out.push({ kind: "table", head, rows })
      continue
    }
    if (/^\s*>/.test(line)) {
      const body: string[] = []
      for (; i < lines.length && /^\s*>/.test(lines[i]!); i++) body.push(lines[i]!.replace(/^\s*>\s?/, ""))
      out.push({ kind: "quote", text: body.join(" ") })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      const ordered = !!item[2]
      const items: string[] = []
      for (; i < lines.length; i++) {
        const next = LIST_ITEM.exec(lines[i]!)
        if (next && !!next[2] === ordered) items.push(next[3]!)
        else if (lines[i]!.trim() && /^\s{2,}/.test(lines[i]!) && items.length) items[items.length - 1] += ` ${lines[i]!.trim()}`
        else break
      }
      out.push({ kind: "list", ordered, start: ordered ? Number(item[2]) : 1, items })
      continue
    }
    const body: string[] = []
    for (; i < lines.length && lines[i]!.trim() && !LIST_ITEM.test(lines[i]!) && !BLOCK_START.test(lines[i]!); i++) body.push(lines[i]!.trim())
    // A line that is not consumed by any rule above must still advance, or the loop would never end.
    if (!body.length) body.push(lines[i++]!.trim())
    out.push({ kind: "p", text: body.join(" ") })
  }
  return out
}

export function MarkdownBlocks({ text }: { text: string }) {
  return (
    <>
      {blocks(text).map((b, i) => {
        const k = `b${i}`
        switch (b.kind) {
          case "p":
            return <p key={k}>{inline(b.text, k)}</p>
          case "quote":
            return <blockquote key={k}>{inline(b.text, k)}</blockquote>
          case "h":
            return (
              <div key={k} role="heading" aria-level={b.level + 1} className={`olr-md-h olr-md-h${b.level}`}>
                {inline(b.text, k)}
              </div>
            )
          case "code":
            return (
              <pre key={k} className="olr-code-block">
                <code>{b.text}</code>
              </pre>
            )
          case "math":
            return <InlineMath key={k} tex={b.text} display />
          case "hr":
            return <hr key={k} className="olr-divider" />
          case "list": {
            const items = b.items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)
            return b.ordered ? (
              <ol key={k} start={b.start}>
                {items}
              </ol>
            ) : (
              <ul key={k}>{items}</ul>
            )
          }
          case "table":
            return (
              <div key={k} className="olr-table-scroll">
                <table className="olr-table">
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j}>{inline(h, `${k}-h${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, m) => <td key={m}>{inline(c, `${k}-${j}-${m}`)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}
