import { describe, expect, it } from "bun:test"
import { planeQuad, rotate } from "./scene3d"

describe("Scene3D geometry", () => {
  it("rotates a point around the vertical axis", () => {
    const rotated = rotate({ x: 1, y: 0, z: 0 }, 90, 0)
    expect(Math.abs(rotated.x)).toBeLessThan(1e-10)
    expect(rotated.y).toBe(0)
    expect(rotated.z).toBeCloseTo(-1, 10)
  })

  it("builds points on the supplied plane", () => {
    const w = { x: 1, y: 2, z: -3 }
    const b = 2.5
    const corners = planeQuad(w, b, 4)
    expect(corners).not.toBeNull()
    for (const point of corners ?? []) {
      expect(w.x * point.x + w.y * point.y + w.z * point.z + b).toBeCloseTo(0, 8)
    }
  })

  it("returns no plane for a zero normal vector", () => {
    expect(planeQuad({ x: 0, y: 0, z: 0 }, 0, 2)).toBeNull()
  })
})
