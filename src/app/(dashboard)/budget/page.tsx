"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, formatCurrency } from "@/lib/utils";

interface BudgetItem {
  category: string;
  limit: number;
  spent: number;
}

export default function BudgetPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function fetchData() {
    setLoading(true);
    const [budgetRes, txRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch(`/api/transactions?month=${month}`),
    ]);
    const budgetData = await budgetRes.json();
    const txData = await txRes.json();

    const spentByCategory: Record<string, number> = {};
    for (const tx of txData) {
      if (tx.type === "expense") {
        spentByCategory[tx.category] =
          (spentByCategory[tx.category] || 0) + tx.amount;
      }
    }

    const budgetMap: Record<string, number> = {};
    for (const b of budgetData) {
      budgetMap[b.category] = b.limit;
    }

    const items: BudgetItem[] = CATEGORIES.map((cat) => ({
      category: cat,
      limit: budgetMap[cat] || 0,
      spent: spentByCategory[cat] || 0,
    }));

    setBudgets(items);
    setLoading(false);
  }

  async function updateBudget(category: string, limit: number) {
    setSaving(category);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, category, limit }),
    });
    setSaving(null);
  }

  function getProgressColor(spent: number, limit: number) {
    if (limit === 0) return "bg-gray-600";
    const pct = spent / limit;
    if (pct <= 0.6) return "bg-green-500";
    if (pct <= 0.85) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getStatusLabel(spent: number, limit: number) {
    if (limit === 0) return "No budget set";
    const remaining = limit - spent;
    if (remaining >= 0) return `${formatCurrency(remaining)} remaining`;
    return `${formatCurrency(Math.abs(remaining))} over budget`;
  }

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-sm text-gray-400">Total Budget</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-sm text-gray-400">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-sm text-gray-400">Remaining</p>
          <p
            className={`mt-1 text-2xl font-bold ${totalBudget - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {formatCurrency(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((item) => {
            const overPct =
              item.limit > 0 && item.spent > item.limit
                ? Math.min(
                    ((item.spent - item.limit) / item.limit) * 100,
                    100
                  )
                : 0;

            return (
              <div
                key={item.category}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{item.category}</h3>
                    <p className="text-xs text-gray-400">
                      {getStatusLabel(item.spent, item.limit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      value={item.limit || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBudgets((prev) =>
                          prev.map((b) =>
                            b.category === item.category
                              ? { ...b, limit: val }
                              : b
                          )
                        );
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateBudget(item.category, val);
                      }}
                      className="w-24 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-right text-sm text-white focus:border-blue-500 focus:outline-none"
                      placeholder="0.00"
                    />
                    {saving === item.category && (
                      <span className="text-xs text-blue-400">Saving...</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(item.spent, item.limit)}`}
                        style={{ width: `${item.limit > 0 ? Math.min((item.spent / item.limit) * 100, 100) : 0}%` }}
                      />
                    </div>
                    {overPct > 0 && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-red-500/50"
                          style={{ width: `${overPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(item.spent)}
                    </span>
                    {item.limit > 0 && (
                      <span className="text-sm text-gray-500">
                        {" "}
                        / {formatCurrency(item.limit)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
