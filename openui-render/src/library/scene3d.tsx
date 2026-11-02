import { defineComponent } from "@openuidev/react-lang"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { z } from "zod/v4"
import { fg, num } from "./style"

// A safe, fully declarative 3D point and vector viewer: pure trigonometry and SVG, no iframe or model-written JavaScript.

const W = 420
const H_DEFAULT = 360
const toRad = (deg: number) => (deg * Math.PI) / 180

interface Vec3 {
  x: number
  y: number
  z: number
}

/** Rotate by azimuth around the vertical (y) axis, then by elevation around the horizontal (x) axis. */
export function rotate(p: Vec3, azimuthDeg: number, elevationDeg: number): Vec3 {
  const a = toRad(azimuthDeg)
  const e = toRad(elevationDeg)
  const x1 = p.x * Math.cos(a) + p.z * Math.sin(a)
  const z1 = -p.x * Math.sin(a) + p.z * Math.cos(a)
  const y1 = p.y
  const y2 = y1 * Math.cos(e) - z1 * Math.sin(e)
  const z2 = y1 * Math.sin(e) + z1 * Math.cos(e)
  return { x: x1, y: y2, z: z2 }
}

/** Orthographic projection: screen x/y from the rotated point; z kept only for painter's-algorithm depth sort. */
function project(p: Vec3, scale: number, cx: number, cy: number) {
  return { sx: cx + p.x * scale, sy: cy - p.y * scale, depth: p.z }
}

/**
 * A plane w·x + b = 0 clipped to a square of half-width `extent`, as a quad: the closest point to the origin plus
 * two orthonormal in-plane basis vectors scaled by extent. Degenerates to nothing when w is (numerically) zero.
 */
export function planeQuad(w: Vec3, b: number, extent: number): Vec3[] | null {
  const norm = Math.hypot(w.x, w.y, w.z)
  if (!Number.isFinite(norm) || norm < 1e-9) return null
  const n = { x: w.x / norm, y: w.y / norm, z: w.z / norm }
  const p0 = { x: (-b * n.x) / norm, y: (-b * n.y) / norm, z: (-b * n.z) / norm }
  // Any vector not parallel to n, then Gram-Schmidt to get two orthonormal in-plane axes.
  const seed = Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
  const dot = seed.x * n.x + seed.y * n.y + seed.z * n.z
  const u0 = { x: seed.x - dot * n.x, y: seed.y - dot * n.y, z: seed.z - dot * n.z }
  const uLen = Math.hypot(u0.x, u0.y, u0.z) || 1
  const u = { x: u0.x / uLen, y: u0.y / uLen, z: u0.z / uLen }
  const v = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x }
  const corner = (su: number, sv: number): Vec3 => ({
    x: p0.x + (u.x * su + v.x * sv) * extent,
    y: p0.y + (u.y * su + v.y * sv) * extent,
    z: p0.z + (u.z * su + v.z * sv) * extent,
  })
  return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
}

const point3 = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  label: z.union([z.number(), z.string()]).optional(),
})

export const Scene3DProps = z.object({
  points: z.array(point3),
  plane: z.object({ w: z.tuple([z.number(), z.number(), z.number()]), b: z.number().optional() }).optional(),
  azimuth: z.number().optional(),
  elevation: z.number().optional(),
  extent: z.number().optional(),
  height: z.number().optional(),
  axisLabels: z.tuple([z.string(), z.string(), z.string()]).optional(),
})

const COLOR_PALETTE = [
  "#22c55e", // Emerald green (chloroplast, biology, success)
  "#38bdf8", // Sky blue (water, oxygen, info)
  "#facc15", // Amber yellow (light, sun, energy)
  "#f472b6", // Pink (stroma, flower)
  "#a855f7", // Purple (sugar, enzymes)
  "#fb923c", // Orange (heat, carbon)
  "#2dd4bf", // Teal (membranes)
  "#818cf8", // Indigo (molecules)
  "#ef4444", // Red (critical)
  "#e879f9", // Fuchsia
]

function getColorForLabel(label: string | number | undefined, index: number): string {
  if (typeof label === "number") {
    return label >= 0 ? "var(--ol-chart-1, #38bdf8)" : "var(--ol-chart-2, #f472b6)"
  }
  if (typeof label === "string" && label.trim()) {
    const l = label.toLowerCase()
    if (l.includes("chloroplast") || l.includes("thylakoid") || l.includes("plant") || l.includes("leaf")) return "#22c55e"
    if (l.includes("light") || l.includes("sun") || l.includes("photon")) return "#facc15"
    if (l.includes("water") || l.includes("h2o")) return "#06b6d4"
    if (l.includes("sugar") || l.includes("glucose")) return "#f97316"
    if (l.includes("co2") || l.includes("carbon")) return "#60a5fa"
    if (l.includes("o2") || l.includes("oxygen")) return "#a855f7"
    if (l.includes("stroma")) return "#ec4899"
    // Deterministic hash for any other label string
    let hash = 0
    for (let i = 0; i < label.length; i++) hash = (hash << 5) - hash + label.charCodeAt(i)
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length]
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

export const Scene3D = defineComponent({
  name: "Scene3D",
  props: Scene3DProps,
  description:
    "Rotatable 3D scatter plot for spatial data. points is a list of {x, y, z, label?}; labels render clearly with distinct colors. azimuth and elevation (degrees) may be bound to sliders. extent sets the half-width of the axes; omit it to fit the data.",
  component: function Scene3DView({ props }) {
    const drag = useRef<{ pointerId: number; x: number; y: number; azimuth: number; elevation: number } | null>(null)
    const [rotation, setRotation] = useState<{ azimuth: number; elevation: number } | null>(null)
    useEffect(() => setRotation(null), [props.azimuth, props.elevation])

    const rows = Array.isArray(props.points) ? props.points.flat() : []
    const finite = rows.filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y) && Number.isFinite(p?.z))
    const height = Math.min(520, Math.max(220, num(props.height, H_DEFAULT)))
    const cx = W / 2
    const cy = height / 2
    const auto = finite.reduce((m, p) => Math.max(m, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)), 1)
    const extent = num(props.extent, Math.ceil(auto * 1.15 * 10) / 10)
    const scale = (Math.min(W, height) / 2 / extent) * 0.78
    const azimuth = rotation?.azimuth ?? num(props.azimuth, 35)
    const elevation = Math.max(-89, Math.min(89, rotation?.elevation ?? num(props.elevation, 20)))

    const axisColor = fg("faint") ?? "rgba(255, 255, 255, 0.3)"
    const axisNames = props.axisLabels ?? ["x", "y", "z"]
    const axes = [
      { to: { x: extent, y: 0, z: 0 }, label: axisNames[0] },
      { to: { x: 0, y: extent, z: 0 }, label: axisNames[1] },
      { to: { x: 0, y: 0, z: extent }, label: axisNames[2] },
    ].map((axis) => ({
      ...axis,
      origin: project(rotate({ x: 0, y: 0, z: 0 }, azimuth, elevation), scale, cx, cy),
      end: project(rotate(axis.to, azimuth, elevation), scale, cx, cy),
    }))

    const dots = finite.map((p, i) => ({ ...project(rotate(p, azimuth, elevation), scale, cx, cy), label: p.label, i }))
    const items: { depth: number; render: () => ReactNode }[] = []

    // 1. Render plane if provided
    if (props.plane && Array.isArray(props.plane.w)) {
      const quad = planeQuad(
        { x: props.plane.w[0], y: props.plane.w[1], z: props.plane.w[2] },
        props.plane.b ?? 0,
        extent,
      )
      if (quad && quad.length === 4) {
        const proj = quad.map((p) => project(rotate(p, azimuth, elevation), scale, cx, cy))
        const meanDepth = proj.reduce((s, p) => s + p.depth, 0) / 4
        const pts = proj.map((p) => `${p.sx},${p.sy}`).join(" ")
        items.push({
          depth: meanDepth,
          render: () => (
            <polygon
              key="plane"
              points={pts}
              fill="rgba(168, 85, 247, 0.18)"
              stroke="rgba(168, 85, 247, 0.5)"
              strokeWidth={1}
            />
          ),
        })
      }
    }

    // 2. Render dots with labels and distinct colors
    for (const d of dots) {
      const color = getColorForLabel(d.label, d.i)
      const labelText = d.label !== undefined && d.label !== null ? String(d.label) : null
      items.push({
        depth: d.depth,
        render: () => (
          <g key={`p${d.i}`}>
            <circle
              cx={d.sx}
              cy={d.sy}
              r={5}
              fill={color}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1.5}
            />
            {labelText && (
              <text
                x={d.sx + 7}
                y={d.sy + 3}
                fontSize={10}
                fontWeight={600}
                fill="#f4f4f5"
                fontFamily="var(--ol-font, sans-serif)"
                style={{
                  pointerEvents: "none",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 2px #000",
                }}
              >
                {labelText}
              </text>
            )}
          </g>
        ),
      })
    }
    items.sort((a, b) => a.depth - b.depth)

    // Collect distinct labels for legend
    const labeledDots = finite.filter((p) => p.label !== undefined && p.label !== "")
    const uniqueLabels = [...new Map(labeledDots.map((d) => [String(d.label), d])).values()]

    return (
      <div
        className="olr-scene3d"
        tabIndex={0}
        role="group"
        aria-label="Interactive 3D scene. Drag to rotate, or use the arrow keys."
        style={{ outline: "none" }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, azimuth, elevation }
          event.currentTarget.setPointerCapture(event.pointerId)
          setRotation({ azimuth, elevation })
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (!start || start.pointerId !== event.pointerId) return
          setRotation({
            azimuth: start.azimuth + (event.clientX - start.x) * 0.7,
            elevation: Math.max(-89, Math.min(89, start.elevation - (event.clientY - start.y) * 0.55)),
          })
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return
          drag.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { drag.current = null }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 15 : 5
          if (event.key === "ArrowLeft") setRotation({ azimuth: azimuth - step, elevation })
          else if (event.key === "ArrowRight") setRotation({ azimuth: azimuth + step, elevation })
          else if (event.key === "ArrowUp") setRotation({ azimuth, elevation: Math.min(89, elevation + step) })
          else if (event.key === "ArrowDown") setRotation({ azimuth, elevation: Math.max(-89, elevation - step) })
          else return
          event.preventDefault()
        }}
      >
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="3D scatter plot and axes" preserveAspectRatio="xMidYMid meet">
          {axes.map((axis, i) => (
            <g key={`axis${i}`}>
              <line x1={axis.origin.sx} y1={axis.origin.sy} x2={axis.end.sx} y2={axis.end.sy} stroke={axisColor} strokeWidth={1} strokeDasharray="3 3" />
              <text x={axis.end.sx} y={axis.end.sy} dy={-4} fontSize={11} fill={axisColor} textAnchor="middle" fontFamily="var(--ol-font)">
                {axis.label}
              </text>
            </g>
          ))}
          {items.map((item) => item.render())}
        </svg>

        {uniqueLabels.length > 0 && (
          <div
            className="olr-scene3d-legend"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
              justifyContent: "center",
            }}
          >
            {uniqueLabels.map((item, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#e4e4e7",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: getColorForLabel(item.label, idx),
                  }}
                />
                {String(item.label)}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  },
})

export const scene3dComponents = [Scene3D]
