"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function triggerDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionKey = "weight" | "injections" | "vitals" | "food";

const SECTION_LABELS: Record<SectionKey, string> = {
  weight: "Weight",
  injections: "Injections",
  vitals: "Vitals",
  food: "Food",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | null;
  sub?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 150px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "14px 18px",
        minWidth: 130,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SiteBar({
  site,
  count,
  total,
}: {
  site: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 160, fontSize: 13, color: "#374151", flexShrink: 0 }}>
        {site.replace(/_/g, " ")}
      </div>
      <div
        style={{
          flex: 1,
          background: "#e5e7eb",
          borderRadius: 4,
          height: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: "#3b82f6",
            height: "100%",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ width: 60, fontSize: 12, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>
        {count} ({pct}%)
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export button (lazy: only runs the query when clicked)
// ---------------------------------------------------------------------------

function ExportButton({
  label,
  type,
  from,
  to,
}: {
  label: string;
  type: SectionKey;
  from: string;
  to: string;
}) {
  const trpc = useTRPC();
  const [enabled, setEnabled] = useState(false);

  const { data: csvData, isFetching } = useQuery({
    ...trpc.report.exportCSV.queryOptions({ type, from, to }),
    enabled,
    staleTime: Infinity,
  });

  // When data arrives and was triggered by a click, download it
  const [waitingForData, setWaitingForData] = useState(false);

  if (csvData && waitingForData) {
    setWaitingForData(false);
    triggerDownload(csvData, `glp1-${type}-${from}-to-${to}.csv`);
  }

  function handleClick() {
    if (isFetching) return;
    if (csvData) {
      triggerDownload(csvData, `glp1-${type}-${from}-to-${to}.csv`);
      return;
    }
    setWaitingForData(true);
    setEnabled(true);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isFetching}
      style={{
        padding: "7px 14px",
        background: isFetching ? "#e5e7eb" : "#f3f4f6",
        color: isFetching ? "#9ca3af" : "#374151",
        border: "1px solid #d1d5db",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        cursor: isFetching ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {isFetching ? "Preparing..." : `Export ${label} CSV`}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const trpc = useTRPC();

  const [from, setFrom] = useState(daysAgoString(30));
  const [to, setTo] = useState(todayString());
  const [sections, setSections] = useState<SectionKey[]>(["weight", "injections", "vitals", "food"]);
  const [reportEnabled, setReportEnabled] = useState(false);

  // We use a "query key" approach — only fetch when the user clicks Generate
  const [reportParams, setReportParams] = useState({ from: daysAgoString(30), to: todayString(), sections: ["weight", "injections", "vitals", "food"] as SectionKey[] });

  const { data: report, isFetching: reportFetching, error: reportError } = useQuery({
    ...trpc.report.generateReport.queryOptions({
      from: reportParams.from,
      to: reportParams.to,
      sections: reportParams.sections,
    }),
    enabled: reportEnabled,
  });

  function handleToggleSection(key: SectionKey) {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  function handleGenerate() {
    setReportParams({ from, to, sections });
    setReportEnabled(true);
  }

  const handleExportAll = useCallback(() => {
    // Export all currently selected sections sequentially
    const available = sections;
    available.forEach((sec) => {
      // We trigger individual export queries via the ExportButton logic.
      // For "Export All" we just call the same trigger for each visible section.
      // Since ExportButton manages its own state, we fire download for each by
      // directly calling exportCSV for each type.
    });
  }, [sections]);

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  const sectionCardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  };

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontWeight: 600,
    color: "#6b7280",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e5e7eb",
  };

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 24px 60px" }}>
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
        Reports &amp; Export
      </h1>
      <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 15 }}>
        Generate summaries and export your health data for any date range.
      </p>

      {/* Configuration Card */}
      <section style={{ ...sectionCardStyle, marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Report Configuration
        </h2>

        {/* Date range */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 160px", minWidth: 150 }}>
            <label htmlFor="from-date" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 160px", minWidth: 150 }}>
            <label htmlFor="to-date" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Section checkboxes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 10 }}>
            Include Sections
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {(["weight", "injections", "vitals", "food"] as SectionKey[]).map((key) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                  padding: "7px 14px",
                  border: sections.includes(key) ? "1px solid #93c5fd" : "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: sections.includes(key) ? "#eff6ff" : "#f9fafb",
                  fontSize: 14,
                  fontWeight: 500,
                  color: sections.includes(key) ? "#1d4ed8" : "#374151",
                  userSelect: "none",
                  transition: "all 0.1s",
                }}
              >
                <input
                  type="checkbox"
                  checked={sections.includes(key)}
                  onChange={() => handleToggleSection(key)}
                  style={{ accentColor: "#3b82f6", width: 15, height: 15 }}
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={reportFetching || sections.length === 0}
          style={{
            padding: "10px 28px",
            background: reportFetching || sections.length === 0 ? "#93c5fd" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: reportFetching || sections.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {reportFetching ? "Generating..." : "Generate Report"}
        </button>
        {sections.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>
            Select at least one section.
          </p>
        )}
      </section>

      {/* Error state */}
      {reportError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 10,
            padding: "14px 18px",
            color: "#dc2626",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Failed to generate report. Please try again.
        </div>
      )}

      {/* Report Results */}
      {report && !reportFetching && (
        <div>
          {/* Report header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: "#111827" }}>
                Report: {formatDate(report.dateRange.from)} &mdash; {formatDate(report.dateRange.to)}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Weight section */}
          {report.weight && (
            <section style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#374151" }}>
                  &#9878; Weight
                </h3>
                <ExportButton label="Weight" type="weight" from={report.dateRange.from} to={report.dateRange.to} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <StatCard
                  label="Start Weight"
                  value={report.weight.startWeight !== null ? `${report.weight.startWeight.toFixed(1)}` : null}
                />
                <StatCard
                  label="End Weight"
                  value={report.weight.endWeight !== null ? `${report.weight.endWeight.toFixed(1)}` : null}
                />
                <StatCard
                  label="Total Change"
                  value={
                    report.weight.totalChange !== null
                      ? `${report.weight.totalChange > 0 ? "+" : ""}${report.weight.totalChange.toFixed(1)}`
                      : null
                  }
                  sub={
                    report.weight.totalChange !== null
                      ? report.weight.totalChange < 0
                        ? "lost"
                        : report.weight.totalChange > 0
                        ? "gained"
                        : "no change"
                      : undefined
                  }
                />
                <StatCard
                  label="Entries"
                  value={String((report.weight.entries as unknown[]).length)}
                />
              </div>
            </section>
          )}

          {/* Injections section */}
          {report.injections && (
            <section style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#374151" }}>
                  &#128137; Injections
                </h3>
                <ExportButton label="Injections" type="injections" from={report.dateRange.from} to={report.dateRange.to} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <StatCard label="Total Injections" value={String(report.injections.totalCount)} />
              </div>
              {Object.keys(report.injections.siteDistribution).length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    Site Distribution
                  </div>
                  {Object.entries(report.injections.siteDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([site, count]) => (
                      <SiteBar
                        key={site}
                        site={site}
                        count={count}
                        total={report.injections!.totalCount}
                      />
                    ))}
                </div>
              )}
              {Object.keys(report.injections.siteDistribution).length === 0 && (
                <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>No injections in this date range.</p>
              )}
            </section>
          )}

          {/* Vitals section */}
          {report.vitals && (
            <section style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#374151" }}>
                  &#10084; Vitals
                </h3>
                <ExportButton label="Vitals" type="vitals" from={report.dateRange.from} to={report.dateRange.to} />
              </div>
              {report.vitals.averages ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <StatCard
                    label="Avg Systolic"
                    value={`${report.vitals.averages.systolic}`}
                    sub="mmHg"
                  />
                  <StatCard
                    label="Avg Diastolic"
                    value={`${report.vitals.averages.diastolic}`}
                    sub="mmHg"
                  />
                  <StatCard
                    label="Avg Heart Rate"
                    value={`${report.vitals.averages.heartRate}`}
                    sub="bpm"
                  />
                  <StatCard
                    label="Readings"
                    value={String((report.vitals.entries as unknown[]).length)}
                  />
                </div>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>No vitals in this date range.</p>
              )}
            </section>
          )}

          {/* Food section */}
          {report.food && (
            <section style={sectionCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#374151" }}>
                  &#127869; Food
                </h3>
                <ExportButton label="Food" type="food" from={report.dateRange.from} to={report.dateRange.to} />
              </div>
              {report.food.dailySummaries.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Date</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Calories</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Protein (g)</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Carbs (g)</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Fat (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.food.dailySummaries.map((day, i) => (
                        <tr
                          key={day.date}
                          style={{
                            borderBottom:
                              i < report.food!.dailySummaries.length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                            background: i % 2 === 0 ? "#fff" : "#fafafa",
                          }}
                        >
                          <td style={{ padding: "9px 12px", color: "#374151" }}>
                            {formatDate(day.date)}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>
                            {day.calories.toFixed(0)}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "#374151" }}>
                            {day.protein.toFixed(1)}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "#374151" }}>
                            {day.carbs.toFixed(1)}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: "#374151" }}>
                            {day.fat.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: "#374151", fontSize: 13 }}>
                          Total
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                          {report.food.dailySummaries
                            .reduce((s, d) => s + d.calories, 0)
                            .toFixed(0)}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>
                          {report.food.dailySummaries
                            .reduce((s, d) => s + d.protein, 0)
                            .toFixed(1)}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>
                          {report.food.dailySummaries
                            .reduce((s, d) => s + d.carbs, 0)
                            .toFixed(1)}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>
                          {report.food.dailySummaries
                            .reduce((s, d) => s + d.fat, 0)
                            .toFixed(1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>No food entries in this date range.</p>
              )}
            </section>
          )}

          {/* Export All */}
          {report && (
            <section
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "18px 24px",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginRight: 4 }}>
                Export CSVs:
              </span>
              {report.weight && (
                <ExportButton label="Weight" type="weight" from={report.dateRange.from} to={report.dateRange.to} />
              )}
              {report.injections && (
                <ExportButton label="Injections" type="injections" from={report.dateRange.from} to={report.dateRange.to} />
              )}
              {report.vitals && (
                <ExportButton label="Vitals" type="vitals" from={report.dateRange.from} to={report.dateRange.to} />
              )}
              {report.food && (
                <ExportButton label="Food" type="food" from={report.dateRange.from} to={report.dateRange.to} />
              )}
            </section>
          )}
        </div>
      )}

      {/* Empty state before first generation */}
      {!report && !reportFetching && !reportError && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 15,
          }}
        >
          Configure your date range and sections above, then click Generate Report.
        </div>
      )}
    </main>
  );
}
