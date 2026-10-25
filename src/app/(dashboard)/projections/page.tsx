"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  type AccountInput,
  type AvenueResult,
  compareAvenues,
  projectNetWorth,
} from "@/lib/projections";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AccountRow {
  key: string;
  label: string;
  color: string;
  startingBalance: number;
  monthlyContribution: number;
  annualReturnPct: number;
}

const DEFAULT_ACCOUNTS: AccountRow[] = [
  { key: "k401", label: "401(k)", color: "#3b82f6", startingBalance: 0, monthlyContribution: 0, annualReturnPct: 7 },
  { key: "roth", label: "Roth IRA", color: "#8b5cf6", startingBalance: 0, monthlyContribution: 0, annualReturnPct: 7 },
  { key: "brokerage", label: "Brokerage", color: "#10b981", startingBalance: 0, monthlyContribution: 0, annualReturnPct: 7 },
  { key: "hysa", label: "HYSA / Savings", color: "#f59e0b", startingBalance: 0, monthlyContribution: 0, annualReturnPct: 4.5 },
];

const MILESTONE_YEARS = [5, 10, 15, 20, 25, 30];

const inputClasses =
  "w-full rounded-lg border-2 border-border/60 bg-background px-3 py-2 text-sm text-foreground text-right focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const labelClasses = "text-sm text-muted-foreground";

export default function ProjectionsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>(DEFAULT_ACCOUNTS);
  const [years, setYears] = useState(20);
  const [loadedFromPay, setLoadedFromPay] = useState(false);

  const [compareAmount, setCompareAmount] = useState(500);
  const [currentMarginalRate, setCurrentMarginalRate] = useState(22);
  const [retirementMarginalRate, setRetirementMarginalRate] = useState(15);
  const [capGainsRate, setCapGainsRate] = useState(15);
  const [employerMatchPct, setEmployerMatchPct] = useState(100);
  const [employerMatchCapPct, setEmployerMatchCapPct] = useState(6);
  const [growthRate, setGrowthRate] = useState(7);
  const [hysaRate, setHysaRate] = useState(4.5);
  const [grossAnnual, setGrossAnnual] = useState(0);

  useEffect(() => {
    async function loadPayProfile() {
      const res = await fetch("/api/pay-profile");
      const data = await res.json();
      if (!data || data.grossAnnual === undefined || loadedFromPay) return;
      const periods = data.payFrequency === "biweekly" ? 26 : data.payFrequency === "semimonthly" ? 24 : 12;
      const grossPayslip = data.grossAnnual / periods;
      const pretax401kMonthly = grossPayslip * (data.pretax401kPercent / 100) * (periods / 12);
      const totalTax =
        (data.oasdi || 0) + (data.medicare || 0) + (data.federalWithholding || 0) + (data.stateWithholding || 0);
      const totalDeductions = grossPayslip * (data.pretax401kPercent / 100) + (data.hsaPretax || 0) + (data.medicalPretax || 0);
      const netMonthly = (grossPayslip - totalDeductions - totalTax) * (periods / 12);
      const rothMonthly = netMonthly * ((data.rothPercent || 0) / 100);
      const savingsMonthly = netMonthly * ((data.savingsPercent || 0) / 100);

      setGrossAnnual(data.grossAnnual);
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.key === "k401") return { ...a, monthlyContribution: Math.round(pretax401kMonthly * 100) / 100 };
          if (a.key === "roth") return { ...a, monthlyContribution: Math.round(rothMonthly * 100) / 100 };
          if (a.key === "hysa") return { ...a, monthlyContribution: Math.round(savingsMonthly * 100) / 100 };
          return a;
        })
      );
      setLoadedFromPay(true);
    }
    loadPayProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateAccount(key: string, field: keyof AccountRow, value: number) {
    setAccounts((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
  }

  const netWorthSeries = useMemo(() => {
    const accountInputs: AccountInput[] = accounts.map((a) => ({
      key: a.key,
      label: a.label,
      color: a.color,
      startingBalance: a.startingBalance,
      monthlyContribution: a.monthlyContribution,
      annualReturnPct: a.annualReturnPct,
    }));
    return projectNetWorth(accountInputs, years);
  }, [accounts, years]);

  const finalTotal = netWorthSeries[netWorthSeries.length - 1]?.total || 0;
  const totalContributed =
    accounts.reduce((s, a) => s + a.startingBalance, 0) +
    accounts.reduce((s, a) => s + a.monthlyContribution, 0) * years * 12;
  const totalGrowth = finalTotal - totalContributed;

  const avenueResults: AvenueResult[] = useMemo(
    () =>
      compareAvenues(compareAmount, years, {
        currentMarginalRatePct: currentMarginalRate,
        retirementMarginalRatePct: retirementMarginalRate,
        capitalGainsRatePct: capGainsRate,
        growthRatePct: growthRate,
        hysaRatePct: hysaRate,
        employerMatchPct,
        employerMatchCapPct,
        grossAnnual,
      }),
    [compareAmount, years, currentMarginalRate, retirementMarginalRate, capGainsRate, growthRate, hysaRate, employerMatchPct, employerMatchCapPct, grossAnnual]
  );

  const milestones = MILESTONE_YEARS.filter((y) => y <= years);

  return (
    <div>
      <div className="mb-8">
        <h1 className="heading-fade text-2xl font-bold">Growth Projections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Net worth over time and a side-by-side comparison of where an extra dollar grows best.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          Educational estimate only, not personalized financial or tax advice. Assumes a fixed monthly
          contribution and a constant annual return with no market volatility — real returns vary
          year to year. Adjust any assumption below to match your own situation.
        </p>
      </div>

      {/* Horizon + accounts */}
      <div className="mb-6 rounded-xl border-2 border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
          <div className="flex items-center gap-2">
            <label className={labelClasses}>Years</label>
            <input
              type="number"
              value={years}
              min={1}
              max={50}
              onChange={(e) => setYears(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className={`${inputClasses} w-20`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Account</th>
                <th className="pb-2 pr-4 text-right">Starting Balance</th>
                <th className="pb-2 pr-4 text-right">Monthly Contribution</th>
                <th className="pb-2 text-right">Annual Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((a) => (
                <tr key={a.key}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="text-sm font-medium text-foreground">{a.label}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={a.startingBalance || ""}
                        onChange={(e) => updateAccount(a.key, "startingBalance", parseFloat(e.target.value) || 0)}
                        className={`${inputClasses} w-28`}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={a.monthlyContribution || ""}
                        onChange={(e) => updateAccount(a.key, "monthlyContribution", parseFloat(e.target.value) || 0)}
                        className={`${inputClasses} w-28`}
                      />
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={a.annualReturnPct || ""}
                        onChange={(e) => updateAccount(a.key, "annualReturnPct", parseFloat(e.target.value) || 0)}
                        className={`${inputClasses} w-20`}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          401(k) and Roth IRA monthly contributions are pre-filled from your Income & Pay profile the
          first time this page loads — edit any field freely, nothing here is saved automatically.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Projected Net Worth</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(finalTotal)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">in {years} years</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Total Contributed</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(totalContributed)}</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Growth (Compounding)</p>
          <p className="mt-1 text-xl font-bold text-emerald-500">{formatCurrency(totalGrowth)}</p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Monthly Contribution Total</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatCurrency(accounts.reduce((s, a) => s + a.monthlyContribution, 0))}
          </p>
        </div>
      </div>

      {/* Net worth over time */}
      <div className="mb-6 rounded-xl border-2 border-border/60 bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Net Worth Over Time</h2>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(y) => `Yr ${y}`} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                }}
                formatter={(value: any, name: any) => [
                  formatCurrency(Number(value)),
                  accounts.find((a) => a.key === name)?.label || name,
                ]}
                labelFormatter={(y) => `Year ${y}`}
              />
              <Legend formatter={(name) => accounts.find((a) => a.key === name)?.label || name} />
              {accounts.map((a) => (
                <Area
                  key={a.key}
                  type="monotone"
                  dataKey={a.key}
                  stackId="1"
                  stroke={a.color}
                  fill={a.color}
                  fillOpacity={0.55}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestones table */}
      {milestones.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Milestones</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Year</th>
                  {accounts.map((a) => (
                    <th key={a.key} className="pb-2 pr-4 text-right">
                      {a.label}
                    </th>
                  ))}
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {milestones.map((y) => {
                  const point = netWorthSeries.find((p) => p.year === y);
                  if (!point) return null;
                  return (
                    <tr key={y}>
                      <td className="py-2.5 font-medium text-foreground">{y}</td>
                      {accounts.map((a) => (
                        <td key={a.key} className="py-2.5 pr-4 text-right text-muted-foreground">
                          {formatCurrency(point[a.key])}
                        </td>
                      ))}
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {formatCurrency(point.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Avenue comparison */}
      <div className="rounded-xl border-2 border-border/60 bg-card p-6">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Compare Avenues</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Where does the next extra dollar do the most good? Same monthly amount, same horizon,
          different tax treatment — compared on an after-tax &ldquo;spendable&rdquo; basis.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className={labelClasses}>Monthly Amount</label>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={compareAmount || ""}
                onChange={(e) => setCompareAmount(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Current Marginal Rate</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                value={currentMarginalRate || ""}
                onChange={(e) => setCurrentMarginalRate(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Retirement Marginal Rate</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                value={retirementMarginalRate || ""}
                onChange={(e) => setRetirementMarginalRate(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Capital Gains Rate</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                value={capGainsRate || ""}
                onChange={(e) => setCapGainsRate(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Growth Rate (401k/Roth/Brokerage)</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={growthRate || ""}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>HYSA Rate</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={hysaRate || ""}
                onChange={(e) => setHysaRate(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Employer Match</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                value={employerMatchPct || ""}
                onChange={(e) => setEmployerMatchPct(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Match Cap (% of gross)</label>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                value={employerMatchCapPct || ""}
                onChange={(e) => setEmployerMatchCapPct(parseFloat(e.target.value) || 0)}
                className={inputClasses}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avenueResults} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="label" stroke="var(--muted-foreground)" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                }}
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Bar dataKey="afterTaxFutureValue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="After-tax value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {avenueResults
            .slice()
            .sort((a, b) => b.afterTaxFutureValue - a.afterTaxFutureValue)
            .map((r, i) => (
              <div key={r.key} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {i === 0 && <span className="mr-1.5 text-primary">#1</span>}
                    {r.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.note}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold text-foreground">
                  {formatCurrency(r.afterTaxFutureValue)}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
