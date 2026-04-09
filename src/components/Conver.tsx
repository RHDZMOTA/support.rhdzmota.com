import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useWorkspace } from "../context/WorkspaceContext";
import ReactMarkdown from "react-markdown";

function useCurrentUserId() {
  const user = useQuery(api.auth.loggedInUser);
  return user?._id ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ConverMessage = {
  _id: Id<"converMessages">;
  _creationTime: number;
  orgId: Id<"orgs">;
  authorId?: Id<"users">;
  authorName: string;
  body: string;
  parentId?: Id<"converMessages">;
  rootId?: Id<"converMessages">;
  promotedFromId?: Id<"converMessages">;
  promotedReplyId?: Id<"converMessages">;
  quotedId?: Id<"converMessages">;
  depth: number;
  editedAt?: number;
  scheduledAt?: number;
  published?: boolean;
  replyCount: number;
  quoted?: { _id: Id<"converMessages">; body: string; authorName: string } | null;
};

type Member = { userId: string; name: string; email: string | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function buildDeepLink(msgId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("msg", msgId);
  return url.toString();
}

function detectMention(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([\w.]*)$/);
  if (!match) return null;
  return { query: match[1], start: cursor - match[0].length };
}

// ─── Jump Resolver ────────────────────────────────────────────────────────────

interface JumpResolverProps {
  replyId: Id<"converMessages">;
  onResolved: (ancestors: Id<"converMessages">[], replyId: Id<"converMessages">) => void;
  onClear: () => void;
}

function JumpResolver({ replyId, onResolved, onClear }: JumpResolverProps) {
  const ancestors = useQuery(api.conver.getAncestors, { id: replyId });
  useEffect(() => {
    if (ancestors === undefined) return;
    onResolved(ancestors, replyId);
    onClear();
  }, [ancestors, replyId, onResolved, onClear]);
  return null;
}

// ─── Quote Block ──────────────────────────────────────────────────────────────

function QuoteBlock({ quoted }: { quoted: NonNullable<ConverMessage["quoted"]> }) {
  return (
    <div className="border-l-2 border-gold pl-3 mb-2 opacity-80">
      <span className="text-2xs font-mono text-gold mr-2">{quoted.authorName}</span>
      <span className="text-xs text-graphite-muted line-clamp-2">{quoted.body}</span>
    </div>
  );
}

// ─── Mention Picker ───────────────────────────────────────────────────────────

interface MentionPickerProps {
  members: Member[];
  query: string;
  activeIndex: number;
  onSelect: (member: Member) => void;
}

function MentionPicker({ members, query, activeIndex, onSelect }: MentionPickerProps) {
  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  }).slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 bg-canvas border border-graphite-faint shadow-lg z-50">
      <div className="px-2 py-1 border-b border-graphite-faint">
        <span className="text-2xs font-mono text-graphite-muted">mention · tab to complete</span>
      </div>
      {filtered.map((m, i) => (
        <button
          key={m.userId}
          onMouseDown={(e) => { e.preventDefault(); onSelect(m); }}
          className={`w-full text-left px-3 py-1.5 flex items-baseline gap-2 transition-colors ${
            i === activeIndex % filtered.length
              ? "bg-graphite text-canvas"
              : "hover:bg-graphite-faint/50 text-graphite"
          }`}
        >
          <span className="text-xs font-semibold truncate">{m.name}</span>
          {m.email && m.email !== m.name && (
            <span className={`text-2xs font-mono truncate ${i === activeIndex % filtered.length ? "text-canvas/60" : "text-graphite-muted"}`}>
              {m.email}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Scheduled Messages Panel ─────────────────────────────────────────────────

function ScheduledMessages({ orgId }: { orgId: Id<"orgs"> }) {
  const scheduled = useQuery(api.conver.listScheduled, { orgId }) ?? [];
  const cancel = useMutation(api.conver.cancelScheduledMessage);
  const [cancelling, setCancelling] = useState<string | null>(null);

  if (scheduled.length === 0) return null;

  return (
    <div className="border border-teal/30 bg-teal/5">
      <div className="px-3 py-2 border-b border-teal/20 flex items-center gap-2">
        <span className="text-2xs font-mono text-teal tracking-widest uppercase">scheduled.outbox</span>
        <span className="text-2xs font-mono text-teal/60">{scheduled.length} pending</span>
      </div>
      <div className="divide-y divide-teal/10">
        {scheduled.map((msg) => (
          <div key={msg._id} className="px-3 py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-mono text-teal mb-0.5">
                ⏱ sends at {formatTime(msg.scheduledAt!)}
              </p>
              <p className="text-sm text-graphite line-clamp-2">{msg.body}</p>
            </div>
            <button
              onClick={async () => {
                setCancelling(msg._id);
                try { await cancel({ msgId: msg._id }); }
                finally { setCancelling(null); }
              }}
              disabled={cancelling === msg._id}
              className="text-2xs font-mono text-graphite-muted hover:text-red-500 transition-colors shrink-0 disabled:opacity-40 mt-0.5"
            >
              cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compose Box ─────────────────────────────────────────────────────────────

interface ComposeProps {
  orgId: Id<"orgs">;
  parentId?: Id<"converMessages">;
  quotedMsg?: ConverMessage | null;
  onClearQuote?: () => void;
  onDone?: () => void;
  placeholder?: string;
  showAlsoTopLevel?: boolean;
}

function ComposeBox({
  orgId, parentId, quotedMsg, onClearQuote, onDone,
  placeholder = "Write a message… (markdown supported)",
  showAlsoTopLevel = false,
}: ComposeProps) {
  const [body, setBody] = useState("");
  const [alsoTopLevel, setAlsoTopLevel] = useState(false);
  const [sending, setSending] = useState(false);
  const [mentionState, setMentionState] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const postMessage = useMutation(api.conver.postMessage);
  const postReply = useMutation(api.conver.postReply);
  const scheduleMessage = useMutation(api.conver.scheduleMessage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const members = useQuery(api.workspaces.listMembers, { orgId }) ?? [];

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const mentionCandidates = mentionState
    ? members.filter((m) => {
        const q = mentionState.query.toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    setMentionState(detectMention(val, cursor));
    setMentionIndex(0);
  };

  const completeMention = (member: Member) => {
    if (!mentionState) return;
    const handle = member.name.replace(/\s+/g, ".");
    const before = body.slice(0, mentionState.start);
    const after = body.slice(textareaRef.current?.selectionStart ?? body.length);
    const newBody = `${before}@${handle} ${after}`;
    setBody(newBody);
    setMentionState(null);
    setMentionIndex(0);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        const pos = before.length + handle.length + 2;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (scheduling && !parentId) {
      const scheduledAt = new Date(scheduleValue).getTime();
      if (!scheduleValue || isNaN(scheduledAt) || scheduledAt <= Date.now()) {
        alert("Please pick a future date/time.");
        return;
      }
      setSending(true);
      try {
        await scheduleMessage({ orgId, body: trimmed, quotedId: quotedMsg?._id, scheduledAt });
        setBody(""); setScheduling(false); setScheduleValue(""); setMentionState(null);
        onDone?.();
      } finally { setSending(false); }
      return;
    }
    setSending(true);
    try {
      if (parentId) {
        await postReply({ orgId, parentId, body: trimmed, quotedId: quotedMsg?._id, alsoTopLevel: alsoTopLevel || undefined });
      } else {
        await postMessage({ orgId, body: trimmed, quotedId: quotedMsg?._id });
      }
      setBody(""); setAlsoTopLevel(false); setMentionState(null);
      onDone?.();
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState && mentionCandidates.length > 0) {
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); completeMention(mentionCandidates[mentionIndex % mentionCandidates.length]); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionCandidates.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length); return; }
      if (e.key === "Escape") { e.preventDefault(); setMentionState(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="border border-graphite-faint bg-white relative">
      {quotedMsg && (
        <div className="px-3 pt-2 flex items-start gap-2">
          <div className="flex-1 border-l-2 border-gold pl-2">
            <span className="text-2xs font-mono text-gold">{quotedMsg.authorName}</span>
            <p className="text-xs text-graphite-muted line-clamp-1">{quotedMsg.body}</p>
          </div>
          <button onClick={onClearQuote} className="text-graphite-muted hover:text-graphite text-xs mt-0.5">✕</button>
        </div>
      )}
      {mentionState && mentionCandidates.length > 0 && (
        <MentionPicker members={mentionCandidates} query={mentionState.query} activeIndex={mentionIndex} onSelect={completeMention} />
      )}
      <textarea
        ref={textareaRef} value={body} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder={placeholder} rows={3}
        className="w-full px-3 py-2 text-sm font-mono text-graphite bg-transparent outline-none resize-none placeholder:text-graphite-muted"
      />
      <div className="px-3 pb-2 border-t border-graphite-faint pt-2 space-y-2">
        {/* Schedule toggle (top-level only) */}
        {!parentId && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={scheduling}
                onChange={(e) => { setScheduling(e.target.checked); setScheduleValue(""); }}
                className="accent-teal" />
              <span className="text-2xs font-mono text-graphite-muted">schedule for later</span>
            </label>
            {scheduling && (
              <input type="datetime-local" value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                className="text-2xs font-mono text-graphite bg-white border border-graphite-faint px-2 py-0.5 outline-none focus:border-teal"
              />
            )}
          </div>
        )}
        {/* Send row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showAlsoTopLevel && !scheduling && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={alsoTopLevel}
                  onChange={(e) => setAlsoTopLevel(e.target.checked)} className="accent-gold" />
                <span className="text-2xs font-mono text-graphite-muted">send to main conver</span>
              </label>
            )}
            {!scheduling && <span className="text-2xs font-mono text-graphite-muted opacity-50">⌘↵ send · @ mention</span>}
          </div>
          <button onClick={handleSubmit}
            disabled={!body.trim() || sending || (scheduling && !scheduleValue)}
            className={`px-3 py-1 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              scheduling ? "bg-teal text-canvas hover:bg-teal/80" : "bg-graphite text-canvas hover:bg-graphite-soft"
            }`}>
            {sending ? "…" : scheduling ? "schedule" : "send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────

interface MessageRowProps {
  msg: ConverMessage;
  orgId: Id<"orgs">;
  currentUserId: Id<"users"> | null;
  isHighlighted: boolean;
  isExpanded: boolean;
  onToggleThread: () => void;
  onReply: (msg: ConverMessage) => void;
  onQuote: (msg: ConverMessage) => void;
  onReplyAsQuote: (msg: ConverMessage) => void;
  onJumpToOriginal?: (replyId: Id<"converMessages">) => void;
  replyBox: React.ReactNode;
  subThread: React.ReactNode;
}

function MessageRow({
  msg, currentUserId, isHighlighted, isExpanded, onToggleThread,
  onReply, onQuote, onReplyAsQuote, onJumpToOriginal, replyBox, subThread,
}: MessageRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(msg.body);
  const [saving, setSaving] = useState(false);
  const editMessage = useMutation(api.conver.editMessage);

  const isAuthor = !!currentUserId && msg.authorId === currentUserId;

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const startEdit = () => { setEditBody(msg.body); setEditing(true); setTimeout(() => editRef.current?.focus(), 0); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === msg.body) { setEditing(false); return; }
    setSaving(true);
    try { await editMessage({ id: msg._id, body: trimmed }); setEditing(false); }
    finally { setSaving(false); }
  };
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") cancelEdit();
  };
  const copyLink = () => navigator.clipboard.writeText(buildDeepLink(msg._id));

  return (
    <div
      ref={rowRef} id={`msg-${msg._id}`}
      className={`group py-2.5 px-3 transition-colors ${
        isHighlighted ? "bg-gold/10 border-l-2 border-gold -ml-px" : "hover:bg-graphite-faint/30"
      }`}
    >
      {msg.promotedReplyId && (
        <div className="mb-1">
          <button onClick={() => onJumpToOriginal?.(msg.promotedReplyId!)}
            className="text-2xs font-mono text-teal opacity-70 hover:opacity-100 hover:underline transition-opacity cursor-pointer">
            ↑ promoted from thread — click to view original
          </button>
        </div>
      )}
      {msg.promotedFromId && (
        <div className="mb-1">
          <span className="text-2xs font-mono text-teal opacity-70">↗ also in main conver</span>
        </div>
      )}

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-semibold text-graphite">{msg.authorName}</span>
        <span className="text-2xs font-mono text-graphite-muted">{formatTime(msg._creationTime)}</span>
        {msg.editedAt && <span className="text-2xs font-mono text-graphite-muted opacity-50">(edited)</span>}
      </div>

      {msg.quoted && <QuoteBlock quoted={msg.quoted} />}

      {editing ? (
        <div className="mt-1">
          <textarea ref={editRef} value={editBody} onChange={(e) => setEditBody(e.target.value)}
            onKeyDown={handleEditKeyDown} rows={3}
            className="w-full px-2 py-1.5 text-sm font-mono text-graphite bg-white border border-gold outline-none resize-none" />
          <div className="flex items-center gap-2 mt-1">
            <button onClick={saveEdit} disabled={saving || !editBody.trim()}
              className="px-2.5 py-1 text-2xs font-mono bg-graphite text-canvas hover:bg-graphite-soft disabled:opacity-40 transition-colors">
              {saving ? "saving…" : "save"}
            </button>
            <button onClick={cancelEdit}
              className="px-2.5 py-1 text-2xs font-mono text-graphite-muted hover:text-graphite border border-graphite-faint transition-colors">
              cancel
            </button>
            <span className="text-2xs font-mono text-graphite-muted opacity-50">⌘↵ save · esc cancel</span>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-graphite text-sm leading-relaxed [&_p]:my-0.5 [&_code]:bg-graphite-faint [&_code]:px-1 [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-graphite-faint [&_pre]:p-2 [&_pre]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-2 [&_blockquote]:opacity-80">
          <MentionRenderer body={msg.body} />
        </div>
      )}

      {!editing && (
        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onReply(msg)} className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors">reply in thread</button>
          <button onClick={() => onReplyAsQuote(msg)} className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors">reply as quote</button>
          <button onClick={() => onQuote(msg)} className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors">quote</button>
          <button onClick={copyLink} className="text-2xs font-mono text-graphite-muted hover:text-graphite transition-colors">copy link</button>
          {isAuthor && (
            <button onClick={startEdit} className="text-2xs font-mono text-gold hover:text-gold/70 transition-colors">edit</button>
          )}
        </div>
      )}

      {!editing && msg.replyCount > 0 && (
        <button onClick={onToggleThread}
          className="mt-1.5 flex items-center gap-1.5 text-2xs font-mono text-teal hover:text-teal/80 transition-colors">
          <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
          {isExpanded ? "collapse thread" : `${msg.replyCount} repl${msg.replyCount === 1 ? "y" : "ies"}`}
        </button>
      )}

      {replyBox}
      {subThread}
    </div>
  );
}

// ─── Mention Renderer ─────────────────────────────────────────────────────────

function MentionRenderer({ body }: { body: string }) {
  const parts = body.split(/(@[\w.]+)/g);
  if (parts.length === 1) return <ReactMarkdown>{body}</ReactMarkdown>;
  const withHighlights = parts.map((part) =>
    /^@[\w.]+$/.test(part) ? `<span class="mention">${part}</span>` : part
  ).join("");
  return (
    <div
      className="[&_.mention]:text-teal [&_.mention]:font-semibold [&_.mention]:font-mono [&_.mention]:text-xs"
      dangerouslySetInnerHTML={{ __html: withHighlights.replace(/\n/g, "<br/>") }}
    />
  );
}

// ─── Thread (recursive) ───────────────────────────────────────────────────────

interface ThreadProps {
  parentId: Id<"converMessages">;
  orgId: Id<"orgs">;
  currentUserId: Id<"users"> | null;
  depth: number;
  highlightId?: string | null;
  onQuote: (msg: ConverMessage) => void;
  onJumpToOriginal: (replyId: Id<"converMessages">) => void;
  expandedOverride?: Set<string>;
}

function Thread({ parentId, orgId, currentUserId, depth, highlightId, onQuote, onJumpToOriginal, expandedOverride }: ThreadProps) {
  const replies = useQuery(api.conver.listReplies, { parentId });
  const [replyingTo, setReplyingTo] = useState<Id<"converMessages"> | null>(null);
  const [quotingFor, setQuotingFor] = useState<ConverMessage | null>(null);
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set());
  const expandedThreads = expandedOverride ?? localExpanded;

  const toggleThread = (id: string) => {
    setLocalExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!replies) {
    return <div className="pl-4 py-2"><span className="text-2xs font-mono text-graphite-muted animate-pulse">loading…</span></div>;
  }

  const indentPx = Math.min(depth * 20, 80);

  return (
    <div style={{ paddingLeft: `${indentPx}px` }} className="border-l border-graphite-faint ml-2">
      {replies.map((reply) => (
        <MessageRow
          key={reply._id}
          msg={reply as ConverMessage}
          orgId={orgId}
          currentUserId={currentUserId}
          isHighlighted={highlightId === reply._id}
          isExpanded={expandedThreads.has(reply._id)}
          onToggleThread={() => toggleThread(reply._id)}
          onReply={(msg) => { setReplyingTo(msg._id); setQuotingFor(null); }}
          onQuote={onQuote}
          onReplyAsQuote={(msg) => { setReplyingTo(msg._id); setQuotingFor(msg); }}
          onJumpToOriginal={onJumpToOriginal}
          replyBox={
            replyingTo === reply._id ? (
              <div className="mt-2 mb-1">
                <ComposeBox orgId={orgId} parentId={reply._id} quotedMsg={quotingFor}
                  onClearQuote={() => setQuotingFor(null)}
                  onDone={() => { setReplyingTo(null); setQuotingFor(null); setLocalExpanded((prev) => new Set([...prev, reply._id])); }}
                  placeholder="Reply in thread…" showAlsoTopLevel />
              </div>
            ) : null
          }
          subThread={
            expandedThreads.has(reply._id) && reply.replyCount > 0 ? (
              <Thread parentId={reply._id} orgId={orgId} currentUserId={currentUserId}
                depth={depth + 1} highlightId={highlightId} onQuote={onQuote} onJumpToOriginal={onJumpToOriginal} />
            ) : null
          }
        />
      ))}
    </div>
  );
}

// ─── Main Conver Component ────────────────────────────────────────────────────

export function Conver() {
  const { activeOrgId } = useWorkspace();
  const currentUserId = useCurrentUserId();
  const [quotingMsg, setQuotingMsg] = useState<ConverMessage | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Id<"converMessages"> | null>(null);
  const [replyQuote, setReplyQuote] = useState<ConverMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [highlightId, setHighlightId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("msg");
  });
  const [pendingJump, setPendingJump] = useState<Id<"converMessages"> | null>(null);

  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const messages = useQuery(api.conver.listTopLevel, activeOrgId ? { orgId: activeOrgId } : "skip");

  const toggleThread = useCallback((id: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleJumpResolved = useCallback(
    (ancestors: Id<"converMessages">[], replyId: Id<"converMessages">) => {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        for (const id of ancestors) next.add(id);
        return next;
      });
      setHighlightId(replyId);
      setTimeout(() => {
        document.getElementById(`msg-${replyId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }, []
  );

  if (!activeOrgId) return null;

  return (
    <div className="space-y-6">
      {pendingJump && (
        <JumpResolver replyId={pendingJump} onResolved={handleJumpResolved} onClear={() => setPendingJump(null)} />
      )}

      <div>
        <p className="sys-label mb-1">module.conver.ledger</p>
        <h1 className="text-xl font-semibold text-graphite">Conver</h1>
        <p className="text-sm text-graphite-muted mt-0.5">Org-wide conversation ledger</p>
      </div>

      {/* Scheduled outbox */}
      <ScheduledMessages orgId={activeOrgId} />

      {/* Message feed */}
      <div className="border border-graphite-faint divide-y divide-graphite-faint bg-white">
        {messages === undefined && (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-graphite" />
          </div>
        )}
        {messages?.length === 0 && (
          <div className="py-12 text-center">
            <p className="sys-label mb-2">conver.empty</p>
            <p className="text-sm text-graphite-muted">No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages?.map((msg) => (
          <div key={msg._id}>
            <MessageRow
              msg={msg as ConverMessage}
              orgId={activeOrgId}
              currentUserId={currentUserId}
              isHighlighted={highlightId === msg._id}
              isExpanded={expandedThreads.has(msg._id)}
              onToggleThread={() => toggleThread(msg._id)}
              onReply={(m) => { setReplyingTo(m._id); setReplyQuote(null); setExpandedThreads((prev) => new Set([...prev, m._id])); }}
              onQuote={(m) => setQuotingMsg(m)}
              onReplyAsQuote={(m) => { setReplyingTo(m._id); setReplyQuote(m); setExpandedThreads((prev) => new Set([...prev, m._id])); }}
              onJumpToOriginal={(replyId) => setPendingJump(replyId)}
              replyBox={
                replyingTo === msg._id ? (
                  <div className="mt-2 mb-1 ml-4">
                    <ComposeBox orgId={activeOrgId} parentId={msg._id} quotedMsg={replyQuote}
                      onClearQuote={() => setReplyQuote(null)}
                      onDone={() => { setReplyingTo(null); setReplyQuote(null); }}
                      placeholder="Reply in thread…" showAlsoTopLevel />
                  </div>
                ) : null
              }
              subThread={
                expandedThreads.has(msg._id) ? (
                  <Thread parentId={msg._id} orgId={activeOrgId} currentUserId={currentUserId}
                    depth={1} highlightId={highlightId}
                    onQuote={(m) => setQuotingMsg(m)}
                    onJumpToOriginal={(replyId) => setPendingJump(replyId)} />
                ) : null
              }
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Main compose */}
      <div>
        <p className="sys-label mb-2">new.message</p>
        <ComposeBox
          orgId={activeOrgId}
          quotedMsg={quotingMsg}
          onClearQuote={() => setQuotingMsg(null)}
          onDone={() => {
            setQuotingMsg(null);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }}
        />
      </div>
    </div>
  );
}
