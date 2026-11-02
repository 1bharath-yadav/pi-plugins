import katex from "katex"

// OpenUI Lang strings use backslash escapes, so a model that writes "\frac" or "\theta" with a single backslash gets a
// form feed or a tab instead of a TeX command. The prompt asks for doubled backslashes; this repairs the common slips.
// Form feed, tab, carriage return and backspace are never meaningful inside a formula. A newline is: it only becomes a
// command when a known \n-command follows it.
const NEWLINE_COMMANDS =
  "abla|eq|e|eg|u|ot|otin|i|mid|ewline|olimits|leq|geq|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|leftrightarrow|earrow|warrow|parallel|subset|supset|sim|cong|approx|prec|succ|vdash"
const NEWLINE_COMMAND = new RegExp(`\\n(?=(?:${NEWLINE_COMMANDS})(?![A-Za-z]))`, "g")

export function repairTex(expression: string): string {
  return expression
    .replace(/\f/g, "\\f")
    .replace(/\t/g, "\\t")
    .replace(/\r(?!\n)/g, "\\r")
    .replace(/\x08/g, "\\b")
    .replace(/\x0b/g, "\\v")
    .replace(NEWLINE_COMMAND, "\\n")
}

export function renderLatex(expression: string, inline = false): string {
  // Matches Open Intelligent UI's Math component. Model-authored HTML and URLs are not trusted.
  return katex.renderToString(repairTex(expression), {
    displayMode: !inline,
    throwOnError: false,
    trust: false,
    strict: "ignore",
    output: "htmlAndMathml",
    maxSize: 12,
    maxExpand: 1000,
  })
}
