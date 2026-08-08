import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const logoBase64 = readFileSync(new URL("./luminus-logo.svg", import.meta.url)).toString("base64");
const logoIcon = `data:image/svg+xml;base64,${logoBase64}`;

const targets = {
  main: {
    name: "Luminus",
    namespace: "https://luminus.local/main",
    version: pkg.version,
    file: "luminus.user.js",
    devTools: false,
    mcp: false,
    minify: false,
  },
  "main-dev": {
    name: "Luminus Dev",
    namespace: "https://luminus.local/main-dev",
    version: `${pkg.version}-dev`,
    file: "luminus-dev.user.js",
    devTools: true,
    mcp: true,
    minify: false,
  },
} as const;

type TargetName = keyof typeof targets;

export default defineConfig(({ mode }) => {
  const target = targets[(mode || "main") as TargetName];
  if (!target) throw new Error(`Build target desconhecido: ${mode}`);

  const localConnect = target.mcp ? "// @connect      127.0.0.1\n// @connect      localhost\n" : "";

  const userscriptHeader = `// ==UserScript==
// @name         ${target.name}
// @namespace    ${target.namespace}
// @version      ${target.version}
// @description  Painel flutuante para o Habblet Hotel: player, logs, visual, links e mute.
// @author       ak
// @icon         ${logoIcon}
// @homepageURL  https://github.com/iIlusion/luminus
// @supportURL   https://discord.gg/HmVkadXGVz
// @downloadURL  https://github.com/iIlusion/luminus/releases/latest/download/luminus.user.js
// @updateURL    https://github.com/iIlusion/luminus/releases/latest/download/luminus.user.js
// @match        https://www.habblet.city/hotel*
// @run-at       document-start
// @inject-into  page
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.habblet.city
// @connect      discord.com
// @connect      cdn.jsdelivr.net
${localConnect}// ==/UserScript==`;

  return {
    resolve: {
      alias: [
        { find: "lucide-react", replacement: path.resolve(fileURLToPath(new URL(".", import.meta.url)), "node_modules/lucide-react/dist/esm/lucide-react.mjs") },
        ...(!target.mcp ? [
          { find: /^.*[/\\]bridge[/\\]mcpBridge$/, replacement: fileURLToPath(new URL("./src/build/noMcp.ts", import.meta.url)) },
        ] : []),
        ...(!target.devTools ? [
          { find: /^.*[/\\]ui[/\\]catalogThumbBakeDev$/, replacement: fileURLToPath(new URL("./src/build/noCatalogThumbBake.ts", import.meta.url)) },
        ] : []),
      ],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __LUMINUS_VERSION__: JSON.stringify(target.version),
      __LUMINUS_BUILD_NAME__: JSON.stringify(target.name),
      __LUMINUS_DEV_TOOLS__: JSON.stringify(target.devTools),
      __LUMINUS_MCP__: JSON.stringify(target.mcp),
    },
    plugins: [
      {
        name: "luminus-userscript-output",
        generateBundle(_, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type !== "chunk") continue;
            chunk.code = `${userscriptHeader}\n${chunk.code}`;
          }
        },
      },
    ],
    build: {
      emptyOutDir: false,
      minify: target.minify ? "esbuild" : false,
      sourcemap: false,
      lib: { entry: "src/main.ts", formats: ["iife"], name: "Luminus", fileName: () => target.file },
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          warn(warning);
        },
      },
    },
  };
});
