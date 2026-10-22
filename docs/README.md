# Documentation

[Open Catalogfore](https://santoshshinde2012.github.io/Catalogfore/) · [Repository overview](../README.md)

Catalogfore is a local Databricks planning tool with bundled pricing snapshots. Choose a guide by the task you want to complete.

## Plan and compare

| Task                                                   | Guide                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Choose a starting point and understand the result      | [FAQ](FAQ.md), [worked walkthroughs](USABILITY.md)                                                   |
| Import billing data and choose a baseline month        | [Usage import](USAGE-IMPORT.md), [export SQL](usage-export.sql), [export notebook](cayfore-usage.py) |
| Find products, relationships, and supported additions  | [Product map](PRODUCT-MAP.md)                                                                        |
| Inspect prices, compare regions, or download rate rows | [Unit costs](UNIT-COSTS.md)                                                                          |
| Save, share, back up, or remove local data             | [Privacy and storage](PRIVACY.md)                                                                    |
| Check supported behavior and remaining limits          | [Product behavior](PLAN.md), [remaining work](ROADMAP.md)                                            |

## Run and extend

| Task                                                             | Guide                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Install, run checks, preview production, or configure deployment | [Development](DEVELOPMENT.md)                                                                                                   |
| Run a forecast or export rates from a shell                      | [CLI](CLI.md)                                                                                                                   |
| Connect a local MCP client                                       | [MCP tools](MCP.md)                                                                                                             |
| Understand layers, ports, and extension points                   | [Architecture](ARCHITECTURE.md)                                                                                                 |
| Change a price or contribute code                                | [Contributing](../CONTRIBUTING.md), [catalog schema](CATALOG.md)                                                                |
| Refresh prices and replay retained source evidence               | [Data pipeline](DATA-PIPELINE.md)                                                                                               |
| Review dependency or security maintenance                        | [Dependency maintenance](MAINTENANCE.md), [dated security review](SECURITY-REVIEW.md), [report a vulnerability](../SECURITY.md) |

## Inspect the evidence

- [Research notes](RESEARCH.md) explain source observations, assumptions, and dated decisions. Historical notes are not a claim that prices remain current.
- [Product inventory](PRODUCTS.md) and [coverage report](COVERAGE.md) are generated from bundled data; regenerate them rather than editing their rows.
- [Unit-cost artifacts](../data/generated/) include compressed CSV/JSON projections. [Source captures](../data/sources/) retain inputs used by offline replay.
- [Naming](NAMING.md), [source attribution](../NOTICE), and [license](../LICENSE) cover project identity and provenance.

Code, committed data, and executable checks determine current behavior. No document certifies live vendor prices, negotiated terms, regional availability, or customer forecast accuracy.
