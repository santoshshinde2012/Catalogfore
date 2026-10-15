import { SCENARIO_PRESETS, compareScenarios, type Portfolio, type ScenarioPresetId } from "@dcf/engine";
import { money } from "../format";

interface ScenariosProps {
  portfolio: Portfolio;
  selected: ScenarioPresetId[];
  onToggle: (id: ScenarioPresetId) => void;
}

export function Scenarios({ portfolio, selected, onToggle }: ScenariosProps) {
  const results = compareScenarios(portfolio, selected.length ? selected : ["as_modeled"]);
  const max = Math.max(...results.map((result) => result.annual), 1);
  return (
    <div className="stage">
      <h1 className="h2">Side by side</h1>
      <p className="lede mb-6">
        Each card clones this portfolio and changes one lever. Photon’s 2× case is an assumption, not a measured speedup. A commit only helps if you use it.
      </p>
      <div className="scenario-grid mb-6">
        {SCENARIO_PRESETS.map((preset) => {
          const on = selected.includes(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              className={on ? "scenario-card is-on" : "scenario-card"}
              aria-pressed={on}
              onClick={() => onToggle(preset.id)}
            >
              <h3>{preset.name}</h3>
              <p className="hint">{preset.description}</p>
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 mb-6">
        {results.map((result) => (
          <div key={result.id}>
            <div className="flex justify-between text-sm mb-1">
              <span>{result.name}</span>
              <span className="num">{money(result.annual)} / year</span>
            </div>
            <div className="split" aria-hidden="true">
              <span className="dbu" style={{ width: `${(result.annual / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <table className="lines">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>DBU / mo</th>
            <th>Cloud / mo</th>
            <th>Month</th>
            <th>Next 12 mo</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <td>{result.name}</td>
              <td className="num">{money(result.estimate.dbuCost)}</td>
              <td className="num">{money(result.estimate.cloudCost)}</td>
              <td className="num">{money(result.estimate.total)}</td>
              <td className="num">{money(result.annual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
