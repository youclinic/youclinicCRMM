import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listAllLogs = query({
  args: {},
  handler: async (ctx) => {
    // Return all logs ordered by timestamp descending
    // (ISO string order is lexicographically sortable)
    const logs = await ctx.db.query("logs").order("desc").collect();
    return logs;
  },
});

export const logLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.insert("logs", {
      type: "login",
      userId,
      userName: user.name || user.email || "",
      timestamp: new Date().toISOString(),
      details: {},
    });
    return { success: true };
  },
});

export const logTabVisit = mutation({
  args: { tab: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.insert("logs", {
      type: "tab_visit",
      userId,
      userName: user.name || user.email || "",
      timestamp: new Date().toISOString(),
      details: { tab: args.tab },
    });
    return { success: true };
  },
}); 