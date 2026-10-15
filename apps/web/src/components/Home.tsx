import { estimate, type Portfolio } from "@dcf/engine";
import { useMemo } from "react";
import { money } from "../format";
import { TEMPLATES, classicChoice, nextYear, singleJob, spendReview } from "../templates";

interface HomeProps {
  canReturn: boolean;
  onChoose: (portfolio: Portfolio) => void;
  onReturn: () => void;
  onBlank: () => void;
}

const QUESTIONS: { who: string; question: string; detail: string; build: () => Portfolio }[] = [
  {
    who: "Platform lead",
    question: "What will my team cost next year?",
    detail: "Nightly transforms, weekday notebooks, a small SQL warehouse, and storage. Growth starts at 8%.",
    build: nextYear,
  },
  {
    who: "FinOps",
    question: "Where can we cut spend?",
    detail: "Notebooks left on 14 hours, a 6-node job with no spot, and a warehouse pinned overnight.",
    build: spendReview,
  },
  {
    who: "Architect",
    question: "Classic or serverless for this job?",
    detail: "One classic job on m5.xlarge. Serverless, Photon, and spot are priced against it.",
    build: classicChoice,
  },
  {
    who: "Engineer",
    question: "What does this one job cost?",
    detail: "Two workers, 8 hours a day, 5 days a week. The multiplication is on the page.",
    build: singleJob,
  },
];

export function Home({ canReturn, onChoose, onReturn, onBlank }: HomeProps) {
  const starters = useMemo(
    () =>
      QUESTIONS.map((question) => {
        const portfolio = question.build();
        return { ...question, portfolio, monthly: estimate(portfolio).total };
      }),
    [],
  );

  return (
    <div className="sheet ask">
      <p className="eyebrow">Fathom</p>
      <h1>What do you need a number for?</h1>
      <p className="lede">
        Pick a question. You get a yearly range, the arithmetic behind it, and the changes that move the dollars. About
        a minute, and every figure stays editable.
      </p>
      <div className="question-list">
        {starters.map((starter) => (
          <button key={starter.question} type="button" className="question" onClick={() => onChoose(starter.portfolio)}>
            <span className="who">{starter.who}</span>
            <span className="question-title">{starter.question}</span>
            <span className="hint">{starter.detail}</span>
            <span className="question-price">
              {money(starter.monthly)} <span className="per">/ month to start</span>
            </span>
          </button>
        ))}
      </div>
      <div className="ask-actions">
        {canReturn && (
          <button type="button" className="btn" onClick={onReturn}>
            Return to this forecast
          </button>
        )}
        <button type="button" className="btn" onClick={onBlank}>
          Start empty
        </button>
      </div>
      <details className="more">
        <summary>More starting points</summary>
        <div className="question-list">
          {TEMPLATES.map((template) => (
            <button key={template.id} type="button" className="question" onClick={() => onChoose(template.build())}>
              <span className="question-title">{template.name}</span>
              <span className="hint">{template.blurb}</span>
            </button>
          ))}
        </div>
      </details>
      <p className="fine">Estimates only. List rates and labeled assumptions, not a quote.</p>
    </div>
  );
}
