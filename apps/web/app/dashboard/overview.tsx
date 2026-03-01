"use client";

import { useTRPC } from "~/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 14) return "1 week ago";
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} weeks ago`;
  return d.toLocaleDateString();
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatInjectionStatus(nextDueDate: Date | string | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (!nextDueDate) {
    return { label: "No injections yet", color: "#6b7280", bg: "#f3f4f6" };
  }
  const due = typeof nextDueDate === "string" ? new Date(nextDueDate) : nextDueDate;
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const dueMidnight = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );
  const diffDays = Math.round(
    (dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return { label: "Due today!", color: "#92400e", bg: "#fffbeb" };
  }
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return {
      label: `${n} day${n === 1 ? "" : "s"} overdue`,
      color: "#991b1b",
      bg: "#fef2f2",
    };
  }
  return {
    label: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
    color: "#065f46",
    bg: "#ecfdf5",
  };
}

function bpCategoryStyle(category: string | null): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (category) {
    case "normal":
      return { label: "Normal", color: "#065f46", bg: "#ecfdf5", border: "#6ee7b7" };
    case "elevated":
      return { label: "Elevated", color: "#854d0e", bg: "#fefce8", border: "#fde047" };
    case "high1":
      return {
        label: "High (Stage 1)",
        color: "#9a3412",
        bg: "#fff7ed",
        border: "#fdba74",
      };
    case "high2":
      return {
        label: "High (Stage 2)",
        color: "#7f1d1d",
        bg: "#fef2f2",
        border: "#fca5a5",
      };
    default:
      return { label: "—", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  }
}

function activityIcon(type: string): string {
  switch (type) {
    case "weight":
      return "⚖";
    case "injection":
      return "💉";
    case "vitals":
      return "❤";
    case "food":
      return "🍴";
    default:
      return "•";
  }
}

function activityBorderColor(type: string): string {
  switch (type) {
    case "weight":
      return "#3b82f6";
    case "injection":
      return "#8b5cf6";
    case "vitals":
      return "#ef4444";
    case "food":
      return "#f59e0b";
    default:
      return "#d1d5db";
  }
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function SnapshotCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 22px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#9ca3af",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card shown while loading
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 22px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          height: 12,
          width: "60%",
          borderRadius: 6,
          background: "#e5e7eb",
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 28,
          width: "80%",
          borderRadius: 6,
          background: "#e5e7eb",
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 12,
          width: "50%",
          borderRadius: 6,
          background: "#e5e7eb",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardOverview() {
  const trpc = useTRPC();

  const summaryQuery = useQuery(trpc.dashboard.summary.queryOptions());
  const activityQuery = useQuery(trpc.dashboard.recentActivity.queryOptions());

  const summary = summaryQuery.data;
  const activities = activityQuery.data;

  // ---- Health snapshot cards ----
  const injStatus = formatInjectionStatus(summary?.injections.nextDueDate ?? null);
  const bpStyle = bpCategoryStyle(summary?.vitals.bpCategory ?? null);

  return (
    <div>
      {/* Health Snapshot */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 18,
          fontWeight: 600,
          color: "#374151",
        }}
      >
        Health Snapshot
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {summaryQuery.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : summaryQuery.isError ? (
          <p style={{ color: "#ef4444", fontSize: 14 }}>
            Failed to load summary data.
          </p>
        ) : (
          <>
            {/* Weight card */}
            <SnapshotCard title="Current Weight" accent="#3b82f6">
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#111827",
                  lineHeight: 1.1,
                }}
              >
                {summary?.weight.current != null
                  ? `${summary.weight.current.toFixed(1)}`
                  : "—"}
              </p>
              {summary?.weight.current != null && (
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  lbs
                </p>
              )}
              {summary?.weight.totalLost != null &&
                summary.weight.totalLost > 0 && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "#059669",
                      fontWeight: 500,
                    }}
                  >
                    {summary.weight.totalLost.toFixed(1)} lbs lost total
                  </p>
                )}
              {summary?.weight.entryCount === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  No entries yet
                </p>
              )}
            </SnapshotCard>

            {/* Injection card */}
            <SnapshotCard title="Injection Status" accent="#8b5cf6">
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: injStatus.color,
                }}
              >
                {injStatus.label}
              </p>
              {summary?.injections.lastInjectionDate && (
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  Last:{" "}
                  {formatDate(summary.injections.lastInjectionDate)}
                </p>
              )}
              {summary?.injections.nextDueDate && (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Due:{" "}
                  {formatDate(summary.injections.nextDueDate)}
                </p>
              )}
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                {summary?.injections.totalCount ?? 0} total injection
                {summary?.injections.totalCount !== 1 ? "s" : ""}
              </p>
            </SnapshotCard>

            {/* BP card */}
            <SnapshotCard title="Blood Pressure" accent="#ef4444">
              {summary?.vitals.latestSystolic != null ? (
                <>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#111827",
                      lineHeight: 1.1,
                    }}
                  >
                    {summary.vitals.latestSystolic}/
                    {summary.vitals.latestDiastolic}
                  </p>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
                    mmHg &middot; HR {summary.vitals.latestHeartRate} bpm
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: bpStyle.bg,
                      color: bpStyle.color,
                      border: `1px solid ${bpStyle.border}`,
                    }}
                  >
                    {bpStyle.label}
                  </span>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  No readings yet
                </p>
              )}
            </SnapshotCard>

            {/* Nutrition card */}
            <SnapshotCard title="Today's Nutrition" accent="#f59e0b">
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#111827",
                  lineHeight: 1.1,
                }}
              >
                {summary?.food.todayCalories ?? 0}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
                kcal today
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                {summary?.food.todayMeals ?? 0} meal
                {summary?.food.todayMeals !== 1 ? "s" : ""} logged
              </p>
            </SnapshotCard>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 18,
          fontWeight: 600,
          color: "#374151",
        }}
      >
        Recent Activity
      </h2>

      {activityQuery.isLoading ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                marginBottom: i < 3 ? 16 : 0,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 13,
                    width: "60%",
                    borderRadius: 6,
                    background: "#e5e7eb",
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    height: 11,
                    width: "30%",
                    borderRadius: 6,
                    background: "#e5e7eb",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : activityQuery.isError ? (
        <p style={{ color: "#ef4444", fontSize: 14 }}>
          Failed to load activity feed.
        </p>
      ) : !activities || activities.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>
            No activity recorded yet. Start by logging your weight, an
            injection, or a meal.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {activities.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 20px",
                borderBottom:
                  idx < activities.length - 1
                    ? "1px solid #f3f4f6"
                    : "none",
                borderLeft: `3px solid ${activityBorderColor(item.type)}`,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                }}
              >
                {activityIcon(item.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.description}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                  {formatRelativeTime(item.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
