import type { Estimate, Portfolio } from "@dcf/engine";
import { useEffect, useState } from "react";
import { Ledger } from "../Ledger";

export function AdvancedBuilder({
  open,
  portfolio,
  estimate,
  selectedId,
  onPortfolio,
  onSelect,
  onRemove,
}: {
  open: boolean;
  portfolio: Portfolio;
  estimate: Estimate;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  return (
    <details className="fold" open={opened} onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary>Advanced</summary>
      <p className="hint">
        The same forecast, one workload at a time. Edits here replace the sliders until you change an input above.
      </p>
      <Ledger
        portfolio={portfolio}
        estimate={estimate}
        selectedId={selectedId}
        onPortfolio={onPortfolio}
        onSelect={onSelect}
        onRemove={onRemove}
      />
    </details>
  );
}
