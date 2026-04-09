import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useWorkspace } from "../context/WorkspaceContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type Engineer = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  scheduleUrl?: string;
  isMainContact?: boolean;
};

export function Hotline() {
  const { activeOrgId, activeOrg, isLoading } = useWorkspace();

  const engineers = useQuery(
    api.supportTeam.listEngineers,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  ) ?? [];

  const config = useQuery(
    api.supportTeam.getConfig,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  );

  const mainContact: Engineer | null =
    engineers.find((e) => e.isMainContact) ?? engineers[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Header */}
      <header className="border-b border-graphite-faint sticky top-0 z-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-graphite">RHDZMOTA</span>
            <span className="text-graphite-faint">|</span>
            <span className="text-xs font-mono text-gold tracking-widest uppercase">Support</span>
            <span className="text-2xs font-mono text-graphite-muted opacity-60">hotline</span>
          </div>
          <div className="flex items-center gap-3">
            <WorkspaceSwitcher />
            <a
              href="/"
              className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors"
            >
              ← support site
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-8">
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-graphite" />
        ) : !activeOrg ? (
          <div className="text-center">
            <p className="sys-label mb-2">workspace.access.denied</p>
            <p className="text-sm text-graphite-muted">No workspace access.</p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* Workspace label */}
            <div className="mb-6 text-center">
              <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-1">
                support.hotline
              </p>
              <p className="text-xs font-mono text-graphite-muted">{activeOrg.slug}</p>
            </div>

            {/* Main card */}
            <div className="border border-graphite-faint">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-graphite-faint bg-graphite-faint/20">
                <p className="sys-label mb-1">main.contact</p>
                {mainContact ? (
                  <p className="text-lg font-semibold text-graphite">{mainContact.name}</p>
                ) : (
                  <p className="text-sm text-graphite-muted font-mono">No contact configured</p>
                )}
              </div>

              {mainContact && (
                <div className="px-6 py-5 space-y-4">
                  {/* Schedule */}
                  {mainContact.scheduleUrl && (
                    <a
                      href={mainContact.scheduleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full px-4 py-2.5 bg-teal text-canvas text-xs font-mono tracking-wide hover:bg-teal/80 transition-colors"
                    >
                      schedule a meeting →
                    </a>
                  )}

                  {/* Contact info */}
                  <div className="space-y-2.5">
                    <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">
                      contact info
                    </p>
                    {mainContact.email && (
                      <ContactRow label="email">
                        <a
                          href={`mailto:${mainContact.email}`}
                          className="text-xs font-mono text-teal hover:underline"
                        >
                          {mainContact.email}
                        </a>
                      </ContactRow>
                    )}
                    {mainContact.phone && (
                      <ContactRow label="phone">
                        <a
                          href={`tel:${mainContact.phone}`}
                          className="text-xs font-mono text-graphite hover:text-teal transition-colors"
                        >
                          {mainContact.phone}
                        </a>
                      </ContactRow>
                    )}
                    {mainContact.whatsapp && (
                      <ContactRow label="whatsapp">
                        <a
                          href={`https://wa.me/${mainContact.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-teal hover:underline"
                        >
                          {mainContact.whatsapp}
                        </a>
                      </ContactRow>
                    )}
                    {!mainContact.email && !mainContact.phone && !mainContact.whatsapp && (
                      <p className="text-xs font-mono text-graphite-muted">
                        No contact info configured.
                      </p>
                    )}
                  </div>

                  {/* SLA */}
                  {(config?.slaType || config?.slaValue) && (
                    <div className="pt-3 border-t border-graphite-faint space-y-2">
                      <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">
                        support.sla
                      </p>
                      {config.slaType && (
                        <ContactRow label="type">
                          <span className="text-xs font-mono text-graphite">{config.slaType}</span>
                        </ContactRow>
                      )}
                      {config.slaValue && (
                        <ContactRow label="reply sla">
                          <span className="text-xs font-mono text-graphite">{config.slaValue}</span>
                        </ContactRow>
                      )}
                      {config.slaNotes && (
                        <p className="text-2xs font-mono text-graphite-muted mt-1">
                          {config.slaNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!mainContact && (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs font-mono text-graphite-muted">
                    No support team configured for this workspace.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-graphite-faint">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-2xs font-mono text-graphite-muted">
            {activeOrg ? `ws.${activeOrg.slug} — hotline` : "hotline"}
          </span>
          <span className="text-2xs font-mono text-graphite-muted">system.status: nominal</span>
        </div>
      </footer>
    </div>
  );
}

function ContactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xs font-mono text-graphite-muted w-20 shrink-0">{label}</span>
      {children}
    </div>
  );
}
