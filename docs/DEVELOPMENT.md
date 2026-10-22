# Development and verification

[Documentation index](README.md) · [Architecture](ARCHITECTURE.md) · [Contributing](../CONTRIBUTING.md)

## Prerequisites and first run

The root [package.json](../package.json) requires Node `^22.13.0 || >=24.0.0`. [.nvmrc](../.nvmrc) selects Node 22 for nvm and CI. Install dependencies from the repository root so npm links the workspaces correctly.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Skip the nvm commands if you already use a supported Node version. Open `http://localhost:5173/Catalogfore/`. Vite listens on all interfaces by default; use `npm run dev -w @cayfore/web -- --host 127.0.0.1` for loopback-only development. No backend, database, `.env`, or Databricks credentials are required.

## Verification commands

| Command                    | What it checks                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`             | ESLint, Prettier, and dependency boundaries                                                                              |
| `npm run typecheck`        | TypeScript across catalog, engine, workbook, web, and MCP workspaces                                                     |
| `npm run check:docs`       | Local file destinations in authored Markdown, including images and reference links; not heading anchors or external URLs |
| `npm run check:sources`    | Offline replay and consistency of retained price captures                                                                |
| `npm run check:unit-costs` | Compressed generated inventory matches source inputs                                                                     |
| `npm test`                 | Vitest with engine coverage thresholds, then Node script tests                                                           |
| `npm run test:fuzz`        | Bounded property-based parser/share-link checks                                                                          |
| `npm run build`            | Production web assets, prerendered landing page, and MCP bundle                                                          |
| `npm run test:mcp`         | Stdio tool listing and known fixture responses; build first                                                              |
| `npm run test:e2e`         | Chromium desktop/mobile Playwright flows, including accessibility checks                                                 |

Install the test browser with `npx playwright install chromium`. Linux environments without browser libraries can use `npx playwright install --with-deps chromium` with permissions to install OS packages.

Engine coverage is enforced by `npm test`: 90% lines, functions, and statements; 80% branches. Lint enforces boundaries and file-size rules, not coverage. A clean audit, test suite, or source replay supports only the checks it ran; none establishes complete security or live price validity.

## Check the production build

The default Playwright command starts Vite development mode. Check production separately because prerendering, hydration, CSP, and chunk loading differ.

Build, then keep this preview process running in one terminal:

```sh
npm run build
npm run preview -w @cayfore/web -- --host 127.0.0.1 --port 4175 --strictPort
```

In another terminal, from the repository root:

```sh
node scripts/console-routes.mjs
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4175/Catalogfore/ npm run test:e2e
```

The console-route script fails on console warnings/errors, page errors, and failed requests while exercising desktop/mobile navigation, editing, persistence, and FAQ access. Both commands use the already-running preview. Stop preview with Ctrl+C. Environment assignments above use POSIX syntax; on PowerShell set `$env:PLAYWRIGHT_BASE_URL` before running npm.

The [CI workflow](../.github/workflows/ci.yml) runs the browser suite against production preview. It also runs `npm audit --audit-level=low` and the lockfile-integrity check. The [Pages workflow](../.github/workflows/pages.yml) has its own build/deploy steps; it is not a duplicate of every CI check.

## Configuration

| Setting                                       | Location or variable                                                               | Scope                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Public site URL and `/Catalogfore/` base path | [site.ts](../apps/web/src/site.ts), consumed by [Vite](../apps/web/vite.config.ts) | Build output and navigation; update static metadata/links too when changing hosting |
| Browser test target                           | `PLAYWRIGHT_BASE_URL`                                                              | Uses an existing server instead of starting development Vite                        |
| Console-route target                          | `PREVIEW_URL`                                                                      | Defaults to `http://127.0.0.1:4175/Catalogfore/`                                    |
| GCP VM refresh credentials                    | `GCP_BILLING_API_KEY`                                                              | Optional maintainer price refresh only; not a browser runtime setting               |
| Skip AWS VM downloads                         | `SKIP_AWS=1`                                                                       | Maintainer refresh; retains stored values instead of downloading offers             |
| Repeat a fuzz case                            | `CAYFORE_FUZZ_SEED`, `CAYFORE_FUZZ_PATH`                                           | Test replay; see [security review](SECURITY-REVIEW.md#reproducing-fuzz-failures)    |

Do not put refresh credentials into frontend variables or committed files. Running the planner does not need optional credentials. Source-refresh commands can modify versioned data; see [DATA-PIPELINE.md](DATA-PIPELINE.md).

## Deployment

[GitHub Pages deployment](../.github/workflows/pages.yml) builds and deploys `main`, on a push or a manual run of that branch. It builds `apps/web/dist`, uploads a Pages artifact, and deploys through the `github-pages` environment. Configure the repository's Pages source as GitHub Actions and allow the workflow/environment to deploy. Repository settings are external state; the YAML alone does not prove they are enabled.

The configured site is `https://santoshshinde2012.github.io/Catalogfore/`. View routing uses query parameters; shareable plan inputs use a fragment. `404.html` is a static fallback. A local build or preview does not publish anything.

Production HTML receives a CSP and a prerendered default plan. Interaction becomes available after the client session is ready. GitHub Pages cannot provide a custom `frame-ancestors` response header through this repository's static files; the meta policy does not claim that protection. Fonts and executable assets are served with the app. [Security policy](../SECURITY.md)

## Common problems

| Symptom                                          | Check                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Install or jsdom fails on an unsupported runtime | Run `node --version`; select the declared Node range, then `npm ci`               |
| Page assets return 404                           | Include `/Catalogfore/` in the URL and match the build's base path                |
| Playwright cannot find Chromium                  | Run the browser installation command above                                        |
| Production tests connect to the wrong server     | Set `PLAYWRIGHT_BASE_URL`; set `PREVIEW_URL` separately for console routes        |
| Rate-artifact check reports stale output         | Review source changes, run `npm run export:unit-costs`, then recheck              |
| Source replay fails                              | Inspect captured data and mappings; do not rewrite expected values merely to pass |
| A large plan no longer appears in the address    | Use **Export → JSON**; oversized share links are deliberately rejected            |
