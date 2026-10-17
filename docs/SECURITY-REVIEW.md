# Security findings and remediation

Reviewed on 18 October 2026 against GitHub's authenticated Security APIs. The original dashboard contained two CodeQL findings and six OpenSSF Scorecard findings on `main`. Scanner jobs passing on a pull request does not mean every existing default-branch alert is resolved.

| Alert                                                                      | Finding                                              | Remediation and verification                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1](https://github.com/santoshshinde2012/cayfore/security/code-scanning/1) | RSS entity double decoding                           | Decode the supported XML entities in one pass. Nested escaped markup stays escaped; tests cover titles, links, GUIDs and CDATA.                                                                                                                                                                    |
| [2](https://github.com/santoshshinde2012/cayfore/security/code-scanning/2) | Release version used in a dynamic regular expression | Select literal changelog headings after strict version validation. CLI tests reject wildcard dots, malformed brackets and injected version text.                                                                                                                                                   |
| [3](https://github.com/santoshshinde2012/cayfore/security/code-scanning/3) | Unprotected `main`                                   | Applied the versioned [branch policy](../.github/branch-protection.json): require PRs, current CI/security checks from their expected GitHub Apps, resolved conversations, and no force pushes or deletion. Includes administrators. Independent review is a separate remaining requirement below. |
| [4](https://github.com/santoshshinde2012/cayfore/security/code-scanning/4) | Incomplete historical SAST coverage                  | CodeQL runs on PRs and `main`, and its analysis and aggregate checks are required before merging. Historical unchecked changes remain in Scorecard's rolling sample until newer checked changes replace them.                                                                                      |
| [5](https://github.com/santoshshinde2012/cayfore/security/code-scanning/5) | No detected fuzzing                                  | Add fast-check properties for JSON, CSV, spreadsheet formula prefixes and share links. Every `npm test` run includes them. The default seed executes 10,000 generated cases; failures report a shrink path for replay.                                                                             |
| [6](https://github.com/santoshshinde2012/cayfore/security/code-scanning/6) | No independent approvals in recent changes           | GitHub currently lists only the owner as a collaborator. Add an independent human reviewer, then require approvals. AI review and the author's own checks do not satisfy this finding. Existing review history cannot be rewritten by a code fix.                                                  |
| [7](https://github.com/santoshshinde2012/cayfore/security/code-scanning/7) | Repository younger than 90 days                      | GitHub records creation on 15 October 2026. Scorecard's maintenance check requires more than 90 days of history. Continue maintaining the project; there is no immediate code change that satisfies this criterion.                                                                                |
| [8](https://github.com/santoshshinde2012/cayfore/security/code-scanning/8) | No OpenSSF Best Practices badge                      | A maintainer must register the project and attest to the applicable criteria at [bestpractices.dev](https://www.bestpractices.dev/). No badge or certification is claimed by this repository.                                                                                                      |

No alerts are dismissed or scanner rules suppressed to improve the score. Code alerts reconcile after their fixes merge into `main` and the default-branch analyses finish. Scorecard's fuzzing detection also examines the default branch; a PR result alone cannot prove the dashboard has updated.

## Additional verified input fixes

Property-based tests found that the malformed share payload `y` could throw before the decoder's error boundary, preventing the planner from initializing. Failed decompression now returns the existing invalid-link result. Browser tests open that exact link and verify that the planner recovers and remains interactive.

Share decoding enforces its output limit during expansion, before allocating an oversized entry or appending it. Dictionary entries and retained dictionary text have bounds derived from the output limit. The pure decoder preserves the installed LZ-string URI format and its MIT attribution. Compatibility tests cover legacy fixtures, arbitrary UTF-16, Unicode, exact limits and a small compressed payload whose output exceeds the limit. An input-length cap alone does not prevent excessive expansion.

Spreadsheet text neutralization now includes line feeds and full-width `＝`, `＋`, `－` and `＠`, alongside the original ASCII prefixes. Quoted CSV tests preserve embedded separators, quotes, newlines and Unicode text. This protects the initial export; spreadsheet applications can remove escaping when a CSV is re-saved. See [OWASP's CSV injection guidance](https://community.owasp.org/attacks/CSV_Injection).

## Repository controls

Dependabot alerts, the dependency graph and Dependabot security updates were enabled and read back through GitHub's API. Secret scanning and push protection were already enabled. The review found no open secret-scanning or Dependabot alerts; `npm audit --audit-level=low` also passed. Dependency status is time-sensitive and should be rechecked in CI.

The [branch policy](../.github/branch-protection.json) requires `check`, `Analyze`, `scan` and `OpenSSF Scorecard` from GitHub Actions (App 15368), and `CodeQL` from GitHub Advanced Security (App 57789). These are actual check names observed on successful runs. The policy preserves the existing merge-commit workflow. It does not require an unavailable second reviewer. After a reviewer joins, enable at least one required approval and approval of the most recent push, then update the versioned policy.

To inspect or reapply the reviewed controls as a repository administrator:

```sh
gh api repos/santoshshinde2012/cayfore/branches/main/protection
gh api --method PUT repos/santoshshinde2012/cayfore/branches/main/protection --input .github/branch-protection.json
gh api repos/santoshshinde2012/cayfore/vulnerability-alerts
gh api repos/santoshshinde2012/cayfore/automated-security-fixes
```

Only trusted default-branch pushes and scheduled Scorecard runs publish results and upload SARIF. PR runs retain their artifacts without publishing repository-wide findings.

## Reproducing fuzz failures

```sh
npm run test:fuzz
CAYFORE_FUZZ_SEED=8675309 npm run test:fuzz
CAYFORE_FUZZ_SEED=20261018 CAYFORE_FUZZ_PATH=479:10:4 npm run test:fuzz -- -t 'handles arbitrary share-link text'
```

The fixed seed makes CI reproducible. Alternate seeds broaden local exploration. The generated inputs are bounded; they complement exact regressions and parser limits rather than proving every input safe.

Criteria and limitations follow the official [Scorecard check documentation](https://github.com/ossf/scorecard/blob/main/docs/checks.md) and [GitHub branch protection documentation](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection).
