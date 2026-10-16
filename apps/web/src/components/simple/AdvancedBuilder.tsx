import type { Estimate, Portfolio } from "@cayfore/engine";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Ledger } from "../Ledger";

export function AdvancedBuilder({
  open,
  ask = 0,
  portfolio,
  estimate,
  selectedId,
  onPortfolio,
  onSelect,
  onRemove,
}: {
  open: boolean;
  ask?: number;
  portfolio: Portfolio;
  estimate: Estimate;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open || ask > 0) setOpened(true);
  }, [open, ask]);
  return (
    <Sheet open={opened} onOpenChange={setOpened}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-between px-2 py-2 font-medium">
          Advanced
          <ChevronRight className="size-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced</SheetTitle>
          <SheetDescription>
            The same forecast, one workload at a time. Edits here replace the sliders until you change an input on the
            page.
          </SheetDescription>
        </SheetHeader>
        <Ledger
          portfolio={portfolio}
          estimate={estimate}
          selectedId={selectedId}
          onPortfolio={onPortfolio}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      </SheetContent>
    </Sheet>
  );
}
