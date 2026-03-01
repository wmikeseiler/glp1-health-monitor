"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type VitalsEntry = {
  id: string;
  userId: string;
  date: Date | string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  createdAt: Date | string | null;
};

type TrendEntry = {
  week: string;
  avgSystolic: number;
  avgDiastolic: number;
  avgHeartRate: number;
};

// ─── BP Classification ────────────────────────────────────────────────────────

type BPCategory = "normal" | "elevated" | "high1" | "high2";

interface BPClassification {
  category: BPCategory;
  label: string;
  color: string;
  bg: string;
  border: string;
}

function classifyBP(systolic: number, diastolic: number): BPClassification {
  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: "high2",
      label: "High Stage 2",
      color: "#ef4444",
      bg: "#fef2f2",
      border: "#fca5a5",
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      category: "high1",
      label: "High Stage 1",
      color: "#f97316",
      bg: "#fff7ed",
      border: "#fdba74",
    };
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      category: "elevated",
      label: "Elevated",
      color: "#f59e0b",
      bg: "#fffbeb",
      border: "#fde68a",
    };
  }
  return {
    category: "normal",
    label: "Normal",
    color: "#10b981",
    bg: "#f0fdf4",
    border: "#86efac",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Trends Chart ─────────────────────────────────────────────────────────────

function TrendsChart({ trends }: { trends: TrendEntry[] }) {
  if (trends.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
        Add at least 2 weeks of data to see the trends chart.
      </div>
    );
  }

  const WIDTH = 700;
  const HEIGHT = 220;
  const PADDING = { top: 20, right: 24, bottom: 44, left: 50 };
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const allValues = trends.flatMap((t) => [t.avgSystolic, t.avgDiastolic, t.avgHeartRate]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = 10;
  const minVal = Math.max(0, rawMin - padding);
  const maxVal = rawMax + padding;
  const range = maxVal - minVal || 1;

  const xStep = trends.length > 1 ? chartW / (trends.length - 1) : chartW;

  function toX(i: number) {
    return PADDING.left + i * xStep;
  }

  function toY(val: number) {
    return PADDING.top + chartH - ((val - minVal) / range) * chartH;
  }

  function makePath(getter: (t: TrendEntry) => number) {
    return trends.map((t, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(getter(t))}`).join(" ");
  }

  const sysPath = makePath((t) => t.avgSystolic);
  const diaPath = makePath((t) => t.avgDiastolic);
  const hrPath = makePath((t) => t.avgHeartRate);

  // Normal BP zone shading: systolic < 120, diastolic < 80 → shade between 60 and 120
  const normalTop = toY(120);
  const normalBottom = toY(60);

  // Y axis ticks
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
    val: Math.round(v),
    y: toY(v),
  }));

  // X axis: show a subset of week labels to avoid clutter
  const xIndices = trends.length <= 6
    ? trends.map((_, i) => i)
    : [0, Math.floor(trends.length / 3), Math.floor((2 * trends.length) / 3), trends.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        aria-label="Blood pressure and heart rate trends chart"
      >
        {/* Normal BP zone (green shaded background) */}
        <rect
          x={PADDING.left}
          y={normalTop}
          width={chartW}
          height={Math.max(0, normalBottom - normalTop)}
          fill="#d1fae5"
          opacity={0.4}
        />
        <text
          x={PADDING.left + 4}
          y={normalTop + 11}
          fontSize={9}
          fill="#10b981"
          opacity={0.8}
        >
          Normal zone
        </text>

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick.val}
            x1={PADDING.left}
            y1={tick.y}
            x2={WIDTH - PADDING.right}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick.val}
            x={PADDING.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="#6b7280"
          >
            {tick.val}
          </text>
        ))}

        {/* X axis labels */}
        {xIndices.map((i) => (
          <text
            key={i}
            x={toX(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize={9}
            fill="#6b7280"
          >
            {trends[i].week}
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

        {/* Heart rate line (dashed gray, behind BP lines) */}
        <path
          d={hrPath}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Diastolic line (green) */}
        <path
          d={diaPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Systolic line (blue) */}
        <path
          d={sysPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots: systolic */}
        {trends.map((t, i) => (
          <circle key={`sys-${i}`} cx={toX(i)} cy={toY(t.avgSystolic)} r={3.5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5}>
            <title>{`Week ${t.week}: Avg Systolic ${t.avgSystolic.toFixed(0)} mmHg`}</title>
          </circle>
        ))}

        {/* Dots: diastolic */}
        {trends.map((t, i) => (
          <circle key={`dia-${i}`} cx={toX(i)} cy={toY(t.avgDiastolic)} r={3.5} fill="#10b981" stroke="#fff" strokeWidth={1.5}>
            <title>{`Week ${t.week}: Avg Diastolic ${t.avgDiastolic.toFixed(0)} mmHg`}</title>
          </circle>
        ))}

        {/* Y axis unit label */}
        <text
          x={12}
          y={PADDING.top + chartH / 2}
          textAnchor="middle"
          fontSize={9}
          fill="#9ca3af"
          transform={`rotate(-90, 12, ${PADDING.top + chartH / 2})`}
        >
          mmHg / bpm
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap", paddingLeft: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          <svg width={24} height={6}>
            <line x1={0} y1={3} x2={24} y2={3} stroke="#3b82f6" strokeWidth={2} />
          </svg>
          Systolic
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          <svg width={24} height={6}>
            <line x1={0} y1={3} x2={24} y2={3} stroke="#10b981" strokeWidth={2} />
          </svg>
          Diastolic
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          <svg width={24} height={6}>
            <line x1={0} y1={3} x2={24} y2={3} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" />
          </svg>
          Heart Rate
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          <div style={{ width: 16, height: 10, background: "#d1fae5", border: "1px solid #86efac", borderRadius: 2 }} />
          Normal BP zone
        </div>
      </div>
    </div>
  );
}

// ─── BP Badge ─────────────────────────────────────────────────────────────────

function BPBadge({ systolic, diastolic }: { systolic: number; diastolic: number }) {
  const cls = classifyBP(systolic, diastolic);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        background: cls.bg,
        color: cls.color,
        border: `1px solid ${cls.border}`,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {cls.label}
    </span>
  );
}

// ─── Latest Reading Card ──────────────────────────────────────────────────────

function LatestReadingCard({ entry }: { entry: VitalsEntry }) {
  const cls = classifyBP(entry.systolic, entry.diastolic);
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${cls.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 28,
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
      }}
    >
      {/* Color indicator bar */}
      <div
        style={{
          width: 6,
          alignSelf: "stretch",
          background: cls.color,
          borderRadius: 4,
          minHeight: 60,
          flexShrink: 0,
        }}
      />

      {/* BP reading */}
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Blood Pressure
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
            {entry.systolic}
          </span>
          <span style={{ fontSize: 22, color: "#6b7280", lineHeight: 1 }}>/</span>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
            {entry.diastolic}
          </span>
          <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 4 }}>mmHg</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              background: cls.bg,
              color: cls.color,
              border: `1px solid ${cls.border}`,
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {cls.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "#e5e7eb", alignSelf: "stretch", minHeight: 60, flexShrink: 0 }} />

      {/* Heart rate */}
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Heart Rate
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 22, color: "#ef4444" }}>&#10084;</span>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
            {entry.heartRate}
          </span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>bpm</span>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Recorded</div>
        <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
          {formatDateShort(entry.date)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VitalsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Form state
  const [systolicInput, setSystolicInput] = useState("");
  const [diastolicInput, setDiastolicInput] = useState("");
  const [heartRateInput, setHeartRateInput] = useState("");
  const [dateInput, setDateInput] = useState(todayDateTimeLocal());
  const [formError, setFormError] = useState("");

  // Queries
  const { data: entries = [], isLoading: listLoading } = useQuery(
    trpc.vitals.list.queryOptions({})
  );

  const { data: latestEntry, isLoading: latestLoading } = useQuery(
    trpc.vitals.latest.queryOptions()
  );

  const { data: trends = [], isLoading: trendsLoading } = useQuery(
    trpc.vitals.trends.queryOptions()
  );

  // Mutations
  const createMutation = useMutation(
    trpc.vitals.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.vitals.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.vitals.latest.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.vitals.trends.queryKey() });
        setSystolicInput("");
        setDiastolicInput("");
        setHeartRateInput("");
        setDateInput(todayDateTimeLocal());
        setFormError("");
      },
      onError: (err: { message?: string }) => {
        setFormError(err.message || "Failed to save vitals.");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.vitals.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.vitals.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.vitals.latest.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.vitals.trends.queryKey() });
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const sys = parseInt(systolicInput, 10);
    const dia = parseInt(diastolicInput, 10);
    const hr = parseInt(heartRateInput, 10);

    if (!systolicInput || isNaN(sys) || sys < 50 || sys > 300) {
      setFormError("Systolic must be between 50 and 300 mmHg.");
      return;
    }
    if (!diastolicInput || isNaN(dia) || dia < 20 || dia > 200) {
      setFormError("Diastolic must be between 20 and 200 mmHg.");
      return;
    }
    if (!heartRateInput || isNaN(hr) || hr < 20 || hr > 300) {
      setFormError("Heart rate must be between 20 and 300 bpm.");
      return;
    }
    if (!dateInput) {
      setFormError("Please select a date.");
      return;
    }

    createMutation.mutate({
      systolic: sys,
      diastolic: dia,
      heartRate: hr,
      date: new Date(dateInput).toISOString(),
    });
  }

  // Sort entries descending by date
  const sortedEntries = [...entries].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
    display: "block",
  };

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontWeight: 600,
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  };

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px 60px" }}>
      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/dashboard"
          style={{
            color: "#3b82f6",
            textDecoration: "none",
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
        Vitals Tracking
      </h1>
      <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 15 }}>
        Monitor your blood pressure and heart rate over time.
      </p>

      {/* Latest Reading */}
      {!latestLoading && latestEntry && (
        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
            Latest Reading
          </h2>
          <LatestReadingCard entry={latestEntry as VitalsEntry} />
        </section>
      )}

      {!latestLoading && !latestEntry && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 28,
            color: "#9ca3af",
            fontSize: 15,
            textAlign: "center",
          }}
        >
          No readings yet. Log your first vitals below.
        </div>
      )}

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
        <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Log Vitals
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            {/* Systolic */}
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 120px", minWidth: 100 }}>
              <label htmlFor="systolic-input" style={labelStyle}>
                Systolic
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="systolic-input"
                  type="number"
                  min={50}
                  max={300}
                  value={systolicInput}
                  onChange={(e) => setSystolicInput(e.target.value)}
                  placeholder="e.g. 120"
                  style={inputStyle}
                />
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>mmHg</span>
            </div>

            {/* Diastolic */}
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 120px", minWidth: 100 }}>
              <label htmlFor="diastolic-input" style={labelStyle}>
                Diastolic
              </label>
              <input
                id="diastolic-input"
                type="number"
                min={20}
                max={200}
                value={diastolicInput}
                onChange={(e) => setDiastolicInput(e.target.value)}
                placeholder="e.g. 80"
                style={inputStyle}
              />
              <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>mmHg</span>
            </div>

            {/* Heart Rate */}
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 120px", minWidth: 100 }}>
              <label htmlFor="heartrate-input" style={labelStyle}>
                Heart Rate
              </label>
              <input
                id="heartrate-input"
                type="number"
                min={20}
                max={300}
                value={heartRateInput}
                onChange={(e) => setHeartRateInput(e.target.value)}
                placeholder="e.g. 72"
                style={inputStyle}
              />
              <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>bpm</span>
            </div>

            {/* Date/time */}
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 180px", minWidth: 160 }}>
              <label htmlFor="vitals-date" style={labelStyle}>
                Date & Time
              </label>
              <input
                id="vitals-date"
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Submit */}
            <div style={{ flex: "0 0 auto", paddingBottom: 18 }}>
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
                {createMutation.isPending ? "Saving..." : "Log Vitals"}
              </button>
            </div>
          </div>

          {/* Live BP classification preview */}
          {systolicInput && diastolicInput && !isNaN(parseInt(systolicInput)) && !isNaN(parseInt(diastolicInput)) && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Classification preview:</span>
              <BPBadge systolic={parseInt(systolicInput)} diastolic={parseInt(diastolicInput)} />
            </div>
          )}

          {formError && (
            <p style={{ margin: "12px 0 0", color: "#ef4444", fontSize: 13 }}>{formError}</p>
          )}
        </form>
      </section>

      {/* Trends Chart */}
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
          Weekly Trends
        </h2>
        {trendsLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading chart...</div>
        ) : (
          <TrendsChart trends={trends as TrendEntry[]} />
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
        ) : sortedEntries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No entries yet. Log your first vitals above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ ...thStyle, textAlign: "left" }}>Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Systolic</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Diastolic</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Heart Rate</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Classification</th>
                  <th style={{ ...thStyle, width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry: VitalsEntry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: i < sortedEntries.length - 1 ? "1px solid #f3f4f6" : "none",
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                      {formatDate(entry.date)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>
                      {entry.systolic}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#111827", fontWeight: 600 }}>
                      {entry.diastolic}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#ef4444", fontSize: 11 }}>&#10084;</span>
                        {entry.heartRate}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <BPBadge systolic={entry.systolic} diastolic={entry.diastolic} />
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
                        aria-label={`Delete vitals entry from ${formatDate(entry.date)}`}
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
