import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { WORKSPACES, emailMatchesAllowlist } from "../src/config/workspaces";

// Ensure all configured workspaces exist in the DB and enroll the current user
// in any workspace their email qualifies for.
export const ensureEnrollment = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || !user.email) return null;

    const email = user.email;

    for (const wConfig of WORKSPACES) {
      // Upsert the org record
      let org = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", wConfig.slug))
        .unique();

      if (!org) {
        const orgId = await ctx.db.insert("orgs", {
          slug: wConfig.slug,
          name: wConfig.name,
          allowlist: wConfig.allowlist,
        });
        org = await ctx.db.get(orgId);
      }

      if (!org) continue;

      // Check if user is eligible
      if (!emailMatchesAllowlist(email, org.allowlist)) continue;

      // Check if membership already exists
      const existing = await ctx.db
        .query("orgMemberships")
        .withIndex("by_org_and_user", (q) =>
          q.eq("orgId", org!._id).eq("userId", userId)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("orgMemberships", {
          orgId: org._id,
          userId,
          role: "member",
        });
      }
    }

    return null;
  },
});

// Get all orgs the current user is a member of
export const myOrgs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("orgMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return org ? { ...org, role: m.role } : null;
      })
    );

    return orgs.filter(Boolean);
  },
});

// Get user's default workspace preference
export const myPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

// Set default workspace
export const setDefaultWorkspace = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { defaultOrgId: args.orgId });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        defaultOrgId: args.orgId,
      });
    }
  },
});

// List all members of an org with their display info
export const listMembers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (!user) return null;
        return {
          userId: m.userId,
          name: user.name ?? user.email ?? "unknown",
          email: user.email ?? null,
        };
      })
    );

    return members.filter(Boolean) as { userId: string; name: string; email: string | null }[];
  },
});

// Get org by id (for display)
export const getOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});
