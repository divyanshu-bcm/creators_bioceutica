"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ExternalLink,
  PackageCheck,
  ImagePlay,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CreatorCampaign, CampaignPhase } from "@/lib/types";

interface CampaignPanelProps {
  prospectId: string;
  prospectCreatedAt: string;
}

const PHASES: { key: CampaignPhase | "contacted"; label: string }[] = [
  { key: "contacted", label: "Contacted" },
  { key: "form_filled", label: "Form Filled" },
  { key: "order_received", label: "Order Received" },
  { key: "content_published", label: "Published" },
];

function phaseIndex(phase: CampaignPhase): number {
  return ["form_filled", "order_received", "content_published"].indexOf(phase);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface OrderFormProps {
  campaignId: string;
  onSuccess: (updated: CreatorCampaign) => void;
}

function OrderIdForm({ campaignId, onSuccess }: OrderFormProps) {
  const [orderId, setOrderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) {
      setError("Order ID is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "order_received", order_id: orderId }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSuccess(updated);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 mt-2">
      <div className="flex gap-2">
        <Input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Enter Order ID…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

interface CampaignCardProps {
  campaign: CreatorCampaign;
  onUpdate: (updated: CreatorCampaign) => void;
}

function CampaignCard({ campaign, onUpdate }: CampaignCardProps) {
  const [publishing, setPublishing] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const pIdx = phaseIndex(campaign.phase);

  async function markPublished() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "content_published" }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      {/* Phase timeline */}
      <div className="flex items-center gap-0">
        {PHASES.map((phase, i) => {
          // Contacted = always filled; others depend on phaseIndex
          const filled = i === 0 ? true : i - 1 <= pIdx;
          const isLast = i === PHASES.length - 1;

          return (
            <div
              key={phase.key}
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Dot + label */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2 transition-colors",
                    filled
                      ? "bg-slate-900 border-slate-900 dark:bg-slate-100 dark:border-slate-100"
                      : "bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none text-center whitespace-nowrap",
                    filled
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-400 dark:text-slate-600",
                  )}
                >
                  {phase.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 -mt-4 transition-colors",
                    i < pIdx + 1
                      ? "bg-slate-900 dark:bg-slate-100"
                      : "bg-slate-200 dark:bg-slate-700",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form info */}
      {campaign.form && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0">
            <ImagePlay className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <span className="truncate font-medium">{campaign.form.title}</span>
          </div>
          {campaign.form_submission_id && (
            <a
              href={`/dashboard/responses/${campaign.form_submission_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              View Response
            </a>
          )}
        </div>
      )}

      {/* Order section */}
      {campaign.phase === "order_received" ||
      campaign.phase === "content_published" ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Package className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {campaign.order_id}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled
            className="h-7 text-xs gap-1.5 opacity-50 cursor-not-allowed"
            title="Tracking API coming soon"
          >
            <PackageCheck className="h-3 w-3" />
            Track Order
          </Button>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
        {campaign.phase === "form_filled" && (
          <>
            {showOrderForm ? (
              <OrderIdForm
                campaignId={campaign.id}
                onSuccess={(updated) => {
                  setShowOrderForm(false);
                  onUpdate(updated);
                }}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8 w-full"
                onClick={() => setShowOrderForm(true)}
              >
                <Package className="h-3.5 w-3.5" />
                Mark Order Received
              </Button>
            )}
          </>
        )}

        {campaign.phase === "order_received" && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8 w-full"
            disabled={publishing}
            onClick={markPublished}
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PackageCheck className="h-3.5 w-3.5" />
            )}
            Mark Content Published
          </Button>
        )}

        {campaign.phase === "content_published" && (
          <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Campaign complete — {formatDate(campaign.content_published_at)}
          </p>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-[10px] text-slate-400 dark:text-slate-600 space-y-0.5">
        <p>Form filled: {formatDate(campaign.form_filled_at)}</p>
        {campaign.order_received_at && (
          <p>Order received: {formatDate(campaign.order_received_at)}</p>
        )}
        {campaign.content_published_at && (
          <p>Published: {formatDate(campaign.content_published_at)}</p>
        )}
      </div>
    </div>
  );
}

export function CampaignPanel({
  prospectId,
  prospectCreatedAt: _prospectCreatedAt,
}: CampaignPanelProps) {
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/campaigns?prospect_id=${prospectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.error) setError(d.error);
          else setCampaigns(d.campaigns ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load campaigns.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId]);

  function handleUpdate(updated: CreatorCampaign) {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Campaigns
      </h2>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          No campaigns yet.
          <br />
          <span className="text-xs">
            A campaign starts when this creator fills a form.
          </span>
        </div>
      )}

      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
