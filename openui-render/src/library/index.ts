import { createLibrary } from "@openuidev/react-lang"
import { chartComponents } from "./chart"
import { controlComponents } from "./controls"
import { functions } from "./functions"
import { layoutComponents } from "./layout"
import { Lesson } from "./lesson"
import { scene3dComponents } from "./scene3d"
import { svgComponents } from "./svg"
import { textComponents } from "./text"

export const renderLibrary = createLibrary({
  root: "Lesson",
  components: [Lesson, ...layoutComponents, ...textComponents, ...controlComponents, ...svgComponents, ...chartComponents, ...scene3dComponents],
  functions,
})

export * from "./chart"
export * from "./controls"
export * from "./functions"
export * from "./layout"
export * from "./lesson"
export * from "./scene3d"
export * from "./svg"
export * from "./text"
