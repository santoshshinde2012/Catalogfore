import { REPO } from "../site";
import { InfoTooltip } from "./ui/tooltip";

const sources = [
  {
    label: "Source",
    title: "Source code",
    description: "Explore Cayfore's implementation and contribute on GitHub.",
    href: REPO,
  },
  {
    label: "License",
    title: "MIT License",
    description: "Read the terms for using and adapting this open-source project.",
    href: `${REPO}/blob/main/LICENSE`,
  },
  {
    label: "Research",
    title: "Pricing research",
    description: "Review the published rate sources and research notes.",
    href: `${REPO}/blob/main/docs/RESEARCH.md`,
  },
  {
    label: "Architecture",
    title: "Architecture",
    description: "See how the catalog, forecasting engine, and web app fit together.",
    href: `${REPO}/blob/main/docs/ARCHITECTURE.md`,
  },
];

export function AppFooter({
  onForecast,
  onProducts,
  onRates,
  onHow,
}: {
  onForecast: () => void;
  onProducts: () => void;
  onRates: () => void;
  onHow: () => void;
}) {
  const navigation = [
    {
      label: "Forecast",
      description: "Return to your annual estimate and interactive cost charts.",
      href: "#forecast",
      action: onForecast,
    },
    {
      label: "Product map",
      description: "Understand Databricks products, their domains, and how they connect.",
      href: "?view=products",
      action: onProducts,
    },
    {
      label: "Unit costs",
      description: "Inspect per-unit pricing, source evidence, and downloadable rate dimensions.",
      href: "?view=rates",
      action: onRates,
    },
    {
      label: "How it works",
      description: "Understand the assumptions and pricing behind this estimate.",
      href: "#how-it-works",
      action: onHow,
    },
  ];
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex size-5 items-center justify-center rounded-md bg-foreground" aria-hidden="true">
                <span className="size-1.5 rounded-full bg-lava" />
              </span>
              Cayfore
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              An independent estimate of Databricks spend. Not a quote, and not affiliated with Databricks.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            {navigation.map(({ label, description, href, action }) => (
              <InfoTooltip key={label} label={label} description={description} side="top">
                <a
                  className="text-link underline-offset-4 hover:underline"
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    action();
                  }}
                >
                  {label}
                </a>
              </InfoTooltip>
            ))}
            {sources.map(({ label, title, description, href }) => (
              <InfoTooltip key={label} label={title} description={description} side="top">
                <a className="text-link underline-offset-4 hover:underline" href={href}>
                  {label}
                </a>
              </InfoTooltip>
            ))}
          </nav>
        </div>
        <p className="text-xs text-muted-foreground">MIT License</p>
      </div>
    </footer>
  );
}
