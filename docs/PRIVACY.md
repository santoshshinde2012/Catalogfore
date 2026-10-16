# Privacy

Cayfore calculates in the browser. The page does not send the forecast, the usage file, or the share link to a Cayfore server. There is no account.

A usage CSV is read on your machine. It is not uploaded. The same is true of the exports: CSV, JSON, and PDF are built locally.

The share link keeps the plan in the URL hash. Opening or forwarding that link shares the plan with whoever can see the address. It is not stored on a server by this project.

The theme choice is stored in this browser under the key `cayfore-theme`. A browser that still has the previous key `dcf-theme` is copied once, and that old key is removed.

Scripts, styles, and fonts are served with the page. The build does not load an analytics script and does not set a cookie. The only value stored in this browser is the theme, and it is either `light` or `dark`.

GitHub Pages, and your browser, still have their own logs. This note covers what Cayfore itself does.
