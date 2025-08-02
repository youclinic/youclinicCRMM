import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role === "admin") {
      // Admins see all leads
      return await ctx.db.query("leads").order("desc").collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned leads
      return await ctx.db
        .query("leads")
        .filter(q => q.eq(q.field("assignedTo"), userId))
        .order("desc")
        .collect();
    } else {
      throw new Error("Invalid user role");
    }
  },
});

export const getConverted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");
    if (userDoc.role === "admin") {
      // Admins see all sold and converted leads
      const sold = await ctx.db.query("leads").withIndex("by_status", q => q.eq("status", "sold")).order("desc").collect();
      const converted = await ctx.db.query("leads").withIndex("by_status", q => q.eq("status", "converted")).order("desc").collect();
      return [...sold, ...converted];
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned sold and converted leads
      const sold = await ctx.db.query("leads").withIndex("by_status", q => q.eq("status", "sold")).filter(q => q.eq(q.field("assignedTo"), userId)).order("desc").collect();
      const converted = await ctx.db.query("leads").withIndex("by_status", q => q.eq("status", "converted")).filter(q => q.eq(q.field("assignedTo"), userId)).order("desc").collect();
      return [...sold, ...converted];
    } else {
      throw new Error("Invalid user role");
    }
  },
});

export const getTreatmentDone = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role === "admin") {
      // Admins see all aftercare patients
      return await ctx.db.query("leads")
        .withIndex("by_status", (q) => q.eq("status", "treatment_done"))
        .order("desc")
        .collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned aftercare patients
      return await ctx.db.query("leads")
        .withIndex("by_status", (q) => q.eq("status", "treatment_done"))
        .filter(q => q.eq(q.field("assignedTo"), userId))
        .order("desc")
        .collect();
    } else {
      throw new Error("Invalid user role");
    }
  },
});

export const getById = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    country: v.optional(v.string()),
    treatmentType: v.string(),
    budget: v.optional(v.string()),
    source: v.string(),
    adName: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferredDate: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    salesPerson: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
    followUpCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Get the current user to get their name and role
    const currentUser = await ctx.db.get(userId);
    if (!currentUser) {
      throw new Error("User not found");
    }
    // Check if user is a salesperson
    if (currentUser.role !== "salesperson" && currentUser.role !== "admin") {
      throw new Error("Only salespersons and admins can create leads");
    }
    // Aynı telefon numarasına sahip bir lead var mı kontrol et
    const existingLead = await ctx.db
      .query("leads")
      .filter(q => q.eq(q.field("phone"), args.phone))
      .first();
    if (existingLead) {
      throw new Error(`Bu telefon numarasına (${args.phone}) ait bir lead zaten mevcut. Lütfen farklı bir telefon numarası kullanın veya mevcut lead'i düzenleyin.`);
    }
    return await ctx.db.insert("leads", {
      ...args,
      email: args.email || "",
      country: args.country || "",
      status: "new",
      assignedTo: userId,
      salesPerson: currentUser.name || currentUser.email, // Use name if available, otherwise email
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    treatmentType: v.optional(v.string()),
    budget: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    adName: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferredDate: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    salesPerson: v.optional(v.string()),
    saleDate: v.optional(v.string()),
    price: v.optional(v.number()),
    deposit: v.optional(v.number()),
    currency: v.optional(v.string()),
    consultation1Date: v.optional(v.string()),
    consultation2Date: v.optional(v.string()),
    consultation3Date: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
    followUpCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const { id, ...updates } = args;
    // Fetch the current lead and user for logging
    const lead = await ctx.db.get(id);
    const user = await ctx.db.get(userId);
    let logStatusChange = false;
    let oldStatus = undefined;
    let newStatus = undefined;
    if (lead && updates.status && updates.status !== lead.status) {
      logStatusChange = true;
      oldStatus = lead.status;
      newStatus = updates.status;
    }
    const result = await ctx.db.patch(id, updates);
    // Log status update if needed
    if (logStatusChange && user) {
      await ctx.db.insert("logs", {
        type: "status_update",
        userId,
        userName: user.name || user.email || "",
        timestamp: new Date().toISOString(),
        details: {
          patientId: id,
          patientName: (lead?.firstName || "") + (lead?.lastName ? (" " + lead.lastName) : ""),
          oldStatus,
          newStatus,
        },
      });
    }
    return result;
  },
});

export const addFile = mutation({
  args: {
    leadId: v.id("leads"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }
    
    const newFile = {
      fileId: args.fileId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploadedAt: Date.now(),
    };
    
    const updatedFiles = [...(lead.files || []), newFile];
    
    return await ctx.db.patch(args.leadId, { files: updatedFiles });
  },
});

export const removeFile = mutation({
  args: {
    leadId: v.id("leads"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }
    
    const updatedFiles = (lead.files || []).filter(file => file.fileId !== args.fileId);
    
    await ctx.db.patch(args.leadId, { files: updatedFiles });
    await ctx.storage.delete(args.fileId);
    
    return { success: true };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.storage.getUrl(args.fileId);
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const lead = await ctx.db.get(args.id);
    if (lead?.files) {
      // Delete all associated files
      for (const file of lead.files) {
        await ctx.storage.delete(file.fileId);
      }
    }
    
    return await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) {
      throw new Error("User not found");
    }

    let leads;
    if (userDoc.role === "admin") {
      leads = await ctx.db.query("leads").collect();
    } else if (userDoc.role === "salesperson") {
      leads = await ctx.db.query("leads")
        .filter(q => q.eq(q.field("assignedTo"), userId))
        .collect();
    } else {
      throw new Error("Invalid user role");
    }

    const stats = {
      total: leads.length,
      new_lead: leads.filter(l => l.status === "new_lead").length,
      no_whatsapp: leads.filter(l => l.status === "no_whatsapp").length,
      on_follow_up: leads.filter(l => l.status === "on_follow_up").length,
      live: leads.filter(l => l.status === "live").length,
      passive_live: leads.filter(l => l.status === "passive_live").length,
      cold: leads.filter(l => l.status === "cold").length,
      hot: leads.filter(l => l.status === "hot").length,
      dead: leads.filter(l => l.status === "dead").length,
      no_communication: leads.filter(l => l.status === "no_communication").length,
      no_interest: leads.filter(l => l.status === "no_interest").length,
      sold: leads.filter(l => l.status === "sold").length,
    };

    return stats;
  },
});

export const searchLeads = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");
    const q = args.query.trim().toLowerCase();
    if (!q) return [];
    // Herkes tüm hastaları arayabilsin
    const allLeads = await ctx.db.query("leads").collect();
    // Normalize fonksiyonu: harfleri küçült, boşluk ve özel karakterleri kaldır
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/gi, "").replace(/\s+/g, "");
    const normalizedQ = normalize(q);
    return allLeads
      .filter(lead => {
        const firstName = lead.firstName ? normalize(lead.firstName) : "";
        const lastName = lead.lastName ? normalize(lead.lastName) : "";
        const fullName = (lead.firstName && lead.lastName) ? normalize(lead.firstName + lead.lastName) : "";
        const email = lead.email ? normalize(lead.email) : "";
        const country = lead.country ? normalize(lead.country) : "";
        const phone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
        const qDigits = normalizedQ.replace(/\D/g, "");
        return (
          firstName.includes(normalizedQ) ||
          lastName.includes(normalizedQ) ||
          fullName.includes(normalizedQ) ||
          email.includes(normalizedQ) ||
          country.includes(normalizedQ) ||
          (phone && qDigits && phone.includes(qDigits))
        );
      })
      .map(lead => ({
        _id: lead._id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        status: lead.status,
      }));
  },
});

// Admin için: Belirli bir kullanıcıya ait lead istatistikleri
export const getStatsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Sadece adminler kullanabilir
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") throw new Error("Only admins can view stats for users");

    // İlgili kullanıcıya ait leadleri çek
    const leads = await ctx.db.query("leads").filter(q => q.eq(q.field("assignedTo"), args.userId)).collect();
    const stats = {
      total: leads.length,
      new_lead: leads.filter(l => l.status === "new_lead").length,
      no_whatsapp: leads.filter(l => l.status === "no_whatsapp").length,
      on_follow_up: leads.filter(l => l.status === "on_follow_up").length,
      live: leads.filter(l => l.status === "live").length,
      passive_live: leads.filter(l => l.status === "passive_live").length,
      cold: leads.filter(l => l.status === "cold").length,
      hot: leads.filter(l => l.status === "hot").length,
      dead: leads.filter(l => l.status === "dead").length,
      no_communication: leads.filter(l => l.status === "no_communication").length,
      no_interest: leads.filter(l => l.status === "no_interest").length,
      sold: leads.filter(l => l.status === "sold").length,
    };
    return stats;
  },
});
