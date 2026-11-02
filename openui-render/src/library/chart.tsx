import { defineComponent } from "@openuidev/react-lang"
import { z } from "zod/v4"
import { fg, num, str } from "./style"

const W = 640
const M = { top: 14, right: 18, bottom: 40, left: 52 }

/** Round tick values covering [min, max], about `count` of them. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    const pad = Math.abs(min) || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / Math.max(1, count)
  const power = Math.pow(10, Math.floor(Math.log10(raw)))
  const fraction = raw / power
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9 && out.length < 50; v += step) out.push(Number(v.toPrecision(12)))
  return out.length >= 2 ? out : [min, max]
}

const tickText = (v: number) => (Math.abs(v) >= 10000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(0) : String(Number(v.toPrecision(4))))
const SERIES = ["var(--ol-chart-1)", "var(--ol-chart-2)", "var(--ol-chart-3)", "var(--ol-chart-4)", "var(--ol-chart-5)", "var(--ol-chart-6)"]

type Row = Record<string, unknown>

export const ChartProps = z.object({
  kind: z.enum(["line", "area", "bar", "scatter"]),
  data: z.array(z.any()),
  x: z.string(),
  y: z.array(z.string()),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  height: z.number().optional(),
})
export const Chart = defineComponent({
  name: "Chart",
  props: ChartProps,
  description:
    'Chart of rows: data is a list of objects, x the key of the horizontal value, y the keys of one or more series. line, area and scatter need numeric x; bar treats x as category labels. Example: Chart("line", @Each(@Linspace(0, 6.3, 80), "t", {t: t, v: @Sin(t)}), "t", ["v"], "t (rad)", "sin t").',
  component: ({ props }) => {
    const rows = (Array.isArray(props.data) ? props.data.flat() : []).filter((r): r is Row => !!r && typeof r === "object")
    const keys = (Array.isArray(props.y) ? props.y : []).map(str).filter(Boolean)
    const H = Math.min(520, Math.max(160, num(props.height, 300)))
    if (!rows.length || !keys.length) return <div className="olr-chart-empty">No data to plot</div>

    const bar = props.kind === "bar"
    const labels = rows.map((r) => str(r[props.x]))
    const xs = bar ? rows.map((_, i) => i) : rows.map((r) => num(r[props.x], NaN))
    const finiteX = xs.filter(Number.isFinite)
    const values = rows.flatMap((r) => keys.map((k) => num(r[k], NaN))).filter(Number.isFinite)
    if (!finiteX.length || !values.length) return <div className="olr-chart-empty">No numeric data to plot</div>

    let x0 = Math.min(...finiteX)
    let x1 = Math.max(...finiteX)
    if (bar) {
      x0 = -0.5
      x1 = rows.length - 0.5
    } else if (x0 === x1) {
      x0 -= 1
      x1 += 1
    }
    const base = bar || props.kind === "area" ? 0 : Infinity
    const yTicks = niceTicks(Math.min(base, ...values), Math.max(bar || props.kind === "area" ? 0 : -Infinity, ...values))
    const y0 = yTicks[0]!
    const y1 = yTicks[yTicks.length - 1]!
    const xTicks = bar ? [] : niceTicks(x0, x1, 6)
    const sx = (v: number) => M.left + ((v - x0) / (x1 - x0 || 1)) * (W - M.left - M.right)
    const sy = (v: number) => H - M.bottom - ((v - y0) / (y1 - y0 || 1)) * (H - M.top - M.bottom)
    const axisY = sy(Math.max(y0, Math.min(0, y1)))
    const step = bar ? (W - M.left - M.right) / rows.length : 0
    const labelEvery = Math.max(1, Math.ceil(rows.length / 10))

    return (
      <figure className="olr-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${props.kind} chart of ${keys.join(", ")}`} preserveAspectRatio="xMidYMid meet">
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} className="olr-chart-grid" />
              <text x={M.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="olr-chart-tick">{tickText(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={sx(t)} y={H - M.bottom + 16} textAnchor="middle" className="olr-chart-tick">{tickText(t)}</text>
          ))}
          {bar && labels.map((label, i) => (i % labelEvery === 0 ? <text key={`l${i}`} x={sx(i)} y={H - M.bottom + 16} textAnchor="middle" className="olr-chart-tick">{label.slice(0, 14)}</text> : null))}
          <line x1={M.left} x2={W - M.right} y1={axisY} y2={axisY} className="olr-chart-axis" />
          <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} className="olr-chart-axis" />
          {keys.map((key, s) => {
            const stroke = fg(`chart${(s % 6) + 1}`) ?? SERIES[s % 6]!
            const points = rows
              .map((r, i) => ({ px: sx(xs[i]!), py: sy(num(r[key], NaN)), v: num(r[key], NaN), i }))
              .filter((p) => Number.isFinite(p.px) && Number.isFinite(p.py))
            if (props.kind === "scatter") {
              return <g key={key}>{points.map((p) => <circle key={p.i} cx={p.px} cy={p.py} r={4} fill={stroke} fillOpacity={0.85}><title>{`${labels[p.i]}, ${p.v}`}</title></circle>)}</g>
            }
            if (bar) {
              const width = Math.max(2, (step * 0.7) / keys.length)
              return (
                <g key={key}>
                  {points.map((p) => {
                    const left = p.px - (step * 0.7) / 2 + s * width
                    return <rect key={p.i} x={left} y={Math.min(p.py, axisY)} width={width} height={Math.abs(axisY - p.py)} rx={2} fill={stroke}><title>{`${labels[p.i]}: ${p.v}`}</title></rect>
                  })}
                </g>
              )
            }
            const path = points.map((p, k) => `${k ? "L" : "M"}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(" ")
            return (
              <g key={key}>
                {props.kind === "area" && points.length > 1 && <path d={`${path} L${points.at(-1)!.px.toFixed(1)} ${axisY} L${points[0]!.px.toFixed(1)} ${axisY} Z`} fill={stroke} fillOpacity={0.16} stroke="none" />}
                <path d={path} fill="none" stroke={stroke} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            )
          })}
          {props.xLabel && <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" className="olr-chart-label">{props.xLabel}</text>}
          {props.yLabel && <text x={12} y={(M.top + H - M.bottom) / 2} transform={`rotate(-90 12 ${(M.top + H - M.bottom) / 2})`} textAnchor="middle" className="olr-chart-label">{props.yLabel}</text>}
        </svg>
        {keys.length > 1 && (
          <figcaption className="olr-chart-legend">
            {keys.map((key, s) => (
              <span key={key}><i style={{ background: SERIES[s % 6] }} />{key}</span>
            ))}
          </figcaption>
        )}
      </figure>
    )
  },
})

export const chartComponents = [Chart]
