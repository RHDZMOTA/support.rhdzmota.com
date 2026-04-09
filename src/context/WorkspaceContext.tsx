import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { WORKSPACES } from "../config/workspaces";

interface OrgEntry {
  _id: Id<"orgs">;
  slug: string;
  name: string;
  allowlist: string[];
  role: string;
}

interface WorkspaceContextValue {
  activeOrgId: Id<"orgs"> | null;
  activeOrg: OrgEntry | null;
  orgs: OrgEntry[];
  setActiveOrgId: (id: Id<"orgs">) => void;
  setDefaultWorkspace: (id: Id<"orgs">) => void;
  isLoading: boolean;
  isActive: boolean | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeOrgId: null,
  activeOrg: null,
  orgs: [],
  setActiveOrgId: () => {},
  setDefaultWorkspace: () => {},
  isLoading: true,
  isActive: null,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const ensureEnrollment = useMutation(api.workspaces.ensureEnrollment);
  const orgsRaw = useQuery(api.workspaces.myOrgs);
  const prefs = useQuery(api.workspaces.myPreferences);
  const setDefaultMutation = useMutation(api.workspaces.setDefaultWorkspace);

  const [activeOrgId, setActiveOrgIdState] = useState<Id<"orgs"> | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  // Run enrollment once on mount
  useEffect(() => {
    if (!enrolled) {
      ensureEnrollment().then(() => setEnrolled(true)).catch(() => setEnrolled(true));
    }
  }, [enrolled, ensureEnrollment]);

  const orgs = (orgsRaw ?? []).filter(Boolean) as OrgEntry[];
  const isLoading = orgsRaw === undefined || prefs === undefined;

  // Once data loads, set active org from preference or first available
  useEffect(() => {
    if (isLoading || orgs.length === 0) return;
    if (activeOrgId) return; // already set

    const preferred = prefs?.defaultOrgId
      ? orgs.find((o) => o._id === prefs.defaultOrgId)
      : null;

    setActiveOrgIdState(preferred?._id ?? orgs[0]._id);
  }, [isLoading, orgs, prefs, activeOrgId]);

  const activeOrg = orgs.find((o) => o._id === activeOrgId) ?? null;
  const isActive = activeOrg
    ? (WORKSPACES.find((w) => w.slug === activeOrg.slug)?.is_active ?? null)
    : null;

  const setActiveOrgId = (id: Id<"orgs">) => {
    setActiveOrgIdState(id);
  };

  const setDefaultWorkspace = async (id: Id<"orgs">) => {
    await setDefaultMutation({ orgId: id });
  };

  return (
    <WorkspaceContext.Provider
      value={{ activeOrgId, activeOrg, orgs, setActiveOrgId, setDefaultWorkspace, isLoading, isActive }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
