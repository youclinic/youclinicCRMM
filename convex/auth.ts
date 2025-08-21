import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, action } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getTurkeyISOString } from "./utils";

const passwordProvider = Password({
  profile(params) {
    return {
      email: params.email as string,
      name: params.name as string,
    };
  },
});
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      console.log("createOrUpdateUser called with args:", args);
      
      // If user already exists, return the existing user
      if (args.existingUserId) {
        console.log("User already exists, returning:", args.existingUserId);
        // Log login for existing user
        const user = await ctx.db.get(args.existingUserId);
        if (user) {
                  await ctx.db.insert("logs", {
          type: "login",
          userId: args.existingUserId,
          userName: user.name || user.email || "",
          timestamp: getTurkeyISOString(),
          details: {},
        });
        }
        return args.existingUserId;
      }
      
      // Check if this is a known salesperson email
      const salespersonEmails = [
        "sarah.johnson@youclinic.com",
        "michael.chen@youclinic.com", 
        "emily.rodriguez@youclinic.com",
        "david.thompson@youclinic.com",
        "lisa.wang@youclinic.com",
        "james.wilson@youclinic.com"
      ];
      
      const email = args.profile.email as string;
      const isSalesperson = salespersonEmails.includes(email);
      
      // Create the user document
      const name = typeof args.profile.name === 'string' && args.profile.name.trim() !== ''
        ? args.profile.name
        : email.split('@')[0].replace('.', ' ');
      const userId = await ctx.db.insert("users", {
        email: email,
        name: name,
        role: "salesperson", // Herkes salesperson olarak atanacak
        isAnonymous: false,
      });
      
      // Patch the user to set authId to the userId
      await ctx.db.patch(userId, { authId: userId });
      // Log login for new user
              await ctx.db.insert("logs", {
          type: "login",
          userId,
          userName: name,
          timestamp: getTurkeyISOString(),
          details: {},
        });
      console.log("Created user with ID and set authId:", userId);
      return userId;
    },
  },
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("loggedInUser query - authId:", userId);
    
    if (!userId) {
      console.log("No authId found, returning null");
      return null;
    }
    
    // Look up user by _id (userId)
    const user = await ctx.db.get(userId);
    console.log("Found user:", user);
    
    if (!user) {
      console.log("No user found in database, returning null");
      return null;
    }
    
    return user;
  },
});

export const storeAction = action({
  args: {
    type: v.string(),
    provider: v.string(),
    identifier: v.string(),
    password: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // store fonksiyonunu çağır
    // store, convexAuth ile export edilen bir fonksiyon
    // store fonksiyonu action context ile çağrılmalı
    // store fonksiyonunu doğrudan çağırıyoruz
    // @ts-ignore
    return await store(ctx, args);
  },
});
