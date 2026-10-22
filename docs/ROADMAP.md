# Remaining work and evidence gaps

[Documentation index](README.md) · [Current behavior](PLAN.md)

This is a scope and evidence register, not a release schedule. Implemented features belong in [PLAN.md](PLAN.md); items here require additional design, data, or validation. The project makes no delivery-date or competitor-parity promise.

## Available now

The source includes local budget variance, named scenarios, dated usage changes, Databricks/FOCUS import review, ownership summaries, price provenance, Product map, Unit costs, regional comparisons, and forecast exports. The CLI and stdio MCP adapters use the shared engine. These features do not establish production accuracy for a particular customer's workload.

## Work that needs further evidence

| Area                       | Current boundary                                                                        | Evidence or decision needed                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Forecast accuracy          | Synthetic fixtures and arithmetic/regression checks; no general customer-accuracy claim | Consented, representative bill histories; held-out backtests; documented error by workload and horizon                                   |
| Usability                  | Automated accessibility checks and reproducible walkthroughs                            | Participant research across intended roles and assistive technologies                                                                    |
| Pricing coverage           | Curated snapshots, explicit proxies and conflicts                                       | First-party evidence for additional dimensions; reconciliation of conflicting observations; review of availability separately from price |
| Currency                   | USD prices and monetary imports                                                         | Clear conversion-date policy, FX source, and separation of display conversion from billing tariffs                                       |
| Live collection and alerts | Manual local imports; no scheduled workspace connection or budget delivery              | Authentication boundary, permissions, credential storage, failure handling, and explicit user requirements                               |
| Shared scenario libraries  | Browser-local saves and individual JSON backups                                         | Storage/service ownership, access controls, conflict resolution, and retention requirements                                              |
| Contract modeling          | User-supplied discounts and a hypothetical prepaid USD allowance                        | Verified contract terms and billing semantics; no inferred DBCU conversion                                                               |
| Optimization               | Scenario comparisons based on modeled inputs                                            | Telemetry and workload constraints before claims about idleness, performance, or safe downsizing                                         |
| Broader FOCUS support      | Recognized cost/usage columns in USD                                                    | Version-specific conformance tests and explicit handling of unsupported datasets                                                         |
| History merging            | Replacement or explicit append with overlap protection                                  | Rules for reconciling multiple exports, corrections, scopes, and historical continuity                                                   |

## What does not count as validation

A vendor hostname does not by itself verify a numeric rate. Passing offline source replay proves retained data is internally reproducible, not that a vendor price is current. Passing tests does not certify every input, every browser, or a security posture. An invoice subtotal does not prove capacity, service availability, or the performance effect of a recommended change.

Prior competitor comparisons are not maintained as current feature claims. Use official product documentation and a dated hands-on evaluation when a competitive decision is needed.

## Propose a change

Describe the user task, an example input, the expected result, and the evidence needed to accept it. Keep private invoices, contracts, and credentials out of public issues. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for implementation and source updates, or [SECURITY.md](../SECURITY.md) for private vulnerability reporting.
