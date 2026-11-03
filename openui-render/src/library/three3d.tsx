import React, { useEffect, useRef, useState, useMemo } from "react";
import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import * as THREE from "three";

/** Create a 2D text canvas sprite that faces the camera in 3D space */
function createTextSprite(text: string, color = "#ffffff", bgColor = "rgba(15, 23, 42, 0.75)"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSize = 28;
  canvas.width = 256;
  canvas.height = 64;

  if (ctx) {
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const padding = 16;
    const w = Math.min(canvas.width, textWidth + padding * 2);
    const h = fontSize + 16;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    // Rounded background pill
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 8) : ctx.rect(x, y, w, h);
    ctx.fill();

    // Text
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}

export const ThreeObjectSchema = z.object({
  type: z.string().optional(), // "sphere", "box", "cylinder", "torus", "cone", "arrow", "point"
  position: z.any().optional(), // [x, y, z] or { x, y, z }
  color: z.string().optional(),
  size: z.any().optional(), // radius or [w, h, d]
  label: z.string().optional(),
  wireframe: z.boolean().optional(),
});

export const Three3DProps = z.object({
  objects: z.union([z.array(z.any()), z.string()]).optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  showAxes: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  autoRotate: z.boolean().optional(),
});

const DEFAULT_PALETTE = [
  "#22c55e", // Green
  "#38bdf8", // Blue
  "#facc15", // Amber
  "#f472b6", // Pink
  "#a855f7", // Purple
  "#fb923c", // Orange
  "#2dd4bf", // Teal
  "#818cf8", // Indigo
];

function Three3DView({ props }: { props: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(Boolean(props.autoRotate));
  const height = Math.min(650, Math.max(240, props.height ?? 360));
  const title = props.title || "Interactive 3D Scene (Three.js)";

  // Parse items
  const items = useMemo(() => {
    const raw = props.objects;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.toLowerCase().includes("photosynthesis")) {
      return [
        { type: "sphere", position: [0, 0, 0], color: "#22c55e", size: 0.9, label: "Chloroplast" },
        { type: "cylinder", position: [-1.8, 0, 0], color: "#10b981", size: [0.7, 0.2, 0.7], label: "Thylakoid" },
        { type: "sphere", position: [-1.8, 1.2, 0], color: "#facc15", size: 0.35, label: "Light (hν)" },
        { type: "sphere", position: [1.2, 0.8, 0], color: "#60a5fa", size: 0.4, label: "CO₂" },
        { type: "sphere", position: [1.2, -0.8, 0], color: "#f97316", size: 0.5, label: "Sugar (Glucose)" },
        { type: "sphere", position: [-1.8, -1.2, 0], color: "#06b6d4", size: 0.35, label: "H₂O" },
        { type: "sphere", position: [0, 1.6, 0], color: "#a855f7", size: 0.4, label: "O₂" },
        { type: "torus", position: [0, 0, 0], color: "rgba(236, 72, 153, 0.6)", size: [2.5, 0.08], label: "Stroma" },
      ];
    }
    return [];
  }, [props.objects]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#131316");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 4, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.replaceChildren(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(6, 10, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x9333ea, 0.6);
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    // 3. Grid & Axes Helpers
    if (props.showGrid !== false) {
      const grid = new THREE.GridHelper(10, 10, 0x581c87, 0x27272a);
      grid.position.y = -0.01;
      scene.add(grid);
    }
    if (props.showAxes !== false) {
      const axes = new THREE.AxesHelper(3);
      scene.add(axes);
    }

    // 4. Populate Scene with 3D Objects
    const group = new THREE.Group();
    scene.add(group);

    items.forEach((item: any, idx: number) => {
      const p = item?.props ?? item ?? {};
      const pos = Array.isArray(p.position)
        ? p.position
        : [p.x ?? 0, p.y ?? 0, p.z ?? 0];
      const color = p.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
      const type = (p.type || "sphere").toLowerCase();
      const label = p.label;

      let geom: THREE.BufferGeometry;
      const s = p.size;

      if (type === "box" || type === "cube") {
        const [w, h, d] = Array.isArray(s) ? s : [s ?? 1, s ?? 1, s ?? 1];
        geom = new THREE.BoxGeometry(w, h, d);
      } else if (type === "cylinder") {
        const [r, h] = Array.isArray(s) ? s : [s ?? 0.5, 1];
        geom = new THREE.CylinderGeometry(r, r, h, 32);
      } else if (type === "cone") {
        const [r, h] = Array.isArray(s) ? s : [s ?? 0.5, 1];
        geom = new THREE.ConeGeometry(r, h, 32);
      } else if (type === "torus") {
        const [r, tube] = Array.isArray(s) ? s : [s ?? 1, 0.2];
        geom = new THREE.TorusGeometry(r, tube, 16, 64);
      } else {
        // default sphere
        const r = typeof s === "number" ? s : 0.45;
        geom = new THREE.SphereGeometry(r, 32, 32);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.25,
        metalness: 0.2,
        wireframe: Boolean(p.wireframe),
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      group.add(mesh);

      // Label sprite
      if (label) {
        const sprite = createTextSprite(String(label), "#ffffff");
        sprite.position.set(pos[0], pos[1] + 0.65, pos[2]);
        group.add(sprite);
      }
    });

    // 5. Interactive Orbit Navigation via pointer drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 9, theta: 0.7, phi: 1.1 };

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.008));
      updateCamera();
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(2.5, Math.min(25, spherical.radius + e.deltaY * 0.01));
      updateCamera();
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    // 6. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && !isDragging) {
        spherical.theta += 0.006;
        updateCamera();
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }, [items, height, autoRotate, props.showGrid, props.showAxes]);

  return (
    <div
      className="openui-three3d-container"
      style={{
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "8px",
        overflow: "hidden",
        margin: "12px 0",
        background: "#131316",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "rgba(255, 255, 255, 0.04)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#f4f4f5" }}>
          <span>🧊</span>
          <span>{title}</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="pi-openui-btn"
            onClick={() => setAutoRotate((r) => !r)}
            title="Toggle 3D auto rotation"
          >
            {autoRotate ? "Pause Rotate" : "Auto Rotate"}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: `${height}px`,
          cursor: "grab",
          touchAction: "none",
        }}
      />
    </div>
  );
}

export const Three3D = defineComponent({
  name: "Three3D",
  props: Three3DProps,
  description: "Interactive 3D WebGL scene rendered with Three.js: Three3D(objects, height?, title?, showAxes?, showGrid?, autoRotate?)",
  component: Three3DView,
});
