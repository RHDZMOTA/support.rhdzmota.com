import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getConfig = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportTeamConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
  },
});

export const upsertConfig = mutation({
  args: {
    orgId: v.id("orgs"),
    slaType: v.optional(v.string()),
    slaValue: v.optional(v.string()),
    slaNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("supportTeamConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
    const { orgId, ...fields } = args;
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("supportTeamConfig", { orgId, ...fields });
    }
  },
});

export const listEngineers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const engineers = await ctx.db
      .query("supportEngineers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return engineers.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  },
});

export const addEngineer = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    scheduleUrl: v.optional(v.string()),
    isMainContact: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // If setting as main contact, unset others
    if (args.isMainContact) {
      const existing = await ctx.db
        .query("supportEngineers")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
      for (const e of existing) {
        if (e.isMainContact) await ctx.db.patch(e._id, { isMainContact: false });
      }
    }
    return await ctx.db.insert("supportEngineers", args);
  },
});

export const updateEngineer = mutation({
  args: {
    id: v.id("supportEngineers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    scheduleUrl: v.optional(v.string()),
    isMainContact: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...fields } = args;
    const eng = await ctx.db.get(id);
    if (!eng) throw new Error("Engineer not found");
    // If setting as main contact, unset others
    if (fields.isMainContact) {
      const existing = await ctx.db
        .query("supportEngineers")
        .withIndex("by_org", (q) => q.eq("orgId", eng.orgId))
        .collect();
      for (const e of existing) {
        if (e._id !== id && e.isMainContact) await ctx.db.patch(e._id, { isMainContact: false });
      }
    }
    const filtered = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, filtered);
  },
});

export const removeEngineer = mutation({
  args: { id: v.id("supportEngineers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});
