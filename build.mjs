import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

// The page script must be a plain global, not a module: it is injected with
// chrome.scripting into arbitrary pages, where imports would not resolve.
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: { "defuddle-global": "src/defuddle-global.ts" },
  bundle: true,
  format: "iife",
  outdir: "dist",
  target: "chrome120",
  logLevel: "info",
});

await build({
  entryPoints: {
    popup: "src/popup.ts",
    options: "src/options.ts",
  },
  bundle: true,
  format: "esm",
  outdir: "dist",
  target: "chrome120",
  logLevel: "info",
});

cpSync("static", "dist", { recursive: true });
