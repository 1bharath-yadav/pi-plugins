import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { createLibrary } from "@openuidev/react-lang";
import { Lesson } from "./lesson";
import { Scene3D } from "./scene3d";

// Standard OpenUI component library built on the official @openuidev/react-ui catalog
export const renderLibrary = createLibrary({
  root: "Stack",
  components: [
    ...Object.values(openuiLibrary.components),
    Lesson,
    Scene3D,
  ],
});

export { openuiLibrary };
export * from "./lesson";
export * from "./scene3d";
