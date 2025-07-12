import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Function to create the 6 salesperson accounts
export const createSalespersonAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Check if user is admin
    const userDoc = await ctx.db.get(userId);
    if (!userDoc || userDoc.role !== "admin") {
      throw new Error("Only admins can create salesperson accounts");
    }
    
    const salespersons = [
      { name: "Sarah Johnson", email: "sarah.johnson@youclinic.com" },
      { name: "Michael Chen", email: "michael.chen@youclinic.com" },
      { name: "Emily Rodriguez", email: "emily.rodriguez@youclinic.com" },
      { name: "David Thompson", email: "david.thompson@youclinic.com" },
      { name: "Lisa Wang", email: "lisa.wang@youclinic.com" },
      { name: "James Wilson", email: "james.wilson@youclinic.com" },
    ];
    
    const createdUsers = [];
    
    for (const salesperson of salespersons) {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_authId", q => q.eq("authId", salesperson.email))
        .first();
      
      if (!existingUser) {
        const userId = await ctx.db.insert("users", {
          name: salesperson.name,
          email: salesperson.email,
          role: "salesperson",
          isAnonymous: false,
        });
        createdUsers.push({ id: userId, ...salesperson });
      }
    }
    
    return createdUsers;
  },
});

// Function to get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Check if user is admin
    const userDoc = await ctx.db.get(userId);
    if (!userDoc || userDoc.role !== "admin") {
      throw new Error("Only admins can view all users");
    }
    
    return await ctx.db.query("users").collect();
  },
});

// Function to get all salespersons
export const getSalespersons = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("role"), "salesperson"))
      .collect();
  },
});

// Function to fix users without roles (for existing users)
export const fixUserRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Get current user
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) {
      throw new Error("User not found");
    }
    
    // If user has no role, assign admin role
    if (!userDoc.role) {
      await ctx.db.patch(userId, { role: "admin" });
      return { success: true, message: "User role assigned as admin" };
    }
    
    return { success: true, message: "User already has a role" };
  },
});

// Function to make current user admin (for setup purposes)
export const makeCurrentUserAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Get current user
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) {
      throw new Error("User not found");
    }
    
    // Update user role to admin
    await ctx.db.patch(userId, { role: "admin" });
    
    return { success: true, message: "User role updated to admin" };
  },
});

// Function to update user role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }
    // Check if current user is admin
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can update user roles");
    }
    return await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Admins can delete non-admin users
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can delete users");
    }
    const userToDelete = await ctx.db.get(args.userId);
    if (!userToDelete) {
      throw new Error("User not found");
    }
    if (userToDelete.role === "admin") {
      throw new Error("Cannot delete another admin");
    }
    return await ctx.db.delete(args.userId);
  },
});

// Yeni salesperson kullanıcı oluştur (admin tarafından, şifreyle)
export const createSalespersonWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") throw new Error("Only admins can create users");

    // Check if user already exists
    const existingUser = await ctx.db.query("users").filter(q => q.eq(q.field("email"), args.email)).first();
    if (existingUser) throw new Error("A user with this email already exists");

    // Kullanıcıyı ekle
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name || args.email.split('@')[0].replace('.', ' '),
      role: "salesperson",
      isAnonymous: false,
    });

    // Password provider ile şifreyi kaydet
    await ctx.scheduler.runAfter(0, api.auth.storeAction, {
      type: "createAccountWithCredentials",
      provider: "password",
      identifier: args.email,
      password: args.password,
      userId: userId,
    });

    await ctx.db.patch(userId, { authId: userId });
    return { success: true };
  },
});