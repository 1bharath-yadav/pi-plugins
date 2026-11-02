import React, { useState, useMemo, useCallback, useEffect, Component, type ReactNode } from "react";
import { Renderer } from "@openuidev/react-lang";
import { renderLibrary } from "./library/index";
import { extractOpenUILang } from "./extract-openui";
import { OpenUIIcon } from "./icon";
import katexCss from "katex/dist/katex-woff2.min.css?inline";
import panelCss from "./library/panel.css?inline";
import blockCss from "./renderer.css?inline";

let host: any = null;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class OpenUIErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn("[OpenUI] Render error caught by OpenUIErrorBoundary:", error);
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="pi-openui-errors">
          <div className="pi-openui-error-item">
            <strong>Render exception:</strong> {this.state.error?.message || String(this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface OpenUIBlockProps {
  language: string;
  source: string;
}

export function OpenUIBlockComponent({ language, source }: OpenUIBlockProps) {
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const code = useMemo(() => {
    let text = (source || "").trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```[^\n]*\r?\n/, "").replace(/```[ \t\r\n]*$/, "").trim();
    }
    return text;
  }, [source]);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }, [code]);

  const handleError = useCallback((errs: any[]) => {
    if (errs && errs.length) {
      setErrors(errs.map((e) => (typeof e?.message === "string" ? e.message : String(e))));
    }
  }, []);

  if (!code) {
    return (
      <div className="pi-openui-card" data-openui-lang={language}>
        <div className="pi-openui-header">
          <div className="pi-openui-tag">
            <OpenUIIcon size={18} />
            <span className="pi-openui-title">OpenUi</span>
          </div>
        </div>
        <div className="pi-openui-content" style={{ opacity: 0.6, fontSize: "13px" }}>
          Empty OpenUI Lang block.
        </div>
      </div>
    );
  }

  return (
    <div className="pi-openui-card" data-openui-lang={language}>
      <div className="pi-openui-header">
        <div className="pi-openui-tag">
          <OpenUIIcon size={18} />
          <span className="pi-openui-title">OpenUi</span>
        </div>
        <div className="pi-openui-actions">
          <button
            type="button"
            className="pi-openui-btn"
            onClick={() => setShowSource((s) => !s)}
            title="Toggle between rendered UI and OpenUI Lang source code"
          >
            {showSource ? "Preview" : "Source"}
          </button>
          <button
            type="button"
            className="pi-openui-btn"
            onClick={handleCopy}
            title="Copy OpenUI Lang code"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {showSource ? (
        <pre className="pi-openui-source">
          <code>{code}</code>
        </pre>
      ) : (
        <div className="pi-openui-content">
          <OpenUIErrorBoundary
            fallback={(err) => (
              <div className="pi-openui-errors">
                <div className="pi-openui-error-item">
                  <strong>Render notice:</strong> {err?.message || String(err)}
                </div>
              </div>
            )}
          >
            <Renderer
              key={code}
              response={code}
              library={renderLibrary}
              onError={handleError}
            />
          </OpenUIErrorBoundary>
          {errors.length > 0 && (
            <div className="pi-openui-errors">
              {errors.map((err, i) => (
                <div key={i} className="pi-openui-error-item">
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OpenUIEntryExtraComponent({ message }: { message: { content?: string; role?: string } }) {
  const content = message?.content || "";

  // If the message already contains our plugin's blockRenderer tag,
  // it is already rendered in place by PluginBlockRenderer!
  if (
    content.includes("local.openui-render:openui") ||
    content.includes("local.openui-render:openui-lang")
  ) {
    return null;
  }

  // Check if there is an un-prefixed openui or openui-lang block
  const extracted = extractOpenUILang(content);
  if (!extracted || !extracted.trim()) {
    return null;
  }

  return (
    <OpenUIBlockComponent
      language="openui-lang"
      source={extracted}
    />
  );
}

export function OpenUIComposerControl({ position }: { position?: string }) {
  const [enabled, setEnabled] = useState(true);

  // Read initial mode from plugin process
  useEffect(() => {
    if (host && typeof host.dispatch === "function") {
      host
        .dispatch("plugin.call", { method: "openui.getMode" })
        .then((res: any) => {
          if (res && typeof res.enabled === "boolean") {
            setEnabled(res.enabled);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleToggle = useCallback(async () => {
    const nextState = !enabled;
    setEnabled(nextState);

    try {
      if (host && typeof host.dispatch === "function") {
        await host.dispatch("plugin.call", {
          method: "openui.setMode",
          args: { enabled: nextState },
        });

        // If toggled ON, insert /openui command prompt into composer
        if (nextState) {
          await host.dispatch("composer.insertText", {
            text: "/openui ",
          });
        }
      }
    } catch (err) {
      console.warn("[OpenUI] Failed to update mode:", err);
    }
  }, [enabled]);

  return (
    <button
      type="button"
      className={`pi-openui-composer-btn ${enabled ? "is-active" : "is-inactive"}`}
      onClick={handleToggle}
      title={enabled ? "OpenUI active (click to toggle)" : "OpenUI inactive (click to enable)"}
    >
      <OpenUIIcon size={16} active={enabled} />
      <span>OpenUi</span>
      <span className={`pi-openui-state-dot ${enabled ? "" : "is-off"}`} />
    </button>
  );
}

export function onLoad(pi: any) {
  host = pi;

  // 1. Inject KaTeX, OpenUI component, and block renderer styles
  if (pi.ui && typeof pi.ui.injectStyle === "function") {
    pi.ui.injectStyle([katexCss, panelCss, blockCss].join("\n\n"));
  }

  // 2. Register blockRenderer for local.openui-render:openui
  pi.slots.register({
    slot: "blockRenderer",
    language: `${pi.plugin.id}:openui`,
    component: OpenUIBlockComponent,
  });

  // 3. Register blockRenderer for local.openui-render:openui-lang
  pi.slots.register({
    slot: "blockRenderer",
    language: `${pi.plugin.id}:openui-lang`,
    component: OpenUIBlockComponent,
  });

  // 4. Register entryExtra for assistant messages containing openui-lang
  pi.slots.register({
    slot: "entryExtra",
    component: OpenUIEntryExtraComponent,
  });

  // 5. Register composer toolbar control
  pi.slots.register({
    slot: "composerControl",
    component: OpenUIComposerControl,
    positions: ["right"],
  });
}
