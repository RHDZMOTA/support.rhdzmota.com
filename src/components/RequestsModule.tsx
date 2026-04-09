import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { StatusBadge, PriorityDot } from "./Dashboard";
import { useWorkspace } from "../context/WorkspaceContext";

type View = "list" | "create" | "detail";

export function RequestsModule() {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<Id<"requests"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSelect = (id: Id<"requests">) => {
    setSelectedId(id);
    setView("detail");
  };

  return (
    <div>
      {view === "list" && (
        <RequestList
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onSelect={handleSelect}
          onCreate={() => setView("create")}
        />
      )}
      {view === "create" && (
        <CreateRequest onBack={() => setView("list")} onCreated={() => setView("list")} />
      )}
      {view === "detail" && selectedId && (
        <RequestDetail id={selectedId} onBack={() => setView("list")} />
      )}
    </div>
  );
}

function RequestList({
  statusFilter,
  setStatusFilter,
  onSelect,
  onCreate,
}: {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onSelect: (id: Id<"requests">) => void;
  onCreate: () => void;
}) {
  const { activeOrgId } = useWorkspace();
  const allRequests = useQuery(api.requests.list, { orgId: activeOrgId ?? undefined });
  const requests = allRequests ?? [];

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const statuses = ["all", "open", "in_progress", "pending", "resolved", "closed"];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="sys-label mb-1">module.support.core</p>
          <h1 className="text-xl font-semibold text-graphite">Support Requests</h1>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-graphite text-canvas text-xs font-mono tracking-wide hover:bg-graphite-soft transition-colors"
        >
          + new request
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 border-b border-graphite-faint pb-3">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-2xs font-mono tracking-wide transition-colors ${
              statusFilter === s
                ? "bg-graphite text-canvas"
                : "text-graphite-muted hover:text-graphite"
            }`}
          >
            {s === "in_progress" ? "in progress" : s}
          </button>
        ))}
        <span className="ml-auto text-2xs font-mono text-graphite-muted">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="border border-graphite-faint">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-graphite-faint/50 border-b border-graphite-faint">
          <div className="col-span-5 text-2xs font-mono text-graphite-muted uppercase tracking-widest">Title</div>
          <div className="col-span-2 text-2xs font-mono text-graphite-muted uppercase tracking-widest">Assignee</div>
          <div className="col-span-2 text-2xs font-mono text-graphite-muted uppercase tracking-widest">Type</div>
          <div className="col-span-2 text-2xs font-mono text-graphite-muted uppercase tracking-widest">Status</div>
          <div className="col-span-1 text-2xs font-mono text-graphite-muted uppercase tracking-widest">P</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-xs font-mono text-graphite-muted">no requests match filter</p>
          </div>
        ) : (
          <div className="divide-y divide-graphite-faint">
            {filtered.map((req) => (
              <button
                key={req._id}
                onClick={() => onSelect(req._id)}
                className="w-full grid grid-cols-12 gap-4 px-4 py-3 text-left hover:bg-graphite-faint/30 transition-colors group"
              >
                <div className="col-span-5">
                  <p className="text-sm text-graphite group-hover:text-teal transition-colors truncate">
                    {req.title}
                  </p>
                  <p className="text-2xs font-mono text-graphite-muted mt-0.5">
                    {new Date(req._creationTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs font-mono text-graphite-muted truncate">
                    {(req as any).assigneeName ?? "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-2xs font-mono text-graphite-muted">{req.type}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <StatusBadge status={req.status} />
                </div>
                <div className="col-span-1 flex items-center">
                  <PriorityDot priority={req.priority} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRequest({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { activeOrgId } = useWorkspace();
  const createRequest = useMutation(api.requests.create);
  const engineers = useQuery(
    api.supportTeam.listEngineers,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  ) ?? [];

  // Default assignee: main contact or first engineer
  const defaultAssignee = engineers.find((e) => e.isMainContact) ?? engineers[0] ?? null;

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "question" as const,
    priority: "normal" as const,
    tags: "",
  });
  const [assigneeId, setAssigneeId] = useState<Id<"supportEngineers"> | "">(""); 
  const [submitting, setSubmitting] = useState(false);

  // Once engineers load, set default
  const resolvedAssigneeId: Id<"supportEngineers"> | undefined =
    assigneeId !== "" ? assigneeId : (defaultAssignee?._id ?? undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await createRequest({
        orgId: activeOrgId ?? undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        priority: form.priority,
        assigneeId: resolvedAssigneeId,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("Request created");
      onCreated();
    } catch {
      toast.error("Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors"
        >
          ← requests
        </button>
        <span className="text-graphite-faint">/</span>
        <p className="sys-label">request.pipeline.ingestion</p>
      </div>

      <h1 className="text-xl font-semibold text-graphite mb-6">New Support Request</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Brief, descriptive title"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite transition-colors"
            required
          />
        </Field>

        <Field label="description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Detailed description of the request..."
            rows={5}
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite transition-colors resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="type" required>
            <Select
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              options={[
                { value: "question", label: "question" },
                { value: "bug", label: "bug" },
                { value: "feature", label: "feature" },
                { value: "incident", label: "incident" },
                { value: "consultation", label: "consultation" },
              ]}
            />
          </Field>
          <Field label="priority" required>
            <Select
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v as typeof form.priority })}
              options={[
                { value: "low", label: "low" },
                { value: "normal", label: "normal" },
                { value: "high", label: "high" },
                { value: "critical", label: "critical" },
              ]}
            />
          </Field>
        </div>

        <Field label="assignee">
          <select
            value={assigneeId !== "" ? assigneeId : (defaultAssignee?._id ?? "")}
            onChange={(e) => setAssigneeId(e.target.value as Id<"supportEngineers"> | "")}
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors appearance-none cursor-pointer"
          >
            <option value="">— unassigned —</option>
            {engineers.map((eng) => (
              <option key={eng._id} value={eng._id}>
                {eng.name}{eng.isMainContact ? " ★" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="tags" hint="comma-separated">
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. delta, auth, pipeline"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite transition-colors font-mono"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2 border-t border-graphite-faint">
          <button
            type="submit"
            disabled={submitting || !form.title.trim()}
            className="px-5 py-2 bg-graphite text-canvas text-xs font-mono tracking-wide hover:bg-graphite-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "submitting..." : "submit request"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 text-xs font-mono text-graphite-muted hover:text-graphite transition-colors"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function RequestDetail({ id, onBack }: { id: Id<"requests">; onBack: () => void }) {
  const { activeOrgId } = useWorkspace();
  const request = useQuery(api.requests.get, { id });
  const engineers = useQuery(
    api.supportTeam.listEngineers,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  ) ?? [];
  const updateStatus = useMutation(api.requests.updateStatus);
  const updateRequest = useMutation(api.requests.update);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  if (request === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-graphite"></div>
      </div>
    );
  }

  if (request === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs font-mono text-graphite-muted">request not found</p>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      await updateStatus({
        id,
        status: status as "open" | "in_progress" | "pending" | "resolved" | "closed",
      });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (val: string) => {
    setUpdatingAssignee(true);
    try {
      await updateRequest({
        id,
        assigneeId: val ? (val as Id<"supportEngineers">) : undefined,
      });
      toast.success("Assignee updated");
    } catch {
      toast.error("Failed to update assignee");
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const nextStatuses: Record<string, string[]> = {
    open: ["in_progress", "pending", "closed"],
    in_progress: ["pending", "resolved", "closed"],
    pending: ["open", "in_progress", "resolved"],
    resolved: ["closed", "open"],
    closed: ["open"],
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors"
        >
          ← requests
        </button>
        <span className="text-graphite-faint">/</span>
        <p className="sys-label">request.detail</p>
      </div>

      <div className="border border-graphite-faint">
        {/* Header */}
        <div className="px-6 py-5 border-b border-graphite-faint">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-graphite">{request.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={request.status} />
                <span className="text-2xs font-mono text-graphite-muted">{request.type}</span>
                <span className="text-2xs font-mono text-graphite-muted">·</span>
                <PriorityDot priority={request.priority} />
                <span className="text-2xs font-mono text-graphite-muted">{request.priority}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xs font-mono text-graphite-muted">
                {new Date(request._creationTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-2xs font-mono text-graphite-muted mt-0.5">
                {new Date(request._creationTime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-graphite-faint border-b border-graphite-faint">
          <MetaCell label="type" value={request.type} mono />
          <MetaCell label="priority" value={request.priority} mono />
          <div className="bg-canvas px-4 py-3">
            <p className="text-2xs font-mono text-graphite-muted uppercase tracking-widest mb-1">assignee</p>
            <select
              value={request.assigneeId ?? ""}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              disabled={updatingAssignee}
              className="text-sm text-graphite bg-transparent outline-none cursor-pointer font-mono disabled:opacity-60 w-full"
            >
              <option value="">— unassigned —</option>
              {engineers.map((eng) => (
                <option key={eng._id} value={eng._id}>
                  {eng.name}{eng.isMainContact ? " ★" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-5 border-b border-graphite-faint">
          <p className="sys-label mb-3">description</p>
          {request.description ? (
            <p className="text-sm text-graphite leading-relaxed whitespace-pre-wrap">
              {request.description}
            </p>
          ) : (
            <p className="text-xs font-mono text-graphite-muted italic">no description provided</p>
          )}
        </div>

        {/* Tags */}
        {request.tags && request.tags.length > 0 && (
          <div className="px-6 py-4 border-b border-graphite-faint">
            <p className="sys-label mb-2">tags</p>
            <div className="flex flex-wrap gap-1.5">
              {request.tags.map((tag) => (
                <span key={tag} className="tag text-graphite-muted border-graphite-faint font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4">
          <p className="sys-label mb-3">status transition</p>
          <div className="flex flex-wrap gap-2">
            {(nextStatuses[request.status] ?? []).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus}
                className="px-3 py-1.5 text-2xs font-mono tracking-wide border border-graphite-faint text-graphite-muted hover:border-teal hover:text-teal transition-colors disabled:opacity-40"
              >
                → {s === "in_progress" ? "in progress" : s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-canvas px-4 py-3">
      <p className="text-2xs font-mono text-graphite-muted uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm text-graphite ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-2xs font-mono text-graphite-muted uppercase tracking-widest">
          {label}
          {required && <span className="text-teal ml-1">*</span>}
        </label>
        {hint && <span className="text-2xs font-mono text-graphite-muted opacity-60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
