import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useWorkspace } from "../context/WorkspaceContext";

type View = "index" | "article" | "create";

export function KnowledgeBase() {
  const [view, setView] = useState<View>("index");
  const [selectedId, setSelectedId] = useState<Id<"kbArticles"> | null>(null);
  const [systemFilter, setSystemFilter] = useState<string>("all");

  return (
    <div>
      {view === "index" && (
        <KBIndex
          systemFilter={systemFilter}
          setSystemFilter={setSystemFilter}
          onSelect={(id) => { setSelectedId(id); setView("article"); }}
          onCreate={() => setView("create")}
        />
      )}
      {view === "article" && selectedId && (
        <ArticleView id={selectedId} onBack={() => setView("index")} />
      )}
      {view === "create" && (
        <CreateArticle onBack={() => setView("index")} onCreated={() => setView("index")} />
      )}
    </div>
  );
}

function KBIndex({
  systemFilter,
  setSystemFilter,
  onSelect,
  onCreate,
}: {
  systemFilter: string;
  setSystemFilter: (s: string) => void;
  onSelect: (id: Id<"kbArticles">) => void;
  onCreate: () => void;
}) {
  const { activeOrgId } = useWorkspace();
  const articles = useQuery(api.kb.list, { orgId: activeOrgId ?? undefined }) ?? [];
  const systems = useQuery(api.kb.systems, { orgId: activeOrgId ?? undefined }) ?? [];

  const filtered =
    systemFilter === "all"
      ? articles
      : articles.filter((a) => a.system === systemFilter);

  const grouped: Record<string, typeof articles> = {};
  for (const a of filtered) {
    if (!grouped[a.system]) grouped[a.system] = [];
    grouped[a.system].push(a);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="sys-label mb-1">module.kb.index</p>
          <h1 className="text-xl font-semibold text-graphite">Knowledge Base</h1>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-graphite text-canvas text-xs font-mono tracking-wide hover:bg-graphite-soft transition-colors"
        >
          + new article
        </button>
      </div>

      {/* System filter */}
      <div className="flex items-center gap-1 border-b border-graphite-faint pb-3 flex-wrap">
        <button
          onClick={() => setSystemFilter("all")}
          className={`px-3 py-1 text-2xs font-mono tracking-wide transition-colors ${
            systemFilter === "all" ? "bg-graphite text-canvas" : "text-graphite-muted hover:text-graphite"
          }`}
        >
          all
        </button>
        {systems.map((s) => (
          <button
            key={s}
            onClick={() => setSystemFilter(s)}
            className={`px-3 py-1 text-2xs font-mono tracking-wide transition-colors ${
              systemFilter === s ? "bg-graphite text-canvas" : "text-graphite-muted hover:text-graphite"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-2xs font-mono text-graphite-muted">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-graphite-faint px-4 py-16 text-center">
          <p className="text-xs font-mono text-graphite-muted mb-1">no articles found</p>
          <p className="text-2xs font-mono text-graphite-muted opacity-60">
            create the first article to populate the knowledge base
          </p>
        </div>
      ) : systemFilter === "all" ? (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([system, arts]) => (
            <SystemGroup key={system} system={system} articles={arts} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="border border-graphite-faint divide-y divide-graphite-faint">
          {filtered.map((a) => (
            <ArticleRow key={a._id} article={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function SystemGroup({
  system,
  articles,
  onSelect,
}: {
  system: string;
  articles: Array<{
    _id: Id<"kbArticles">;
    title: string;
    slug: string;
    system: string;
    published: boolean;
    tags?: string[];
    _creationTime: number;
  }>;
  onSelect: (id: Id<"kbArticles">) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase">
          kb.{system.toLowerCase().replace(/\s+/g, ".")}
        </p>
        <span className="text-2xs font-mono text-graphite-muted opacity-50">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="border border-graphite-faint divide-y divide-graphite-faint">
        {articles.map((a) => (
          <ArticleRow key={a._id} article={a} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ArticleRow({
  article,
  onSelect,
}: {
  article: {
    _id: Id<"kbArticles">;
    title: string;
    slug: string;
    system: string;
    published: boolean;
    tags?: string[];
    _creationTime: number;
  };
  onSelect: (id: Id<"kbArticles">) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article._id)}
      className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-graphite-faint/30 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-graphite group-hover:text-teal transition-colors truncate">
          {article.title}
        </p>
        <p className="text-2xs font-mono text-graphite-muted mt-0.5">{article.slug}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {article.tags?.slice(0, 2).map((t) => (
          <span key={t} className="tag text-graphite-muted border-graphite-faint font-mono hidden sm:inline-flex">
            {t}
          </span>
        ))}
        <span
          className={`text-2xs font-mono px-1.5 py-0.5 border ${
            article.published
              ? "text-teal border-teal/30 bg-teal-light"
              : "text-graphite-muted border-graphite-faint"
          }`}
        >
          {article.published ? "published" : "draft"}
        </span>
      </div>
    </button>
  );
}

function ArticleView({ id, onBack }: { id: Id<"kbArticles">; onBack: () => void }) {
  const article = useQuery(api.kb.get, { id });
  const updateArticle = useMutation(api.kb.update);

  if (article === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-graphite"></div>
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs font-mono text-graphite-muted">article not found</p>
      </div>
    );
  }

  const togglePublished = async () => {
    try {
      await updateArticle({ id, published: !article.published });
      toast.success(article.published ? "Article set to draft" : "Article published");
    } catch {
      toast.error("Failed to update article");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors"
        >
          ← knowledge base
        </button>
        <span className="text-graphite-faint">/</span>
        <p className="sys-label">kb.{article.system.toLowerCase().replace(/\s+/g, ".")}</p>
      </div>

      <div className="border border-graphite-faint">
        {/* Header */}
        <div className="px-6 py-5 border-b border-graphite-faint">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-graphite">{article.title}</h1>
              <p className="text-2xs font-mono text-graphite-muted mt-1">{article.slug}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-2xs font-mono px-1.5 py-0.5 border ${
                  article.published
                    ? "text-teal border-teal/30 bg-teal-light"
                    : "text-graphite-muted border-graphite-faint"
                }`}
              >
                {article.published ? "published" : "draft"}
              </span>
              <button
                onClick={togglePublished}
                className="text-2xs font-mono text-graphite-muted hover:text-teal transition-colors border border-graphite-faint px-2 py-0.5"
              >
                {article.published ? "unpublish" : "publish"}
              </button>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-graphite-faint border-b border-graphite-faint">
          <div className="bg-canvas px-4 py-3">
            <p className="text-2xs font-mono text-graphite-muted uppercase tracking-widest mb-1">system</p>
            <p className="text-sm font-mono text-graphite">{article.system}</p>
          </div>
          <div className="bg-canvas px-4 py-3">
            <p className="text-2xs font-mono text-graphite-muted uppercase tracking-widest mb-1">created</p>
            <p className="text-sm text-graphite">
              {new Date(article._creationTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="bg-canvas px-4 py-3">
            <p className="text-2xs font-mono text-graphite-muted uppercase tracking-widest mb-1">tags</p>
            <div className="flex flex-wrap gap-1">
              {article.tags?.length ? (
                article.tags.map((t) => (
                  <span key={t} className="text-2xs font-mono text-graphite-muted">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-2xs font-mono text-graphite-muted opacity-50">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="sys-label mb-4">content</p>
          <div className="prose-sm text-graphite leading-relaxed whitespace-pre-wrap font-mono text-xs bg-graphite-faint/30 p-4 border border-graphite-faint">
            {article.content}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateArticle({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { activeOrgId } = useWorkspace();
  const createArticle = useMutation(api.kb.create);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    system: "",
    tags: "",
    published: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setForm({ ...form, title, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.system.trim()) return;
    setSubmitting(true);
    try {
      await createArticle({
        orgId: activeOrgId ?? undefined,
        title: form.title.trim(),
        slug: form.slug.trim(),
        content: form.content.trim(),
        system: form.system.trim(),
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        published: form.published,
      });
      toast.success("Article created");
      onCreated();
    } catch {
      toast.error("Failed to create article");
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
          ← knowledge base
        </button>
        <span className="text-graphite-faint">/</span>
        <p className="sys-label">kb.article.create</p>
      </div>

      <h1 className="text-xl font-semibold text-graphite mb-6">New Article</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <KBField label="title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Article title"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite transition-colors"
            required
          />
        </KBField>

        <KBField label="slug" required hint="auto-generated from title">
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="article-slug"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors"
            required
          />
        </KBField>

        <KBField label="system" required hint="e.g. delta, auth, pipeline">
          <input
            type="text"
            value={form.system}
            onChange={(e) => setForm({ ...form, system: e.target.value })}
            placeholder="package or system name"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors"
            required
          />
        </KBField>

        <KBField label="content" hint="markdown supported">
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Article content in markdown..."
            rows={10}
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors resize-none"
          />
        </KBField>

        <KBField label="tags" hint="comma-separated">
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. auth, setup, reference"
            className="w-full px-3 py-2 bg-white border border-graphite-faint focus:border-teal focus:ring-1 focus:ring-teal outline-none text-sm text-graphite font-mono transition-colors"
          />
        </KBField>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="w-3.5 h-3.5 accent-teal"
            />
            <span className="text-xs font-mono text-graphite-muted">publish immediately</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-graphite-faint">
          <button
            type="submit"
            disabled={submitting || !form.title.trim() || !form.slug.trim() || !form.system.trim()}
            className="px-5 py-2 bg-graphite text-canvas text-xs font-mono tracking-wide hover:bg-graphite-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "saving..." : "save article"}
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

function KBField({
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
