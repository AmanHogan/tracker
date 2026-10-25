/**
 * Estimates per-paycheck US payroll taxes for a single filer taking the
 * standard deduction (2025 figures). Ported 1:1 from the Android app's
 * TaxEstimator.kt so both apps agree on the same numbers.
 *
 * Pre-tax handling mirrors a real payslip:
 * - HSA and Section 125 medical premiums reduce BOTH FICA (OASDI/Medicare)
 *   wages and federal taxable wages.
 * - Traditional 401(k) reduces federal taxable wages but NOT FICA wages.
 *
 * This is an estimate — actual withholding depends on W-4 elections,
 * credits, etc.
 */

const OASDI_RATE = 0.062;
const OASDI_WAGE_BASE = 176_100;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = 200_000;
const STANDARD_DEDUCTION = 15_000;

// 2025 single-filer brackets: [upper bound, rate]
const FEDERAL_BRACKETS: [number, number][] = [
  [11_925, 0.1],
  [48_475, 0.12],
  [103_350, 0.22],
  [197_300, 0.24],
  [250_525, 0.32],
  [626_350, 0.35],
  [Infinity, 0.37],
];

export interface TaxEstimate {
  oasdi: number;
  medicare: number;
  federalWithholding: number;
  stateWithholding: number;
}

/**
 * All inputs match the pay profile: annual gross, pay periods per year,
 * 401k as percent of gross, HSA/medical as per-payslip dollars, and a flat
 * state income tax rate in percent (0 for TX, FL, etc.).
 */
export function estimateTaxes(
  grossAnnual: number,
  periodsPerYear: number,
  pretax401kPercent: number,
  hsaPerPeriod: number,
  medicalPerPeriod: number,
  stateRatePct: number
): TaxEstimate {
  const periods = Math.max(periodsPerYear, 1);
  const cafeteriaAnnual = (hsaPerPeriod + medicalPerPeriod) * periods;
  const annual401k = (grossAnnual * pretax401kPercent) / 100;

  // FICA wages: gross minus HSA/medical (401k still counts)
  const ficaWages = Math.max(grossAnnual - cafeteriaAnnual, 0);
  const oasdi = Math.min(ficaWages, OASDI_WAGE_BASE) * OASDI_RATE;
  let medicare = ficaWages * MEDICARE_RATE;
  if (ficaWages > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicare += (ficaWages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  // Federal taxable: gross minus all pre-tax, minus standard deduction
  const taxable = Math.max(grossAnnual - annual401k - cafeteriaAnnual - STANDARD_DEDUCTION, 0);
  let federal = 0;
  let lower = 0;
  for (const [upper, rate] of FEDERAL_BRACKETS) {
    if (taxable <= lower) break;
    federal += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }

  const state = Math.max(grossAnnual - annual401k - cafeteriaAnnual, 0) * (stateRatePct / 100);

  const perPeriod = (annual: number) => Math.round((annual / periods) * 100) / 100;

  return {
    oasdi: perPeriod(oasdi),
    medicare: perPeriod(medicare),
    federalWithholding: perPeriod(federal),
    stateWithholding: perPeriod(state),
  };
}
