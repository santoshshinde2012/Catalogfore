/** Loads Plausible only when a build sets VITE_PLAUSIBLE_DOMAIN. Off for the public site. */
export function installOptionalAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) return;
  if (document.querySelector("script[data-cayfore-analytics]")) return;
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = domain;
  script.dataset.cayforeAnalytics = "plausible";
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}
