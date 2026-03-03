"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import type { CampaignPhase } from "@/lib/types";
import { ProspectTableConfig } from "@/lib/prospects-config";
import { PageCursor } from "@/lib/prospects-api";
import { ProspectCard } from "@/components/dashboard/ProspectCard";
import { ProspectCreateModal } from "@/components/dashboard/ProspectCreateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProspectListViewProps {
  slug: string;
  config: ProspectTableConfig;
}

type PageSize = 20 | 50 | 100 | 1000;

export function ProspectListView({ slug, config }: ProspectListViewProps) {
  const pk = config.primaryKey ?? "prospect_id";
  const apiBase = config.apiBasePath ?? `/api/prospects/${slug}`;

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [cursorStack, setCursorStack] = useState<PageCursor[]>([]);
  const [currentCursor, setCurrentCursor] = useState<PageCursor | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  // Phase filter state (standardcreators only)
  const [phaseFilter, setPhaseFilter] = useState<"all" | CampaignPhase>("all");
  const [filteredProspectIds, setFilteredProspectIds] =
    useState<Set<string> | null>(null);
  const [phaseFilterLoading, setPhaseFilterLoading] = useState(false);

  // Track the latest fetch to ignore stale responses
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(
    async (cursor: PageCursor | null, search: string, limit: PageSize) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set("cursor", JSON.stringify(cursor));
      if (search.trim()) params.set("search", search.trim());

      try {
        const res = await fetch(`${apiBase}?${params}`);
        if (fetchId !== fetchIdRef.current) return; // stale

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "Failed to load data.");
          setLoading(false);
          return;
        }

        const result = await res.json();
        setData(result.data ?? []);
        setHasNext(result.hasNext ?? false);
        setCurrentCursor(result.nextCursor ?? null);
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        setError("Network error. Please try again.");
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    },
    [slug],
  );

  // Reset everything and reload on slug (tab) change
  useEffect(() => {
    setCursorStack([]);
    setCurrentCursor(null);
    setSearchInput("");
    setActiveSearch("");
    setPhaseFilter("all");
    setFilteredProspectIds(null);
    fetchData(null, "", pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Reload when pageSize changes (reset to first page)
  function handlePageSizeChange(val: string) {
    const size = parseInt(val) as PageSize;
    setPageSize(size);
    setCursorStack([]);
    setCurrentCursor(null);
    fetchData(null, activeSearch, size);
  }

  function handleSearch() {
    setCursorStack([]);
    setCurrentCursor(null);
    setActiveSearch(searchInput);
    fetchData(null, searchInput, pageSize);
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
    setCursorStack([]);
    setCurrentCursor(null);
    fetchData(null, "", pageSize);
  }

  function handleNext() {
    if (!currentCursor) return;
    setCursorStack((prev) => [...prev, currentCursor]);
    fetchData(currentCursor, activeSearch, pageSize);
  }

  function handlePrev() {
    const newStack = [...cursorStack];
    newStack.pop();
    const prevCursor = newStack[newStack.length - 1] ?? null;
    setCursorStack(newStack);
    fetchData(prevCursor, activeSearch, pageSize);
  }

  const pageNumber = cursorStack.length + 1;

  // Called by ProspectCard on inline single delete
  function handleSingleDelete(id: string) {
    setData((prev) => prev.filter((r) => r[pk] !== id));
  }

  // Phase filter (standardcreators only)
  async function applyPhaseFilter(phase: "all" | CampaignPhase) {
    setPhaseFilter(phase);
    if (phase === "all") {
      setFilteredProspectIds(null);
      return;
    }
    setPhaseFilterLoading(true);
    try {
      const res = await fetch(`/api/campaigns?phase=${phase}`);
      const d = await res.json();
      setFilteredProspectIds(new Set<string>(d.prospect_ids ?? []));
    } finally {
      setPhaseFilterLoading(false);
    }
  }

  const displayData =
    filteredProspectIds !== null
      ? data.filter((r) => filteredProspectIds.has(r[pk] as string))
      : data;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-60 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`Search by ${config.searchFields.join(" or ")}…`}
              className="pl-8 h-9"
            />
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            variant="secondary"
            className="gap-1.5 shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          {activeSearch && (
            <Button
              onClick={handleClearSearch}
              size="sm"
              variant="ghost"
              className="gap-1.5 shrink-0 text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Page size */}
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
              <SelectItem value="1000">1000 / page</SelectItem>
            </SelectContent>
          </Select>

          {/* Add */}
          <ProspectCreateModal
            slug={slug}
            config={config}
            onSuccess={() => {
              const cursor = cursorStack[cursorStack.length - 1] ?? null;
              fetchData(cursor, activeSearch, pageSize);
            }}
          />
        </div>
      </div>

      {/* Phase filter chips — standardcreators only */}
      {slug === "standardcreators" && (
        <div className="flex items-center gap-2 flex-wrap">
          {phaseFilterLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          )}
          {(
            [
              { value: "all", label: "All" },
              { value: "form_filled", label: "Form Filled" },
              { value: "order_received", label: "Order Received" },
              { value: "content_published", label: "Published" },
            ] as { value: "all" | CampaignPhase; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyPhaseFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                phaseFilter === opt.value
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Active search banner */}
      {activeSearch && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0" />
          Showing results for <strong>&ldquo;{activeSearch}&rdquo;</strong>{" "}
          across all records in {config.displayLabel}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg font-medium">No records found</p>
          <p className="text-sm mt-1">
            {activeSearch
              ? "Try a different search term."
              : "Add the first record using the button above."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayData.map((record) => (
            <ProspectCard
              key={record[pk] as string}
              record={record}
              config={config}
              slug={slug}
              onDelete={handleSingleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination footer */}
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {pageNumber}
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrev}
              disabled={cursorStack.length === 0}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!hasNext}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
