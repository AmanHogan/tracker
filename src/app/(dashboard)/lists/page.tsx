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
} from "lucide-react";

interface ListItem {
  _id?: string;
  name: string;
  notes: string;
  lowEst: number;
  midEst: number;
  highEst: number;
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
  "rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

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
  const [addLow, setAddLow] = useState("");
  const [addMid, setAddMid] = useState("");
  const [addHigh, setAddHigh] = useState("");
  const [addDelivery, setAddDelivery] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const activeList = lists.find((l) => l._id === activeListId) || null;

  useEffect(() => {
    fetchLists();
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

  const saveList = useCallback(
    async (list: ListData) => {
      setSaving(true);
      await fetch("/api/lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: list._id, items: list.items }),
      });
      setSaving(false);
    },
    []
  );

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

  function updateItemCost(itemIndex: number, actualCost: number) {
    if (!activeList) return;
    const updated = { ...activeList };
    updated.items = [...updated.items];
    updated.items[itemIndex] = { ...updated.items[itemIndex], actualCost };
    setLists((prev) =>
      prev.map((l) => (l._id === updated._id ? updated : l))
    );
    saveList(updated);
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
      lowEst: parseFloat(addLow) || 0,
      midEst: parseFloat(addMid) || 0,
      highEst: parseFloat(addHigh) || 0,
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
    setAddLow("");
    setAddMid("");
    setAddHigh("");
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

  // Group items by section
  const sections: { name: string; items: { item: ListItem; index: number }[] }[] =
    [];
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
  const checkedItems = activeList?.items.filter((i) => i.checked).length || 0;
  const totalMidEst =
    activeList?.items.reduce((s, i) => s + i.midEst + i.deliverySetup, 0) || 0;
  const totalActual =
    activeList?.items.reduce(
      (s, i) => s + (i.actualCost > 0 ? i.actualCost : 0),
      0
    ) || 0;
  const checkedMidEst =
    activeList?.items
      .filter((i) => i.checked)
      .reduce((s, i) => s + i.midEst + i.deliverySetup, 0) || 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lists</h1>
          <p className="mt-1 text-sm text-gray-400">
            Checklists, shopping lists, and move-in budgets
          </p>
        </div>
        <button
          onClick={() => setShowNewList(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} /> New List
        </button>
      </div>

      {/* New list form */}
      {showNewList && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Create New List</h3>
            <button
              onClick={() => setShowNewList(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`${inputClasses} w-full`}
                placeholder="Move-in Shopping"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Type</label>
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
              <label className="mb-1 block text-xs text-gray-400">
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
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
                  ? "border-blue-500/50 bg-blue-600/10"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              {list.type === "checklist" ? (
                <ClipboardList size={18} className="text-blue-400" />
              ) : (
                <ShoppingCart size={18} className="text-green-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {list.name}
                </p>
                <p className="text-xs text-gray-500">
                  {list.items.filter((i) => i.checked).length}/
                  {list.items.length} items
                </p>
              </div>
              {list.items.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-400">
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
            <p className="py-8 text-center text-sm text-gray-500">
              No lists yet. Create one to get started.
            </p>
          )}
        </div>

        {/* Active list detail */}
        {activeList ? (
          <div>
            {/* Header + stats */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {activeList.name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      activeList.type === "checklist"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {activeList.type}
                  </span>
                </div>
                {activeList.description && (
                  <p className="mt-1 text-sm text-gray-400">
                    {activeList.description}
                  </p>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() =>
                    setMenuOpen(
                      menuOpen === activeList._id ? null : activeList._id
                    )
                  }
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <MoreVertical size={18} />
                </button>
                {menuOpen === activeList._id && (
                  <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-lg">
                    <button
                      onClick={() => deleteList(activeList._id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 size={14} /> Delete List
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress + cost summary */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs text-gray-400">Progress</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {checkedItems}/{totalItems}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {activeList.type === "checklist" && (
                <>
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <p className="text-xs text-gray-400">Mid Estimate</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {formatCurrency(totalMidEst)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <p className="text-xs text-gray-400">Actual Spent</p>
                    <p className="mt-1 text-lg font-bold text-green-400">
                      {formatCurrency(totalActual)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <p className="text-xs text-gray-400">Remaining (Est)</p>
                    <p className="mt-1 text-lg font-bold text-orange-400">
                      {formatCurrency(totalMidEst - checkedMidEst)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Add item */}
            <div className="mb-4">
              {!showAddItem ? (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-gray-700 px-4 py-2.5 text-sm text-gray-400 hover:border-gray-500 hover:text-white"
                >
                  <Plus size={16} /> Add Item
                </button>
              ) : (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs text-gray-400">
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
                            activeList.items.map((i) => i.section).filter(Boolean)
                          )
                        ).map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs text-gray-400">
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
                      <label className="mb-1 block text-xs text-gray-400">
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
                          <label className="mb-1 block text-xs text-gray-400">
                            Low Est.
                          </label>
                          <input
                            type="number"
                            value={addLow}
                            onChange={(e) => setAddLow(e.target.value)}
                            className={`${inputClasses} w-full`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Mid Est.
                          </label>
                          <input
                            type="number"
                            value={addMid}
                            onChange={(e) => setAddMid(e.target.value)}
                            className={`${inputClasses} w-full`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            High Est.
                          </label>
                          <input
                            type="number"
                            value={addHigh}
                            onChange={(e) => setAddHigh(e.target.value)}
                            className={`${inputClasses} w-full`}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Delivery
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
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddItem(false)}
                      className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saving && (
              <div className="mb-3 text-xs text-blue-400">Saving...</div>
            )}

            {/* Sections + items */}
            {sections.map((section) => {
              const isCollapsed = collapsedSections.has(section.name);
              const sectionChecked = section.items.filter(
                (i) => i.item.checked
              ).length;
              const sectionTotal = section.items.length;
              const sectionMidEst = section.items.reduce(
                (s, i) => s + i.item.midEst + i.item.deliverySetup,
                0
              );
              const sectionActual = section.items.reduce(
                (s, i) => s + (i.item.actualCost > 0 ? i.item.actualCost : 0),
                0
              );

              return (
                <div
                  key={section.name}
                  className="mb-4 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden"
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-800/50"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                    <span className="flex-1 text-sm font-semibold uppercase tracking-wider text-gray-300">
                      {section.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {sectionChecked}/{sectionTotal}
                    </span>
                    {activeList.type === "checklist" && sectionMidEst > 0 && (
                      <span className="text-xs text-gray-400">
                        {formatCurrency(sectionMidEst)}
                      </span>
                    )}
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${sectionTotal > 0 ? (sectionChecked / sectionTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-gray-800">
                      {/* Table header for checklists */}
                      {activeList.type === "checklist" && (
                        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_repeat(4,80px)_80px_40px] gap-2 px-5 py-2 text-xs uppercase text-gray-500">
                          <div className="w-6" />
                          <div>Item</div>
                          <div>Notes</div>
                          <div className="text-right">Low</div>
                          <div className="text-right">Mid</div>
                          <div className="text-right">High</div>
                          <div className="text-right">Delivery</div>
                          <div className="text-right">Actual</div>
                          <div />
                        </div>
                      )}
                      {section.items.map(({ item, index }) => (
                        <div
                          key={index}
                          className={`group px-5 py-3 transition-colors ${
                            item.checked ? "bg-gray-800/30" : ""
                          }`}
                        >
                          {activeList.type === "checklist" ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_1fr_repeat(4,80px)_80px_40px] sm:items-center">
                              <button
                                onClick={() => toggleItem(index)}
                                className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                  item.checked
                                    ? "border-green-500 bg-green-500"
                                    : "border-gray-600 hover:border-blue-500"
                                }`}
                              >
                                {item.checked && (
                                  <Check size={12} className="text-white" />
                                )}
                              </button>
                              <span
                                className={`text-sm ${item.checked ? "text-gray-500 line-through" : "text-white"}`}
                              >
                                {item.name}
                              </span>
                              <span className="text-xs text-gray-400 sm:text-sm">
                                {item.notes}
                              </span>
                              <span className="text-right text-sm text-gray-500">
                                {item.lowEst > 0
                                  ? formatCurrency(item.lowEst)
                                  : "—"}
                              </span>
                              <span className="text-right text-sm text-gray-300">
                                {item.midEst > 0
                                  ? formatCurrency(item.midEst)
                                  : "—"}
                              </span>
                              <span className="text-right text-sm text-gray-500">
                                {item.highEst > 0
                                  ? formatCurrency(item.highEst)
                                  : "—"}
                              </span>
                              <span className="text-right text-sm text-gray-500">
                                {item.deliverySetup > 0
                                  ? formatCurrency(item.deliverySetup)
                                  : "—"}
                              </span>
                              <input
                                type="number"
                                value={item.actualCost || ""}
                                onChange={(e) =>
                                  updateItemCost(
                                    index,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-right text-sm text-green-400 focus:border-blue-500 focus:outline-none"
                                placeholder="$0"
                              />
                              <button
                                onClick={() => deleteItem(index)}
                                className="text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
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
                                    : "border-gray-600 hover:border-blue-500"
                                }`}
                              >
                                {item.checked && (
                                  <Check size={12} className="text-white" />
                                )}
                              </button>
                              <span
                                className={`flex-1 text-sm ${item.checked ? "text-gray-500 line-through" : "text-white"}`}
                              >
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="text-xs text-gray-500">
                                  {item.notes}
                                </span>
                              )}
                              <button
                                onClick={() => deleteItem(index)}
                                className="text-gray-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Section subtotal for checklists */}
                      {activeList.type === "checklist" && (
                        <div className="flex items-center justify-between bg-gray-800/30 px-5 py-2">
                          <span className="text-xs font-medium uppercase text-gray-400">
                            {section.name} Subtotal
                          </span>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-400">
                              Est: {formatCurrency(sectionMidEst)}
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

            {totalItems === 0 && (
              <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center">
                <p className="text-gray-500">
                  No items yet. Click &quot;Add Item&quot; to get started.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-700 py-20">
            <p className="text-gray-500">
              Select a list or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
