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
} from "recharts";

interface Transaction {
  _id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
}

interface Budget {
  category: string;
  limit: number;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      setLoading(true);
      const [txRes, budgetRes] = await Promise.all([
        fetch(`/api/transactions?month=${month}`),
        fetch(`/api/budgets?month=${month}`),
      ]);
      setTransactions(await txRes.json());
      setBudgets(await budgetRes.json());
      setLoading(false);
    }
    fetch_data();
  }, [month]);

  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);

  // Weekly breakdown
  const weeklyData: { week: string; expenses: number; income: number }[] = [];
  const year = parseInt(month.split("-")[0]);
  const mon = parseInt(month.split("-")[1]) - 1;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const start = w * 7 + 1;
    const end = Math.min(start + 6, daysInMonth);
    const label = `${start}-${end}`;

    let weekExpenses = 0;
    let weekIncome = 0;

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const day = d.getDate();
      if (day >= start && day <= end) {
        if (tx.type === "expense") weekExpenses += tx.amount;
        else weekIncome += tx.amount;
      }
    }

    weeklyData.push({
      week: label,
      expenses: Math.round(weekExpenses * 100) / 100,
      income: Math.round(weekIncome * 100) / 100,
    });
  }

  // Category variance
  const budgetMap: Record<string, number> = {};
  for (const b of budgets) budgetMap[b.category] = b.limit;

  const spentByCategory: Record<string, number> = {};
  for (const tx of expenses) {
    spentByCategory[tx.category] =
      (spentByCategory[tx.category] || 0) + tx.amount;
  }

  const varianceData = CATEGORIES.map((cat) => {
    const budgeted = budgetMap[cat] || 0;
    const actual = spentByCategory[cat] || 0;
    const diff = budgeted - actual;
    return { category: cat, budgeted, actual, difference: diff };
  }).filter((v) => v.budgeted > 0 || v.actual > 0);

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-sm text-gray-400">Income</p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-sm text-gray-400">Expenses</p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-sm text-gray-400">Net</p>
              <p
                className={`mt-1 text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-blue-400" : "text-red-400"}`}
              >
                {formatCurrency(totalIncome - totalExpenses)}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Weekly Breakdown
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                  <Bar
                    dataKey="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="Expenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Category Variance (Budget vs Actual)
            </h2>
            {varianceData.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                No budget or spending data for this month
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-xs uppercase text-gray-400">
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4 text-right">Budgeted</th>
                      <th className="pb-3 pr-4 text-right">Actual</th>
                      <th className="pb-3 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {varianceData.map((row) => (
                      <tr key={row.category}>
                        <td className="py-3 pr-4 text-sm text-white">
                          {row.category}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm text-gray-300">
                          {formatCurrency(row.budgeted)}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm text-gray-300">
                          {formatCurrency(row.actual)}
                        </td>
                        <td
                          className={`py-3 text-right text-sm font-medium ${row.difference >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {row.difference >= 0 ? "+" : ""}
                          {formatCurrency(row.difference)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-700">
                      <td className="py-3 pr-4 text-sm font-semibold text-white">
                        Total
                      </td>
                      <td className="py-3 pr-4 text-right text-sm font-semibold text-white">
                        {formatCurrency(
                          varianceData.reduce((s, r) => s + r.budgeted, 0)
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-sm font-semibold text-white">
                        {formatCurrency(
                          varianceData.reduce((s, r) => s + r.actual, 0)
                        )}
                      </td>
                      <td
                        className={`py-3 text-right text-sm font-semibold ${varianceData.reduce((s, r) => s + r.difference, 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {varianceData.reduce((s, r) => s + r.difference, 0) >= 0
                          ? "+"
                          : ""}
                        {formatCurrency(
                          varianceData.reduce((s, r) => s + r.difference, 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
