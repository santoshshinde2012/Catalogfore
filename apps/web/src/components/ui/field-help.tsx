import { CircleHelp } from "lucide-react";
import { InfoTooltip } from "./tooltip";

export function FieldHelp({ label, description }: { label: string; description: string }) {
  return (
    <InfoTooltip label={label} description={description} openOnClick>
      <button
        type="button"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Help: ${label}`}
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </button>
    </InfoTooltip>
  );
}
