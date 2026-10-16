import { ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export function UsagePanel({
  busy,
  error,
  onFile,
  onSample,
}: {
  busy: boolean;
  error: string;
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted">
        Use my real usage
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <p className="text-sm text-muted-foreground">
          Upload a <code className="font-mono text-xs">system.billing.usage</code> CSV. One month replaces the spend and
          the mix. Several months also fit a trend, and the growth field shows that rate. Cloud and discount stay as you
          set them.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <label>
              {busy ? "Reading…" : "Choose CSV"}
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                aria-label="Usage CSV"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onFile(file);
                }}
              />
            </label>
          </Button>
          <Button type="button" variant="outline" onClick={onSample} disabled={busy}>
            Load a sample
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
