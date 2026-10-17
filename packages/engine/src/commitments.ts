import { roundMoney } from "./money.js";

export interface CommitmentMonth {
  month: number;
  eligibleListCost: number;
  covered: number;
  overage: number;
  remaining: number;
}
export interface CommitmentProjection {
  faceValue: number;
  purchaseCost: number;
  payAsYouGo: number;
  overage: number;
  totalCost: number;
  unused: number;
  savings: number;
  breakEvenConsumption: number;
  exhaustedMonth: number | null;
  months: CommitmentMonth[];
}

/** A USD list-value allowance, not a vendor-specific DBCU conversion or contract quote. */
export function simulateCommitment(
  eligibleMonthlyListCost: readonly number[],
  faceValue: number,
  discount: number,
): CommitmentProjection {
  if (!Number.isFinite(faceValue) || faceValue < 0 || !Number.isFinite(discount) || discount < 0 || discount >= 1)
    throw new RangeError("Commitment value must be non-negative and discount must be between 0 and 100%.");
  if (eligibleMonthlyListCost.some((amount) => !Number.isFinite(amount) || amount < 0))
    throw new RangeError("Eligible monthly list costs must be finite and non-negative.");
  let remaining = roundMoney(faceValue);
  let exhaustedMonth: number | null = null;
  const months = eligibleMonthlyListCost.slice(0, 12).map((amount, index) => {
    const eligibleListCost = roundMoney(amount);
    const covered = roundMoney(Math.min(remaining, eligibleListCost));
    remaining = roundMoney(Math.max(0, remaining - covered));
    if (faceValue > 0 && remaining === 0 && exhaustedMonth == null) exhaustedMonth = index + 1;
    return { month: index + 1, eligibleListCost, covered, overage: roundMoney(eligibleListCost - covered), remaining };
  });
  const purchaseCost = roundMoney(faceValue * (1 - discount));
  const payAsYouGo = roundMoney(months.reduce((sum, month) => sum + month.eligibleListCost, 0));
  const overage = roundMoney(months.reduce((sum, month) => sum + month.overage, 0));
  const totalCost = roundMoney(purchaseCost + overage);
  return {
    faceValue: roundMoney(faceValue),
    purchaseCost,
    payAsYouGo,
    overage,
    totalCost,
    unused: remaining,
    savings: roundMoney(payAsYouGo - totalCost),
    breakEvenConsumption: purchaseCost,
    exhaustedMonth,
    months,
  };
}
