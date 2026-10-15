import { estimate, type Portfolio } from "@dcf/engine";
import { useEffect, useRef } from "react";
import { money } from "../format";
import { TEMPLATES } from "../templates";

interface WelcomeProps {
  onChoose: (portfolio: Portfolio) => void;
  onBlank: () => void;
  onClose: () => void;
}

export function Welcome({ onChoose, onBlank, onClose }: WelcomeProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    cardRef.current?.querySelector("button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-card" ref={cardRef}>
        <p className="eyebrow">Start a forecast</p>
        <h2 id="welcome-title">What are you running?</h2>
        <p className="hint mb-4 max-w-2xl">
          Pick a shape. The totals are already live, and nothing on this page is a quote. You can throw the template away and build the portfolio yourself.
        </p>
        <div className="template-grid">
          {TEMPLATES.map((template) => {
            const portfolio = template.build();
            const total = estimate(portfolio).total;
            return (
              <button key={template.id} type="button" className="template-card" onClick={() => onChoose(portfolio)}>
                <strong>{template.name}</strong>
                <span className="hint block">{template.blurb}</span>
                <span className="entry-cost mt-2 block">{money(total)} / month</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn" onClick={onBlank}>
            Start blank
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Keep what is on the desk
          </button>
        </div>
      </div>
    </div>
  );
}
