"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  ClipboardList,
  Check,
  X,
  MoreVertical,
  Download,
  Upload,
} from "lucide-react";

interface ListItem {
  _id?: string;
  name: string;
  notes: string;
  costEstimate: number;
  deliverySetup: number;
  actualCost: number;
  checked: boolean;
  section: string;
  sortOrder: number;
}

interface ListData {
  _id: string;
  name: string;
  type: "checklist" | "shopping";
  description: string;
  items: ListItem[];
}

const inputClasses =
  "rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export default function ListsPage() {
  const [lists, setLists] = useState<ListData[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewList, setShowNewList] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"checklist" | "shopping">("shopping");
  const [newDesc, setNewDesc] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [showAddItem, setShowAddItem] = useState(false);
  const [addSection, setAddSection] = useState("");
  const [addName, setAddName] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addCost, setAddCost] = useState("");
  const [addDelivery, setAddDelivery] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [salesTax, setSalesTax] = useState(8.25);
  const [applyTax, setApplyTax] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const activeList = lists.find((l) => l._id === activeListId) || null;

  useEffect(() => {
    fetchLists();
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.salesTax != null) setSalesTax(data.salesTax);
      })
      .catch(() => {});
  }, []);

  async function fetchLists() {
    setLoading(true);
    const res = await fetch("/api/lists");
    const data = await res.json();
    setLists(data);
    if (data.length > 0 && !activeListId) {
      setActiveListId(data[0]._id);
    }
    setLoading(false);
  }

  async function createList() {
    if (!newName.trim()) return;
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        type: newType,
        description: newDesc,
      }),
    });
    const list = await res.json();
    setLists((prev) => [list, ...prev]);
    setActiveListId(list._id);
    setShowNewList(false);
    setNewName("");
    setNewDesc("");
  }

  const saveList = useCallback(async (list: ListData) => {
    setSaving(true);
    await fetch("/api/lists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: list._id, items: list.items }),
    });
    setSaving(false);
  }, []);

  async function deleteList(id: string) {
    await fetch(`/api/lists?id=${id}`, { method: "DELETE" });
    setLists((prev) => prev.filter((l) => l._id !== id));
    if (activeListId === id) {
      setActiveListId(lists.find((l) => l._id !== id)?._id || null);
    }
    setMenuOpen(null);
  }

  function toggleItem(itemIndex: number) {
    if (!activeList) return;
    const updated = { ...activeList };
    updated.items = [...updated.items];
    updated.items[itemIndex] = {
      ...updated.items[itemIndex],
      checked: !updated.items[itemIndex].checked,
    };
    setLists((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
    );
    saveList(updated);
  }

  function updateItemField(
    itemIndex: number,
    field: keyof ListItem,
    value: string | number
  ) {
    if (!activeList) return;
    const updated = { ...activeList };
    updated.items = [...updated.items];
    updated.items[itemIndex] = {
      ...updated.items[itemIndex],
      [field]: value,
    };
    setLists((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
    );
  }

  function saveCurrentList() {
    if (!activeList) return;
    saveList(activeList);
  }

  function deleteItem(itemIndex: number) {
    if (!activeList) return;
    const updated = { ...activeList };
    updated.items = updated.items.filter((_, i) => i !== itemIndex);
    setLists((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
    );
    saveList(updated);
  }

  function addItem() {
    if (!activeList || !addName.trim()) return;
    const newItem: ListItem = {
      name: addName,
      notes: addNotes,
      costEstimate: parseFloat(addCost) || 0,
      deliverySetup: parseFloat(addDelivery) || 0,
      actualCost: 0,
      checked: false,
      section: addSection,
      sortOrder: activeList.items.length,
    };
    const updated = { ...activeList, items: [...activeList.items, newItem] };
    setLists((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
    );
    saveList(updated);
    setAddName("");
    setAddNotes("");
    setAddCost("");
    setAddDelivery("");
  }

  function toggleSection(section: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function exportList() {
    if (!activeList) return;
    const res = await fetch(`/api/lists/export?id=${activeList._id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeList.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importList(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (activeList) {
      formData.append("listId", activeList._id);
    }

    const res = await fetch("/api/lists/import", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      await fetchLists();
    }
    setImportLoading(false);
    e.target.value = "";
  }

  // Group items by section
  const sections: {
    name: string;
    items: { item: ListItem; index: number }[];
  }[] = [];
  if (activeList) {
    const sectionMap = new Map<
      string,
      { item: ListItem; index: number }[]
    >();
    activeList.items.forEach((item, index) => {
      const key = item.section || "Unsorted";
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push({ item, index });
    });
    Array.from(sectionMap.entries()).forEach(([name, items]) => {
      sections.push({ name, items });
    });
  }

  // Stats
  const totalItems = activeList?.items.length || 0;
  const checkedItems =
    activeList?.items.filter((i) => i.checked).length || 0;
  const subtotal =
    activeList?.items.reduce(
      (s, i) => s + i.costEstimate + i.deliverySetup,
      0
    ) || 0;
  const taxAmount = applyTax ? subtotal * (salesTax / 100) : 0;
  const grandTotal = subtotal + taxAmount;
  const totalActual =
    activeList?.items.reduce(
      (s, i) => s + (i.actualCost > 0 ? i.actualCost : 0),
      0
    ) || 0;
  const checkedEst =
    activeList?.items
      .filter((i) => i.checked)
      .reduce((s, i) => s + i.costEstimate + i.deliverySetup, 0) || 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-fade text-2xl font-bold">Lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checklists, shopping lists, and move-in budgets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:border-border hover:text-foreground">
            <Upload size={14} />
            {importLoading ? "Importing..." : "Import"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={importList}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> New List
          </button>
        </div>
      </div>

      {/* New list form */}
      {showNewList && (
        <div className="mb-6 rounded-xl border-2 border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Create New List</h3>
            <button
              onClick={() => setShowNewList(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`${inputClasses} w-full`}
                placeholder="Move-in Shopping"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Type</label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as "checklist" | "shopping")
                }
                className={`${inputClasses} w-full`}
              >
                <option value="checklist">
                  Checklist (with cost estimates)
                </option>
                <option value="shopping">Shopping List</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Description
              </label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className={`${inputClasses} w-full`}
                placeholder="Optional description"
              />
            </div>
          </div>
          <button
            onClick={createList}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* List sidebar */}
        <div className="space-y-2">
          {lists.map((list) => (
            <button
              key={list._id}
              onClick={() => setActiveListId(list._id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                activeListId === list._id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-card hover:border-border"
              }`}
            >
              {list.type === "checklist" ? (
                <ClipboardList size={18} className="text-primary" />
              ) : (
                <ShoppingCart size={18} className="text-green-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {list.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {list.items.filter((i) => i.checked).length}/
                  {list.items.length} items
                </p>
              </div>
              {list.items.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {Math.round(
                      (list.items.filter((i) => i.checked).length /
                        list.items.length) *
                        100
                    )}
                    %
                  </div>
                </div>
              )}
            </button>
          ))}
          {lists.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No lists yet. Create one to get started.
            </p>
          )}
        </div>

        {/* Active list detail */}
        {activeList ? (
          <div>
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {activeList.name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      activeList.type === "checklist"
                        ? "bg-primary/10 text-primary"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {activeList.type}
                  </span>
                </div>
                {activeList.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeList.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeList.type === "checklist" && (
                  <button
                    onClick={exportList}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-border hover:text-foreground"
                  >
                    <Download size={14} /> Export
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === activeList._id ? null : activeList._id
                      )
                    }
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen === activeList._id && (
                    <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                      <button
                        onClick={() => deleteList(activeList._id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-muted"
                      >
                        <Trash2 size={14} /> Delete List
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border-2 border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {checkedItems}/{totalItems}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {activeList.type === "checklist" && (
                <>
                  <div className="rounded-xl border-2 border-border/60 bg-card p-4">
                    <p className="text-xs text-muted-foreground">Estimated Total</p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {formatCurrency(grandTotal)}
                    </p>
                    {applyTax && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        incl. {formatCurrency(taxAmount)} tax
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border-2 border-border/60 bg-card p-4">
                    <p className="text-xs text-muted-foreground">Actual Spent</p>
                    <p className="mt-1 text-lg font-bold text-green-400">
                      {formatCurrency(totalActual)}
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-border/60 bg-card p-4">
                    <p className="text-xs text-muted-foreground">Remaining (Est)</p>
                    <p className="mt-1 text-lg font-bold text-orange-400">
                      {formatCurrency(grandTotal - checkedEst)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Sales tax toggle */}
            {activeList.type === "checklist" && (
              <div className="mb-4 flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card px-5 py-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">
                    Apply sales tax
                  </span>
                </label>
                {applyTax && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={salesTax}
                      onChange={(e) =>
                        setSalesTax(parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-border bg-muted px-2 py-1 text-right text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            )}

            {/* Add item */}
            <div className="mb-4">
              {!showAddItem ? (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-border hover:text-foreground"
                >
                  <Plus size={16} /> Add Item
                </button>
              ) : (
                <div className="rounded-xl border-2 border-border/60 bg-card p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Section
                      </label>
                      <input
                        value={addSection}
                        onChange={(e) => setAddSection(e.target.value)}
                        className={`${inputClasses} w-full`}
                        placeholder="e.g. Bedroom"
                        list="sections-list"
                      />
                      <datalist id="sections-list">
                        {Array.from(
                          new Set(
                            activeList.items
                              .map((i) => i.section)
                              .filter(Boolean)
                          )
                        ).map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Item Name
                      </label>
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className={`${inputClasses} w-full`}
                        placeholder="Queen mattress"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Notes
                      </label>
                      <input
                        value={addNotes}
                        onChange={(e) => setAddNotes(e.target.value)}
                        className={`${inputClasses} w-full`}
                        placeholder="Mid-range foam/hybrid"
                      />
                    </div>
                    {activeList.type === "checklist" && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Cost Estimate
                          </label>
                          <input
                            type="number"
                            value={addCost}
                            onChange={(e) => setAddCost(e.target.value)}
                            className={`${inputClasses} w-full`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Delivery/Setup
                          </label>
                          <input
                            type="number"
                            value={addDelivery}
                            onChange={(e) => setAddDelivery(e.target.value)}
                            className={`${inputClasses} w-full`}
                            placeholder="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={addItem}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddItem(false)}
                      className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saving && (
              <div className="mb-3 text-xs text-primary">Saving...</div>
            )}

            {/* Sections + items */}
            {sections.map((section) => {
              const isCollapsed = collapsedSections.has(section.name);
              const sectionChecked = section.items.filter(
                (i) => i.item.checked
              ).length;
              const sectionTotal = section.items.length;
              const sectionEst = section.items.reduce(
                (s, i) =>
                  s + i.item.costEstimate + i.item.deliverySetup,
                0
              );
              const sectionTax = applyTax
                ? sectionEst * (salesTax / 100)
                : 0;
              const sectionActual = section.items.reduce(
                (s, i) =>
                  s + (i.item.actualCost > 0 ? i.item.actualCost : 0),
                0
              );

              return (
                <div
                  key={section.name}
                  className="mb-4 overflow-hidden rounded-xl border-2 border-border/60 bg-card"
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/50"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm font-semibold uppercase tracking-wider text-foreground">
                      {section.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sectionChecked}/{sectionTotal}
                    </span>
                    {activeList.type === "checklist" && sectionEst > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(sectionEst + sectionTax)}
                      </span>
                    )}
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${sectionTotal > 0 ? (sectionChecked / sectionTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-border">
                      {/* Table header for checklists */}
                      {activeList.type === "checklist" && (
                        <div className="hidden gap-2 px-5 py-2 text-xs uppercase text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_1fr_100px_100px_100px_40px]">
                          <div className="w-6" />
                          <div>Item</div>
                          <div>Notes</div>
                          <div className="text-right">Estimate</div>
                          <div className="text-right">Delivery</div>
                          <div className="text-right">Actual</div>
                          <div />
                        </div>
                      )}
                      {section.items.map(({ item, index }) => (
                        <div
                          key={index}
                          className={`group px-5 py-3 transition-colors ${
                            item.checked ? "bg-muted/30" : ""
                          }`}
                        >
                          {activeList.type === "checklist" ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_100px_100px_100px_40px] sm:items-center">
                              <button
                                onClick={() => toggleItem(index)}
                                className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                  item.checked
                                    ? "border-green-500 bg-green-500"
                                    : "border-border hover:border-primary"
                                }`}
                              >
                                {item.checked && (
                                  <Check size={12} className="text-foreground" />
                                )}
                              </button>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateItemField(index, "name", e.target.value)
                                }
                                onBlur={saveCurrentList}
                                className={`w-full bg-transparent text-sm focus:rounded focus:border focus:border-primary focus:bg-muted focus:px-2 focus:py-1 focus:outline-none ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}
                              />
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) =>
                                  updateItemField(index, "notes", e.target.value)
                                }
                                onBlur={saveCurrentList}
                                className="w-full bg-transparent text-sm text-muted-foreground focus:rounded focus:border focus:border-primary focus:bg-muted focus:px-2 focus:py-1 focus:outline-none"
                                placeholder="Notes"
                              />
                              <input
                                type="number"
                                value={item.costEstimate || ""}
                                onChange={(e) =>
                                  updateItemField(
                                    index,
                                    "costEstimate",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onBlur={saveCurrentList}
                                className="w-full rounded border border-border bg-muted px-2 py-1 text-right text-sm text-foreground focus:border-primary focus:outline-none"
                                placeholder="$0"
                              />
                              <input
                                type="number"
                                value={item.deliverySetup || ""}
                                onChange={(e) =>
                                  updateItemField(
                                    index,
                                    "deliverySetup",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onBlur={saveCurrentList}
                                className="w-full rounded border border-border bg-muted px-2 py-1 text-right text-sm text-muted-foreground focus:border-primary focus:outline-none"
                                placeholder="$0"
                              />
                              <input
                                type="number"
                                value={item.actualCost || ""}
                                onChange={(e) =>
                                  updateItemField(
                                    index,
                                    "actualCost",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                onBlur={saveCurrentList}
                                className="w-full rounded border border-border bg-muted px-2 py-1 text-right text-sm text-green-400 focus:border-primary focus:outline-none"
                                placeholder="$0"
                              />
                              <button
                                onClick={() => deleteItem(index)}
                                className="text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleItem(index)}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                  item.checked
                                    ? "border-green-500 bg-green-500"
                                    : "border-border hover:border-primary"
                                }`}
                              >
                                {item.checked && (
                                  <Check size={12} className="text-foreground" />
                                )}
                              </button>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateItemField(index, "name", e.target.value)
                                }
                                onBlur={saveCurrentList}
                                className={`flex-1 bg-transparent text-sm focus:rounded focus:border focus:border-primary focus:bg-muted focus:px-2 focus:py-1 focus:outline-none ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}
                              />
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) =>
                                  updateItemField(index, "notes", e.target.value)
                                }
                                onBlur={saveCurrentList}
                                className="w-32 bg-transparent text-right text-xs text-muted-foreground focus:rounded focus:border focus:border-primary focus:bg-muted focus:px-2 focus:py-1 focus:outline-none"
                                placeholder="Notes"
                              />
                              <button
                                onClick={() => deleteItem(index)}
                                className="text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Section subtotal */}
                      {activeList.type === "checklist" && (
                        <div className="flex items-center justify-between bg-muted/30 px-5 py-2">
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {section.name} Subtotal
                          </span>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Est: {formatCurrency(sectionEst + sectionTax)}
                            </span>
                            {sectionActual > 0 && (
                              <span className="text-green-400">
                                Actual: {formatCurrency(sectionActual)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand total */}
            {activeList.type === "checklist" && totalItems > 0 && (
              <div className="mt-2 rounded-xl border-2 border-border/60 bg-card px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Grand Total
                  </span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(grandTotal)}
                    </p>
                    {applyTax && (
                      <p className="text-xs text-muted-foreground">
                        Subtotal {formatCurrency(subtotal)} + Tax{" "}
                        {formatCurrency(taxAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {totalItems === 0 && (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground">
                  No items yet. Click &quot;Add Item&quot; to get started.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-20">
            <p className="text-muted-foreground">
              Select a list or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
