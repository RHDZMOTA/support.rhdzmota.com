import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  orgs: defineTable({
    slug: v.string(),
    name: v.string(),
    allowlist: v.array(v.string()),
  }).index("by_slug", ["slug"]),

  orgMemberships: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    defaultOrgId: v.optional(v.id("orgs")),
  }).index("by_user", ["userId"]),

  // Support team config per org (one doc per org)
  supportTeamConfig: defineTable({
    orgId: v.id("orgs"),
    slaType: v.optional(v.string()),
    slaValue: v.optional(v.string()),
    slaNotes: v.optional(v.string()),
  }).index("by_org", ["orgId"]),

  // Support engineers per org
  supportEngineers: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    scheduleUrl: v.optional(v.string()),
    isMainContact: v.optional(v.boolean()),
    order: v.optional(v.number()),
  }).index("by_org", ["orgId"]),

  requests: defineTable({
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
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    clientType: v.optional(v.union(
      v.literal("client"),
      v.literal("former_client"),
      v.literal("partner"),
      v.literal("oss_user")
    )),
    clientName: v.optional(v.string()),
    assigneeId: v.optional(v.id("supportEngineers")),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("critical")
    ),
    tags: v.optional(v.array(v.string())),
    resolvedAt: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_client_type", ["clientType"])
    .index("by_priority", ["priority"])
    .index("by_org", ["orgId"]),

  kbArticles: defineTable({
    orgId: v.optional(v.id("orgs")),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    system: v.string(),
    tags: v.optional(v.array(v.string())),
    published: v.boolean(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_system", ["system"])
    .index("by_slug", ["slug"])
    .index("by_published", ["published"])
    .index("by_org", ["orgId"]),

  converMessages: defineTable({
    orgId: v.id("orgs"),
    authorId: v.optional(v.id("users")),
    body: v.string(),
    parentId: v.optional(v.id("converMessages")),
    rootId: v.optional(v.id("converMessages")),
    promotedFromId: v.optional(v.id("converMessages")),
    promotedReplyId: v.optional(v.id("converMessages")),
    quotedId: v.optional(v.id("converMessages")),
    depth: v.number(),
    editedAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    published: v.optional(v.boolean()),
    scheduledJobId: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_parent", ["orgId", "parentId"])
    .index("by_root", ["rootId"])
    .index("by_parent", ["parentId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
