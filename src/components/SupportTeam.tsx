import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useWorkspace } from "../context/WorkspaceContext";

type Engineer = {
  _id: Id<"supportEngineers">;
  orgId: Id<"orgs">;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  scheduleUrl?: string;
  isMainContact?: boolean;
  order?: number;
};

type Config = {
  _id: Id<"supportTeamConfig">;
  orgId: Id<"orgs">;
  slaType?: string;
  slaValue?: string;
  slaNotes?: string;
};

// ─── Gear Icon ────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ─── Engineer Form (used in modal) ───────────────────────────────────────────

interface EngineerFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  scheduleUrl: string;
  isMainContact: boolean;
}

const emptyEngineer = (): EngineerFormData => ({
  name: "", email: "", phone: "", whatsapp: "", scheduleUrl: "", isMainContact: false,
});

function engineerToForm(e: Engineer): EngineerFormData {
  return {
    name: e.name,
    email: e.email ?? "",
    phone: e.phone ?? "",
    whatsapp: e.whatsapp ?? "",
    scheduleUrl: e.scheduleUrl ?? "",
    isMainContact: e.isMainContact ?? false,
  };
}

// ─── Config Modal ─────────────────────────────────────────────────────────────

interface ConfigModalProps {
  orgId: Id<"orgs">;
  engineers: Engineer[];
  config: Config | null | undefined;
  onClose: () => void;
}

function ConfigModal({ orgId, engineers, config, onClose }: ConfigModalProps) {
  const addEngineer = useMutation(api.supportTeam.addEngineer);
  const updateEngineer = useMutation(api.supportTeam.updateEngineer);
  const removeEngineer = useMutation(api.supportTeam.removeEngineer);
  const upsertConfig = useMutation(api.supportTeam.upsertConfig);

  // SLA form
  const [slaType, setSlaType] = useState(config?.slaType ?? "");
  const [slaValue, setSlaValue] = useState(config?.slaValue ?? "");
  const [slaNotes, setSlaNotes] = useState(config?.slaNotes ?? "");
  const [savingSla, setSavingSla] = useState(false);

  // Engineer editing
  const [editingId, setEditingId] = useState<Id<"supportEngineers"> | "new" | null>(null);
  const [form, setForm] = useState<EngineerFormData>(emptyEngineer());
  const [savingEng, setSavingEng] = useState(false);

  const startNew = () => { setForm(emptyEngineer()); setEditingId("new"); };
  const startEdit = (e: Engineer) => { setForm(engineerToForm(e)); setEditingId(e._id); };
  const cancelEdit = () => setEditingId(null);

  const saveEngineer = async () => {
    if (!form.name.trim()) return;
    setSavingEng(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        scheduleUrl: form.scheduleUrl.trim() || undefined,
        isMainContact: form.isMainContact || undefined,
      };
      if (editingId === "new") {
        await addEngineer({ orgId, ...payload });
      } else if (editingId) {
        await updateEngineer({ id: editingId, ...payload });
      }
      setEditingId(null);
    } finally { setSavingEng(false); }
  };

  const saveSla = async () => {
    setSavingSla(true);
    try {
      await upsertConfig({
        orgId,
        slaType: slaType.trim() || undefined,
        slaValue: slaValue.trim() || undefined,
        slaNotes: slaNotes.trim() || undefined,
      });
    } finally { setSavingSla(false); }
  };

  const f = (field: keyof EngineerFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: field === "isMainContact" ? e.target.checked : e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/60 backdrop-blur-sm p-4">
      <div className="bg-canvas border border-graphite-faint w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-graphite-faint flex items-center justify-between sticky top-0 bg-canvas z-10">
          <div>
            <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">support.team.config</p>
            <h2 className="text-base font-semibold text-graphite mt-0.5">Configure Support Team</h2>
          </div>
          <button onClick={onClose} className="text-graphite-muted hover:text-graphite text-sm transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-8">
          {/* Engineers section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="sys-label">support.engineers</p>
              <button onClick={startNew}
                className="text-2xs font-mono text-teal hover:text-teal/80 transition-colors">
                + add engineer
              </button>
            </div>

            {/* New / edit form */}
            {editingId !== null && (
              <div className="border border-gold/40 bg-gold/5 p-4 mb-3 space-y-3">
                <p className="text-2xs font-mono text-gold tracking-widest uppercase">
                  {editingId === "new" ? "new engineer" : "edit engineer"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Name *", field: "name" as const, placeholder: "Full name" },
                    { label: "Email", field: "email" as const, placeholder: "email@example.com" },
                    { label: "Phone", field: "phone" as const, placeholder: "+1 555 000 0000" },
                    { label: "WhatsApp", field: "whatsapp" as const, placeholder: "+1 555 000 0000" },
                    { label: "Schedule URL", field: "scheduleUrl" as const, placeholder: "https://cal.com/..." },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="text-2xs font-mono text-graphite-muted block mb-1">{label}</label>
                      <input
                        type="text" value={form[field] as string} onChange={f(field)}
                        placeholder={placeholder}
                        className="w-full px-2 py-1.5 text-sm font-mono text-graphite bg-white border border-graphite-faint outline-none focus:border-teal"
                      />
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.isMainContact}
                    onChange={f("isMainContact")} className="accent-gold" />
                  <span className="text-2xs font-mono text-graphite-muted">set as main contact</span>
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={saveEngineer} disabled={savingEng || !form.name.trim()}
                    className="px-3 py-1 text-xs font-mono bg-graphite text-canvas hover:bg-graphite-soft disabled:opacity-40 transition-colors">
                    {savingEng ? "saving…" : "save"}
                  </button>
                  <button onClick={cancelEdit}
                    className="px-3 py-1 text-xs font-mono text-graphite-muted hover:text-graphite border border-graphite-faint transition-colors">
                    cancel
                  </button>
                </div>
              </div>
            )}

            {/* Engineers list */}
            {engineers.length === 0 && editingId === null && (
              <p className="text-xs font-mono text-graphite-muted py-3">No engineers configured yet.</p>
            )}
            <div className="divide-y divide-graphite-faint border border-graphite-faint">
              {engineers.map((eng) => (
                <div key={eng._id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-graphite">{eng.name}</span>
                      {eng.isMainContact && (
                        <span className="text-2xs font-mono text-gold border border-gold/40 px-1.5 py-0.5">main contact</span>
                      )}
                    </div>
                    {eng.email && <p className="text-2xs font-mono text-graphite-muted mt-0.5">{eng.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(eng)}
                      className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors">edit</button>
                    <button onClick={() => removeEngineer({ id: eng._id })}
                      className="text-2xs font-mono text-graphite-muted hover:text-red-500 transition-colors">remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA section */}
          <div>
            <p className="sys-label mb-3">support.sla</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-mono text-graphite-muted block mb-1">Support Type</label>
                  <input type="text" value={slaType} onChange={(e) => setSlaType(e.target.value)}
                    placeholder="e.g. contact, follow-up, response"
                    className="w-full px-2 py-1.5 text-sm font-mono text-graphite bg-white border border-graphite-faint outline-none focus:border-teal" />
                </div>
                <div>
                  <label className="text-2xs font-mono text-graphite-muted block mb-1">Reply SLA</label>
                  <input type="text" value={slaValue} onChange={(e) => setSlaValue(e.target.value)}
                    placeholder="e.g. 4h, 1 business day"
                    className="w-full px-2 py-1.5 text-sm font-mono text-graphite bg-white border border-graphite-faint outline-none focus:border-teal" />
                </div>
              </div>
              <div>
                <label className="text-2xs font-mono text-graphite-muted block mb-1">Notes</label>
                <input type="text" value={slaNotes} onChange={(e) => setSlaNotes(e.target.value)}
                  placeholder="Additional SLA notes…"
                  className="w-full px-2 py-1.5 text-sm font-mono text-graphite bg-white border border-graphite-faint outline-none focus:border-teal" />
              </div>
              <button onClick={saveSla} disabled={savingSla}
                className="px-3 py-1 text-xs font-mono bg-graphite text-canvas hover:bg-graphite-soft disabled:opacity-40 transition-colors">
                {savingSla ? "saving…" : "save SLA"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Contact Card ────────────────────────────────────────────────────────

function MainContactCard({ engineer }: { engineer: Engineer }) {
  return (
    <div className="border border-graphite-faint p-4">
      <p className="sys-label mb-3">main.contact</p>
      <p className="text-sm font-semibold text-graphite mb-3">{engineer.name}</p>
      {engineer.scheduleUrl && (
        <a href={engineer.scheduleUrl} target="_blank" rel="noopener noreferrer"
          className="inline-block mb-3 px-3 py-1 text-xs font-mono bg-teal text-canvas hover:bg-teal/80 transition-colors">
          schedule a meeting →
        </a>
      )}
      <div className="space-y-1.5">
        <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-1.5">contact info</p>
        {engineer.email && (
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-graphite-muted w-16">email</span>
            <a href={`mailto:${engineer.email}`} className="text-xs font-mono text-teal hover:underline">{engineer.email}</a>
          </div>
        )}
        {engineer.phone && (
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-graphite-muted w-16">phone</span>
            <a href={`tel:${engineer.phone}`} className="text-xs font-mono text-graphite hover:text-teal transition-colors">{engineer.phone}</a>
          </div>
        )}
        {engineer.whatsapp && (
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-graphite-muted w-16">whatsapp</span>
            <a href={`https://wa.me/${engineer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-teal hover:underline">{engineer.whatsapp}</a>
          </div>
        )}
        {!engineer.email && !engineer.phone && !engineer.whatsapp && (
          <p className="text-xs font-mono text-graphite-muted">No contact info configured.</p>
        )}
      </div>
    </div>
  );
}

// ─── Team Members Card ────────────────────────────────────────────────────────

function TeamMembersCard({ engineers }: { engineers: Engineer[] }) {
  return (
    <div className="border border-graphite-faint">
      <div className="px-4 py-3 border-b border-graphite-faint">
        <p className="sys-label">support.team.members</p>
      </div>
      {engineers.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-mono text-graphite-muted">No team members configured.</p>
        </div>
      ) : (
        <div className="divide-y divide-graphite-faint">
          <div className="px-4 py-2 grid grid-cols-2 gap-4">
            <span className="text-2xs font-mono text-graphite-muted uppercase tracking-widest">Name</span>
            <span className="text-2xs font-mono text-graphite-muted uppercase tracking-widest">Email</span>
          </div>
          {engineers.map((eng) => (
            <div key={eng._id} className="px-4 py-2.5 grid grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-graphite truncate">{eng.name}</span>
                {eng.isMainContact && (
                  <span className="text-2xs font-mono text-gold border border-gold/40 px-1 py-0.5 shrink-0">★</span>
                )}
              </div>
              <span className="text-xs font-mono text-graphite-muted truncate">{eng.email ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SLA Card ─────────────────────────────────────────────────────────────────

function SlaCard({ config }: { config: Config | null | undefined }) {
  return (
    <div className="border border-graphite-faint p-4">
      <p className="sys-label mb-3">support.sla</p>
      {!config?.slaType && !config?.slaValue && !config?.slaNotes ? (
        <p className="text-xs font-mono text-graphite-muted">No SLA configured.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-2xs font-mono text-graphite-muted w-24">support type</span>
            <span className="text-sm text-graphite">{config?.slaType ?? "—"}</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xs font-mono text-graphite-muted w-24">reply SLA</span>
            <span className="text-sm text-graphite font-mono">{config?.slaValue ?? "—"}</span>
          </div>
          {config?.slaNotes && (
            <div className="flex items-baseline gap-3">
              <span className="text-2xs font-mono text-graphite-muted w-24">notes</span>
              <span className="text-sm text-graphite-muted">{config.slaNotes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function SupportTeam() {
  const { activeOrgId } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);

  const engineers = useQuery(
    api.supportTeam.listEngineers,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  ) ?? [];

  const config = useQuery(
    api.supportTeam.getConfig,
    activeOrgId ? { orgId: activeOrgId } : "skip"
  );

  if (!activeOrgId) return null;

  const mainContact = engineers.find((e) => e.isMainContact) ?? engineers[0] ?? null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <p className="sys-label">support.team</p>
        <button
          onClick={() => setModalOpen(true)}
          className="text-graphite-muted hover:text-graphite transition-colors"
          title="Configure support team"
        >
          <GearIcon />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* C1: Main contact */}
          {mainContact ? (
            <MainContactCard engineer={mainContact} />
          ) : (
            <div className="border border-graphite-faint p-4">
              <p className="sys-label mb-2">main.contact</p>
              <p className="text-xs font-mono text-graphite-muted">
                No main contact set.{" "}
                <button onClick={() => setModalOpen(true)} className="text-teal hover:underline">Configure →</button>
              </p>
            </div>
          )}

          {/* C2: Team members */}
          <TeamMembersCard engineers={engineers} />
        </div>

        {/* C3: SLA — full width below */}
        <SlaCard config={config} />
      </div>

      {modalOpen && (
        <ConfigModal
          orgId={activeOrgId}
          engineers={engineers}
          config={config}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
