import { navigateToSection } from "../../lib/page-navigation";

const sections = [
  ["plan-inputs", "Inputs"],
  ["forecast", "Forecast"],
  ["budget-planning", "Budget and scenarios"],
];

export function PlanIntroduction() {
  return (
    <div className="lg:flex lg:items-end lg:justify-between lg:gap-6">
      <header className="max-w-3xl lg:flex-1">
        <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Databricks cost planner
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          What does the next year cost?
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Set cloud, starting spend, workload mix, and monthly growth. The year updates as you go.
        </p>
      </header>
      <nav aria-label="Plan sections" className="mt-2 flex flex-wrap gap-x-5 text-sm lg:shrink-0 print:hidden">
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-11 items-center font-medium text-link underline-offset-4 hover:underline"
            onClick={(event) => {
              event.preventDefault();
              navigateToSection(id);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
