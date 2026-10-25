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
    if (limit === 0) return "bg-muted";
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
    "rounded-lg border border-border bg-muted px-2 py-1.5 text-right text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-fade text-2xl font-bold">Budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyFromPrevMonth}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-border hover:text-foreground"
          >
            <Copy size={14} /> Copy Last Month
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Budget</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-card p-5">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p
            className={`mt-1 text-2xl font-bold ${totalBudget - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {formatCurrency(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                className="overflow-hidden rounded-xl border-2 border-border/60 bg-card"
              >
                {/* Category header */}
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(entry.category)}
                      className="text-muted-foreground hover:text-foreground"
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
                          <h3 className="font-medium text-foreground">
                            {entry.category}
                            {hasItems && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {entry.items.length} item
                                {entry.items.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {getStatusLabel(entry.spent, entry.limit)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasItems ? (
                            <>
                              <span className="text-sm text-muted-foreground">$</span>
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
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(entry.limit)}
                            </span>
                          )}
                          {saving === entry.category && (
                            <span className="text-xs text-primary">
                              Saving...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-8 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(entry.spent, entry.limit)}`}
                          style={{
                            width: `${entry.limit > 0 ? Math.min((entry.spent / entry.limit) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                      {overPct > 0 && (
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-red-500/50"
                            style={{ width: `${overPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(entry.spent)}
                      </span>
                      {entry.limit > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          / {formatCurrency(entry.limit)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: sub-items */}
                {isExpanded && (
                  <div className="border-t border-border bg-background/50">
                    {hasItems && (
                      <div className="divide-y divide-border/50">
                        {entry.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="group flex items-center gap-3 px-5 py-2.5 pl-14"
                          >
                            <span className="flex-1 text-sm text-foreground">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
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
                              className="text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add item row */}
                    {addingTo === entry.category ? (
                      <div className="flex items-center gap-2 border-t border-border/50 px-5 py-2.5 pl-14">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Item name (e.g. Water Bill)"
                          className="flex-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addSubItem(entry.category);
                            if (e.key === "Escape") setAddingTo(null);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">$</span>
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
                          className="rounded bg-primary px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-primary/90"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingTo(null)}
                          className="px-1 text-xs text-muted-foreground hover:text-foreground"
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
                        className="flex w-full items-center gap-2 border-t border-border/50 px-5 py-2.5 pl-14 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
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
