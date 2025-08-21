import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { getTurkeyISOString } from "./utils";

export const listAllLogs = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    // Return all logs ordered by timestamp descending
    // (ISO string order is lexicographically sortable)
    const logs = await ctx.db.query("logs").order("desc").paginate(args.paginationOpts);
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
      timestamp: getTurkeyISOString(),
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
      timestamp: getTurkeyISOString(),
      details: { tab: args.tab },
    });
    return { success: true };
  },
}); 