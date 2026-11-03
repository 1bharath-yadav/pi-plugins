import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import antigravityExtension from "../core/index.js";

/**
 * Pi Agent Harness Trusted Extension for Google Antigravity.
 * Runs in the Pi Agent sidecar process under the agent.extension grant.
 */
export default function (pi: ExtensionAPI): void {
  antigravityExtension(pi);
}
