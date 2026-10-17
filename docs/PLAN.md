# Product behavior

Updated **2026-10-17**. Pricing sources are in [RESEARCH.md](RESEARCH.md), import semantics in [USAGE-IMPORT.md](USAGE-IMPORT.md), and module boundaries in [ARCHITECTURE.md](ARCHITECTURE.md).

Cayfore helps a Databricks owner prepare a budget and compare planned changes without workspace credentials. It is a browser-local estimate, not a vendor quote. The web app, CLI, and MCP use the same cost and forecast engine.

## Start a plan

The quick estimate accepts cloud, tier, region, starting monthly spend or a team-size anchor, workload mix, monthly growth, and a hypothetical commitment discount. Its three archetypes are classic jobs, serverless SQL, and foundation-model tokens. These are sizing assumptions, not an invoice reconstruction.

Advanced adds or edits individual products. Global growth, pricing, and budget changes preserve the detailed workloads. Switching back to the quick basket is explicit and can be undone. Monthly growth supports declining and growing usage.

The default AWS Premium example remains about **$170,258 per year**, with **$11,997** in its first month. The planning range is an assumption range; it is not a calibrated probability interval.

## Plan from observed usage

Databricks billing exports and recognized FOCUS cost columns use one shared typed parser. The app reviews the selected month, cost basis, currencies, pricing gaps, signed corrections, and ownership before applying the file. Replacing the baseline is the default. Append is explicit; the same source and month cannot be appended twice.

A closed calendar month is selected by default. Partial months require explicit selection and are not silently extrapolated. Selecting an older month excludes later observations from the fit. Original, retraction, and restatement quantities remain signed. Mixed units are not added together as DBUs. Unsupported monetary currencies are rejected.

Exported monetary costs remain the baseline. No synthetic VM bill is added. Missing-price DBU rows use the correct SKU as an approximation; unsupported charges remain visibly unresolved. FOCUS imports include the services present in the file and distinguish effective amortized cost from billed cash cost. This import does not claim full FOCUS conformance.

The import preserves monthly observations and ownership summaries for local inspection. Charts use USD history only when it is a dollar series. DBU-only history is shown separately in the observed-history table. Raw CSV records are not placed in saved plans or shared links.

## One forecast result

`projectPortfolio(portfolio, dependencies)` returns the authoritative estimate, dated monthly points, planning bands, annual sum, and explanations. The quick planner delegates to it. Every result, export, product breakdown, recommendation, and caller uses the same forecast arithmetic.

Prices and product formulas are evaluated for each forecast month. Promotions expire on their actual dates. Planned usage events take effect in their selected month and continue afterward; multipliers compose, and zero retires a workload. Forecast dates and reporting cutoffs are explicit inputs. Legacy engine-only defaults use the catalog verification date; application boundaries supply the current observation date for imports.

Historical fits retain calendar spacing and zero periods. Validation fits parameters using only training observations. The model-only interval is distinct from source-quality and infrastructure assumptions. Synthetic examples test behavior and do not establish customer forecast accuracy.

Each cost line carries price status and provenance. The UI distinguishes priced, approximate, unresolved, and documented zero-price lines. A total with unresolved charges is a known subtotal. Source-confidence scores remain evidence-quality rubrics, not probabilities.

## Budget and scenarios

An optional annual USD budget adds variance and an equally phased monthly budget line. The cumulative chart states that annual budget is divided by 12; it does not invent a custom finance schedule.

Named scenarios can be saved, duplicated, opened, deleted, and compared locally. Monthly comparisons align calendar dates. When forecast start dates differ, annual comparisons state that each figure covers its own first 12 months.

Individual savings cards compare against the current plan and may overlap. Their advertised saving equals the reduction produced by Apply. Applying one recalculates the other alternatives.

A separate commitment what-if takes a user-supplied eligible list-spend baseline, a 12-month USD list-value allowance, and a purchase discount. It includes prepaid cost, unused balance, overage, and break-even. It does not infer DBCU conversions or replace a real contract's terms.

## Graphs and exports

The app offers dated imported-history and forecast lines, a planning range, a budget line, a saved-scenario overlay, cumulative forecast versus budget, stacked monthly cost components, a workload donut, and an accessible month table. Historical observations and future estimates use distinct series. Tooltips and tables show actual computed amounts; chart components do not invent costs.

Mobile navigation moves directly between inputs and results. Section links preserve the saved plan and focus their destinations. Numeric drafts validate before changing the forecast; the advanced editor manages focus when selecting, adding, closing, and removing workloads. Import actions remain visible while details scroll. See [USABILITY.md](USABILITY.md) for the checked workflows.

CSV, Excel, JSON, and PDF exports use the same canonical forecast as the screen. The workbook adds live totals, rates, and sources. JSON includes source context, calculated quote, bands, assumptions, and saved inputs. Saved files are validated against the supported version and workload schemas before replacing the active plan.

Share links use a namespaced fragment and internal navigation preserves that state. Links exclude ownership attribution labels; JSON downloads and local saved scenarios can retain them. See [PRIVACY.md](PRIVACY.md).

Saved plans record their price-book version. When the installed catalog differs, a visible warning explains that the historical book is unavailable and current prices are being used. Accepting the current catalog is explicit. Exported quotes retain the original calculated report; older catalog replay requires supplying that catalog separately.

## Architecture and delivery

Cost strategies, product formulas, usage sources, scenario policies, and exporters have explicit interfaces or registries. Business pricing stays in the engine. Web hooks own browser state, storage, uploads, and clipboard actions. Charts render prepared series. Dependency-cruiser enforces layer boundaries, and modules stay below the repository's 200-line limit.

Use Node **22.13+ within Node 22, or Node 24+**; `.nvmrc` and workflows select Node 22. Checks include lint, typecheck, covered engine tests, script tests, CLI/MCP checks, production build, and desktop/mobile Playwright flows with axe.

The app retains GitHub Pages deployment at `/cayfore/`. This implementation changes source locally; publishing remains the repository's existing deployment workflow.

## Work requiring additional evidence

Customer interviews, consented bill reconciliation, and customer-data forecast backtests require representative participants or data. Full FOCUS export conformance, automated waste diagnosis, multi-export history merging, and live scheduled workspace collection need separate validated requirements. Billing amounts alone cannot prove CPU idleness or safe downsizing. Current architecture and honest source labels allow those features to be added without pretending their evidence already exists.
