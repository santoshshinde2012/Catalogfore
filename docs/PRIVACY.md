# Privacy and local storage

[Documentation index](README.md) · [FAQ](FAQ.md)

The Catalogfore web app calculates in your browser. It does not send your forecast, imported usage rows, or share fragment to a Catalogfore backend, and it has no account system. CSV, Excel, JSON, and PDF downloads are generated locally.

## What is retained

| Location                             | Contents                                                                                     | How to remove or keep it                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Active session                       | Current inputs, imported preview, and workspace drafts                                       | Leaving/reloading ends the session; export JSON for a file backup                       |
| URL fragment                         | Shareable plan inputs, costs, names, and monthly summaries; ownership attribution is omitted | Remove the fragment or start a new forecast; browser history may retain older addresses |
| `cayfore:scenarios:v1` local storage | Up to 20 saved plans, including imported monthly and ownership summaries                     | Delete scenarios in the app or clear this site's browser storage                        |
| `cayfore-theme` local storage        | Light/dark preference                                                                        | Change appearance or clear site storage; legacy `dcf-theme` is migrated when possible   |
| Downloaded files                     | Reports and, for JSON, editable plan inputs and retained summaries                           | Manage these files and any copies yourself                                              |

Saved plans do not retain raw CSV records or full identity metadata. They can retain derived team/owner labels in ownership summaries. Workload names and other plan labels can also contain information you supplied; excluding attribution from a link is not a complete anonymization step.

## Sharing and backup

Anyone who receives a share URL can read its plan inputs. URL fragments are not included in the normal HTTP request for the page, but remain visible to browser history, extensions with access, and people or tools receiving the full URL. The project does not create a server copy of the link.

Share links omit ownership attribution and recalculate against the currently installed price book. JSON files retain the calculated report and can retain attribution summaries; review them before sharing. Reopening a saved plan recalculates it with the installed book and can warn when the stored version differs.

Only plans within the supported link limits are synchronized to the address. For oversized plans, the app removes the stale plan fragment, keeps the plan active in memory, and asks you to export JSON. Export before leaving or reloading. A JSON export backs up the active plan, not the full saved-scenario collection.

Browser storage can be blocked, cleared, or exhausted. Failed scenario saves remain available for the current session and show a session-only notice. Scenarios do not synchronize between browsers or devices. Open and export each scenario you need to retain.

## Network and other tools

Scripts, styles, fonts, bundled samples, and lazy-loaded code are served with the app. The build includes no analytics script and the app itself sets no cookie. Opening a source, documentation, or repository link navigates to that site's own service and policies. GitHub Pages and your browser have their own operational logs.

The CLI and stdio MCP server compute locally using supplied inputs; their current implementation does not connect to a Databricks workspace. This does not describe the privacy of an MCP client, an assistant, or an external connector you use to supply those inputs. Maintainer refresh scripts separately fetch public pricing/metadata and are not part of a browser import.
