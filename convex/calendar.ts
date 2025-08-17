import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Kullanıcının etkinliklerini listele
export const list = query({
  args: {
    startDate: v.optional(v.string()), // YYYY-MM-DD formatında başlangıç tarihi
    endDate: v.optional(v.string()), // YYYY-MM-DD formatında bitiş tarihi
    includeCompleted: v.optional(v.boolean()), // Tamamlanan etkinlikleri dahil et
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    // Tarih filtresi uygula
    if (args.startDate) {
      events = events.filter(event => event.eventDate >= args.startDate!);
    }
    if (args.endDate) {
      events = events.filter(event => event.eventDate <= args.endDate!);
    }

    // Tamamlanan etkinlikleri filtrele
    if (args.includeCompleted === false) {
      events = events.filter(event => !event.isCompleted);
    }

    return events;
  },
});

// Belirli bir tarihteki etkinlikleri getir
export const getByDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD formatında
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).eq("eventDate", args.date)
      )
      .order("asc")
      .collect();
  },
});

// Bugünkü etkinlikleri getir
export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).eq("eventDate", today)
      )
      .order("asc")
      .collect();
  },
});

// Bu haftaki etkinlikleri getir
export const getThisWeek = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Haftanın başlangıcı (Pazar)
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Haftanın sonu (Cumartesi)

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("eventDate"), startDate),
          q.lte(q.field("eventDate"), endDate)
        )
      )
      .order("asc")
      .collect();
  },
});

// Yeni etkinlik oluştur
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(), // YYYY-MM-DD formatında
    eventTime: v.optional(v.string()), // HH:MM formatında
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    return await ctx.db.insert("calendarEvents", {
      userId,
      title: args.title,
      description: args.description || "",
      eventDate: args.eventDate,
      eventTime: args.eventTime || "",
      isCompleted: false,
      priority: args.priority || "medium",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Etkinlik güncelle
export const update = mutation({
  args: {
    id: v.id("calendarEvents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    eventTime: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { id, ...updates } = args;

    // Etkinliğin kullanıcıya ait olduğunu kontrol et
    const event = await ctx.db.get(id);
    if (!event || event.userId !== userId) {
      throw new Error("Event not found or access denied");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Etkinlik tamamlandı olarak işaretle
export const markCompleted = mutation({
  args: {
    id: v.id("calendarEvents"),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Etkinliğin kullanıcıya ait olduğunu kontrol et
    const event = await ctx.db.get(args.id);
    if (!event || event.userId !== userId) {
      throw new Error("Event not found or access denied");
    }

    return await ctx.db.patch(args.id, {
      isCompleted: args.isCompleted,
      updatedAt: Date.now(),
    });
  },
});

// Etkinlik sil
export const remove = mutation({
  args: {
    id: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Etkinliğin kullanıcıya ait olduğunu kontrol et
    const event = await ctx.db.get(args.id);
    if (!event || event.userId !== userId) {
      throw new Error("Event not found or access denied");
    }

    return await ctx.db.delete(args.id);
  },
});

// Tamamlanmamış etkinlikleri getir
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_user_and_completed", (q) => 
        q.eq("userId", userId).eq("isCompleted", false)
      )
      .order("asc")
      .collect();
  },
});

// İstatistikleri getir
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const allEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const today = new Date().toISOString().split('T')[0];
    const todayEvents = allEvents.filter(event => event.eventDate === today);
    const pendingEvents = allEvents.filter(event => !event.isCompleted);
    const completedEvents = allEvents.filter(event => event.isCompleted);

    return {
      total: allEvents.length,
      today: todayEvents.length,
      pending: pendingEvents.length,
      completed: completedEvents.length,
      highPriority: pendingEvents.filter(event => event.priority === "high").length,
      mediumPriority: pendingEvents.filter(event => event.priority === "medium").length,
      lowPriority: pendingEvents.filter(event => event.priority === "low").length,
    };
  },
});
