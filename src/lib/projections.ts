/**
 * Compound-growth projections for the net worth / avenue comparison page.
 * These are simplified educational estimates (fixed monthly contribution,
 * fixed annual return, no volatility/sequence-of-returns modeling) — not
 * personalized financial advice.
 */

export interface AccountInput {
  key: string;
  label: string;
  color: string;
  startingBalance: number;
  monthlyContribution: number;
  annualReturnPct: number;
}

export interface YearPoint {
  year: number;
  total: number;
  [accountKey: string]: number;
}

/**
 * Future value of a single account after `years`, given a starting
 * balance and a fixed monthly contribution compounded monthly. Uses an
 * ordinary annuity (contribution posted at end of each month).
 */
export function futureValue(
  startingBalance: number,
  monthlyContribution: number,
  annualReturnPct: number,
  years: number
): number {
  const months = Math.round(years * 12);
  const i = annualReturnPct / 100 / 12;
  const balanceGrowth = startingBalance * Math.pow(1 + i, months);
  const contributionGrowth =
    i === 0
      ? monthlyContribution * months
      : monthlyContribution * ((Math.pow(1 + i, months) - 1) / i);
  return balanceGrowth + contributionGrowth;
}

/** Yearly series (year 0..years) per account plus a running total, for a stacked chart. */
export function projectNetWorth(accounts: AccountInput[], years: number): YearPoint[] {
  const points: YearPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const point: YearPoint = { year: y, total: 0 };
    for (const acct of accounts) {
      const value = futureValue(acct.startingBalance, acct.monthlyContribution, acct.annualReturnPct, y);
      point[acct.key] = value;
      point.total += value;
    }
    points.push(point);
  }
  return points;
}

export type AvenueKey = "traditional401k" | "rothIra" | "brokerage" | "hysa";

export interface AvenueAssumptions {
  currentMarginalRatePct: number;
  retirementMarginalRatePct: number;
  capitalGainsRatePct: number;
  growthRatePct: number;
  hysaRatePct: number;
  employerMatchPct: number;
  employerMatchCapPct: number;
  grossAnnual: number;
}

export interface AvenueResult {
  key: AvenueKey;
  label: string;
  preTaxFutureValue: number;
  afterTaxFutureValue: number;
  note: string;
}

/**
 * Compares putting the same monthly dollar amount into four common
 * avenues over `years`, and estimates what each is worth AFTER accounting
 * for that avenue's tax treatment — so they're compared on a like-for-like
 * "spendable dollars" basis, not raw account balance.
 */
export function compareAvenues(
  monthlyAmount: number,
  years: number,
  a: AvenueAssumptions
): AvenueResult[] {
  const months = years * 12;

  // Traditional 401(k): contribution is pre-tax, so the same take-home
  // dollar amount buys a bigger contribution (grossed up by the current
  // marginal rate); employer match (up to a cap % of gross) is added on
  // top; the whole balance is taxed at an assumed retirement marginal
  // rate on withdrawal.
  const grossedUpContribution = monthlyAmount / (1 - a.currentMarginalRatePct / 100);
  const monthlyMatchCap = (a.grossAnnual * (a.employerMatchCapPct / 100)) / 12;
  const monthlyMatch = Math.min(
    grossedUpContribution * (a.employerMatchPct / 100),
    monthlyMatchCap * (a.employerMatchPct / 100)
  );
  const trad401kPreTax = futureValue(0, grossedUpContribution + monthlyMatch, a.growthRatePct, years);
  const trad401kAfterTax = trad401kPreTax * (1 - a.retirementMarginalRatePct / 100);

  // Roth IRA: contribution is after-tax (the same monthlyAmount), grows
  // tax-free, withdrawal is tax-free.
  const rothFv = futureValue(0, monthlyAmount, a.growthRatePct, years);

  // Taxable brokerage: after-tax contribution, growth taxed at long-term
  // capital gains rate on withdrawal (approximated against total gain,
  // not cost-basis-tracked lot by lot).
  const brokerageFv = futureValue(0, monthlyAmount, a.growthRatePct, years);
  const brokerageContributed = monthlyAmount * months;
  const brokerageGain = Math.max(brokerageFv - brokerageContributed, 0);
  const brokerageAfterTax = brokerageFv - brokerageGain * (a.capitalGainsRatePct / 100);

  // HYSA: after-tax contribution, interest taxed as ordinary income each
  // year — approximated as compounding at an after-tax rate.
  const hysaAfterTaxRate = a.hysaRatePct * (1 - a.currentMarginalRatePct / 100);
  const hysaFv = futureValue(0, monthlyAmount, hysaAfterTaxRate, years);

  return [
    {
      key: "traditional401k",
      label: "Traditional 401(k)",
      preTaxFutureValue: trad401kPreTax,
      afterTaxFutureValue: trad401kAfterTax,
      note: "Includes assumed employer match; taxed as ordinary income at withdrawal.",
    },
    {
      key: "rothIra",
      label: "Roth IRA",
      preTaxFutureValue: rothFv,
      afterTaxFutureValue: rothFv,
      note: "After-tax in, tax-free growth and withdrawal.",
    },
    {
      key: "brokerage",
      label: "Taxable Brokerage",
      preTaxFutureValue: brokerageFv,
      afterTaxFutureValue: brokerageAfterTax,
      note: "Growth taxed at your long-term capital gains rate on sale.",
    },
    {
      key: "hysa",
      label: "HYSA / Savings",
      preTaxFutureValue: hysaFv,
      afterTaxFutureValue: hysaFv,
      note: "Interest taxed as ordinary income each year; most liquid, no market risk.",
    },
  ];
}
