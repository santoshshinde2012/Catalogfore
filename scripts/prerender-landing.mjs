import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repo, "apps/web");
const page = "https://santoshshinde2012.github.io/cayfore/";
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
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  ssr: { noExternal: ["lz-string"] },
});

try {
  const mod = await vite.ssrLoadModule("/src/prerender-entry.tsx");
  const html = mod.render();
  if (!html.includes("What does the next year cost?")) {
    throw new Error("Prerender did not include the page heading");
  }
  const indexPath = path.join(webRoot, "dist/index.html");
  let index = readFileSync(indexPath, "utf8");
  const marker = '<div id="root"></div>';
  if (!index.includes(marker)) throw new Error("Built index.html has no empty #root");
  index = index.replace(marker, `<div id="root" data-prerender="done">${html}</div>`);

  const sheet = index.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!sheet) throw new Error("Built index.html has no stylesheet");
  const cssPath = path.join(webRoot, "dist", sheet[1].replace(/^\/cayfore\//, ""));
  const css = readFileSync(cssPath, "utf8");
  if (css.includes("</style>")) throw new Error("Stylesheet cannot be inlined");
  index = index.replace(sheet[0], `<style>${css}</style>`);

  const boot = readFileSync(path.join(webRoot, "public/theme-boot.js"), "utf8").trim();
  const bootHash = createHash("sha256").update(boot).digest("base64");
  if (!index.includes('<script src="./theme-boot.js"></script>')) {
    throw new Error("Built index.html is missing theme-boot.js");
  }
  index = index.replace('<script src="./theme-boot.js"></script>', `<script>${boot}</script>`);
  const moduleTag = index.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  if (!moduleTag) throw new Error("Built index.html is missing the module script");
  const loader = `import("${moduleTag[1]}");`;
  const loaderHash = createHash("sha256").update(loader).digest("base64");
  index = index.replace(moduleTag[0], `<script type="module">${loader}</script>`);
  index = index.replace(/<link rel="modulepreload"[^>]*>/g, "");
  index = index.replace(/script-src ([^;"]+)/, `script-src $1 'sha256-${bootHash}' 'sha256-${loaderHash}'`);

  writeFileSync(indexPath, index);
  console.log(`prerendered landing (${html.length} bytes), inlined css and theme boot`);
} finally {
  await vite.close();
}
