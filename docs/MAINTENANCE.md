# Dependency maintenance

The repository's [Dependabot configuration](../.github/dependabot.yml) groups routine npm and GitHub Actions updates. Use [Development and verification](DEVELOPMENT.md) for the current supported runtime and checks.

Routine updates share one weekly `dependencies` multi-ecosystem group, with an open-PR limit of one and a seven-day cooldown. Check the default branch configuration and current PRs when investigating an update; a local YAML change does not prove GitHub has applied it.

Security updates remain enabled and grouped by ecosystem. GitHub does not support combining security updates across ecosystems or combining them with routine version updates. Security alerts can therefore create additional PRs. The weekly catalog workflow still reviews product data; it did not create the nine dependency PRs covered here.

## Historical consolidation decisions: 2026-10-17

The following table records the 2026-10-17 maintenance review of specific proposed versions. It is not an instruction to install those versions today; evaluate current package metadata, the supported Node range and compatibility tests before a migration. Original branches and PR history provide the review context.

| Original PR                                                                                                                      | Proposal                   | Decision                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#6](https://github.com/santoshshinde2012/Catalogfore/pull/6)                                                                    | setup-node 7.1.0           | Include its verified SHA in every workflow; keep the application on Node 22 from `.nvmrc`.                                                                            |
| [#7](https://github.com/santoshshinde2012/Catalogfore/pull/7)                                                                    | create-pull-request 8.1.1  | Include its verified SHA in the weekly catalog workflow.                                                                                                              |
| [#13](https://github.com/santoshshinde2012/Catalogfore/pull/13), [#14](https://github.com/santoshshinde2012/Catalogfore/pull/14) | CodeQL 4.38.3              | Update init, analyze, and SARIF upload together to the verified v4 SHA.                                                                                               |
| [#8](https://github.com/santoshshinde2012/Catalogfore/pull/8)                                                                    | @eslint/js 10.0.1          | Defer until ESLint and its React, Hooks, and TypeScript plugins can be migrated together. This package requires ESLint 10; the current toolchain uses ESLint 9.       |
| [#9](https://github.com/santoshshinde2012/Catalogfore/pull/9)                                                                    | @vitejs/plugin-react 6.1.2 | Defer with the Vite migration. Its Vite 8 peer requirement does not match the web app's Vite 6.                                                                       |
| [#10](https://github.com/santoshshinde2012/Catalogfore/pull/10)                                                                  | jsdom 30.1.2               | Defer until the supported Node range is revised. It requires Node 22.22.2+, 24.15+, or 26+, while this repository also supports earlier Node 22 and 24 releases.      |
| [#11](https://github.com/santoshshinde2012/Catalogfore/pull/11)                                                                  | vite-node 6.0.0            | Defer as a coordinated CLI runner migration with focused CLI/MCP checks. It brings its own Vite 8 dependency; coexistence alone does not establish CLI compatibility. |
| [#12](https://github.com/santoshshinde2012/Catalogfore/pull/12)                                                                  | @types/node 26.6.5         | Keep Node types on major 22, aligned with the minimum supported runtime. Node 26 types expose APIs unavailable on Node 22.                                            |

That consolidation did not change npm package versions or the lockfile. Major updates remain eligible for future grouped proposals; the table records the migration work identified for those particular versions.

## Validation and sources

GitHub Actions stay pinned to full commit SHAs. Their internal Node 24 runtime is independent of the application's `.nvmrc` selection. The existing GitHub-hosted `ubuntu-latest` runners support it; self-hosted runners would need version 2.327.1 or newer.

The Actions updates are checked in hosted CI, CodeQL, Security, and Scorecard. The local build, tests, and production browser checks remain the verification path in [CONTRIBUTING.md](../CONTRIBUTING.md).

- [Dependabot multi-ecosystem grouping](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-multi-ecosystem-updates)
- [Dependabot security-update limitations](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates)
- [setup-node 7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), [create-pull-request 8 migration](https://github.com/peter-evans/create-pull-request/blob/v8.1.1/docs/updating.md), [CodeQL 4.38.3](https://github.com/github/codeql-action/releases/tag/v4.38.3)
- Official npm package metadata: [@eslint/js](https://registry.npmjs.org/@eslint%2Fjs/10.0.1), [React plugin](https://registry.npmjs.org/@vitejs%2Fplugin-react/6.1.2), [jsdom](https://registry.npmjs.org/jsdom/30.1.2), [vite-node](https://registry.npmjs.org/vite-node/6.0.0), [Node types](https://registry.npmjs.org/@types%2Fnode/26.6.5)
- [Vite migration guide](https://vite.dev/guide/migration)
