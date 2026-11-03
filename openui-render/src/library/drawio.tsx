import React, { useMemo, useState } from "react";
import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { deflateRaw } from "pako";

/**
 * Deflate and base64-encode XML for viewer.diagrams.net (#R parameter).
 * Parity with diagrams.net compression specification.
 */
function deflateB64(xml: string): string {
  try {
    const pre = encodeURIComponent(xml.trim());
    const compressed = deflateRaw(pre, { level: 9 });
    return Buffer.from(compressed).toString("base64");
  } catch (err) {
    console.warn("[Drawio] Compression failed:", err);
    return "";
  }
}

/**
 * Build read-only viewer URL and editor URL for diagrams.net.
 */
function buildDiagramUrls(xmlOrUrl: string): { viewerUrl: string; editUrl: string } {
  const trimmed = (xmlOrUrl || "").trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const isDiagramsNet = trimmed.includes("diagrams.net") || trimmed.includes("draw.io");
    const viewerUrl = isDiagramsNet
      ? trimmed
      : `https://viewer.diagrams.net/?edit=_blank&layers=1&nav=1#U${encodeURIComponent(trimmed)}`;
    return {
      viewerUrl,
      editUrl: `https://app.diagrams.net/?edit=_blank#U${encodeURIComponent(trimmed)}`,
    };
  }

  // Raw XML string
  const payload = deflateB64(trimmed);
  if (!payload) {
    return { viewerUrl: "", editUrl: "" };
  }

  const encodedPayload = encodeURIComponent(payload);
  const viewerUrl = `https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&edit=_blank#R${encodedPayload}`;
  const editorPayload = JSON.stringify({ type: "xml", compressed: true, data: payload });
  const editUrl = `https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create=${encodeURIComponent(editorPayload)}`;

  return { viewerUrl, editUrl };
}

const createDrawioProps = () =>
  z.object({
    xml: z.union([z.string(), z.any()]),
    height: z.number().optional(),
    title: z.string().optional(),
    allowEdit: z.boolean().optional(),
  });

export const DrawioProps = createDrawioProps();

function DrawioComponent({ props }: { props: any }) {
  const [showXml, setShowXml] = useState(false);
  const rawXml = typeof props.xml === "string" ? props.xml : JSON.stringify(props.xml);
  const height = Math.min(800, Math.max(260, props.height ?? 400));
  const title = props.title || "Architecture Diagram";

  const { viewerUrl, editUrl } = useMemo(() => buildDiagramUrls(rawXml), [rawXml]);

  return (
    <div
      className="openui-drawio-container"
      style={{
        border: "1px solid var(--openui-border, rgba(255, 255, 255, 0.12))",
        borderRadius: "8px",
        overflow: "hidden",
        margin: "12px 0",
        background: "var(--openui-popover-background, #18181b)",
      }}
    >
      <div
        className="openui-drawio-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "var(--openui-highlight, rgba(255, 255, 255, 0.04))",
          borderBottom: "1px solid var(--openui-border, rgba(255, 255, 255, 0.08))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--openui-foreground, #f4f4f5)" }}>
          <span>📐</span>
          <span>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className="pi-openui-btn"
            onClick={() => setShowXml((s) => !s)}
            title="Toggle XML code"
          >
            {showXml ? "Viewer" : "XML"}
          </button>
          {editUrl && props.allowEdit !== false && (
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pi-openui-btn"
              style={{
                textDecoration: "none",
                background: "#9333ea",
                color: "#ffffff",
                borderColor: "#a855f7",
                fontWeight: 600,
              }}
              title="Open and edit this diagram in diagrams.net"
            >
              Edit in Draw.io ↗
            </a>
          )}
        </div>
      </div>

      {showXml ? (
        <pre
          style={{
            margin: 0,
            padding: "12px 14px",
            background: "rgba(0, 0, 0, 0.4)",
            color: "#e4e4e7",
            fontSize: "12px",
            lineHeight: 1.45,
            maxHeight: `${height}px`,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          <code>{rawXml}</code>
        </pre>
      ) : viewerUrl ? (
        <iframe
          src={viewerUrl}
          title={title}
          style={{
            width: "100%",
            height: `${height}px`,
            border: 0,
            display: "block",
            background: "#ffffff",
          }}
          allow="fullscreen"
          loading="lazy"
        />
      ) : (
        <div style={{ padding: "20px", textAlign: "center", color: "#a1a1aa", fontSize: "13px" }}>
          Invalid or empty Draw.io diagram XML.
        </div>
      )}
    </div>
  );
}

export const Drawio = defineComponent({
  name: "Drawio",
  props: createDrawioProps(),
  description: "Embed an editable Draw.io / diagrams.net architecture diagram: Drawio(xml, height?, title?, allowEdit?)",
  component: DrawioComponent,
});

export const Diagram = defineComponent({
  name: "Diagram",
  props: createDrawioProps(),
  description: "Alias for Drawio. Embed an editable diagram: Diagram(xml, height?, title?)",
  component: DrawioComponent,
});
