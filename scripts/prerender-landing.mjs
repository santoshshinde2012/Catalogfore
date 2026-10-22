import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repo, "apps/web");
const page = "https://santoshshinde2012.github.io/Catalogfore/";
const dom = new JSDOM('<!doctype html><html><body><div id="root" data-prerender="done"></div></body></html>', {
  url: page,
  pretendToBeVisual: true,
});
const { window } = dom;

function install(name, value) {
  if (globalThis[name] === undefined) globalThis[name] = value;
}

install("window", window);
install("document", window.document);
install("navigator", window.navigator);
install("HTMLElement", window.HTMLElement);
install("SVGElement", window.SVGElement);
install("Element", window.Element);
install("Node", window.Node);
install("DocumentFragment", window.DocumentFragment);
install("MutationObserver", window.MutationObserver);
install("getComputedStyle", window.getComputedStyle.bind(window));
window.matchMedia = () => ({
  matches: false,
  media: "",
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false;
  },
});

const vite = await createServer({
  root: webRoot,
  configFile: path.join(webRoot, "vite.config.ts"),
  server: { middlewareMode: true, ws: false },
  appType: "custom",
  logLevel: "error",
  ssr: { noExternal: ["lz-string"] },
});

try {
  const mod = await vite.ssrLoadModule("/src/prerender-entry.tsx");
  const html = await mod.render();
  if (!html.includes("What does the next year cost?")) {
    throw new Error("Prerender did not include the page heading");
  }
  if (html.includes("<!--$!-->") || html.includes("<!--$?-->")) {
    throw new Error("Prerender has unfinished Suspense boundaries; hydration would discard their server output");
  }
  const indexPath = path.join(webRoot, "dist/index.html");
  let index = readFileSync(indexPath, "utf8");
  const marker = '<div id="root" inert aria-busy="true"></div>';
  if (!index.includes(marker)) throw new Error("Built index.html has no empty #root");
  index = index.replace(marker, `<div id="root" data-prerender="done" inert aria-busy="true">${html}</div>`);

  const sheet = index.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!sheet) throw new Error("Built index.html has no stylesheet");
  const cssPath = path.join(webRoot, "dist", sheet[1].replace(/^\/Catalogfore\//, ""));
  const css = readFileSync(cssPath, "utf8");
  if (css.includes("</style>")) throw new Error("Stylesheet cannot be inlined");
  index = index.replace(sheet[0], `<style>${css}</style>`);

  const boot = readFileSync(path.join(webRoot, "public/theme-boot.js"), "utf8").trim();
  const bootHash = createHash("sha256").update(boot).digest("base64");
  const bootTag = index.match(/<script src="(?:\.\/|\/Catalogfore\/|\/)theme-boot\.js"><\/script>/);
  if (!bootTag) throw new Error("Built index.html is missing theme-boot.js");
  index = index.replace(bootTag[0], `<script>${boot}</script>`);
  const moduleTag = index.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  if (!moduleTag) throw new Error("Built index.html is missing the module script");
  // Keep Vite's module script and dependency preloads. A detached dynamic import
  // lets document load finish while the visible planner still has no handlers.
  index = index.replace(/script-src ([^;"]+)/, `script-src $1 'sha256-${bootHash}'`);

  writeFileSync(indexPath, index);
  console.log(`prerendered landing (${html.length} bytes), inlined css and theme boot`);
} finally {
  await vite.close();
}
