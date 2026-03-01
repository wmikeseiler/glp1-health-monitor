"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type FoodItem = {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

type FoodEntry = {
  id: string;
  userId: string;
  date: Date | string;
  mealType: MealType;
  items: { name: string; quantity?: string; calories?: number; protein?: number; carbs?: number; fat?: number }[];
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  photoUrl: string | null;
  createdAt: Date | string | null;
};

type USDAResult = {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDisplayDate(dateStr: string): string {
  const today = todayString();
  const yesterday = shiftDate(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "0";
  return n.toFixed(decimals);
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function emptyItem(): FoodItem {
  return { name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "" };
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#6b7280",
  marginBottom: 4,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

// ─── MacroCard Component ──────────────────────────────────────────────────────

function MacroCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: 120,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "14px 16px",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{unit}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FoodPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ── Date state
  const [selectedDate, setSelectedDate] = useState(todayString());

  // ── Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [items, setItems] = useState<FoodItem[]>([emptyItem()]);
  const [formError, setFormError] = useState("");

  // Handle debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setDebouncedQuery("");
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setSearchOpen(true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Queries
  const { data: summary, isLoading: summaryLoading } = useQuery(
    trpc.food.dailySummary.queryOptions({ date: selectedDate })
  );

  const { data: foodLog = [], isLoading: logLoading } = useQuery(
    trpc.food.list.queryOptions({ date: selectedDate })
  );

  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    ...trpc.food.searchFood.queryOptions({ query: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
  });

  // ── Mutations
  const logMutation = useMutation(
    trpc.food.log.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.food.list.queryKey({ date: selectedDate }) });
        queryClient.invalidateQueries({ queryKey: trpc.food.dailySummary.queryKey({ date: selectedDate }) });
        setItems([emptyItem()]);
        setFormError("");
      },
      onError: (err: { message?: string }) => {
        setFormError(err.message || "Failed to log food.");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.food.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.food.list.queryKey({ date: selectedDate }) });
        queryClient.invalidateQueries({ queryKey: trpc.food.dailySummary.queryKey({ date: selectedDate }) });
      },
    })
  );

  // ── Item helpers
  function updateItem(index: number, field: keyof FoodItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }

  function handleSearchResultClick(result: USDAResult) {
    const newItem: FoodItem = {
      name: result.description,
      quantity: result.servingSize != null
        ? `${result.servingSize}${result.servingSizeUnit ? " " + result.servingSizeUnit : ""}`
        : "",
      calories: result.calories != null ? String(Math.round(result.calories)) : "",
      protein: result.protein != null ? fmt(result.protein) : "",
      carbs: result.carbs != null ? fmt(result.carbs) : "",
      fat: result.fat != null ? fmt(result.fat) : "",
    };

    // If the first item is empty, replace it; otherwise append
    setItems((prev) => {
      const first = prev[0];
      const firstIsEmpty =
        !first.name && !first.calories && !first.protein && !first.carbs && !first.fat;
      if (firstIsEmpty && prev.length === 1) return [newItem];
      return [...prev, newItem];
    });

    setSearchQuery("");
    setDebouncedQuery("");
    setSearchOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const validItems = items.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      setFormError("Please add at least one food item with a name.");
      return;
    }

    const mappedItems = validItems.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity.trim() || undefined,
      calories: item.calories ? parseFloat(item.calories) : undefined,
      protein: item.protein ? parseFloat(item.protein) : undefined,
      carbs: item.carbs ? parseFloat(item.carbs) : undefined,
      fat: item.fat ? parseFloat(item.fat) : undefined,
    }));

    // Build date as start-of-day ISO for the selected date
    const dateISO = `${selectedDate}T12:00:00.000Z`;

    logMutation.mutate({
      mealType,
      items: mappedItems,
      date: dateISO,
    });
  }

  // ── Group food log by meal type
  const grouped = MEAL_ORDER.reduce<Record<MealType, FoodEntry[]>>(
    (acc, mt) => {
      acc[mt] = (foodLog as FoodEntry[]).filter((e) => e.mealType === mt);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] }
  );

  const isToday = selectedDate === todayString();

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px 60px" }}>
      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/dashboard"
          style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
        Food Tracking
      </h1>
      <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: 15 }}>
        Log meals, track macros, and search the USDA food database.
      </p>

      {/* ── A) Date Navigator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "12px 16px",
        }}
      >
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          aria-label="Previous day"
          style={{
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 16,
            color: "#374151",
            lineHeight: 1,
          }}
        >
          &#8592;
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            {formatDisplayDate(selectedDate)}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{selectedDate}</div>
        </div>

        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
          disabled={isToday}
          aria-label="Next day"
          style={{
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: isToday ? "not-allowed" : "pointer",
            fontSize: 16,
            color: isToday ? "#d1d5db" : "#374151",
            lineHeight: 1,
          }}
        >
          &#8594;
        </button>

        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayString())}
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: 13,
              color: "#374151",
              fontWeight: 500,
            }}
          >
            Today
          </button>
        )}
      </div>

      {/* ── B) Daily Macro Summary */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Daily Summary
        </h2>
        {summaryLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading summary...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              <MacroCard
                label="Calories"
                value={fmt(summary?.totalCalories, 0)}
                unit="kcal"
                color="#f59e0b"
              />
              <MacroCard
                label="Protein"
                value={fmt(summary?.totalProtein)}
                unit="grams"
                color="#3b82f6"
              />
              <MacroCard
                label="Carbs"
                value={fmt(summary?.totalCarbs)}
                unit="grams"
                color="#10b981"
              />
              <MacroCard
                label="Fat"
                value={fmt(summary?.totalFat)}
                unit="grams"
                color="#f97316"
              />
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {summary?.mealCount ?? 0} meal{summary?.mealCount !== 1 ? "s" : ""} logged
            </div>
          </>
        )}
      </section>

      {/* ── C) USDA Food Search */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Search Food (USDA Database)
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>
          Search for a food item to auto-fill the entry form below.
        </p>
        <div ref={searchRef} style={{ position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (debouncedQuery.length >= 2) setSearchOpen(true); }}
            placeholder="e.g. chicken breast, greek yogurt..."
            style={{
              ...inputStyle,
              fontSize: 15,
              paddingRight: searchFetching ? 40 : 12,
            }}
            aria-label="Search USDA food database"
          />

          {searchFetching && (
            <div style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              fontSize: 12,
            }}>
              ...
            </div>
          )}

          {searchOpen && debouncedQuery.length >= 2 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                zIndex: 100,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {searchResults.length === 0 && !searchFetching ? (
                <div style={{ padding: "16px", color: "#9ca3af", fontSize: 14, textAlign: "center" }}>
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </div>
              ) : (
                (searchResults as USDAResult[]).map((result) => (
                  <button
                    key={result.fdcId}
                    type="button"
                    onClick={() => handleSearchResultClick(result)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontWeight: 500, color: "#111827", marginBottom: 2 }}>
                      {result.description}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
                      {result.brandName && (
                        <span style={{ color: "#9ca3af" }}>{result.brandName}</span>
                      )}
                      {result.calories != null && (
                        <span>{Math.round(result.calories)} kcal</span>
                      )}
                      {result.protein != null && (
                        <span>{fmt(result.protein)}g protein</span>
                      )}
                      {result.carbs != null && (
                        <span>{fmt(result.carbs)}g carbs</span>
                      )}
                      {result.fat != null && (
                        <span>{fmt(result.fat)}g fat</span>
                      )}
                      {result.servingSize != null && (
                        <span style={{ color: "#d1d5db" }}>
                          per {result.servingSize}{result.servingSizeUnit ? ` ${result.servingSizeUnit}` : ""}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── D) Manual Food Entry Form */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          marginBottom: 28,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Log Food
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          {/* Meal type selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Meal Type</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MEAL_ORDER.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setMealType(mt)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 20,
                    border: mealType === mt ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    background: mealType === mt ? "#eff6ff" : "#fff",
                    color: mealType === mt ? "#1d4ed8" : "#374151",
                    fontWeight: mealType === mt ? 600 : 400,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {MEAL_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          {/* Food items list */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Food Items</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  {/* Item number header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "2px 6px",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Name + quantity row */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 140 }}>
                      <label htmlFor={`item-name-${index}`} style={labelStyle}>Name *</label>
                      <input
                        id={`item-name-${index}`}
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="e.g. Chicken Breast"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: "0 1 140px", minWidth: 110 }}>
                      <label htmlFor={`item-qty-${index}`} style={labelStyle}>Quantity</label>
                      <input
                        id={`item-qty-${index}`}
                        type="text"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="e.g. 100g, 1 cup"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Macros row */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {(["calories", "protein", "carbs", "fat"] as const).map((macro) => (
                      <div key={macro} style={{ flex: "1 1 80px", minWidth: 70 }}>
                        <label htmlFor={`item-${macro}-${index}`} style={labelStyle}>
                          {macro === "calories" ? "Cal" : macro.charAt(0).toUpperCase() + macro.slice(1)}
                          {macro !== "calories" ? " (g)" : ""}
                        </label>
                        <input
                          id={`item-${macro}-${index}`}
                          type="number"
                          min="0"
                          step={macro === "calories" ? "1" : "0.1"}
                          value={item[macro]}
                          onChange={(e) => updateItem(index, macro, e.target.value)}
                          placeholder="0"
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add item button */}
            <button
              type="button"
              onClick={addItem}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: "8px 0",
                width: "100%",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              + Add Item
            </button>
          </div>

          {formError && (
            <p style={{ margin: "8px 0 12px", color: "#ef4444", fontSize: 13 }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={logMutation.isPending}
            style={{
              padding: "11px 28px",
              background: logMutation.isPending ? "#93c5fd" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: logMutation.isPending ? "not-allowed" : "pointer",
            }}
          >
            {logMutation.isPending ? "Saving..." : "Log Meal"}
          </button>
        </form>
      </section>

      {/* ── E) Today's Food Log */}
      <section>
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          {formatDisplayDate(selectedDate)}&rsquo;s Log
        </h2>

        {logLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14, padding: "20px 0" }}>
            Loading food log...
          </div>
        ) : (foodLog as FoodEntry[]).length === 0 ? (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "40px 24px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No food logged for this day yet. Add a meal above!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {MEAL_ORDER.map((mt) => {
              const entries = grouped[mt];
              if (entries.length === 0) return null;
              return (
                <div
                  key={mt}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Meal header */}
                  <div
                    style={{
                      padding: "12px 20px",
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>
                      {MEAL_LABELS[mt]}
                    </span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
                    </span>
                  </div>

                  {/* Entries */}
                  <div>
                    {entries.map((entry, entryIndex) => {
                      const cal = entry.calories ?? 0;
                      const protein = entry.protein != null ? parseFloat(entry.protein) : 0;
                      const carbs = entry.carbs != null ? parseFloat(entry.carbs) : 0;
                      const fat = entry.fat != null ? parseFloat(entry.fat) : 0;

                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: "14px 20px",
                            borderBottom: entryIndex < entries.length - 1 ? "1px solid #f3f4f6" : "none",
                          }}
                        >
                          {/* Items list */}
                          <div style={{ marginBottom: 10 }}>
                            {entry.items.map((item, ii) => (
                              <div
                                key={ii}
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 8,
                                  marginBottom: ii < entry.items.length - 1 ? 4 : 0,
                                }}
                              >
                                <span style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>
                                  {item.name}
                                </span>
                                {item.quantity && (
                                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                    {item.quantity}
                                  </span>
                                )}
                                {item.calories != null && (
                                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                                    {Math.round(item.calories)} kcal
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Macro breakdown */}
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#f59e0b",
                                  background: "#fffbeb",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  border: "1px solid #fde68a",
                                }}
                              >
                                {cal} kcal
                              </span>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>
                                P: <strong>{fmt(protein)}g</strong>
                              </span>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>
                                C: <strong>{fmt(carbs)}g</strong>
                              </span>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>
                                F: <strong>{fmt(fat)}g</strong>
                              </span>
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate({ id: entry.id })}
                              disabled={deleteMutation.isPending}
                              style={{
                                marginLeft: "auto",
                                padding: "3px 10px",
                                background: "transparent",
                                color: "#ef4444",
                                border: "1px solid #fca5a5",
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                                fontWeight: 500,
                                flexShrink: 0,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
