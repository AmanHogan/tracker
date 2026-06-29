"use client";

import { useEffect, useState } from "react";
import { formatCurrency, CATEGORIES } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899",
  "#f59e0b", "#06b6d4", "#6366f1", "#ef4444", "#14b8a6", "#84cc16",
];

interface PayData {
  grossAnnual: number;
  payFrequency: "biweekly" | "semimonthly" | "monthly";
  pretax401kPercent: number;
  hsaPretax: number;
  medicalPretax: number;
  oasdi: number;
  medicare: number;
  federalWithholding: number;
  stateWithholding: number;
  savingsPercent: number;
  checkingPercent: number;
  rothPercent: number;
}

interface BudgetItem {
  category: string;
  limit: number;
  spent: number;
}

const defaultPay: PayData = {
  grossAnnual: 0,
  payFrequency: "semimonthly",
  pretax401kPercent: 0,
  hsaPretax: 0,
  medicalPretax: 0,
  oasdi: 0,
  medicare: 0,
  federalWithholding: 0,
  stateWithholding: 0,
  savingsPercent: 20,
  checkingPercent: 75,
  rothPercent: 5,
};

export default function IncomePage() {
  const [pay, setPay] = useState<PayData>(defaultPay);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  useEffect(() => {
    async function load() {
      const [payRes, budgetRes, txRes] = await Promise.all([
        fetch("/api/pay-profile"),
        fetch(`/api/budgets?month=${currentMonth}`),
        fetch(`/api/transactions?month=${currentMonth}`),
      ]);
      const payData = await payRes.json();
      if (payData.grossAnnual !== undefined) {
        setPay({ ...defaultPay, ...payData });
      }

      const budgetData = await budgetRes.json();
      const txData = await txRes.json();

      const spentByCategory: Record<string, number> = {};
      for (const tx of txData) {
        if (tx.type === "expense") {
          spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
        }
      }

      const budgetMap: Record<string, number> = {};
      for (const b of budgetData) budgetMap[b.category] = b.limit;

      const items: BudgetItem[] = CATEGORIES.map((cat) => ({
        category: cat,
        limit: budgetMap[cat] || 0,
        spent: spentByCategory[cat] || 0,
      })).filter((b) => b.limit > 0 || b.spent > 0);

      setBudgets(items);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/pay-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pay),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Calculations
  const payslipsPerYear = pay.payFrequency === "biweekly" ? 26 : pay.payFrequency === "semimonthly" ? 24 : 12;
  const grossPayslip = pay.grossAnnual / payslipsPerYear;
  const grossMonth = pay.grossAnnual / 12;

  const pretax401k = grossPayslip * (pay.pretax401kPercent / 100);
  const totalDeductions = pretax401k + pay.hsaPretax + pay.medicalPretax;

  const totalTax = pay.oasdi + pay.medicare + pay.federalWithholding + pay.stateWithholding;

  const netPayslip = grossPayslip - totalDeductions - totalTax;
  const netMonth = netPayslip * (payslipsPerYear / 12);

  const savingsPayslip = netPayslip * (pay.savingsPercent / 100);
  const checkingPayslip = netPayslip * (pay.checkingPercent / 100);
  const rothPayslip = netPayslip * (pay.rothPercent / 100);

  const monthlySavings = savingsPayslip * (payslipsPerYear / 12);
  const monthlyChecking = checkingPayslip * (payslipsPerYear / 12);
  const monthlyRoth = rothPayslip * (payslipsPerYear / 12);

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const leftover = monthlyChecking - totalBudget;

  // --- Chart Data ---

  // 1. Paycheck waterfall: where gross pay goes
  const paycheckPie = [
    { name: "401k", value: pretax401k * (payslipsPerYear / 12) },
    { name: "HSA", value: pay.hsaPretax * (payslipsPerYear / 12) },
    { name: "Medical", value: pay.medicalPretax * (payslipsPerYear / 12) },
    { name: "OASDI", value: pay.oasdi * (payslipsPerYear / 12) },
    { name: "Medicare", value: pay.medicare * (payslipsPerYear / 12) },
    { name: "Federal Tax", value: pay.federalWithholding * (payslipsPerYear / 12) },
    ...(pay.stateWithholding > 0 ? [{ name: "State Tax", value: pay.stateWithholding * (payslipsPerYear / 12) }] : []),
    { name: "Savings", value: monthlySavings },
    { name: "Roth IRA", value: monthlyRoth },
    { name: "Checking (Spending)", value: monthlyChecking },
  ].filter((d) => d.value > 0);

  // 2. Budget as % of checking (spendable income)
  const budgetBars = budgets
    .filter((b) => b.limit > 0)
    .map((b) => ({
      category: b.category,
      budgeted: b.limit,
      spent: b.spent,
      pctOfChecking: monthlyChecking > 0 ? (b.limit / monthlyChecking) * 100 : 0,
      pctSpent: monthlyChecking > 0 ? (b.spent / monthlyChecking) * 100 : 0,
    }));

  // 3. Net pay distribution pie
  const distributionPie = [
    { name: "Savings", value: monthlySavings },
    { name: "Roth IRA", value: monthlyRoth },
    { name: "Checking", value: monthlyChecking },
  ].filter((d) => d.value > 0);

  // 4. Checking breakdown: budget + leftover
  const checkingBreakdown = [
    ...budgets.filter((b) => b.limit > 0).map((b) => ({ name: b.category, value: b.limit })),
    ...(leftover > 0 ? [{ name: "Unbudgeted", value: leftover }] : []),
  ];

  const inputClasses =
    "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClasses = "text-sm text-gray-400";
  const valueClasses = "text-sm font-medium text-white text-right";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Income & Pay</h1>
          <p className="mt-1 text-sm text-gray-400">
            Paycheck breakdown and budget analysis
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* === INPUT FORM === */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gross Pay */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Gross Pay</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Gross Annual</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.grossAnnual || ""}
                  onChange={(e) => setPay({ ...pay, grossAnnual: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-36`}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Pay Frequency</label>
              <select
                value={pay.payFrequency}
                onChange={(e) => setPay({ ...pay, payFrequency: e.target.value as any })}
                className={`${inputClasses} w-36 text-left`}
              >
                <option value="semimonthly">Semi-Monthly (24/yr)</option>
                <option value="biweekly">Bi-Weekly (26/yr)</option>
                <option value="monthly">Monthly (12/yr)</option>
              </select>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span className={labelClasses}>Gross Per Month</span>
                <span className={valueClasses}>{formatCurrency(grossMonth)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className={labelClasses}>Gross Per Payslip</span>
                <span className={valueClasses}>{formatCurrency(grossPayslip)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay Distribution */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Net Pay Distribution</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Savings (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={pay.savingsPercent || ""}
                  onChange={(e) => setPay({ ...pay, savingsPercent: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-20`}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Checking (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={pay.checkingPercent || ""}
                  onChange={(e) => setPay({ ...pay, checkingPercent: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-20`}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Roth IRA (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={pay.rothPercent || ""}
                  onChange={(e) => setPay({ ...pay, rothPercent: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-20`}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3 space-y-1">
              <div className="flex justify-between">
                <span className={labelClasses}>Monthly Savings</span>
                <span className="text-sm font-medium text-green-400">{formatCurrency(monthlySavings)}</span>
              </div>
              <div className="flex justify-between">
                <span className={labelClasses}>Monthly Checking</span>
                <span className={valueClasses}>{formatCurrency(monthlyChecking)}</span>
              </div>
              <div className="flex justify-between">
                <span className={labelClasses}>Monthly Roth</span>
                <span className="text-sm font-medium text-purple-400">{formatCurrency(monthlyRoth)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-tax Deductions */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Pre-Tax Deductions (per payslip)</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>401k (%)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={pay.pretax401kPercent || ""}
                  onChange={(e) => setPay({ ...pay, pretax401kPercent: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-20`}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>HSA</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.hsaPretax || ""}
                  onChange={(e) => setPay({ ...pay, hsaPretax: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Medical</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.medicalPretax || ""}
                  onChange={(e) => setPay({ ...pay, medicalPretax: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span className={labelClasses}>401k Per Payslip</span>
                <span className={valueClasses}>{formatCurrency(pretax401k)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className={labelClasses}>Total Deductions/Payslip</span>
                <span className="text-sm font-medium text-orange-400">{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Taxes */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Taxes (per payslip)</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>OASDI (Social Security)</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.oasdi || ""}
                  onChange={(e) => setPay({ ...pay, oasdi: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Medicare</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.medicare || ""}
                  onChange={(e) => setPay({ ...pay, medicare: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>Federal Withholding</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.federalWithholding || ""}
                  onChange={(e) => setPay({ ...pay, federalWithholding: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className={labelClasses}>State Withholding</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={pay.stateWithholding || ""}
                  onChange={(e) => setPay({ ...pay, stateWithholding: parseFloat(e.target.value) || 0 })}
                  className={`${inputClasses} w-28`}
                />
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span className={labelClasses}>Total Tax/Payslip</span>
                <span className="text-sm font-medium text-red-400">{formatCurrency(totalTax)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === SUMMARY CARDS === */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-400">Net Pay / Month</p>
          <p className="mt-1 text-xl font-bold text-white">{formatCurrency(netMonth)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-400">To Checking</p>
          <p className="mt-1 text-xl font-bold text-blue-400">{formatCurrency(monthlyChecking)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-400">Total Budget</p>
          <p className="mt-1 text-xl font-bold text-orange-400">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-400">Budget % of Checking</p>
          <p className="mt-1 text-xl font-bold text-white">
            {monthlyChecking > 0 ? ((totalBudget / monthlyChecking) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs text-gray-400">Leftover</p>
          <p className={`mt-1 text-xl font-bold ${leftover >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatCurrency(leftover)}
          </p>
        </div>
      </div>

      {/* === CHARTS === */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Where Gross Pay Goes */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Where Your Gross Pay Goes (Monthly)
          </h2>
          {paycheckPie.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paycheckPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={true}
                  >
                    {paycheckPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-gray-500">Enter your pay info above</p>
          )}
        </div>

        {/* Net Pay Distribution */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Net Pay Distribution
          </h2>
          {distributionPie.length > 0 ? (
            <>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                      formatter={(value: any) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {[
                  { label: "Savings", value: monthlySavings, color: "bg-green-500", pct: pay.savingsPercent },
                  { label: "Roth IRA", value: monthlyRoth, color: "bg-purple-500", pct: pay.rothPercent },
                  { label: "Checking", value: monthlyChecking, color: "bg-blue-500", pct: pay.checkingPercent },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="flex-1 text-sm text-gray-300">{item.label}</span>
                    <span className="text-sm text-gray-400">{item.pct}%</span>
                    <span className="text-sm font-medium text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-gray-500">Enter your pay info above</p>
          )}
        </div>
      </div>

      {/* Budget as % of Checking */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">
          Budget Categories as % of Checking Income
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          How each budget category eats into your {formatCurrency(monthlyChecking)} monthly checking
        </p>
        {budgetBars.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetBars} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#64748b"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toFixed(1)}%`,
                    name === "pctOfChecking" ? "Budget %" : "Spent %",
                  ]}
                />
                <Bar
                  dataKey="pctOfChecking"
                  fill="#3b82f6"
                  name="Budget %"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="pctSpent"
                  fill="#f97316"
                  name="Spent %"
                  radius={[0, 4, 4, 0]}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-gray-500">
            Set budget limits on the Budget page to see this chart
          </p>
        )}
      </div>

      {/* Checking Breakdown Pie */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">
          Checking Account Breakdown
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          How your monthly checking of {formatCurrency(monthlyChecking)} is allocated by budget
        </p>
        {checkingBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={checkingBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {checkingBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center space-y-2">
              {checkingBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="flex-1 text-sm text-gray-300">{item.name}</span>
                  <span className="text-sm text-gray-400">
                    {monthlyChecking > 0
                      ? ((item.value / monthlyChecking) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-gray-500">
            Set budget limits on the Budget page to see this chart
          </p>
        )}
      </div>

      {/* Payslip Summary Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Payslip Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs uppercase text-gray-400">
                <th className="pb-3 pr-4">Item</th>
                <th className="pb-3 pr-4 text-right">Per Payslip</th>
                <th className="pb-3 pr-4 text-right">Monthly</th>
                <th className="pb-3 text-right">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              <tr>
                <td className="py-2.5 font-medium text-white">Gross Pay</td>
                <td className="py-2.5 text-right text-gray-300">{formatCurrency(grossPayslip)}</td>
                <td className="py-2.5 text-right text-gray-300">{formatCurrency(grossMonth)}</td>
                <td className="py-2.5 text-right text-gray-300">{formatCurrency(pay.grossAnnual)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-orange-400">Pre-Tax Deductions</td>
                <td className="py-2.5 text-right text-orange-400">-{formatCurrency(totalDeductions)}</td>
                <td className="py-2.5 text-right text-orange-400">-{formatCurrency(totalDeductions * (payslipsPerYear / 12))}</td>
                <td className="py-2.5 text-right text-orange-400">-{formatCurrency(totalDeductions * payslipsPerYear)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-red-400">Taxes</td>
                <td className="py-2.5 text-right text-red-400">-{formatCurrency(totalTax)}</td>
                <td className="py-2.5 text-right text-red-400">-{formatCurrency(totalTax * (payslipsPerYear / 12))}</td>
                <td className="py-2.5 text-right text-red-400">-{formatCurrency(totalTax * payslipsPerYear)}</td>
              </tr>
              <tr className="border-t-2 border-gray-700">
                <td className="py-2.5 font-semibold text-white">Net Pay</td>
                <td className="py-2.5 text-right font-semibold text-white">{formatCurrency(netPayslip)}</td>
                <td className="py-2.5 text-right font-semibold text-white">{formatCurrency(netMonth)}</td>
                <td className="py-2.5 text-right font-semibold text-white">{formatCurrency(netMonth * 12)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-green-400">→ Savings</td>
                <td className="py-2.5 text-right text-green-400">{formatCurrency(savingsPayslip)}</td>
                <td className="py-2.5 text-right text-green-400">{formatCurrency(monthlySavings)}</td>
                <td className="py-2.5 text-right text-green-400">{formatCurrency(monthlySavings * 12)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-blue-400">→ Checking</td>
                <td className="py-2.5 text-right text-blue-400">{formatCurrency(checkingPayslip)}</td>
                <td className="py-2.5 text-right text-blue-400">{formatCurrency(monthlyChecking)}</td>
                <td className="py-2.5 text-right text-blue-400">{formatCurrency(monthlyChecking * 12)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-purple-400">→ Roth IRA</td>
                <td className="py-2.5 text-right text-purple-400">{formatCurrency(rothPayslip)}</td>
                <td className="py-2.5 text-right text-purple-400">{formatCurrency(monthlyRoth)}</td>
                <td className="py-2.5 text-right text-purple-400">{formatCurrency(monthlyRoth * 12)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
