import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { RequestsModule } from "./components/RequestsModule";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { Conver } from "./components/Conver";
import { Hotline } from "./components/Hotline";
import { SignOutButton } from "./SignOutButton";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";

type Module = "dashboard" | "requests" | "kb" | "conver";

// Detect if the current path is /hotline (case-insensitive)
function isHotlinePath() {
  return window.location.pathname.toLowerCase() === "/hotline";
}

export default function App() {
  const hotline = isHotlinePath();

  return (
    <div className="min-h-screen bg-canvas">
      <Authenticated>
        <WorkspaceProvider>
          {hotline ? <Hotline /> : <AuthenticatedApp />}
        </WorkspaceProvider>
      </Authenticated>
      <Unauthenticated>
        {hotline ? <HotlineUnauthView /> : <UnauthenticatedView />}
      </Unauthenticated>
      <Toaster
        toastOptions={{
          style: {
            background: "#1C1F24",
            color: "#F5F3EF",
            border: "1px solid #3A3F47",
            borderRadius: "2px",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
}

function AuthenticatedApp() {
  const [activeModule, setActiveModule] = useState<Module>("dashboard");
  const { activeOrg, isLoading } = useWorkspace();

  // Handle deep-link: if ?msg= is present, navigate to conver
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("msg")) {
      setActiveModule("conver");
    }
  }, []);

  const navItems: { id: Module; label: string; sys: string; icon?: string }[] = [
    { id: "dashboard", label: "Home", sys: "module.core.overview" },
    { id: "requests", label: "Requests", sys: "module.support.core" },
    { id: "conver", label: "Conver", sys: "module.conver.ledger" },
    { id: "kb", label: "📖", sys: "module.kb.index" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-graphite-faint bg-canvas sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-tight text-graphite">RHDZMOTA</span>
              <span className="text-graphite-faint">|</span>
              <span className="text-xs font-mono text-gold tracking-widest uppercase">Support</span>
              <span className="text-2xs font-mono text-gold-light opacity-60">v0.1.0</span>
            </div>
            <nav className="flex items-center gap-1 ml-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  title={item.id === "kb" ? "Knowledge Base" : undefined}
                  className={`px-3 py-1.5 text-xs font-mono tracking-wide transition-colors ${
                    activeModule === item.id
                      ? "text-graphite bg-graphite-faint"
                      : "text-graphite-muted hover:text-graphite"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-mono text-graphite-muted hidden sm:block">
              {navItems.find((n) => n.id === activeModule)?.sys}
            </span>
            <WorkspaceSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-graphite" />
          </div>
        ) : !activeOrg ? (
          <NoWorkspaceView />
        ) : (
          <>
            {activeModule === "dashboard" && <Dashboard onNavigate={setActiveModule} />}
            {activeModule === "requests" && <RequestsModule />}
            {activeModule === "conver" && <Conver />}
            {activeModule === "kb" && <KnowledgeBase />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-graphite-faint mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-2xs font-mono text-graphite-muted">
            {activeOrg ? `ws.${activeOrg.slug} — active` : "request.pipeline.ingestion — active"}
          </span>
          <span className="text-2xs font-mono text-graphite-muted">system.status: nominal</span>
        </div>
      </footer>
    </div>
  );
}

function NoWorkspaceView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="sys-label mb-3">workspace.access.denied</p>
      <h2 className="text-lg font-semibold text-graphite mb-2">No workspace access</h2>
      <p className="text-sm text-graphite-muted max-w-sm">
        Your account is not enrolled in any workspace. Contact your administrator to be added to an org.
      </p>
    </div>
  );
}

function UnauthenticatedView() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-graphite-faint">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-graphite">RHDZMOTA</span>
            <span className="text-graphite-faint">|</span>
            <span className="text-xs font-mono text-gold tracking-widest uppercase">Support</span>
          </div>
          <span className="text-2xs font-mono text-graphite-muted">auth.required</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-3">
              system.access
            </p>
            <h1 className="text-2xl font-semibold text-graphite mb-1">Sign in</h1>
            <p className="text-sm text-graphite-muted">
              Authenticate to access the support platform.
            </p>
          </div>
          <SignInForm />
          <p className="mt-6 text-2xs font-mono text-graphite-muted text-center">
            support.rhdzmota.com
          </p>
        </div>
      </main>
    </div>
  );
}

function HotlineUnauthView() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-graphite-faint">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-graphite">RHDZMOTA</span>
            <span className="text-graphite-faint">|</span>
            <span className="text-xs font-mono text-gold tracking-widest uppercase">Support</span>
            <span className="text-2xs font-mono text-graphite-muted opacity-60">hotline</span>
          </div>
          <a
            href="/"
            className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors"
          >
            ← support site
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-3">
              hotline.access
            </p>
            <h1 className="text-2xl font-semibold text-graphite mb-1">Sign in</h1>
            <p className="text-sm text-graphite-muted">
              Authenticate to view support contact info.
            </p>
          </div>
          <SignInForm />
          <p className="mt-6 text-2xs font-mono text-graphite-muted text-center">
            support.rhdzmota.com/hotline
          </p>
        </div>
      </main>
    </div>
  );
}
