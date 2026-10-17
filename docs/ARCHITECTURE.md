# Architecture

Cayfore prices a portfolio by composing small units. The website and the MCP server both call the same engine. Neither one owns a rate table or a pricing formula.

```mermaid
flowchart TB
  subgraph presentation
    Web[React UI]
    MCP[stdio MCP]
    CLI[CLI]
  end
  subgraph application
    Simple[simple forecast]
    Projection[canonical projection]
    Products[product formulas]
    Usage[usage import]
    Recs[savings ranker]
  end
  subgraph domain
    Estimate[estimate]
    Registry[strategy registry]
    Forecast[forecast model]
    Policies[scenario policies]
  end
  subgraph infrastructure
    JSON[(versioned JSON)]
    Scripts[refresh and catalog watch]
  end

  Web --> Simple
  Web --> Products
  Web --> Recs
  Web --> Projection
  MCP --> Projection
  CLI --> Projection
  MCP --> Products
  Simple --> Projection
  Projection --> Estimate
  Projection --> Forecast
  Products --> Estimate
  Usage --> Products
  Estimate --> Registry
  Registry --> JSON
  Recs --> Projection
  Recs --> Policies
  Scripts --> JSON
```

## Units

| Unit                            | Responsibility                                                                                                                                 | Depends on                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `@cayfore/catalog`              | Product inventory: SKU, billing unit, confidence, citation, and the inputs a new row needs. Zod validates it.                                  | `data/product-catalog.json`                            |
| `@cayfore/catalog/map`          | Optional educational domains, aliases, relationships, and example architectures joined to catalog products; validates coverage and references. | `data/product-map.json`, product catalog               |
| `products.ts`                   | Turns a catalog id into one workload per underlying SKU, applies a named formula, and splits a 12-month forecast by product.                   | `@cayfore/catalog`, `createWorkload`                   |
| `catalog/pricing-catalog.ts`    | `PricingCatalog`. The bundled object reads the versioned JSON. A test can pass a different book.                                               | JSON files, via `catalog.ts`                           |
| `costing/strategies/*`          | One `CostStrategy` per workload kind. Each file prices that kind only.                                                                         | `PricingCatalog`, pure helpers in `costing/support.ts` |
| `costing/estimate-portfolio.ts` | Walks the portfolio, finds a strategy, scales lines, adds the add-on. It does not know how a SKU is priced.                                    | `CostStrategy[]`, `PricingCatalog`                     |
| `forecast/model.ts`             | Turns one month’s estimate into 12–36 points. Growth and seasonality only.                                                                     | An `Estimate`                                          |
| `forecast/series.ts`            | Fits an imported usage history to twelve months, with an approximate interval.                                                                 | Usage points                                           |
| `projection.ts`                 | Returns the canonical dated estimate, forecast points, monthly planning ranges, annual total, and assumptions for every caller.                | Pricing and forecast services                          |
| `forecast/portfolio.ts`         | Evaluates product formulas and usage events for each explicit forecast month.                                                                  | Cost strategies, formula registry                      |
| `usage/`                        | Parses uploads through source adapters, preserves typed billing records, selects periods, aggregates costs, and builds a preview/portfolio.    | CSV parser, catalog, injected reporting cutoff         |
| `commitments.ts`                | Prices a hypothetical prepaid USD list-value allowance, unused balance, and PAYG overflow.                                                     | Pure money helpers                                     |
| `policies/scenario-policies.ts` | Named mutations: serverless, Photon, spot, commits. Each policy is data plus `apply`.                                                          | `PricingCatalog` when a policy needs a rate            |
| `recommend.ts`                  | Ranks policies and the autostop / right-size adjustments by annual dollars.                                                                    | `projectPortfolio`, `applyScenario`                    |
| `simple/`                       | Turns four inputs into a portfolio. Mix, presets, monthly growth, and a usage file set workload sizes. It does not price a SKU itself.         | `projectPortfolio`, sizing helpers                     |
| `apps/web/src/hooks`            | Session and derived view state: URL, theme, bands, recommendations.                                                                            | Engine functions                                       |
| `apps/web/src/components`       | Presentational pieces. They receive data and callbacks. The Advanced ledger reads the product catalog for the picker and the per-product year. | Props, product catalog                                 |

## How SOLID shows up

**Single responsibility.** A cluster file does not forecast. The forecast file does not know what a DBU is. A React card does not encode the URL hash. `useSimpleForecast` does. The simple module only chooses workload sizes. `estimate()` still prices them.

The product map loads through an optional catalog entry point and a separate web chunk. Pricing-only callers do not load or validate educational metadata. View navigation uses the `view=products` query parameter; the session owns the `#plan=` fragment and synchronizes it when view history changes. Explicit map additions use the existing product workload factory, preserve the current portfolio, and support Undo.

**Open/closed.** A new workload kind is a new strategy file added to `defaultCostStrategies`, plus a presentational editor registered in `components/editor/registry.tsx`. `estimate()` does not grow a switch. A new product that uses a kind already in the registry is a row in `data/product-catalog.json`. The Advanced picker and the schema-driven fields read that row, so the new product does not need a new React component. A new what-if is a new `ScenarioPolicy` in the policy list. `applyScenario` looks the policy up. The four-input page is another caller of those interfaces. Changing the mix does not add a formula to the strategies.

**Liskov.** Every `CostStrategy` accepts a workload and a `CostContext` and returns a `RawLine`. Callers do not special-case the kind after the quote. Every `ScenarioPolicy` returns a new portfolio and leaves the input alone.

**Interface segregation.** Strategies see `PricingCatalog`, not the JSON documents and not the React tree. The growth-only forecast accepts an `Estimate`; dated orchestration receives a portfolio so it can apply product formulas and usage events. Presentational components see the fields they render.

**Dependency inversion.** `estimate(portfolio, dependencies)` takes a catalog and a strategy list. The default is the bundled book. Tests pass a fake catalog and, in one case, a strategy that did not exist when the estimator was written. Scenario policies receive the catalog instead of importing a global rate table for the spot discount and the Photon multiplier.

## What stays pure

Pricing, forecasting, policies, recommendations, and portfolio normalization are functions of their arguments. They do not read the clock, the network, or `localStorage`. Product formulas receive an explicit date; deterministic defaults come from the versioned catalog. Upload reporting cutoffs are supplied by the web, CLI, or MCP boundary. Web session modules own URL state, local scenarios, theme, uploads, and clipboard actions.

The UI and exports receive `projectPortfolio` results. Charts prepare display rows without introducing rate formulas. A custom or imported rate has explicit provenance; ordinary product rows rehydrate catalog-owned prices. Missing rates contribute a known subtotal and visible unresolved lines. Source quality and model-only intervals are distinct concepts.

## Source resolution

`catalog.ts` resolves exact Azure meters and validated first-party Databricks regional prices before reference fallbacks. Price-source metadata travels with the resolved observation. The forecast strategies, unit-cost projection, imported usage estimates, and Excel source sheets use these same lookup functions. Known conflicting first-party values produce unresolved components and a known subtotal.

Network retrieval belongs to scripts. Fixed first-party endpoints produce retained compressed captures and normalized USD/DBU rows. Offline replay verifies the captures' SHA-256 fingerprints, dimensions, unit mappings, accepted values, and quarantines. The runtime engine reads those versioned inputs without network access. Publisher identity, numeric role, observation date, scope, and consumption assumptions contribute separately to evidence classification; a vendor hostname alone does not verify a price.

## Unit-cost visibility

The optional `@cayfore/engine/unit-costs` module projects the product catalog, pricing inputs, applicable dimensions, and source evidence into a read-only unit-cost inventory. The core catalog remains independent of the engine. The builder performs no IO and does not read the clock; UI, CLI, and artifact generation share its rows and serializers. A quoted quantity basis and normalized dollars per raw unit prevent token or request-batch prices from being mistaken for single-unit rates. Conditional factors and allowances remain distinct from dollar prices.

The Unit costs UI and evidence data load only when that view opens. Query parameters own product/reference-placement navigation; the portfolio remains in its existing URL fragment. Unit-cost calculations do not replace forecast workloads. Browser downloads and the CLI emit ordinary CSV/JSON; `scripts/unit-costs.ts` also writes compressed canonical artifacts. CI decompresses and compares their full contents, while weekly refreshes regenerate them after their input files change. Source observation dates survive documentation reviews and rebuilds.

## Errors

A missing strategy throws `MissingCostStrategyError`. A scenario id that is not in the supplied policy list throws `UnknownScenarioError`. A JSON file that is not a forecast is rejected in the session hook with a visible alert. PDF export reports a failure on the page instead of failing silently.

## Review on 2026-10-16

| Finding                                                                       | Fix                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Several modules mixed lookup, formulas, and forecasting, or passed 200 lines. | Split along the existing seams: formulas, product forecast, CSV parsing, portfolio normalization, forecast fits, plan edits, plan sections, MCP tools, price refresh. |
| Exporters and usage importers were direct calls.                              | `forecastExporters` and `usageImporters` are registries. Formulas and cost strategies already were.                                                                   |
| Strategy tests named kinds one by one.                                        | One contract test runs every registered strategy and every catalog formula.                                                                                           |
| The engine could have imported React or `fetch` without a CI failure.         | `dependency-cruiser` plus ESLint restricted globals. Costing cannot import the product or simple modules.                                                             |
| Confidence was a word, not a score, and proxy cells were not counted.         | `confidenceScore` on each product. `data/rate-confidence.json` scores every cloud, region, tier, and SKU cell.                                                        |
| Actions used floating tags. Coverage had no threshold.                        | Action SHAs are pinned. Engine lines, functions, and statements must stay at or above 90%.                                                                            |

## Checks

ESLint (including `@typescript-eslint/no-explicit-any` and a 200-line module cap), Prettier, and dependency-cruiser run from `npm run lint`. Vitest covers the bundled estimate, the strategy contract, and the formula registry. Engine coverage is enforced in that run.
