"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
        setSelectedIds(new Set());
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
    setSelectedIds(new Set());
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

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r[pk] as string)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Delete ${selectedIds.size} selected record(s)? This cannot be undone.`,
      )
    )
      return;
    setBulkDeleting(true);
    try {
      const res = await fetch(`${apiBase}/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        // Re-fetch current page
        const cursor = cursorStack[cursorStack.length - 1] ?? null;
        fetchData(cursor, activeSearch, pageSize);
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  // Called by ProspectCard on inline single delete
  function handleSingleDelete(id: string) {
    setData((prev) => prev.filter((r) => r[pk] !== id));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }

  const allSelected = data.length > 0 && selectedIds.size === data.length;

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
          {/* Bulk delete */}
          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              size="sm"
              variant="outline"
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              {bulkDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete {selectedIds.size}
            </Button>
          )}

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

      {/* Active search banner */}
      {activeSearch && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0" />
          Showing results for <strong>&ldquo;{activeSearch}&rdquo;</strong>{" "}
          across all records in {config.displayLabel}
        </div>
      )}

      {/* Select all bar */}
      {data.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-slate-900 cursor-pointer"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {allSelected ? "All selected" : `${selectedIds.size} selected`}
          </span>
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
          {data.map((record) => (
            <ProspectCard
              key={record[pk] as string}
              record={record}
              config={config}
              slug={slug}
              selected={selectedIds.has(record[pk] as string)}
              onToggleSelect={() => toggleSelect(record[pk] as string)}
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
