import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useWorkspace } from "../context/WorkspaceContext";
import { SupportTeam } from "./SupportTeam";

type Module = "dashboard" | "requests" | "kb";

interface DashboardProps {
  onNavigate: (module: Module) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { activeOrgId, isActive } = useWorkspace();
  const stats = useQuery(api.requests.stats, { orgId: activeOrgId ?? undefined });
  const recentRequests = useQuery(api.requests.list, { orgId: activeOrgId ?? undefined });

  const recent = recentRequests?.slice(0, 8) ?? [];
  const active = recentRequests?.filter(
    (r) => r.status === "open" || r.status === "in_progress" || r.status === "pending"
  ) ?? [];

  return (
    <div className="space-y-10">
      {/* ── Dashboard section ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="sys-label mb-1">module.core.overview</p>
            <h1 className="text-xl font-semibold text-graphite">Home</h1>
          </div>
          <ContractStatusBadge isActive={isActive} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-graphite-faint border border-graphite-faint">
          <StatCell label="total" value={stats?.total ?? "—"} />
          <StatCell label="open" value={stats?.open ?? "—"} accent="teal" />
          <StatCell label="in progress" value={stats?.inProgress ?? "—"} accent="teal" />
          <StatCell label="pending" value={stats?.pending ?? "—"} />
          <StatCell label="critical" value={stats?.critical ?? "—"} accent={stats?.critical ? "red" : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="sys-label">request.pipeline.active</p>
              <button
                onClick={() => onNavigate("requests")}
                className="text-2xs font-mono text-teal hover:text-teal-dark transition-colors"
              >
                view all →
              </button>
            </div>
            <div className="border border-graphite-faint">
              {active.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs font-mono text-graphite-muted">no active requests</p>
                </div>
              ) : (
                <div className="divide-y divide-graphite-faint">
                  {active.slice(0, 6).map((req) => (
                    <RequestRow key={req._id} request={req} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="sys-label">request.pipeline.recent</p>
              <span className="text-2xs font-mono text-graphite-muted">last 8</span>
            </div>
            <div className="border border-graphite-faint">
              {recent.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs font-mono text-graphite-muted">no requests yet</p>
                </div>
              ) : (
                <div className="divide-y divide-graphite-faint">
                  {recent.map((req) => (
                    <RequestRow key={req._id} request={req} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-graphite-faint" />

      {/* ── Support Team section ── */}
      <SupportTeam />
    </div>
  );
}

function ContractStatusBadge({ isActive }: { isActive: boolean | null }) {
  if (isActive === null) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">contract.status</p>
      <div className={`flex items-center gap-2 px-3 py-1.5 border ${
        isActive
          ? "border-teal/40 bg-teal/5"
          : "border-red-500/40 bg-red-500/5"
      }`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-teal" : "bg-red-500"}`} />
        <span className={`text-xs font-mono font-semibold tracking-wide ${isActive ? "text-teal" : "text-red-500"}`}>
          {isActive ? "active" : "inactive"}
        </span>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "teal" | "red";
}) {
  return (
    <div className="bg-canvas px-4 py-4">
      <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-1">{label}</p>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          accent === "teal"
            ? "text-teal"
            : accent === "red"
            ? "text-red-500"
            : "text-graphite"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RequestRow({
  request,
  compact,
}: {
  request: {
    _id: string;
    title: string;
    status: string;
    priority: string;
    type: string;
    assigneeName?: string | null;
    _creationTime: number;
  };
  compact?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-graphite-faint/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-graphite truncate">{request.title}</p>
        {!compact && request.assigneeName && (
          <p className="text-2xs font-mono text-graphite-muted mt-0.5">
            {request.assigneeName}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={request.status} />
        <PriorityDot priority={request.priority} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "open", cls: "text-teal border-teal/40 bg-teal-light" },
    in_progress: { label: "in progress", cls: "text-teal-dark border-teal/40 bg-teal-light" },
    pending: { label: "pending", cls: "text-gold border-gold/40 bg-gold/10" },
    resolved: { label: "resolved", cls: "text-graphite-muted border-graphite-faint" },
    closed: { label: "closed", cls: "text-graphite-muted border-graphite-faint" },
  };
  const s = map[status] ?? { label: status, cls: "text-graphite-muted border-graphite-faint" };
  return <span className={`tag ${s.cls}`}>{s.label}</span>;
}

export function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: "bg-graphite-muted",
    normal: "bg-graphite-soft",
    high: "bg-gold",
    critical: "bg-red-500",
  };
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full inline-block ${map[priority] ?? "bg-graphite-muted"}`}
      title={priority}
    />
  );
}


