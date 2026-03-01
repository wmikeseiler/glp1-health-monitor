"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type WeightEntry = {
  id: string;
  userId: string;
  date: string;
  weight: string;
  unit: string;
  createdAt: Date | string | null;
};

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
        Add at least 2 entries to see the chart.
      </div>
    );
  }

  // Sort ascending by date for chart
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((e) => parseFloat(e.weight));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const WIDTH = 700;
  const HEIGHT = 200;
  const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const xStep = sorted.length > 1 ? chartW / (sorted.length - 1) : chartW;

  const points = sorted.map((entry, i) => {
    const x = PADDING.left + i * xStep;
    const y = PADDING.top + chartH - ((parseFloat(entry.weight) - minVal) / range) * chartH;
    return { x, y, entry };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y axis labels: min, max, and mid
  const yLabels = [
    { val: maxVal, y: PADDING.top },
    { val: (maxVal + minVal) / 2, y: PADDING.top + chartH / 2 },
    { val: minVal, y: PADDING.top + chartH },
  ];

  // X axis: show first, last, and a few in between
  const xIndices = [0, Math.floor(sorted.length / 2), sorted.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i && v < sorted.length
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="Weight over time chart"
    >
      {/* Grid lines */}
      {yLabels.map((label) => (
        <line
          key={label.val}
          x1={PADDING.left}
          y1={label.y}
          x2={WIDTH - PADDING.right}
          y2={label.y}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}

      {/* Y axis labels */}
      {yLabels.map((label) => (
        <text
          key={label.val}
          x={PADDING.left - 8}
          y={label.y + 4}
          textAnchor="end"
          fontSize={11}
          fill="#6b7280"
        >
          {label.val.toFixed(1)}
        </text>
      ))}

      {/* X axis labels */}
      {xIndices.map((i) => (
        <text
          key={i}
          x={points[i].x}
          y={HEIGHT - 6}
          textAnchor="middle"
          fontSize={10}
          fill="#6b7280"
        >
          {formatDate(sorted[i].date).replace(/, \d{4}$/, "")}
        </text>
      ))}

      {/* Axes */}
      <line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + chartH}
        stroke="#d1d5db"
        strokeWidth={1}
      />
      <line
        x1={PADDING.left}
        y1={PADDING.top + chartH}
        x2={WIDTH - PADDING.right}
        y2={PADDING.top + chartH}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={2}>
          <title>{`${formatDate(p.entry.date)}: ${parseFloat(p.entry.weight).toFixed(1)} ${p.entry.unit}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function WeightPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [weightInput, setWeightInput] = useState("");
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [date, setDate] = useState(todayString());
  const [formError, setFormError] = useState("");

  const { data: entries = [], isLoading: listLoading } = useQuery(
    trpc.weight.list.queryOptions({ from: undefined, to: undefined })
  );

  const { data: stats, isLoading: statsLoading } = useQuery(trpc.weight.stats.queryOptions());

  const createMutation = useMutation(
    trpc.weight.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.weight.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.weight.stats.queryKey() });
        setWeightInput("");
        setDate(todayString());
        setFormError("");
      },
      onError: (err) => {
        setFormError(err.message || "Failed to save entry.");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.weight.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.weight.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.weight.stats.queryKey() });
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const w = parseFloat(weightInput);
    if (!weightInput || isNaN(w) || w <= 0) {
      setFormError("Please enter a valid weight greater than 0.");
      return;
    }
    if (!date) {
      setFormError("Please select a date.");
      return;
    }
    createMutation.mutate({ weight: w, unit, date });
  }

  const statCard = (label: string, value: string | null, sub?: string) => (
    <div
      style={{
        flex: "1 1 160px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "16px 20px",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const currentUnit = stats && entries.length > 0 ? entries[0].unit : unit;

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

      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>Weight Tracking</h1>
      <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 15 }}>
        Log your weight to track progress over time.
      </p>

      {/* Entry Form */}
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
          Log Weight
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            {/* Weight input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 120px", minWidth: 110 }}>
              <label htmlFor="weight-input" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                Weight
              </label>
              <input
                id="weight-input"
                type="number"
                step="0.1"
                min="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="e.g. 185.5"
                style={{
                  padding: "9px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 15,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Unit select */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 0 90px" }}>
              <label htmlFor="unit-select" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                Unit
              </label>
              <select
                id="unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as "lbs" | "kg")}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 15,
                  background: "#fff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>

            {/* Date input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 150px", minWidth: 140 }}>
              <label htmlFor="date-input" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                Date
              </label>
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 15,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit */}
            <div style={{ flex: "0 0 auto" }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  padding: "10px 24px",
                  background: createMutation.isPending ? "#93c5fd" : "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: createMutation.isPending ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {createMutation.isPending ? "Saving..." : "Log Weight"}
              </button>
            </div>
          </div>

          {formError && (
            <p style={{ margin: "12px 0 0", color: "#ef4444", fontSize: 13 }}>{formError}</p>
          )}
        </form>
      </section>

      {/* Stats Cards */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Stats
        </h2>
        {statsLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading stats...</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {statCard(
              "Current Weight",
              stats?.currentWeight != null
                ? `${stats.currentWeight.toFixed(1)} ${currentUnit}`
                : null
            )}
            {statCard(
              "Starting Weight",
              stats?.startWeight != null
                ? `${stats.startWeight.toFixed(1)} ${currentUnit}`
                : null
            )}
            {statCard(
              "Total Lost",
              stats?.totalLost != null
                ? `${stats.totalLost > 0 ? "" : "+"}${Math.abs(stats.totalLost).toFixed(1)} ${currentUnit}`
                : null,
              stats?.totalLost != null && stats.totalLost > 0 ? "lost" : stats?.totalLost != null && stats.totalLost < 0 ? "gained" : undefined
            )}
            {statCard(
              "Rate / Week",
              stats?.ratePerWeek != null
                ? `${Math.abs(stats.ratePerWeek).toFixed(1)} ${currentUnit}`
                : null,
              stats?.ratePerWeek != null ? (stats.ratePerWeek > 0 ? "per week lost" : "per week gained") : undefined
            )}
            {statCard("Entries", stats?.entryCount != null ? String(stats.entryCount) : "0")}
          </div>
        )}
      </section>

      {/* Chart */}
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
          Weight Over Time
        </h2>
        {listLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading chart...</div>
        ) : (
          <WeightChart entries={entries} />
        )}
      </section>

      {/* History Table */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          History
        </h2>

        {listLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading entries...</div>
        ) : entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No entries yet. Log your first weight above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Weight
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Unit
                  </th>
                  <th style={{ padding: "8px 12px", width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: i < entries.length - 1 ? "1px solid #f3f4f6" : "none",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {formatDate(entry.date)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>
                      {parseFloat(entry.weight).toFixed(1)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#6b7280" }}>
                      {entry.unit}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <button
                        onClick={() => deleteMutation.mutate({ id: entry.id })}
                        disabled={deleteMutation.isPending}
                        style={{
                          padding: "4px 10px",
                          background: "transparent",
                          color: "#ef4444",
                          border: "1px solid #fca5a5",
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
                          fontWeight: 500,
                        }}
                        aria-label={`Delete entry for ${formatDate(entry.date)}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
