import React, { useState, useMemo, useCallback, useEffect, Component, type ReactNode } from "react";
import { Renderer } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { renderLibrary } from "./library/index";
import { extractOpenUILang } from "./extract-openui";
import { OpenUIIcon } from "./icon";
import katexCss from "katex/dist/katex-woff2.min.css?inline";
import openuiCss from "@openuidev/react-ui/index.css?inline";
import defaultsCss from "@openuidev/react-ui/defaults.css?inline";
import panelCss from "./library/panel.css?inline";
import blockCss from "./renderer.css?inline";

let host: any = null;

/** Dynamically detect PI-Desktop active host theme (light vs dark) */
function readHostColorScheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const html = document.documentElement;
  const body = document.body;

  // 1. Host object properties
  if (host?.theme === "light" || host?.ui?.theme === "light") return "light";
  if (host?.theme === "dark" || host?.ui?.theme === "dark") return "dark";

  // 2. Explicit data-theme or color-mode attributes
  const attr =
    html.getAttribute("data-theme") ||
    body?.getAttribute("data-theme") ||
    html.getAttribute("data-color-mode") ||
    body?.getAttribute("data-color-mode") ||
    html.getAttribute("data-theme-mode") ||
    body?.getAttribute("data-theme-mode");
  if (attr === "light") return "light";
  if (attr === "dark") return "dark";

  // 3. Class names
  if (
    html.classList.contains("light") ||
    body?.classList.contains("light") ||
    html.classList.contains("theme-light") ||
    body?.classList.contains("theme-light")
  ) {
    return "light";
  }
  if (
    html.classList.contains("dark") ||
    body?.classList.contains("dark") ||
    html.classList.contains("theme-dark") ||
    body?.classList.contains("theme-dark")
  ) {
    return "dark";
  }

  // 4. Computed style colorScheme or background brightness
  if (typeof getComputedStyle !== "undefined") {
    try {
      const scheme = getComputedStyle(html).colorScheme || getComputedStyle(body || html).colorScheme;
      if (/\blight\b/.test(scheme)) return "light";
      if (/\bdark\b/.test(scheme)) return "dark";

      const bg = getComputedStyle(body || html).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const brightness = (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1000;
        if (brightness > 150) return "light";
      }
    } catch {}
  }

  // 5. System preference
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useHostTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(readHostColorScheme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setTheme(readHostColorScheme());

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-plugin-theme", "class", "style"] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    }

    const mql = window.matchMedia?.("(prefers-color-scheme: light)");
    mql?.addEventListener?.("change", update);

    return () => {
      observer.disconnect();
      mql?.removeEventListener?.("change", update);
    };
  }, []);

  return theme;
}

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
            <strong>Render notice:</strong> {this.state.error?.message || String(this.state.error)}
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
  const hostTheme = useHostTheme();

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
    } else {
      setErrors([]);
    }
  }, []);

  if (!code) {
    return (
      <div className="pi-openui-card" data-theme={hostTheme} data-openui-lang={language}>
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
    <div className="pi-openui-card" data-theme={hostTheme} data-openui-lang={language}>
      <div className="pi-openui-header">
        <div className="pi-openui-tag">
          <OpenUIIcon size={18} />
          <span className="pi-openui-title">OpenUi</span>
          {errors.length > 0 && (
            <span
              className="pi-openui-warning-badge"
              onClick={() => setShowSource(true)}
              title="Click to view syntax warnings in Source tab"
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
                background: "rgba(234, 179, 8, 0.15)",
                color: "#eab308",
                cursor: "pointer",
                marginLeft: "4px",
                fontWeight: 600,
              }}
            >
              ⚠️ {errors.length} {errors.length === 1 ? "warning" : "warnings"}
            </span>
          )}
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
        <div className="pi-openui-source-view">
          <pre className="pi-openui-source">
            <code>{code}</code>
          </pre>
          {errors.length > 0 && (
            <div className="pi-openui-errors" style={{ margin: "8px 12px 12px" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Syntax / Schema Diagnostics:</div>
              {errors.map((err, i) => (
                <div key={i} className="pi-openui-error-item">
                  • {err}
                </div>
              ))}
            </div>
          )}
        </div>
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
            <ThemeProvider mode={hostTheme}>
              <Renderer
                key={code}
                response={code}
                library={renderLibrary}
                onError={handleError}
              />
            </ThemeProvider>
          </OpenUIErrorBoundary>
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
  const [config, setConfig] = useState({
    enabled: true,
  });

  // Read initial configuration from plugin process
  useEffect(() => {
    if (host && typeof host.dispatch === "function") {
      host
        .dispatch("plugin.call", { method: "openui.getConfig" })
        .then((res: any) => {
          if (res && typeof res === "object") {
            setConfig({
              enabled: res.enabled !== false,
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const updateConfig = useCallback(async (newCfg: Partial<typeof config>) => {
    const merged = { ...config, ...newCfg };
    setConfig(merged);
    try {
      if (host && typeof host.dispatch === "function") {
        await host.dispatch("plugin.call", {
          method: "openui.setConfig",
          args: merged,
        });
      }
    } catch (err) {
      console.warn("[OpenUI] Failed to update config:", err);
    }
  }, [config]);

  const handleToggle = useCallback(async () => {
    const nextState = !config.enabled;
    await updateConfig({ enabled: nextState });

    // If toggled ON, insert /openui command prompt into composer
    if (nextState && host && typeof host.dispatch === "function") {
      try {
        await host.dispatch("composer.insertText", {
          text: "/openui ",
        });
      } catch {}
    }
  }, [config.enabled, updateConfig]);

  return (
    <div className="pi-openui-composer-wrapper">
      <button
        type="button"
        className={`pi-openui-composer-btn ${config.enabled ? "is-active" : "is-inactive"}`}
        onClick={handleToggle}
        title="OpenUI Rendering (Click to toggle)"
      >
        <OpenUIIcon size={16} active={config.enabled} />
        <span>OpenUi</span>
        <span className={`pi-openui-state-dot ${config.enabled ? "" : "is-off"}`} />
      </button>
    </div>
  );
}

export function onLoad(pi: any) {
  host = pi;

  // 1. Inject KaTeX, official @openuidev/react-ui component styling, and block renderer styles
  if (pi.ui && typeof pi.ui.injectStyle === "function") {
    // Map :root to :scope and card classes so all variables resolve inside PI-Desktop's @scope
    const openuiThemeCss = openuiCss.replace(/:root\b/g, ":scope, [data-pi-plugin], .pi-openui-card, .openui-card");
    const defaultsThemeCss = defaultsCss.replace(/:root\b/g, ":scope, [data-pi-plugin], .pi-openui-card, .openui-card");
    pi.ui.injectStyle([katexCss, defaultsThemeCss, openuiThemeCss, panelCss, blockCss].join("\n\n"));
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
