"use client";

import { useEffect, useState, useMemo } from "react";
import { CATEGORIES, formatCurrency } from "@/lib/utils";
import { Plus, Upload, Trash2, Search } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account?: string;
}

export default function TransactionsPage() {
  // Transaction data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form visibility
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Add form fields
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // CSV import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMonth, setImportMonth] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set("month", filterMonth);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth]);

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filterCategory !== "all") {
      result = result.filter((t) => t.category === filterCategory);
    }

    if (filterType !== "all") {
      result = result.filter((t) => t.type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.description.toLowerCase().includes(query)
      );
    }

    // Sort by date descending
    result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return result;
  }, [transactions, filterCategory, filterType, searchQuery]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          description: formDescription,
          amount: parseFloat(formAmount),
          type: formType,
          category: formCategory,
        }),
      });
      if (res.ok) {
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormDescription("");
        setFormAmount("");
        setFormType("expense");
        setFormCategory(CATEGORIES[0]);
        setShowAddForm(false);
        fetchTransactions();
      }
    } catch (err) {
      console.error("Failed to add transaction:", err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportMessage("");
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      if (importMonth) formData.append("month", importMonth);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setImportMessage(`Successfully imported ${data.count} transactions.`);
        setImportFile(null);
        setImportMonth("");
        fetchTransactions();
      } else {
        setImportMessage("Import failed. Please check the file format.");
      }
    } catch (err) {
      console.error("Failed to import CSV:", err);
      setImportMessage("Import failed. Please try again.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const inputClasses =
    "bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowImport(false);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
          <button
            onClick={() => {
              setShowImport(!showImport);
              setShowAddForm(false);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600 sm:flex-none"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Add Transaction
          </h2>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={`${inputClasses} w-full`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Grocery shopping"
                  className={`${inputClasses} w-full`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClasses} w-full`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as "income" | "expense")
                  }
                  className={`${inputClasses} w-full`}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={`${inputClasses} w-full`}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {formSubmitting ? "Adding..." : "Add Transaction"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Section */}
      {showImport && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Import Fidelity CSV
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-white hover:file:bg-gray-600 file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Month Filter (optional)
              </label>
              <input
                type="month"
                value={importMonth}
                onChange={(e) => setImportMonth(e.target.value)}
                className={inputClasses}
              />
            </div>
            <button
              onClick={handleImport}
              disabled={!importFile || importLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {importLoading ? "Importing..." : "Import"}
            </button>
          </div>
          {importMessage && (
            <p className="mt-3 text-sm text-green-400">{importMessage}</p>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={inputClasses}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={inputClasses}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search descriptions..."
                className={`${inputClasses} w-full pl-9`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Date
                </th>
                <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Description
                </th>
                <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Category
                </th>
                <th className="text-left text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Account
                </th>
                <th className="text-right text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Amount
                </th>
                <th className="text-right text-gray-400 text-xs uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                  >
                    No transactions found. Add a transaction or import a CSV to
                    get started.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {t.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {t.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {t.account || "—"}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-right whitespace-nowrap font-medium ${
                        t.type === "income" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(Math.abs(t.amount))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-50 transition-colors p-1"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
