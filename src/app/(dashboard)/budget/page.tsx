"use client";

import { useEffect, useState, useCallback } from "react";
import { CATEGORIES, formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Trash2, Copy } from "lucide-react";

interface SubItem {
  name: string;
  amount: number;
}

interface BudgetEntry {
  category: string;
  limit: number;
  items: SubItem[];
  spent: number;
}

export default function BudgetPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

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

    const budgetMap: Record<string, { limit: number; items: SubItem[] }> = {};
    for (const b of budgetData) {
      budgetMap[b.category] = { limit: b.limit, items: b.items || [] };
    }

    const entries: BudgetEntry[] = CATEGORIES.map((cat) => ({
      category: cat,
      limit: budgetMap[cat]?.limit || 0,
      items: budgetMap[cat]?.items || [],
      spent: spentByCategory[cat] || 0,
    }));

    setBudgets(entries);
    setLoading(false);
  }

  const saveBudget = useCallback(
    async (category: string, items: SubItem[], limit: number) => {
      setSaving(category);
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          category,
          items: items.length > 0 ? items : undefined,
          limit: items.length > 0 ? undefined : limit,
        }),
      });
      setSaving(null);
    },
    [month]
  );

  function toggleExpand(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function updateDirectLimit(category: string, limit: number) {
    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit } : b))
    );
  }

  function saveDirectLimit(category: string, limit: number) {
    const entry = budgets.find((b) => b.category === category);
    if (entry && entry.items.length === 0) {
      saveBudget(category, [], limit);
    }
  }

  function updateSubItemAmount(
    category: string,
    idx: number,
    amount: number
  ) {
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.category !== category) return b;
        const items = b.items.map((item, i) =>
          i === idx ? { ...item, amount } : item
        );
        const limit = items.reduce((s, i) => s + i.amount, 0);
        return { ...b, items, limit };
      })
    );
  }

  function saveSubItems(category: string) {
    const entry = budgets.find((b) => b.category === category);
    if (entry) {
      saveBudget(category, entry.items, entry.limit);
    }
  }

  function addSubItem(category: string) {
    if (!newItemName.trim()) return;
    const amount = parseFloat(newItemAmount) || 0;
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.category !== category) return b;
        const items = [...b.items, { name: newItemName.trim(), amount }];
        const limit = items.reduce((s, i) => s + i.amount, 0);
        return { ...b, items, limit };
      })
    );
    const entry = budgets.find((b) => b.category === category);
    if (entry) {
      const items = [
        ...entry.items,
        { name: newItemName.trim(), amount },
      ];
      saveBudget(category, items, items.reduce((s, i) => s + i.amount, 0));
    }
    setNewItemName("");
    setNewItemAmount("");
    setAddingTo(null);
  }

  function deleteSubItem(category: string, idx: number) {
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.category !== category) return b;
        const items = b.items.filter((_, i) => i !== idx);
        const limit = items.reduce((s, i) => s + i.amount, 0);
        return { ...b, items, limit };
      })
    );
    const entry = budgets.find((b) => b.category === category);
    if (entry) {
      const items = entry.items.filter((_, i) => i !== idx);
      saveBudget(category, items, items.reduce((s, i) => s + i.amount, 0));
    }
  }

  async function copyFromPrevMonth() {
    const [y, m] = month.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/budgets?month=${prevMonth}`);
    const prevBudgets = await res.json();
    if (prevBudgets.length === 0) return;

    for (const pb of prevBudgets) {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          category: pb.category,
          items: pb.items?.length > 0 ? pb.items : undefined,
          limit: pb.items?.length > 0 ? undefined : pb.limit,
        }),
      });
    }
    fetchData();
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

  const inputClasses =
    "rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-right text-sm text-white focus:border-blue-500 focus:outline-none";

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget</h1>
          <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyFromPrevMonth}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white"
          >
            <Copy size={14} /> Copy Last Month
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
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
        <div className="space-y-3">
          {budgets.map((entry) => {
            const isExpanded = expanded.has(entry.category);
            const hasItems = entry.items.length > 0;
            const overPct =
              entry.limit > 0 && entry.spent > entry.limit
                ? Math.min(
                    ((entry.spent - entry.limit) / entry.limit) * 100,
                    100
                  )
                : 0;

            return (
              <div
                key={entry.category}
                className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
              >
                {/* Category header */}
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(entry.category)}
                      className="text-gray-500 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">
                            {entry.category}
                            {hasItems && (
                              <span className="ml-2 text-xs text-gray-500">
                                {entry.items.length} item
                                {entry.items.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {getStatusLabel(entry.spent, entry.limit)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasItems ? (
                            <>
                              <span className="text-sm text-gray-400">$</span>
                              <input
                                type="number"
                                value={entry.limit || ""}
                                onChange={(e) =>
                                  updateDirectLimit(
                                    entry.category,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onBlur={(e) =>
                                  saveDirectLimit(
                                    entry.category,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={`w-24 ${inputClasses}`}
                                placeholder="0.00"
                              />
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-white">
                              {formatCurrency(entry.limit)}
                            </span>
                          )}
                          {saving === entry.category && (
                            <span className="text-xs text-blue-400">
                              Saving...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-8 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(entry.spent, entry.limit)}`}
                          style={{
                            width: `${entry.limit > 0 ? Math.min((entry.spent / entry.limit) * 100, 100) : 0}%`,
                          }}
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
                        {formatCurrency(entry.spent)}
                      </span>
                      {entry.limit > 0 && (
                        <span className="text-sm text-gray-500">
                          {" "}
                          / {formatCurrency(entry.limit)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: sub-items */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-gray-950/50">
                    {hasItems && (
                      <div className="divide-y divide-gray-800/50">
                        {entry.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center gap-3 px-5 py-2.5 pl-14"
                          >
                            <span className="flex-1 text-sm text-gray-300">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">$</span>
                              <input
                                type="number"
                                value={item.amount || ""}
                                onChange={(e) =>
                                  updateSubItemAmount(
                                    entry.category,
                                    idx,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onBlur={() => saveSubItems(entry.category)}
                                className={`w-24 ${inputClasses}`}
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              onClick={() =>
                                deleteSubItem(entry.category, idx)
                              }
                              className="text-gray-700 opacity-0 hover:text-red-400 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add item row */}
                    {addingTo === entry.category ? (
                      <div className="flex items-center gap-2 border-t border-gray-800/50 px-5 py-2.5 pl-14">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Item name (e.g. Water Bill)"
                          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addSubItem(entry.category);
                            if (e.key === "Escape") setAddingTo(null);
                          }}
                        />
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          value={newItemAmount}
                          onChange={(e) => setNewItemAmount(e.target.value)}
                          placeholder="0"
                          className={`w-24 ${inputClasses}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addSubItem(entry.category);
                          }}
                        />
                        <button
                          onClick={() => addSubItem(entry.category)}
                          className="rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingTo(null)}
                          className="px-1 text-xs text-gray-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingTo(entry.category);
                          setNewItemName("");
                          setNewItemAmount("");
                        }}
                        className="flex w-full items-center gap-2 border-t border-gray-800/50 px-5 py-2.5 pl-14 text-sm text-gray-500 hover:bg-gray-800/30 hover:text-gray-300"
                      >
                        <Plus size={14} /> Add line item
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
