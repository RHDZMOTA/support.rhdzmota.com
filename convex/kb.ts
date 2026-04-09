import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    orgId: v.optional(v.id("orgs")),
    system: v.optional(v.string()),
    publishedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.orgId) {
      const results = await ctx.db
        .query("kbArticles")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .collect();
      if (args.system) return results.filter((a) => a.system === args.system);
      if (args.publishedOnly) return results.filter((a) => a.published);
      return results;
    }
    if (args.system) {
      return await ctx.db
        .query("kbArticles")
        .withIndex("by_system", (q) => q.eq("system", args.system!))
        .order("desc")
        .collect();
    }
    if (args.publishedOnly) {
      return await ctx.db
        .query("kbArticles")
        .withIndex("by_published", (q) => q.eq("published", true))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("kbArticles").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("kbArticles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const systems = query({
  args: { orgId: v.optional(v.id("orgs")) },
  handler: async (ctx, args) => {
    let articles;
    if (args.orgId) {
      articles = await ctx.db
        .query("kbArticles")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
    } else {
      articles = await ctx.db.query("kbArticles").collect();
    }
    const systemSet = new Set(articles.map((a) => a.system));
    return Array.from(systemSet).sort();
  },
});

export const create = mutation({
  args: {
    orgId: v.optional(v.id("orgs")),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    system: v.string(),
    tags: v.optional(v.array(v.string())),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert("kbArticles", {
      ...args,
      createdBy: userId ?? undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("kbArticles"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    system: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});
