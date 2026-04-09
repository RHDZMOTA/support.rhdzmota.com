import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function enrichWithAssignee(ctx: any, requests: any[]) {
  return Promise.all(
    requests.map(async (r) => {
      if (!r.assigneeId) return { ...r, assigneeName: null };
      const eng = await ctx.db.get(r.assigneeId);
      return { ...r, assigneeName: eng?.name ?? null };
    })
  );
}

export const list = query({
  args: {
    orgId: v.optional(v.id("orgs")),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed")
    )),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.orgId) {
      const q = ctx.db
        .query("requests")
        .withIndex("by_org", (qi: any) => qi.eq("orgId", args.orgId));
      results = await q.order("desc").collect();
      if (args.status) results = results.filter((r: any) => r.status === args.status);
    } else if (args.status) {
      results = await ctx.db
        .query("requests")
        .withIndex("by_status", (qi: any) => qi.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db.query("requests").order("desc").collect();
    }
    return enrichWithAssignee(ctx, results);
  },
});

export const get = query({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    const r = await ctx.db.get(args.id);
    if (!r) return null;
    const assignee = r.assigneeId ? await ctx.db.get(r.assigneeId) : null;
    return { ...r, assigneeName: assignee?.name ?? null };
  },
});

export const create = mutation({
  args: {
    orgId: v.optional(v.id("orgs")),
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("question"),
      v.literal("incident"),
      v.literal("consultation")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("critical")
    ),
    assigneeId: v.optional(v.id("supportEngineers")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert("requests", {
      ...args,
      status: "open",
      createdBy: userId ?? undefined,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("requests"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "resolved" || args.status === "closed") {
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const update = mutation({
  args: {
    id: v.id("requests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("question"),
      v.literal("incident"),
      v.literal("consultation")
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("critical")
    )),
    assigneeId: v.optional(v.id("supportEngineers")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const stats = query({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    let all;
    if (args.orgId) {
      all = await ctx.db
        .query("requests")
        .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
        .collect();
    } else {
      all = await ctx.db.query("requests").collect();
    }
    const open = all.filter((r: any) => r.status === "open").length;
    const inProgress = all.filter((r: any) => r.status === "in_progress").length;
    const pending = all.filter((r: any) => r.status === "pending").length;
    const resolved = all.filter((r: any) => r.status === "resolved" || r.status === "closed").length;
    const critical = all.filter((r: any) => r.priority === "critical" && r.status !== "resolved" && r.status !== "closed").length;
    return { total: all.length, open, inProgress, pending, resolved, critical };
  },
});
