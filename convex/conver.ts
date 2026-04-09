import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

function authorLabel(user: Doc<"users"> | null): string {
  if (!user) return "unknown";
  return user.name ?? user.email ?? "unknown";
}

// List top-level messages for an org — only published ones
export const listTopLevel = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("converMessages")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("asc")
      .collect();

    // Only top-level (depth 0) and published (published !== false)
    const topLevel = messages.filter((m) => m.depth === 0 && m.published !== false);

    return Promise.all(
      topLevel.map(async (msg) => {
        const author = msg.authorId ? await ctx.db.get(msg.authorId) : null;
        const replyCount = messages.filter((m) => m.rootId === msg._id).length;
        let quoted = null;
        if (msg.quotedId) {
          const q = await ctx.db.get(msg.quotedId);
          if (q) {
            const qAuthor = q.authorId ? await ctx.db.get(q.authorId) : null;
            quoted = { ...q, authorName: authorLabel(qAuthor) };
          }
        }
        return {
          ...msg,
          authorName: authorLabel(author),
          replyCount,
          quoted,
        };
      })
    );
  },
});

// List direct children of a message
export const listReplies = query({
  args: { parentId: v.id("converMessages") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("converMessages")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order("asc")
      .collect();

    return Promise.all(
      replies.map(async (msg) => {
        const author = msg.authorId ? await ctx.db.get(msg.authorId) : null;
        const allInRoot = msg.rootId
          ? await ctx.db
              .query("converMessages")
              .withIndex("by_root", (q) => q.eq("rootId", msg.rootId!))
              .collect()
          : [];
        const replyCount = allInRoot.filter((m) => m.parentId === msg._id).length;
        let quoted = null;
        if (msg.quotedId) {
          const q = await ctx.db.get(msg.quotedId);
          if (q) {
            const qAuthor = q.authorId ? await ctx.db.get(q.authorId) : null;
            quoted = { ...q, authorName: authorLabel(qAuthor) };
          }
        }
        return {
          ...msg,
          authorName: authorLabel(author),
          replyCount,
          quoted,
        };
      })
    );
  },
});

// Get a single message by id
export const getMessage = query({
  args: { id: v.id("converMessages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.id);
    if (!msg) return null;
    const author = msg.authorId ? await ctx.db.get(msg.authorId) : null;
    return { ...msg, authorName: authorLabel(author) };
  },
});

// Get the ancestor chain for a reply
export const getAncestors = query({
  args: { id: v.id("converMessages") },
  handler: async (ctx, args) => {
    const ancestors: Id<"converMessages">[] = [];
    let current = await ctx.db.get(args.id);
    while (current?.parentId) {
      ancestors.unshift(current.parentId);
      current = await ctx.db.get(current.parentId);
    }
    return ancestors;
  },
});

// List pending scheduled messages for the current user in an org
export const listScheduled = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("converMessages")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return all
      .filter((m) => m.published === false && m.authorId === userId)
      .map((m) => ({ ...m, authorName: "you" }));
  },
});

// Edit a message body (author only)
export const editMessage = mutation({
  args: {
    id: v.id("converMessages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg) throw new Error("Message not found");
    if (msg.authorId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, { body: args.body, editedAt: Date.now() });
  },
});

// Post a new top-level message (immediate)
export const postMessage = mutation({
  args: {
    orgId: v.id("orgs"),
    body: v.string(),
    quotedId: v.optional(v.id("converMessages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert("converMessages", {
      orgId: args.orgId,
      authorId: userId ?? undefined,
      body: args.body,
      depth: 0,
      quotedId: args.quotedId,
    });
  },
});

// Schedule a top-level message for future delivery
export const scheduleMessage = mutation({
  args: {
    orgId: v.id("orgs"),
    body: v.string(),
    quotedId: v.optional(v.id("converMessages")),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const msgId = await ctx.db.insert("converMessages", {
      orgId: args.orgId,
      authorId: userId ?? undefined,
      body: args.body,
      depth: 0,
      quotedId: args.quotedId,
      scheduledAt: args.scheduledAt,
      published: false,
    });
    const delayMs = Math.max(0, args.scheduledAt - Date.now());
    const jobId = await ctx.scheduler.runAfter(
      delayMs,
      internal.conver.publishScheduledMessage,
      { msgId }
    );
    await ctx.db.patch(msgId, { scheduledJobId: jobId });
    return msgId;
  },
});

// Cancel a scheduled message (author only)
export const cancelScheduledMessage = mutation({
  args: { msgId: v.id("converMessages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const msg = await ctx.db.get(args.msgId);
    if (!msg) throw new Error("Message not found");
    if (msg.authorId !== userId) throw new Error("Not authorized");
    if (msg.published !== false) throw new Error("Already published");
    if (msg.scheduledJobId) {
      await ctx.scheduler.cancel(msg.scheduledJobId as Id<"_scheduled_functions">);
    }
    await ctx.db.delete(args.msgId);
  },
});

// Internal: publish a scheduled message when its time arrives
export const publishScheduledMessage = internalMutation({
  args: { msgId: v.id("converMessages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.msgId);
    if (!msg || msg.published !== false) return;
    await ctx.db.patch(args.msgId, { published: true, scheduledJobId: undefined });
  },
});

// Reply to a message in thread
export const postReply = mutation({
  args: {
    orgId: v.id("orgs"),
    parentId: v.id("converMessages"),
    body: v.string(),
    quotedId: v.optional(v.id("converMessages")),
    alsoTopLevel: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const parent = await ctx.db.get(args.parentId);
    if (!parent) throw new Error("Parent message not found");

    const rootId: Id<"converMessages"> =
      parent.rootId ?? (parent._id as Id<"converMessages">);
    const depth = parent.depth + 1;

    const replyId = await ctx.db.insert("converMessages", {
      orgId: args.orgId,
      authorId: userId ?? undefined,
      body: args.body,
      parentId: args.parentId,
      rootId,
      depth,
      quotedId: args.quotedId,
    });

    if (args.alsoTopLevel) {
      const promotedId = await ctx.db.insert("converMessages", {
        orgId: args.orgId,
        authorId: userId ?? undefined,
        body: args.body,
        depth: 0,
        promotedReplyId: replyId,
        quotedId: args.quotedId,
      });
      await ctx.db.patch(replyId, { promotedFromId: promotedId });
    }

    return replyId;
  },
});
