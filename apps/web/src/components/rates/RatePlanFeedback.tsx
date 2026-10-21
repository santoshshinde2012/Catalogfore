import { Button } from "../ui/button";

export function RatePlanFeedback({
  notice,
  canUndo,
  onView,
  onUndo,
}: {
  notice: string;
  canUndo: boolean;
  onView: () => void;
  onUndo: () => void;
}) {
  return (
    <section
      aria-label="Forecast change"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3"
    >
      <p role="status" className="min-w-0 text-sm">
        {notice}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onView}>
          View forecast
        </Button>
        {canUndo && (
          <Button type="button" size="sm" variant="outline" onClick={onUndo}>
            Undo change
          </Button>
        )}
      </div>
    </section>
  );
}
