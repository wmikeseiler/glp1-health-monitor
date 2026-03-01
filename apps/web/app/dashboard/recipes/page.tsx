"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Ingredient = {
  name: string;
  amount: string;
  unit?: string;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  tags: string[] | null;
  glp1FriendlyNotes: string | null;
  createdAt: Date;
  isFavorite?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TAGS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "high-protein",
  "quick",
  "low-carb",
];

const MAX_CALORIES_OPTIONS = [
  { label: "Any calories", value: "" },
  { label: "Under 200 kcal", value: "200" },
  { label: "Under 400 kcal", value: "400" },
  { label: "Under 600 kcal", value: "600" },
  { label: "Under 800 kcal", value: "800" },
];

const MAX_PREP_OPTIONS = [
  { label: "Any prep time", value: "" },
  { label: "Under 15 min", value: "15" },
  { label: "Under 30 min", value: "30" },
  { label: "Under 60 min", value: "60" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMacro(val: string | null | undefined): number {
  if (val == null) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatTime(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  outline: "none",
  cursor: "pointer",
  color: "#374151",
};

// ─── HeartIcon ────────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ─── MacroBadge ───────────────────────────────────────────────────────────────

function MacroBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: color + "14",
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {label}: {value}
    </span>
  );
}

// ─── TagPill ──────────────────────────────────────────────────────────────────

function TagPill({
  tag,
  active,
  onClick,
}: {
  tag: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        border: active ? "2px solid #3b82f6" : "1px solid #d1d5db",
        background: active ? "#eff6ff" : "#fff",
        color: active ? "#1d4ed8" : "#6b7280",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </button>
  );
}

// ─── RecipeDetail ─────────────────────────────────────────────────────────────

function RecipeDetail({
  recipe,
  onClose,
  onToggleFavorite,
  isFavoriteLoading,
}: {
  recipe: Recipe;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  isFavoriteLoading: boolean;
}) {
  const totalTime =
    (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) || null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 28,
        marginBottom: 24,
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {recipe.title}
          </h2>
          {recipe.description && (
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
              {recipe.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onToggleFavorite(recipe.id)}
            disabled={isFavoriteLoading}
            aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: isFavoriteLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HeartIcon filled={!!recipe.isFavorite} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipe"
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Time + servings row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          padding: "12px 16px",
          background: "#f9fafb",
          borderRadius: 8,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        {recipe.prepTime != null && (
          <span>Prep: <strong style={{ color: "#374151" }}>{formatTime(recipe.prepTime)}</strong></span>
        )}
        {recipe.cookTime != null && (
          <span>Cook: <strong style={{ color: "#374151" }}>{formatTime(recipe.cookTime)}</strong></span>
        )}
        {totalTime != null && recipe.prepTime != null && recipe.cookTime != null && (
          <span>Total: <strong style={{ color: "#374151" }}>{formatTime(totalTime)}</strong></span>
        )}
        {recipe.servings != null && (
          <span>Servings: <strong style={{ color: "#374151" }}>{recipe.servings}</strong></span>
        )}
      </div>

      {/* Macros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {recipe.calories != null && (
          <MacroBadge label="Cal" value={`${recipe.calories} kcal`} color="#f59e0b" />
        )}
        {recipe.protein != null && (
          <MacroBadge
            label="Protein"
            value={`${parseMacro(recipe.protein).toFixed(1)}g`}
            color="#3b82f6"
          />
        )}
        {recipe.carbs != null && (
          <MacroBadge
            label="Carbs"
            value={`${parseMacro(recipe.carbs).toFixed(1)}g`}
            color="#10b981"
          />
        )}
        {recipe.fat != null && (
          <MacroBadge
            label="Fat"
            value={`${parseMacro(recipe.fat).toFixed(1)}g`}
            color="#f97316"
          />
        )}
      </div>

      {/* GLP-1 notes */}
      {recipe.glp1FriendlyNotes && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>&#127807;</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              GLP-1 Friendly Note
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#166534", lineHeight: 1.5 }}>
              {recipe.glp1FriendlyNotes}
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
          marginBottom: 20,
        }}
      >
        {/* Ingredients */}
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#374151" }}>
            Ingredients
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  fontSize: 14,
                  color: "#374151",
                  paddingBottom: 8,
                  borderBottom: i < recipe.ingredients.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    minWidth: 56,
                    flexShrink: 0,
                  }}
                >
                  {ing.amount}{ing.unit ? ` ${ing.unit}` : ""}
                </span>
                <span style={{ color: "#6b7280" }}>{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#374151" }}>
            Instructions
          </h3>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {recipe.instructions.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                background: "#f3f4f6",
                color: "#6b7280",
                borderRadius: 12,
                padding: "3px 10px",
                border: "1px solid #e5e7eb",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onSelect,
  onToggleFavorite,
  isFavoriteLoading,
}: {
  recipe: Recipe;
  onSelect: () => void;
  onToggleFavorite: (id: string) => void;
  isFavoriteLoading: boolean;
}) {
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) || null;

  const truncatedDesc =
    recipe.description && recipe.description.length > 100
      ? recipe.description.slice(0, 97) + "..."
      : recipe.description;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
      onClick={onSelect}
    >
      {/* Card body */}
      <div style={{ padding: "18px 20px 12px", flex: 1 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <h3
            style={{
              margin: 0,
              flex: 1,
              fontSize: 16,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.3,
            }}
          >
            {recipe.title}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id);
            }}
            disabled={isFavoriteLoading}
            aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: isFavoriteLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              borderRadius: 6,
            }}
          >
            <HeartIcon filled={!!recipe.isFavorite} />
          </button>
        </div>

        {/* Description */}
        {truncatedDesc && (
          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
            {truncatedDesc}
          </p>
        )}

        {/* Macro badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {recipe.calories != null && (
            <MacroBadge label="Cal" value={`${recipe.calories}`} color="#f59e0b" />
          )}
          {recipe.protein != null && (
            <MacroBadge
              label="P"
              value={`${parseMacro(recipe.protein).toFixed(0)}g`}
              color="#3b82f6"
            />
          )}
          {recipe.carbs != null && (
            <MacroBadge
              label="C"
              value={`${parseMacro(recipe.carbs).toFixed(0)}g`}
              color="#10b981"
            />
          )}
          {recipe.fat != null && (
            <MacroBadge
              label="F"
              value={`${parseMacro(recipe.fat).toFixed(0)}g`}
              color="#f97316"
            />
          )}
        </div>

        {/* Time */}
        {totalTime != null && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
            {recipe.prepTime != null && <span>Prep {formatTime(recipe.prepTime)}</span>}
            {recipe.prepTime != null && recipe.cookTime != null && (
              <span style={{ margin: "0 4px", color: "#d1d5db" }}>·</span>
            )}
            {recipe.cookTime != null && <span>Cook {formatTime(recipe.cookTime)}</span>}
          </div>
        )}

        {/* GLP-1 note teaser */}
        {recipe.glp1FriendlyNotes && (
          <div
            style={{
              fontSize: 12,
              color: "#16a34a",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              padding: "4px 8px",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>&#127807;</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {recipe.glp1FriendlyNotes.length > 60
                ? recipe.glp1FriendlyNotes.slice(0, 57) + "..."
                : recipe.glp1FriendlyNotes}
            </span>
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  background: "#f3f4f6",
                  color: "#6b7280",
                  borderRadius: 10,
                  padding: "2px 8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: "1px solid #f3f4f6",
          background: "#fafafa",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 500 }}>
          View recipe &rarr;
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [maxCalories, setMaxCalories] = useState<string>("");
  const [maxPrepTime, setMaxPrepTime] = useState<string>("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Selected recipe state
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Favorite loading tracking
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<Set<string>>(new Set());

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Queries
  const isSearching = debouncedSearch.length >= 2;

  const { data: listRecipes = [], isLoading: listLoading } = useQuery({
    ...trpc.recipe.list.queryOptions({
      tag: activeTag ?? undefined,
      maxCalories: maxCalories ? parseInt(maxCalories) : undefined,
      maxPrepTime: maxPrepTime ? parseInt(maxPrepTime) : undefined,
    }),
    enabled: !isSearching && !showFavoritesOnly,
  });

  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    ...trpc.recipe.search.queryOptions({ query: debouncedSearch }),
    enabled: isSearching && !showFavoritesOnly,
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    ...trpc.recipe.favorites.queryOptions(),
    enabled: showFavoritesOnly,
  });

  const { data: selectedRecipe } = useQuery({
    ...trpc.recipe.getById.queryOptions({ id: selectedRecipeId! }),
    enabled: selectedRecipeId != null,
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation(
    trpc.recipe.toggleFavorite.mutationOptions({
      onMutate: (vars) => {
        setFavoriteLoadingIds((prev) => new Set(prev).add(vars.recipeId));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.recipe.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recipe.search.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recipe.favorites.queryKey() });
        if (selectedRecipeId) {
          queryClient.invalidateQueries({
            queryKey: trpc.recipe.getById.queryKey({ id: selectedRecipeId }),
          });
        }
      },
      onSettled: (_data, _err, vars) => {
        setFavoriteLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(vars.recipeId);
          return next;
        });
      },
    })
  );

  function handleToggleFavorite(recipeId: string) {
    toggleFavoriteMutation.mutate({ recipeId });
  }

  // Determine which recipe list to show
  let displayedRecipes: Recipe[] = [];
  let isLoading = false;

  if (showFavoritesOnly) {
    displayedRecipes = favorites as Recipe[];
    isLoading = favoritesLoading;
  } else if (isSearching) {
    displayedRecipes = searchResults as Recipe[];
    isLoading = searchFetching;
  } else {
    displayedRecipes = listRecipes as Recipe[];
    isLoading = listLoading;
  }

  // When a recipe is selected via the card click, show the selected one
  const recipeToShow =
    selectedRecipeId != null
      ? (selectedRecipe as Recipe | undefined) ?? displayedRecipes.find((r) => r.id === selectedRecipeId)
      : null;

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

      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
        GLP-1 Recipes
      </h1>
      <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: 15 }}>
        Browse curated recipes designed for GLP-1 therapy — high protein, satisfying, easy to prepare.
      </p>

      {/* ── A) Search & Filters */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "20px 20px 16px",
          marginBottom: 24,
        }}
      >
        {/* Search input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                // Clear selected recipe on new search
                if (selectedRecipeId) setSelectedRecipeId(null);
              }}
              placeholder="Search recipes by name or ingredient..."
              style={{
                padding: "10px 40px 10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 15,
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
              }}
              aria-label="Search recipes"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 2,
                }}
              >
                &#10005;
              </button>
            )}
          </div>
        </div>

        {/* Tag pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <TagPill
            tag="All"
            active={activeTag === null}
            onClick={() => {
              setActiveTag(null);
              setSelectedRecipeId(null);
            }}
          />
          {ALL_TAGS.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              active={activeTag === tag}
              onClick={() => {
                setActiveTag(activeTag === tag ? null : tag);
                setSelectedRecipeId(null);
              }}
            />
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <select
            value={maxCalories}
            onChange={(e) => {
              setMaxCalories(e.target.value);
              setSelectedRecipeId(null);
            }}
            style={selectStyle}
            aria-label="Filter by max calories"
          >
            {MAX_CALORIES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={maxPrepTime}
            onChange={(e) => {
              setMaxPrepTime(e.target.value);
              setSelectedRecipeId(null);
            }}
            style={selectStyle}
            aria-label="Filter by max prep time"
          >
            {MAX_PREP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Favorites toggle */}
          <button
            type="button"
            onClick={() => {
              setShowFavoritesOnly((v) => !v);
              setSelectedRecipeId(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 20,
              border: showFavoritesOnly ? "2px solid #ef4444" : "1px solid #d1d5db",
              background: showFavoritesOnly ? "#fef2f2" : "#fff",
              color: showFavoritesOnly ? "#dc2626" : "#6b7280",
              fontWeight: showFavoritesOnly ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <HeartIcon filled={showFavoritesOnly} />
            Favorites
          </button>
        </div>
      </section>

      {/* ── B) Selected Recipe Detail */}
      {recipeToShow && (
        <RecipeDetail
          recipe={recipeToShow}
          onClose={() => setSelectedRecipeId(null)}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteLoading={favoriteLoadingIds.has(recipeToShow.id)}
        />
      )}

      {/* ── C) Recipe Grid */}
      <section>
        {/* Result count / state label */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#374151" }}>
            {showFavoritesOnly
              ? "Favorited Recipes"
              : isSearching
              ? `Search: "${debouncedSearch}"`
              : activeTag
              ? `Tag: ${activeTag}`
              : "All Recipes"}
          </h2>
          {!isLoading && (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              {displayedRecipes.length} recipe{displayedRecipes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            Loading recipes...
          </div>
        ) : displayedRecipes.length === 0 ? (
          <div
            style={{
              background: "#f9fafb",
              border: "1px dashed #d1d5db",
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            {showFavoritesOnly
              ? "No favorited recipes yet. Click the heart on any recipe to save it!"
              : isSearching
              ? `No recipes found for "${debouncedSearch}".`
              : "No recipes found. Try adjusting your filters."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {displayedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSelect={() =>
                  setSelectedRecipeId(
                    selectedRecipeId === recipe.id ? null : recipe.id
                  )
                }
                onToggleFavorite={handleToggleFavorite}
                isFavoriteLoading={favoriteLoadingIds.has(recipe.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
