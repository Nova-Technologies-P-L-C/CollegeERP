"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  onRowAction?: (row: T) => void;
  onRowClick?: (row: T) => void;
  selectedRowKey?: (row: T) => boolean;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function extractAllStrings(val: unknown): string[] {
  if (val == null) return [];
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return [String(val).toLowerCase()];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractAllStrings);
  }
  if (typeof val === "object") {
    return Object.values(val as Record<string, unknown>).flatMap(extractAllStrings);
  }
  return [];
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKeys = [],
  pageSize = 10,
  onRowClick,
  selectedRowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const tokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return data.filter((row) => {
      let searchableValues: string[] = [];
      if (searchKeys.length > 0) {
        searchableValues = searchKeys.flatMap((key) => {
          const val = key.includes(".") ? getNestedValue(row, key) : row[key];
          return extractAllStrings(val);
        });
      } else {
        searchableValues = extractAllStrings(row);
      }

      const combinedText = searchableValues.join(" ");
      return tokens.every((token) => combinedText.includes(token));
    });
  }, [data, search, searchKeys]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Search + page size */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/30 hover:bg-accent/30">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span className="text-muted-foreground/50">
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-10 w-10 opacity-20" />
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, i) => (
                  <TableRow
                    key={i}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "hover:bg-accent/30 transition-colors",
                      onRowClick && "cursor-pointer",
                      selectedRowKey && selectedRowKey(row) && "bg-brand-primary/10 hover:bg-brand-primary/15 font-medium border-l-4 border-l-brand-primary"
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className="text-sm">
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          Showing {sorted.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length} entries
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  page === pageNum
                    ? "bg-brand-primary text-white"
                    : "border border-border hover:bg-accent"
                )}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
