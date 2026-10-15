import { estimate, skuCatalog, type Portfolio } from "@dcf/engine";
import { money } from "../format";
import { TEMPLATES } from "../templates";

interface WelcomeProps {
  onChoose: (portfolio: Portfolio) => void;
  onBlank: () => void;
  onClose: () => void;
}

export function Welcome({ onChoose, onBlank, onClose }: WelcomeProps) {
  return (
    <section className="hero" aria-labelledby="welcome-title">
      <div className="wrap hero-grid">
        <div>
          <p className="eyebrow">Databricks cost forecaster</p>
          <h1 id="welcome-title">See the bill before the month closes.</h1>
          <p className="sub">
            Forecast DBUs and the cloud invoice together. Jobs, SQL, pipelines, serverless, and serving — then compare the levers that actually move the number.
          </p>
          <p className="meta">Estimates only · catalog {skuCatalog.version} · not a quote</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-ghost" onClick={onBlank}>
              Start blank
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Keep what is on the desk
            </button>
          </div>
        </div>
        <div className="template-grid">
          {TEMPLATES.map((template, index) => {
            const portfolio = template.build();
            const total = estimate(portfolio).total;
            return (
              <button key={template.id} type="button" className="template-card" onClick={() => onChoose(portfolio)}>
                <span className="step">{String(index + 1).padStart(2, "0")}</span>
                <strong>{template.name}</strong>
                <span className="hint">{template.blurb}</span>
                <span className="entry-cost">
                  {money(total)}
                  <span className="per"> / month</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
