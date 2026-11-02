import { defineFunction } from "@openuidev/react-lang"
import { z } from "zod/v4"

// Pure functions the model calls as @Name(args) inside an OpenUI Lang program. Bad arguments, a throw or a
// non-finite result make the runtime evaluate the call to null, so a half-streamed program never crashes the panel.
// None of these names collide with OpenUI's built-ins (@Count @Sum @Avg @Min @Max @Round @Filter @Sort @Each @Set ...).

const MAX_ITEMS = 5000
const list = () => z.array(z.any())
const numbers = () => z.array(z.number())

export function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error("result is not a finite number")
  return value
}

/** Equality by value, so a number from a slider matches the same number as text. */
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if ((typeof a === "number" && typeof b === "string") || (typeof a === "string" && typeof b === "number")) return String(a) === String(b)
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && same(left[key], right[key]))
}

// Math
const unary = (name: string, description: string, fn: (value: number) => number) =>
  defineFunction({ name, description, params: z.object({ number: z.number() }), returns: z.number(), fn: ({ number }) => finite(fn(number)) })

export const Sin = unary("Sin", "Sine of an angle in radians", Math.sin)
export const Cos = unary("Cos", "Cosine of an angle in radians", Math.cos)
export const Tan = unary("Tan", "Tangent of an angle in radians", Math.tan)
export const Exp = unary("Exp", "e raised to number", Math.exp)
export const Ln = unary("Ln", "Natural logarithm; null for zero or a negative number", (value) => (value > 0 ? Math.log(value) : NaN))
export const Absolute = unary("Absolute", "Absolute value", Math.abs)
export const Sqrt = unary("Sqrt", "Square root; null for a negative number", (value) => (value >= 0 ? Math.sqrt(value) : NaN))
export const FloorValue = unary("FloorValue", "Largest whole number not above number", Math.floor)
export const Ceiling = unary("Ceiling", "Smallest whole number not below number", Math.ceil)

export const Pow = defineFunction({
  name: "Pow",
  description: "base raised to exponent",
  params: z.object({ base: z.number(), exponent: z.number() }),
  returns: z.number(),
  fn: ({ base, exponent }) => finite(Math.pow(base, exponent)),
})

export const Atan2 = defineFunction({
  name: "Atan2",
  description: "Angle in radians of the point (x, y) from the x axis",
  params: z.object({ y: z.number(), x: z.number() }),
  returns: z.number(),
  fn: ({ y, x }) => finite(Math.atan2(y, x)),
})

export const Clamp = defineFunction({
  name: "Clamp",
  description: "number kept between min and max",
  params: z.object({ number: z.number(), min: z.number(), max: z.number() }),
  returns: z.number(),
  fn: ({ number, min, max }) => Math.min(Math.max(number, Math.min(min, max)), Math.max(min, max)),
})

export const Lerp = defineFunction({
  name: "Lerp",
  description: "The value a fraction t of the way from a to b",
  params: z.object({ a: z.number(), b: z.number(), t: z.number() }),
  returns: z.number(),
  fn: ({ a, b, t }) => finite(a + (b - a) * t),
})

export const Dot = defineFunction({
  name: "Dot",
  description: "Dot product of two number lists of equal length",
  params: z.object({ a: numbers(), b: numbers() }),
  returns: z.number(),
  fn: ({ a, b }) => {
    if (a.length !== b.length) throw new Error("lists differ in length")
    return finite(a.reduce((sum, value, i) => sum + value * b[i]!, 0))
  },
})

export const Norm = defineFunction({
  name: "Norm",
  description: "Euclidean length of a number list",
  params: z.object({ list: numbers() }),
  returns: z.number(),
  fn: ({ list: values }) => finite(Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))),
})

// Lists
export const Range = defineFunction({
  name: "Range",
  description: "Numbers from start up to end (not included) by step (default 1), e.g. @Range(0, 3) is [0, 1, 2]",
  params: z.object({ start: z.number(), end: z.number(), step: z.number().optional() }),
  returns: numbers(),
  fn: ({ start, end, step = 1 }) => {
    if (step === 0 || !Number.isFinite(step)) throw new Error("step must be a non-zero number")
    const count = Math.max(0, Math.ceil((end - start) / step))
    if (count > MAX_ITEMS) throw new Error(`more than ${MAX_ITEMS} items`)
    return Array.from({ length: count }, (_, i) => Number((start + i * step).toPrecision(12)))
  },
})

export const Linspace = defineFunction({
  name: "Linspace",
  description: "count evenly spaced numbers from start to end, both included, e.g. @Linspace(0, 1, 5) is [0, 0.25, 0.5, 0.75, 1]",
  params: z.object({ start: z.number(), end: z.number(), count: z.number() }),
  returns: numbers(),
  fn: ({ start, end, count }) => {
    const n = Math.trunc(count)
    if (n < 2 || n > MAX_ITEMS) throw new Error(`count must be 2 to ${MAX_ITEMS}`)
    return Array.from({ length: n }, (_, i) => start + ((end - start) * i) / (n - 1))
  },
})

export const Append = defineFunction({
  name: "Append",
  description: "Copy of the list with item added at the end",
  params: z.object({ list: list(), item: z.any() }),
  returns: list(),
  fn: ({ list: items, item }) => [...items, item],
})

export const Toggle = defineFunction({
  name: "Toggle",
  description: "Adds item if missing, removes it if present (a set of strings or numbers)",
  params: z.object({ list: list(), item: z.any() }),
  returns: list(),
  fn: ({ list: items, item }) => (items.some((x) => same(x, item)) ? items.filter((x) => !same(x, item)) : [...items, item]),
})

export const Includes = defineFunction({
  name: "Includes",
  description: "True if the list has item, or the text contains it",
  params: z.object({ list: z.union([list(), z.string()]), item: z.any() }),
  returns: z.boolean(),
  fn: ({ list: items, item }) => (typeof items === "string" ? item != null && items.includes(String(item)) : items.some((x) => same(x, item))),
})

export const Take = defineFunction({
  name: "Take",
  description: "The first n items; a negative n takes the last n",
  params: z.object({ list: list(), n: z.number() }),
  returns: list(),
  fn: ({ list: items, n }) => {
    const k = Math.trunc(n)
    return k >= 0 ? items.slice(0, k) : items.slice(k)
  },
})

export const Reverse = defineFunction({
  name: "Reverse",
  description: "Copy in reverse order",
  params: z.object({ list: list() }),
  returns: list(),
  fn: ({ list: items }) => [...items].reverse(),
})

// Text
export const Fixed = defineFunction({
  name: "Fixed",
  description: "number as text with exactly decimals digits (0 to 8), e.g. @Fixed(3.14159, 2) is \"3.14\"",
  params: z.object({ number: z.number(), decimals: z.number() }),
  returns: z.string(),
  fn: ({ number, decimals }) => number.toFixed(Math.min(8, Math.max(0, Math.trunc(decimals)))),
})

export const Join = defineFunction({
  name: "Join",
  description: "List items as one text, separated by separator (default \", \")",
  params: z.object({ list: list(), separator: z.string().optional() }),
  returns: z.string(),
  fn: ({ list: items, separator }) => items.map((item) => (item == null ? "" : String(item))).join(separator ?? ", "),
})

// Machine learning toolkit: small, deterministic, in-browser demonstrations
function mulberry32(seed: number) {
  let a = Math.trunc(seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}


export const functions = [
  Sin, Cos, Tan, Atan2, Exp, Ln, Absolute, Sqrt, Pow, FloorValue, Ceiling, Clamp, Lerp, Dot, Norm,
  Range, Linspace, Append, Toggle, Includes, Take, Reverse,
  Fixed, Join,
]
