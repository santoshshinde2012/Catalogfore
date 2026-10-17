# Privacy

Cayfore calculates in the browser. The page does not send the forecast, the usage file, or the share link to a Cayfore server. There is no account.

A usage CSV is read on your machine. It is not uploaded. The same is true of the exports: CSV, JSON, and PDF are built locally.

The share link keeps the plan in the URL hash. Opening or forwarding that link shares the costs, workload names, assumptions, and monthly observations with whoever can see the address. Ownership attribution labels are omitted from links. It is not stored on a server by this project.

Named scenarios are stored locally under `cayfore:scenarios:v1`. They include plan inputs, monthly usage summaries, and any ownership summaries imported for that scenario. Delete a scenario using its Delete button or clear the site's browser storage. JSON downloads can retain these ownership summaries; review the file before sharing it. Saved plans do not retain raw CSV rows or full identity metadata. If browser storage is unavailable, scenarios remain available for the current session and the page recommends exporting a copy.

The theme choice is stored in this browser under the key `cayfore-theme`. A browser that still has the previous key `dcf-theme` is copied once, and that old key is removed.

Scripts, styles, and fonts are served with the page. The build does not load an analytics script and does not set a cookie. Browser storage contains the theme and any scenarios the user saves.

GitHub Pages, and your browser, still have their own logs. This note covers what Cayfore itself does.
