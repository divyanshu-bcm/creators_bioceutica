"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MoreHorizontal,
  Instagram,
  Youtube,
  Mail,
  Users,
  Star,
  Trash2,
  ExternalLink,
  UserCircle2,
} from "lucide-react";
import { ProspectTableConfig } from "@/lib/prospects-config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ProspectCardProps {
  record: Record<string, unknown>;
  config: ProspectTableConfig;
  slug: string;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: (id: string) => void;
}

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function statusColor(status: string | null | undefined): string {
  if (!status)
    return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  const s = status.toLowerCase();
  if (
    s.includes("active") ||
    s.includes("yes") ||
    s.includes("fit") ||
    s.includes("attiv")
  ) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
  if (
    s.includes("pending") ||
    s.includes("wait") ||
    s.includes("maybe") ||
    s.includes("follow")
  ) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
  }
  if (
    s.includes("no") ||
    s.includes("reject") ||
    s.includes("decline") ||
    s.includes("not")
  ) {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
  }
  if (s.includes("contact") || s.includes("sent") || s.includes("reach")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function fitColor(fit: string | null | undefined): string {
  if (!fit)
    return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  const f = fit.toLowerCase();
  if (f === "yes" || f === "fit" || f === "si" || f === "sì") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
  if (f === "no" || f === "not fit") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
}

// Avatar background color derived from initials
const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function avatarColor(name: string | undefined | null): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ProspectCard({
  record,
  config,
  slug,
  selected,
  onToggleSelect,
  onDelete,
}: ProspectCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const pk = config.primaryKey ?? "prospect_id";
  const apiBase = config.apiBasePath ?? `/api/prospects/${slug}`;
  const detailBase = config.detailBasePath ?? `/dashboard/prospects/${slug}`;

  const prospectId = record[pk] as string;
  const name = record[config.nameField] as string | null;
  const initials = getInitials(name);
  const bgColor = avatarColor(name);

  // Status and fit fields (may not exist on every table)
  const status = (record["Status"] ?? record["STATUS"] ?? null) as
    | string
    | null;
  const fit = (record["IS A FIT?"] ?? record["Fit or Not"] ?? null) as
    | string
    | null;
  const email = record["Email"] as string | null;

  // Social stats — shown if present
  const igFollowers = (record["Instagram Followers"] ?? null) as string | null;
  const ttFollowers = (record["TikTok Followers"] ?? null) as string | null;
  const ytSubs = (record["Youtube Subscribers"] ??
    record["Iscritti"] ??
    null) as string | null;

  // Extra notable field per table
  const type = (record["Type"] ?? null) as string | null;
  const source = (record["Source"] ?? null) as string | null;

  // Creator link (for content records)
  const creatorName = (record["creator_name"] ?? null) as string | null;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${name ?? "this record"}"? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${prospectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(prospectId);
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleCardClick() {
    router.push(`${detailBase}/${prospectId}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      className={cn(
        "group relative flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border px-5 py-4 cursor-pointer transition-all duration-150",
        "hover:shadow-md hover:-translate-y-px hover:border-slate-300 dark:hover:border-slate-600",
        selected
          ? "border-slate-900 dark:border-slate-100 shadow-sm ring-1 ring-slate-900 dark:ring-slate-100"
          : "border-slate-200 dark:border-slate-800",
        deleting && "opacity-50 pointer-events-none",
      )}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className="shrink-0"
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-slate-900 dark:accent-slate-100 cursor-pointer"
        />
      </div>

      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm select-none",
          bgColor,
        )}
      >
        {initials}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs">
            {name ?? <span className="text-slate-400 italic">No name</span>}
          </span>
          {status && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                statusColor(status),
              )}
            >
              {status}
            </span>
          )}
          {fit && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                fitColor(fit),
              )}
            >
              <Star className="h-3 w-3" />
              {fit}
            </span>
          )}
          {type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {type}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          {igFollowers && (
            <span className="flex items-center gap-1">
              <Instagram className="h-3.5 w-3.5 shrink-0 text-pink-500" />
              <span>{igFollowers}</span>
            </span>
          )}
          {ttFollowers && (
            <span className="flex items-center gap-1">
              {/* TikTok icon approximation */}
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
              </svg>
              <span>{ttFollowers}</span>
            </span>
          )}
          {ytSubs && (
            <span className="flex items-center gap-1">
              <Youtube className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span>{ytSubs}</span>
            </span>
          )}
          {email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-45">{email}</span>
            </span>
          )}
          {source && !igFollowers && !email && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>{source}</span>
            </span>
          )}
          {creatorName && (
            <span className="flex items-center gap-1">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span>{creatorName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => router.push(`${detailBase}/${prospectId}`)}
              className="gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View / Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
