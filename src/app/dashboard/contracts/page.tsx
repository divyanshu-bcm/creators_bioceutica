"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type {
  Contract,
  ContractSubmitter,
  DocuSealTemplate,
  DocuSealTemplateRole,
} from "@/lib/types";
import {
  FileText,
  Send,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  PenLine,
  Users,
} from "lucide-react";

const DOCUSEAL_BASE_URL =
  process.env.NEXT_PUBLIC_DOCUSEAL_BASE_URL ??
  "https://docuseal-railway-production-792e.up.railway.app";

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    sent: "Sent",
    opened: "Opened",
    completed: "Completed",
    declined: "Declined",
    expired: "Expired",
    awaiting: "Awaiting",
  };
  return map[status] ?? status;
}

function statusVariant(
  status: string,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  if (status === "completed") return "success";
  if (status === "declined" || status === "expired") return "destructive";
  if (status === "sent" || status === "opened") return "default";
  return "secondary";
}

interface SendDraftSubmitter {
  role: string;
  uuid: string;
  email: string;
  name: string;
}

export default function ContractsPage() {
  const [tab, setTab] = useState("templates");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Templates state
  const [templates, setTemplates] = useState<DocuSealTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);

  // Send modal state
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTemplate, setSendTemplate] = useState<DocuSealTemplate | null>(
    null,
  );
  const [templateRoles, setTemplateRoles] = useState<DocuSealTemplateRole[]>(
    [],
  );
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [ourRole, setOurRole] = useState<string>("");
  const [draftSubmitters, setDraftSubmitters] = useState<SendDraftSubmitter[]>(
    [],
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [createdContract, setCreatedContract] = useState<Contract | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // Pull current user email on mount for prefilling "our" submitter row
  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserEmail(user?.email ?? "");
    })();
  }, []);

  // Fetch templates
  useEffect(() => {
    void (async () => {
      setLoadingTemplates(true);
      setTemplatesError(null);
      try {
        const res = await fetch("/api/contracts/templates");
        const data = await res.json();
        if (!res.ok) {
          setTemplatesError(data?.error ?? "Failed to load templates");
        } else {
          setTemplates(Array.isArray(data) ? data : []);
        }
      } catch {
        setTemplatesError("Failed to load templates");
      }
      setLoadingTemplates(false);
    })();
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoadingContracts(true);
    setContractsError(null);
    try {
      const res = await fetch("/api/contracts");
      const data = await res.json();
      if (!res.ok) {
        setContractsError(data?.error ?? "Failed to load contracts");
      } else {
        setContracts(Array.isArray(data) ? data : []);
      }
    } catch {
      setContractsError("Failed to load contracts");
    }
    setLoadingContracts(false);
  }, []);

  useEffect(() => {
    if (tab === "history") {
      void fetchContracts();
    }
  }, [tab, fetchContracts]);

  async function openSendModal(template: DocuSealTemplate) {
    setSendTemplate(template);
    setSendError(null);
    setCreatedContract(null);
    setCopied(false);
    setTemplateRoles([]);
    setDraftSubmitters([]);
    setOurRole("");
    setSendOpen(true);

    setLoadingRoles(true);
    try {
      const res = await fetch(`/api/contracts/templates/${template.id}`);
      const data = await res.json();
      if (!res.ok) {
        setSendError(data?.error ?? "Failed to load template roles");
        setLoadingRoles(false);
        return;
      }
      const roles: DocuSealTemplateRole[] = Array.isArray(data?.submitters)
        ? data.submitters
        : [];
      if (roles.length === 0) {
        setSendError("This template has no submitter roles configured.");
        setLoadingRoles(false);
        return;
      }
      setTemplateRoles(roles);

      const firstRole = roles[0].name;
      setOurRole(firstRole);
      setDraftSubmitters(
        roles.map((r) => ({
          role: r.name,
          uuid: r.uuid,
          email: r.name === firstRole ? currentUserEmail : "",
          name: "",
        })),
      );
    } catch {
      setSendError("Failed to load template roles");
    }
    setLoadingRoles(false);
  }

  function handleRoleChange(nextRole: string) {
    setOurRole(nextRole);
    setDraftSubmitters((prev) =>
      prev.map((s) => {
        if (s.role === nextRole) {
          return { ...s, email: s.email || currentUserEmail };
        }
        // Clear our email from the previously-selected "ours" row if it was our email
        if (s.email === currentUserEmail) {
          return { ...s, email: "" };
        }
        return s;
      }),
    );
  }

  function updateSubmitterField(
    role: string,
    field: "email" | "name",
    value: string,
  ) {
    setDraftSubmitters((prev) =>
      prev.map((s) => (s.role === role ? { ...s, [field]: value } : s)),
    );
  }

  async function handleSend() {
    if (!sendTemplate || draftSubmitters.length === 0) return;

    for (const s of draftSubmitters) {
      if (!s.email.trim()) {
        setSendError(`Email is required for ${s.role}`);
        return;
      }
    }
    if (!ourRole) {
      setSendError("Please select which party you are");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/contracts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: sendTemplate.id,
          template_name: sendTemplate.name,
          our_role: ourRole,
          submitters: draftSubmitters.map((s) => ({
            role: s.role,
            email: s.email.trim(),
            name: s.name.trim() || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data?.error ?? "Failed to send contract");
        setSending(false);
        return;
      }

      setCreatedContract(data as Contract);
      setSending(false);
      void fetchContracts();
    } catch {
      setSendError("Failed to send contract");
      setSending(false);
    }
  }

  async function copySignLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  function closeSendModal() {
    if (sending) return;
    setSendOpen(false);
    if (createdContract) {
      setTab("history");
    }
  }

  const isMultiParty = templateRoles.length >= 3;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Contracts
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Send and track DocuSeal contracts with creators.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="dark:bg-slate-800">
          <TabsTrigger
            value="templates"
            className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
          >
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100"
          >
            History
          </TabsTrigger>
        </TabsList>

        {/* ─── Templates Tab ────────────────────────── */}
        <TabsContent value="templates">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading templates...</span>
            </div>
          ) : templatesError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-300">
              {templatesError}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No templates found in DocuSeal.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                Create templates in your DocuSeal account first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {t.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Modified{" "}
                          {new Date(t.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => void openSendModal(t)}
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send Contract
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`${DOCUSEAL_BASE_URL}/templates/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── History Tab ──────────────────────────── */}
        <TabsContent value="history">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchContracts()}
              disabled={loadingContracts}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingContracts ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {contractsError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-300 mb-4">
              {contractsError}
            </div>
          )}

          {loadingContracts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading contracts...</span>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No contracts sent yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {contracts.map((c) => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Send Contract Modal ────────────────────── */}
      <Dialog open={sendOpen} onOpenChange={(v) => (v ? null : closeSendModal())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createdContract ? "Contract Created" : "Send Contract"}
            </DialogTitle>
            <DialogDescription>
              {createdContract ? (
                <>Your signing link is ready. Share happens after you sign.</>
              ) : (
                <>
                  Send &ldquo;{sendTemplate?.name}&rdquo; via DocuSeal.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingRoles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500 text-sm">
                Loading template…
              </span>
            </div>
          ) : createdContract ? (
            <SignReadyPanel
              contract={createdContract}
              onCopy={copySignLink}
              copied={copied}
            />
          ) : (
            <div className="space-y-4">
              {isMultiParty && (
                <div>
                  <Label className="mb-1.5 block flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Which party are you?
                  </Label>
                  <Select value={ourRole} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateRoles.map((r) => (
                        <SelectItem key={r.uuid} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                {draftSubmitters.map((s) => {
                  const isOurs = s.role === ourRole;
                  return (
                    <div
                      key={s.uuid}
                      className={`rounded-lg border p-3 ${
                        isOurs
                          ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {s.role}
                        </span>
                        {isOurs && (
                          <Badge variant="secondary" className="text-[10px]">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="email"
                          value={s.email}
                          onChange={(e) =>
                            updateSubmitterField(s.role, "email", e.target.value)
                          }
                          placeholder={isOurs ? "you@company.com" : "email@example.com"}
                        />
                        <Input
                          value={s.name}
                          onChange={(e) =>
                            updateSubmitterField(s.role, "name", e.target.value)
                          }
                          placeholder="Full name (optional)"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {sendError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {sendError}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {createdContract ? (
              <Button onClick={closeSendModal}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={closeSendModal}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSend()}
                  disabled={sending || loadingRoles || draftSubmitters.length === 0}
                  className="gap-1.5"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Submission
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────────────────────────────────
// Sign-ready panel (shown inside the send modal after creation)
// ───────────────────────────────────────────────────
function SignReadyPanel({
  contract,
  onCopy,
  copied,
}: {
  contract: Contract;
  onCopy: (url: string) => void | Promise<void>;
  copied: boolean;
}) {
  const signUrl = contract.our_embed_src;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" /> Submission created
        </div>
        <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
          You&apos;re next to sign as{" "}
          <strong>{contract.our_role}</strong>. Other parties will receive
          their email only after you finish.
        </p>
      </div>

      {signUrl ? (
        <div className="flex items-center gap-2">
          <Button asChild className="flex-1 gap-1.5">
            <a href={signUrl} target="_blank" rel="noopener noreferrer">
              <PenLine className="h-4 w-4" />
              Sign Now
            </a>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void onCopy(signUrl)}
            title="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          DocuSeal did not return a signing link for your role.
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────
// Contract card (history tab)
// ───────────────────────────────────────────────────
function ContractCard({ contract }: { contract: Contract }) {
  const signed = Boolean(contract.our_signed_at);
  const ourRole = contract.our_role ?? "You";
  const submitters: ContractSubmitter[] = Array.isArray(contract.submitters)
    ? contract.submitters
    : [];
  const counterparties = submitters.filter((s) => s.role !== contract.our_role);

  const borderClass = signed
    ? "border-emerald-400/70 bg-emerald-50/30 dark:border-emerald-600/50 dark:bg-emerald-950/20"
    : "border-red-300/70 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/20";

  return (
    <Card className={`border ${borderClass} transition-colors`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {contract.template_name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Sent{" "}
              {new Date(contract.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {signed ? (
            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white border-transparent">
              <CheckCircle2 className="h-3 w-3" />
              {ourRole} Signed
            </Badge>
          ) : (
            <Badge className="gap-1 bg-red-500 hover:bg-red-500 text-white border-transparent">
              <Clock className="h-3 w-3" />
              {ourRole} Pending
            </Badge>
          )}
        </div>

        {counterparties.length > 0 && (
          <div className="space-y-1.5">
            {counterparties.map((s) => (
              <div
                key={`${s.role}-${s.email}`}
                className="flex items-center justify-between text-xs rounded border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {s.name || s.email}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 truncate">
                    {s.role}
                  </p>
                </div>
                <Badge
                  variant={statusVariant(s.status ?? "pending")}
                  className="text-[10px]"
                >
                  {statusLabel(s.status ?? "pending")}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Badge variant={statusVariant(contract.status)}>
            {statusLabel(contract.status)}
          </Badge>
          <div className="flex items-center gap-2">
            {!signed && contract.our_embed_src && (
              <Button size="sm" asChild className="gap-1.5">
                <a
                  href={contract.our_embed_src}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Sign Now
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <a
                href={`${DOCUSEAL_BASE_URL}/submissions/${contract.docuseal_submission_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
