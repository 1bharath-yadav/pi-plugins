// Framework-agnostic on purpose: this file is imported both by the React component library and by the
// lang-core prompt mirror (prompt-library.ts), which must not pull React into the server-side plugin.
import { tagSchemaId } from "@openuidev/lang-core"
import type { CSSProperties } from "react"
import { z } from "zod/v4"

// Model output is untrusted. Every value that reaches a style or an attribute passes through this file:
// colors and lengths are matched against allow-lists, and URLs must be absolute http(s).

/** An absolute http(s) URL, or null. Relative, javascript:, data: and file: URLs are all refused. */
export function webUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
  } catch {
    return null
  }
}

// Shared prop schemas. tagSchemaId only changes how the prompt prints a type (`Node[]`, `Color`, `Length`).
const node = z.any()
tagSchemaId(node, "Node")
/** Children slot: any component, or a list of them (for example from @Each). */
export const children = z.array(node)

export const color = z.string()
tagSchemaId(color, "Color")

export const length = z.union([z.number(), z.string()])
tagSchemaId(length, "Length")

export const radiusSchema = z.union([z.enum(["sm", "md", "lg", "xl", "full"]), z.number()])
tagSchemaId(radiusSchema, "Radius")

const STATUS = ["info", "success", "warning", "danger", "purple", "pink"] as const
const TOKENS: Record<string, string> = {
  ink: "var(--ol-ink)",
  muted: "var(--ol-muted)",
  faint: "var(--ol-faint)",
  surface: "var(--ol-surface)",
  ...Object.fromEntries(STATUS.map((name) => [name, `var(--ol-${name})`])),
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`chart${i + 1}`, `var(--ol-chart-${i + 1})`])),
}
const SOFT: Record<string, string> = {
  ...TOKENS,
  surface: "var(--ol-surface)",
  "surface-strong": "var(--ol-surface-strong)",
  ...Object.fromEntries(STATUS.map((name) => [name, `var(--ol-${name}-soft)`])),
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNC = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.]+(?:%|deg)?(?:\s*[,\s/]\s*[\d.]+%?){2,3}\s*\)$/i
const NAMED = /^[a-z]{3,20}$/i

/** A hex, rgb()/hsl() or plain named color. Anything that could carry a url(), var() or a second declaration is dropped. */
export function cssColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value.trim()
  return HEX.test(text) || FUNC.test(text) || NAMED.test(text) ? text : undefined
}

/** Text, icon and stroke colors: a token or a safe CSS color. */
export const fg = (value: unknown) => (typeof value === "string" ? (TOKENS[value] ?? cssColor(value)) : undefined)
/** Backgrounds: status tokens become their soft tints. */
export const bg = (value: unknown) => (typeof value === "string" ? (SOFT[value] ?? cssColor(value)) : undefined)

/** Spacing in 4px steps, clamped so a wild number cannot break the layout. */
export const space = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? `${Math.min(24, Math.max(0, value)) * 4}px` : undefined

/** A px number or a restricted CSS length. */
export function size(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.max(0, value)}px`
  if (typeof value !== "string") return undefined
  const text = value.trim()
  if (/^\d+(\.\d+)?$/.test(text)) return `${text}px`
  return /^\d+(\.\d+)?(px|%|em|rem|vh|vw|fr)$|^auto$/.test(text) ? text : undefined
}

const RADIUS: Record<string, string> = {
  sm: "var(--ol-radius-sm)",
  md: "var(--ol-radius-md)",
  lg: "var(--ol-radius-lg)",
  xl: "var(--ol-radius-xl)",
  full: "999px",
}
export const radius = (value: unknown) => (typeof value === "string" ? RADIUS[value] : size(value))

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ") || undefined

export const str = (value: unknown) => (value == null ? "" : String(value))

/** A finite number, or the fallback. Model-written numbers can be null, NaN or strings while a program streams. */
export function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

export type Style = CSSProperties
