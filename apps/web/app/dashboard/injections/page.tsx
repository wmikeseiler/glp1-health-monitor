"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";
import { INJECTION_SITE_LABELS } from "@glp1/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type InjectionSite =
  | "left_thigh"
  | "right_thigh"
  | "left_abdomen"
  | "right_abdomen"
  | "left_arm"
  | "right_arm";

type InjectionEntry = {
  id: string;
  userId: string;
  medicationId: string;
  site: string;
  dose: string;
  date: Date | string;
  notes?: string | null;
  createdAt?: Date | string | null;
};

type Medication = {
  id: string;
  name: string;
  currentDose: string;
  doseUnit: string;
  scheduleDays: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Body Map SVG ─────────────────────────────────────────────────────────────
// SVG viewport: 200 x 380
// Body is centered around x=100
// Regions (from the *viewer's* perspective, so left/right are mirrored):
//   left_arm  = viewer's RIGHT side  (x > 100)
//   right_arm = viewer's LEFT side   (x < 100)
//   left_abdomen  = viewer's RIGHT   (x > 100)
//   right_abdomen = viewer's LEFT    (x < 100)
//   left_thigh    = viewer's RIGHT   (x > 100)
//   right_thigh   = viewer's LEFT    (x < 100)

const SITE_REGIONS: Record<
  InjectionSite,
  { label: string; labelX: number; labelY: number; shape: React.ReactNode }
> = {
  right_arm: {
    label: "R Arm",
    labelX: 38,
    labelY: 148,
    shape: (
      <ellipse cx={38} cy={148} rx={16} ry={26} />
    ),
  },
  left_arm: {
    label: "L Arm",
    labelX: 162,
    labelY: 148,
    shape: (
      <ellipse cx={162} cy={148} rx={16} ry={26} />
    ),
  },
  right_abdomen: {
    label: "R Abd",
    labelX: 74,
    labelY: 192,
    shape: (
      <rect x={58} y={174} width={32} height={36} rx={8} />
    ),
  },
  left_abdomen: {
    label: "L Abd",
    labelX: 126,
    labelY: 192,
    shape: (
      <rect x={110} y={174} width={32} height={36} rx={8} />
    ),
  },
  right_thigh: {
    label: "R Thigh",
    labelX: 72,
    labelY: 298,
    shape: (
      <ellipse cx={72} cy={298} rx={22} ry={36} />
    ),
  },
  left_thigh: {
    label: "L Thigh",
    labelX: 128,
    labelY: 298,
    shape: (
      <ellipse cx={128} cy={298} rx={22} ry={36} />
    ),
  },
};

function getSiteColor(
  site: InjectionSite,
  selected: InjectionSite | null,
  suggested: string | null,
  recencyMap: Map<string, number>
): { fill: string; stroke: string; strokeWidth: number; opacity: number } {
  if (site === selected) {
    return { fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 2.5, opacity: 0.85 };
  }
  if (site === suggested && site !== selected) {
    return { fill: "#d1fae5", stroke: "#10b981", strokeWidth: 2.5, opacity: 0.9 };
  }
  const daysSince = recencyMap.get(site);
  if (daysSince !== undefined) {
    // Recently used: orange tint; recency fades over 30 days
    const intensity = Math.max(0, 1 - daysSince / 30);
    const alpha = 0.25 + intensity * 0.45;
    return { fill: "#f59e0b", stroke: "#d97706", strokeWidth: 1.5, opacity: alpha };
  }
  return { fill: "#e5e7eb", stroke: "#9ca3af", strokeWidth: 1.5, opacity: 1 };
}

interface BodyMapProps {
  selected: InjectionSite | null;
  onSelect: (site: InjectionSite) => void;
  suggested: string | null;
  recencyMap: Map<string, number>;
}

function BodyMap({ selected, onSelect, suggested, recencyMap }: BodyMapProps) {
  const sites = Object.keys(SITE_REGIONS) as InjectionSite[];

  return (
    <svg
      viewBox="0 0 200 380"
      style={{ width: "100%", maxWidth: 200, height: "auto", display: "block", margin: "0 auto" }}
      aria-label="Body map for injection site selection"
    >
      {/* Head */}
      <ellipse cx={100} cy={38} rx={26} ry={30} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1.5} />

      {/* Neck */}
      <rect x={91} y={64} width={18} height={18} rx={4} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1.5} />

      {/* Torso */}
      <rect x={58} y={100} width={84} height={120} rx={14} fill="#f9fafb" stroke="#d1d5db" strokeWidth={1.5} />

      {/* Lower body / hips */}
      <ellipse cx={100} cy={225} rx={44} ry={16} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1} />

      {/* Left leg (viewer's right) */}
      <rect x={104} y={232} width={36} height={100} rx={14} fill="#f9fafb" stroke="#d1d5db" strokeWidth={1.5} />
      {/* Right leg (viewer's left) */}
      <rect x={60} y={232} width={36} height={100} rx={14} fill="#f9fafb" stroke="#d1d5db" strokeWidth={1.5} />

      {/* Left shoulder cap (viewer's right) */}
      <ellipse cx={144} cy={108} rx={14} ry={10} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1} />
      {/* Right shoulder cap (viewer's left) */}
      <ellipse cx={56} cy={108} rx={14} ry={10} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={1} />

      {/* Clickable injection site regions */}
      {sites.map((site) => {
        const region = SITE_REGIONS[site];
        const colors = getSiteColor(site, selected, suggested, recencyMap);
        const isSuggested = site === suggested && site !== selected;

        return (
          <g
            key={site}
            onClick={() => onSelect(site)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={`Select ${INJECTION_SITE_LABELS[site] ?? site}`}
            aria-pressed={site === selected}
          >
            {/* Pulse ring for suggested site */}
            {isSuggested && (
              <g opacity={0.5}>
                {/* We use a slightly enlarged copy of the shape with animation */}
                <style>{`
                  @keyframes pulse-ring {
                    0% { opacity: 0.6; transform: scale(1); }
                    70% { opacity: 0; transform: scale(1.25); }
                    100% { opacity: 0; transform: scale(1.25); }
                  }
                  .pulse-ring-${site} {
                    transform-origin: ${site.includes("arm")
                      ? (site === "left_arm" ? "162px 148px" : "38px 148px")
                      : site.includes("thigh")
                        ? (site === "left_thigh" ? "128px 298px" : "72px 298px")
                        : site === "left_abdomen"
                          ? "126px 192px"
                          : "74px 192px"
                    };
                    animation: pulse-ring 1.8s ease-out infinite;
                  }
                `}</style>
                <g className={`pulse-ring-${site}`} fill="none" stroke="#10b981" strokeWidth={2}>
                  {region.shape}
                </g>
              </g>
            )}

            {/* Main region shape */}
            <g
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={colors.strokeWidth}
              opacity={colors.opacity}
            >
              {region.shape}
            </g>

            {/* Label */}
            <text
              x={region.labelX}
              y={region.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={site === selected ? 700 : 500}
              fill={site === selected ? "#fff" : "#374151"}
              pointerEvents="none"
              style={{ userSelect: "none" }}
            >
              {region.label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(4, 355)">
        <rect x={0} y={0} width={10} height={10} rx={2} fill="#3b82f6" opacity={0.85} />
        <text x={13} y={8} fontSize={6.5} fill="#6b7280">Selected</text>
        <rect x={55} y={0} width={10} height={10} rx={2} fill="#d1fae5" stroke="#10b981" strokeWidth={1} />
        <text x={68} y={8} fontSize={6.5} fill="#6b7280">Suggested</text>
        <rect x={120} y={0} width={10} height={10} rx={2} fill="#f59e0b" opacity={0.6} />
        <text x={133} y={8} fontSize={6.5} fill="#6b7280">Recent</text>
      </g>
    </svg>
  );
}

// ─── Reminder Banner ─────────────────────────────────────────────────────────

function ReminderBanner({
  medicationId,
  medicationName,
}: {
  medicationId: string;
  medicationName: string;
}) {
  const trpc = useTRPC();
  const { data: reminder } = useQuery(
    trpc.injection.upcomingReminder.queryOptions({ medicationId })
  );

  if (!reminder) return null;

  const nextDate = new Date(reminder.nextInjectionDate);
  const days = reminder.daysUntil;

  let bannerBg = "#eff6ff";
  let bannerBorder = "#bfdbfe";
  let bannerText = "#1d4ed8";
  let bannerMsg = "";

  if (days < 0) {
    bannerBg = "#fff7ed";
    bannerBorder = "#fed7aa";
    bannerText = "#c2410c";
    bannerMsg = `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
  } else if (days === 0) {
    bannerBg = "#fef9c3";
    bannerBorder = "#fde047";
    bannerText = "#a16207";
    bannerMsg = "Due today";
  } else if (days === 1) {
    bannerMsg = "Due tomorrow";
  } else {
    bannerMsg = `Due in ${days} days`;
  }

  return (
    <div
      style={{
        background: bannerBg,
        border: `1px solid ${bannerBorder}`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        fontSize: 14,
        color: bannerText,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <span>
        <strong>{medicationName}</strong> next injection:{" "}
        <strong>
          {nextDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </strong>
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: 13,
          background: bannerText,
          color: "#fff",
          borderRadius: 20,
          padding: "2px 10px",
        }}
      >
        {bannerMsg}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InjectionsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Form state
  const [selectedMedId, setSelectedMedId] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<InjectionSite | null>(null);
  const [dose, setDose] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [date, setDate] = useState<string>(todayString());
  const [formError, setFormError] = useState<string>("");

  // Queries
  const { data: medications = [], isLoading: medsLoading } = useQuery(
    trpc.medication.list.queryOptions()
  );

  const { data: injections = [], isLoading: injectionsLoading } = useQuery(
    trpc.injection.list.queryOptions({})
  );

  const { data: suggestion } = useQuery(
    trpc.injection.suggestNextSite.queryOptions()
  );

  // Build recency map: site -> days since last use
  const recencyMap = new Map<string, number>();
  const now = new Date();
  for (const inj of injections) {
    const injDate = typeof inj.date === "string" ? new Date(inj.date) : inj.date;
    const days = daysBetween(now, injDate);
    const existing = recencyMap.get(inj.site);
    if (existing === undefined || days < existing) {
      recencyMap.set(inj.site, days);
    }
  }

  // Mutations
  const createMutation = useMutation(
    trpc.injection.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.injection.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.injection.suggestNextSite.queryKey() });
        setSelectedSite(null);
        setDose("");
        setNotes("");
        setDate(todayString());
        setFormError("");
      },
      onError: (err: { message?: string }) => {
        setFormError(err.message || "Failed to log injection.");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.injection.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.injection.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.injection.suggestNextSite.queryKey() });
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!selectedMedId) {
      setFormError("Please select a medication.");
      return;
    }
    if (!selectedSite) {
      setFormError("Please select an injection site.");
      return;
    }
    const doseNum = parseFloat(dose);
    if (!dose || isNaN(doseNum) || doseNum <= 0) {
      setFormError("Please enter a valid dose.");
      return;
    }
    if (!date) {
      setFormError("Please select a date.");
      return;
    }

    createMutation.mutate({
      medicationId: selectedMedId,
      site: selectedSite,
      dose: doseNum,
      notes: notes.trim() || undefined,
      date,
    });
  }

  // Sort injections descending by date
  const sortedInjections = [...injections].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db2 = new Date(b.date).getTime();
    return db2 - da;
  });

  // Find medication name by id
  const medMap = new Map<string, Medication>(
    (medications as Medication[]).map((m) => [m.id, m])
  );

  const selectedMed = selectedMedId ? medMap.get(selectedMedId) : undefined;

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

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 24px 60px" }}>
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
        Injection Tracker
      </h1>
      <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 15 }}>
        Log your GLP-1 injections and rotate sites to reduce discomfort.
      </p>

      {/* No medications warning */}
      {!medsLoading && medications.length === 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 28,
            color: "#92400e",
            fontSize: 15,
          }}
        >
          <strong>No medications found.</strong> You need to add a medication before logging
          injections. (Medication management coming soon — use the API or database directly to
          add one.)
        </div>
      )}

      {/* Suggestion Banner */}
      {suggestion && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 20 }}>&#128204;</span>
          <div>
            <div style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
              Suggested Next Site
            </div>
            <div style={{ fontSize: 15, color: "#166534", fontWeight: 700 }}>
              {suggestion.siteLabel}
            </div>
          </div>
          {selectedSite !== (suggestion.site as InjectionSite) && (
            <button
              onClick={() => setSelectedSite(suggestion.site as InjectionSite)}
              style={{
                marginLeft: "auto",
                padding: "6px 14px",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Use This Site
            </button>
          )}
        </div>
      )}

      {/* Reminder Banner */}
      {selectedMed && (
        <ReminderBanner medicationId={selectedMed.id} medicationName={selectedMed.name} />
      )}

      {/* Body Map + Form side by side */}
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        {/* Body Map */}
        <div
          style={{
            flex: "0 0 220px",
            minWidth: 180,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
            Tap a site to select
          </div>
          <BodyMap
            selected={selectedSite}
            onSelect={setSelectedSite}
            suggested={suggestion?.site ?? null}
            recencyMap={recencyMap}
          />
          {selectedSite && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                fontSize: 13,
                color: "#1d4ed8",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {INJECTION_SITE_LABELS[selectedSite] ?? selectedSite}
            </div>
          )}
        </div>

        {/* Form */}
        <div
          style={{
            flex: "1 1 300px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
            Log Injection
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Medication */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="med-select" style={labelStyle}>
                Medication
              </label>
              {medsLoading ? (
                <div style={{ fontSize: 14, color: "#9ca3af" }}>Loading medications...</div>
              ) : (
                <select
                  id="med-select"
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Select medication…</option>
                  {(medications as Medication[]).map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.name} — {med.currentDose} {med.doseUnit}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Site (dropdown fallback / mirror of body map) */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="site-select" style={labelStyle}>
                Injection Site
              </label>
              <select
                id="site-select"
                value={selectedSite ?? ""}
                onChange={(e) =>
                  setSelectedSite((e.target.value || null) as InjectionSite | null)
                }
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Select from map or dropdown…</option>
                {(Object.keys(INJECTION_SITE_LABELS) as InjectionSite[]).map((site) => (
                  <option key={site} value={site}>
                    {INJECTION_SITE_LABELS[site]}
                  </option>
                ))}
              </select>
            </div>

            {/* Dose */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="dose-input" style={labelStyle}>
                Dose{selectedMed ? ` (${selectedMed.doseUnit})` : ""}
              </label>
              <input
                id="dose-input"
                type="number"
                step="0.01"
                min="0"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder={
                  selectedMed ? `e.g. ${selectedMed.currentDose}` : "e.g. 0.5"
                }
                style={inputStyle}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="inj-date" style={labelStyle}>
                Date
              </label>
              <input
                id="inj-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="inj-notes" style={labelStyle}>
                Notes <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="inj-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations, side effects, etc."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {formError && (
              <p style={{ margin: "0 0 12px", color: "#ef4444", fontSize: 13 }}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                width: "100%",
                padding: "11px 0",
                background: createMutation.isPending ? "#93c5fd" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: createMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {createMutation.isPending ? "Logging..." : "Log Injection"}
            </button>
          </form>
        </div>
      </div>

      {/* Injection History */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#374151" }}>
          Injection History
        </h2>

        {injectionsLoading ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading history...</div>
        ) : sortedInjections.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No injections logged yet. Use the form above to record your first one.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {["Date", "Medication", "Site", "Dose", "Notes", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === "" || h === "Dose" ? "right" : "left",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedInjections.map((inj: InjectionEntry, i) => {
                  const med = medMap.get(inj.medicationId);
                  return (
                    <tr
                      key={inj.id}
                      style={{
                        borderBottom:
                          i < sortedInjections.length - 1 ? "1px solid #f3f4f6" : "none",
                        background: i % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>
                        {formatDateTime(inj.date)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        {med ? med.name : inj.medicationId.slice(0, 8) + "…"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {INJECTION_SITE_LABELS[inj.site] ?? inj.site}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: "#111827",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inj.dose}
                        {med ? ` ${med.doseUnit}` : ""}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#6b7280",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inj.notes ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button
                          onClick={() => deleteMutation.mutate({ id: inj.id })}
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
                          aria-label={`Delete injection on ${formatDateTime(inj.date)}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
