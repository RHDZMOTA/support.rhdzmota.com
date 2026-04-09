import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function WorkspaceSwitcher() {
  const { activeOrg, orgs, setActiveOrgId, setDefaultWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (orgs.length === 0) return null;

  const handleSetDefault = async (e: React.MouseEvent, id: Id<"orgs">) => {
    e.stopPropagation();
    await setDefaultWorkspace(id);
    toast.success("Default workspace updated");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 border transition-colors text-xs font-mono ${
          open
            ? "border-teal text-teal bg-teal-light"
            : "border-graphite-faint text-graphite-muted hover:border-graphite hover:text-graphite"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block shrink-0" />
        <span className="max-w-[120px] truncate">{activeOrg?.name ?? "—"}</span>
        <span className="opacity-50 ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-canvas border border-graphite-faint shadow-sm z-50">
          <div className="px-3 py-2 border-b border-graphite-faint">
            <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">
              workspace.switch
            </p>
          </div>
          <div className="py-1">
            {orgs.map((org) => {
              const isActive = org._id === activeOrg?._id;
              return (
                <div
                  key={org._id}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group ${
                    isActive
                      ? "bg-graphite-faint/50"
                      : "hover:bg-graphite-faint/30"
                  }`}
                  onClick={() => {
                    setActiveOrgId(org._id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive ? "bg-teal" : "bg-graphite-muted"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-mono truncate ${isActive ? "text-graphite" : "text-graphite-muted"}`}>
                        {org.name}
                      </p>
                      <p className="text-2xs font-mono text-graphite-muted opacity-60 truncate">
                        {org.slug}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleSetDefault(e, org._id)}
                    className="text-2xs font-mono text-graphite-muted opacity-0 group-hover:opacity-100 hover:text-teal transition-all shrink-0 ml-2"
                    title="Set as default"
                  >
                    default
                  </button>
                </div>
              );
            })}
          </div>
          {orgs.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-2xs font-mono text-graphite-muted">no workspaces available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
