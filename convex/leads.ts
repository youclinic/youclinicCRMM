import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role === "admin") {
      // Admins see only new leads (new and new_lead status)
      return await ctx.db
        .query("leads")
        .filter(q => 
          q.or(
            q.eq(q.field("status"), "new"),
            q.eq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned new leads (new and new_lead status)
      return await ctx.db
        .query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.or(
              q.eq(q.field("status"), "new"),
              q.eq(q.field("status"), "new_lead")
            )
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }
  },
});

export const getConverted = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");
    
    // Get all sold and converted leads in one query
    let leads;
    if (userDoc.role === "admin") {
      // Admins see all sold and converted leads
      leads = await ctx.db.query("leads")
        .withIndex("by_status")
        .filter(q => 
          q.or(
            q.eq(q.field("status"), "sold"),
            q.eq(q.field("status"), "converted")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned sold and converted leads
      leads = await ctx.db.query("leads")
        .withIndex("by_status")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.or(
              q.eq(q.field("status"), "sold"),
              q.eq(q.field("status"), "converted")
            )
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }

    // Separate sold and converted leads
    const sold = leads.page.filter(lead => lead.status === "sold");
    const converted = leads.page.filter(lead => lead.status === "converted");

    return {
      sold,
      converted,
      soldIsDone: leads.isDone,
      convertedIsDone: leads.isDone,
      soldContinueCursor: leads.continueCursor,
      convertedContinueCursor: leads.continueCursor
    };
  },
});

export const getTreatmentDone = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
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
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned aftercare patients
      return await ctx.db.query("leads")
        .withIndex("by_status", (q) => q.eq("status", "treatment_done"))
        .filter(q => q.eq(q.field("assignedTo"), userId))
        .order("desc")
        .paginate(args.paginationOpts);
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
    consultation4Date: v.optional(v.string()),
    consultation1Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))),
    consultation2Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))),
    consultation3Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))),
    consultation4Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))),
    consultation1Notes: v.optional(v.string()),
    consultation2Notes: v.optional(v.string()),
    consultation3Notes: v.optional(v.string()),
    consultation4Notes: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
    followUpCount: v.optional(v.number()),
    arrivalDate: v.optional(v.string()),
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
    
    // Check if status is being changed to "on_follow_up"
    if (lead && updates.status && updates.status !== lead.status) {
      logStatusChange = true;
      oldStatus = lead.status;
      newStatus = updates.status;
      
      // If status is being set to "on_follow_up", automatically set nextFollowUpDate to tomorrow
      if (updates.status === "on_follow_up") {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours in milliseconds
        updates.nextFollowUpDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
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
      leads = await ctx.db.query("leads")
        .filter(q => q.neq(q.field("status"), "treatment_done"))
        .collect();
    } else if (userDoc.role === "salesperson") {
      leads = await ctx.db.query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done")
          )
        )
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
      cold: leads.filter(l => l.status === "cold").length, // Cold - GBTU
      hot: leads.filter(l => l.status === "hot").length,
      dead: leads.filter(l => l.status === "dead").length, // EWS
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
    
    // Role-based access control for search
    let allLeads;
    if (userDoc.role === "admin") {
      // Admins can search all patients (except treatment_done)
      allLeads = await ctx.db.query("leads")
        .filter(q => q.neq(q.field("status"), "treatment_done"))
        .collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons can only search their assigned patients (except treatment_done)
      allLeads = await ctx.db.query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done")
          )
        )
        .collect();
    } else {
      throw new Error("Invalid user role");
    }
    
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
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        treatmentType: lead.treatmentType,
        country: lead.country,
        assignedTo: lead.assignedTo,
        salesPerson: lead.salesPerson,
        nextFollowUpDate: lead.nextFollowUpDate,
        followUpCount: lead.followUpCount,
        files: lead.files,
        createdAt: lead.createdAt,
      }));
  },
});

// Global search function for sidebar - allows searching all patients but with restricted view in modal
export const globalSearchLeads = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");
    const q = args.query.trim().toLowerCase();
    if (!q) return [];
    
    // Global search - everyone can search all patients (except treatment_done)
    const allLeads = await ctx.db.query("leads")
      .filter(q => q.neq(q.field("status"), "treatment_done"))
      .collect();
    
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
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        treatmentType: lead.treatmentType,
        country: lead.country,
        assignedTo: lead.assignedTo,
        salesPerson: lead.salesPerson,
        nextFollowUpDate: lead.nextFollowUpDate,
        followUpCount: lead.followUpCount,
        files: lead.files,
        createdAt: lead.createdAt,
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

    // İlgili kullanıcıya ait leadleri çek (treatment_done hariç)
    const leads = await ctx.db.query("leads")
      .filter(q => 
        q.and(
          q.eq(q.field("assignedTo"), args.userId),
          q.neq(q.field("status"), "treatment_done")
        )
      )
      .collect();
    const stats = {
      total: leads.length,
      new_lead: leads.filter(l => l.status === "new_lead").length,
      no_whatsapp: leads.filter(l => l.status === "no_whatsapp").length,
      on_follow_up: leads.filter(l => l.status === "on_follow_up").length,
      live: leads.filter(l => l.status === "live").length,
      passive_live: leads.filter(l => l.status === "passive_live").length,
      cold: leads.filter(l => l.status === "cold").length, // Cold - GBTU
      hot: leads.filter(l => l.status === "hot").length,
      dead: leads.filter(l => l.status === "dead").length, // EWS
      no_communication: leads.filter(l => l.status === "no_communication").length,
      no_interest: leads.filter(l => l.status === "no_interest").length,
      sold: leads.filter(l => l.status === "sold").length,
    };
    return stats;
  },
});

// Dashboard için consultation tarihlerini de içeren lead listesi
export const getDashboardLeads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    let leads;
    if (userDoc.role === "admin") {
      // Admins see all leads except treatment_done
      leads = await ctx.db.query("leads")
        .filter(q => q.neq(q.field("status"), "treatment_done"))
        .order("desc")
        .collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned leads except treatment_done
      leads = await ctx.db
        .query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done")
          )
        )
        .order("desc")
        .collect();
    } else {
      throw new Error("Invalid user role");
    }

    return leads;
  },
});

// Upcoming hastaları getir (arrival date'i olan sold hastaları)
export const getUpcomingPatients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    let leads;
    if (userDoc.role === "admin") {
      // Admins see all upcoming patients
      leads = await ctx.db.query("leads")
        .withIndex("by_arrivalDate")
        .filter(q => q.and(
          q.eq(q.field("status"), "sold"),
          q.neq(q.field("arrivalDate"), undefined)
        ))
        .order("asc")
        .collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned upcoming patients
      leads = await ctx.db.query("leads")
        .withIndex("by_arrivalDate")
        .filter(q => q.and(
          q.eq(q.field("status"), "sold"),
          q.neq(q.field("arrivalDate"), undefined),
          q.eq(q.field("assignedTo"), userId)
        ))
        .order("asc")
        .collect();
    } else {
      throw new Error("Invalid user role");
    }

    return leads;
  },
});

// Admin için: Bu ay gelecek hastaların toplam cirosu
export const getMonthlyRevenue = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userDoc = await ctx.db.get(userId);
    if (!userDoc || userDoc.role !== "admin") {
      throw new Error("Only admins can view monthly revenue");
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Bu ay gelecek hastaları getir
    const upcomingPatients = await ctx.db.query("leads")
      .withIndex("by_arrivalDate")
      .filter(q => q.and(
        q.eq(q.field("status"), "sold"),
        q.neq(q.field("arrivalDate"), undefined)
      ))
      .collect();

    // Bu ay gelecek hastaları filtrele
    const thisMonthPatients = upcomingPatients.filter(patient => {
      if (!patient.arrivalDate) return false;
      
      const arrivalDate = new Date(patient.arrivalDate);
      const patientMonth = arrivalDate.getMonth();
      const patientYear = arrivalDate.getFullYear();
      
      return patientMonth === currentMonth && patientYear === currentYear;
    });

    // Para birimlerine göre grupla ve toplam hesapla
    const revenueByCurrency: { [currency: string]: number } = {};
    
    thisMonthPatients.forEach(patient => {
      const currency = patient.currency || "USD";
      const price = patient.price || 0;
      
      if (!revenueByCurrency[currency]) {
        revenueByCurrency[currency] = 0;
      }
      revenueByCurrency[currency] += price;
    });

    return {
      revenueByCurrency,
      patientCount: thisMonthPatients.length,
      patients: thisMonthPatients.map(patient => ({
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        arrivalDate: patient.arrivalDate,
        price: patient.price || 0,
        currency: patient.currency || "USD"
      }))
    };
  },
});

export const getNewLeadsCount = query({
  args: {},
  returns: v.number(),
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
      // Admins see all leads except treatment_done
      leads = await ctx.db.query("leads")
        .filter(q => q.neq(q.field("status"), "treatment_done"))
        .collect();
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned leads except treatment_done
      leads = await ctx.db.query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done")
          )
        )
        .collect();
    } else {
      throw new Error("Invalid user role");
    }

    // Filter for new leads (checking both "new" and "new_lead" statuses)
    const newLeads = leads.filter(lead => lead.status === "new" || lead.status === "new_lead");
    return newLeads.length;
  },
});

// Proforma invoice functions
export const createProformaInvoice = mutation({
  args: {
    patientId: v.id("leads"),
    items: v.array(v.object({
      description: v.string(),
      amount: v.number(),
    })),
    deposit: v.number(),
    currency: v.string(),
    salespersonPhone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Calculate totals
    const total = args.items.reduce((sum, item) => sum + item.amount, 0);
    const remaining = total - args.deposit;

    // Generate invoice number (format: PRO-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of invoices for today
    const todayInvoices = await ctx.db
      .query("proformaInvoices")
      .filter(q => q.eq(q.field("invoiceDate"), today.toISOString().slice(0, 10)))
      .collect();
    
    const invoiceNumber = `PRO-${dateStr}-${(todayInvoices.length + 1).toString().padStart(3, '0')}`;

    return await ctx.db.insert("proformaInvoices", {
      patientId: args.patientId,
      createdBy: userId,
      invoiceNumber,
      invoiceDate: today.toISOString().slice(0, 10),
      items: args.items,
      total,
      deposit: args.deposit,
      remaining,
      currency: args.currency || "USD", // Default to USD if not provided
      salespersonPhone: args.salespersonPhone,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getProformaInvoices = query({
  args: {
    patientId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("proformaInvoices")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getProformaInvoiceById = query({
  args: {
    invoiceId: v.id("proformaInvoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.get(args.invoiceId);
  },
});

export const updateProformaInvoice = mutation({
  args: {
    invoiceId: v.id("proformaInvoices"),
    items: v.array(v.object({
      description: v.string(),
      amount: v.number(),
    })),
    deposit: v.number(),
    currency: v.string(),
    salespersonPhone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Calculate totals
    const total = args.items.reduce((sum, item) => sum + item.amount, 0);
    const remaining = total - args.deposit;

    return await ctx.db.patch(args.invoiceId, {
      items: args.items,
      total,
      deposit: args.deposit,
      remaining,
      currency: args.currency,
      salespersonPhone: args.salespersonPhone,
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProformaInvoice = mutation({
  args: {
    invoiceId: v.id("proformaInvoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.delete(args.invoiceId);
  },
});

// Get patients by follow-up date
export const getPatientsByFollowUpDate = query({
  args: { 
    followUpDate: v.string(), // YYYY-MM-DD formatında
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    let patients;
    if (userDoc.role === "admin") {
      // Admins see all patients with the specified follow-up date (except new leads)
      patients = await ctx.db
        .query("leads")
        .withIndex("by_nextFollowUpDate", (q) => q.eq("nextFollowUpDate", args.followUpDate))
        .filter(q => 
          q.and(
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned patients with the specified follow-up date (except new leads)
      patients = await ctx.db
        .query("leads")
        .withIndex("by_nextFollowUpDate", (q) => q.eq("nextFollowUpDate", args.followUpDate))
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }

    return patients;
  },
});

// Get patients by follow-up date range
export const getPatientsByFollowUpDateRange = query({
  args: { 
    startDate: v.string(), // YYYY-MM-DD formatında
    endDate: v.string(), // YYYY-MM-DD formatında
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    let patients;
    if (userDoc.role === "admin") {
      // Admins see all patients in the date range (except new leads)
      patients = await ctx.db
        .query("leads")
        .withIndex("by_nextFollowUpDate")
        .filter(q => 
          q.and(
            q.gte(q.field("nextFollowUpDate"), args.startDate),
            q.lte(q.field("nextFollowUpDate"), args.endDate),
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned patients in the date range (except new leads)
      patients = await ctx.db
        .query("leads")
        .withIndex("by_nextFollowUpDate")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.gte(q.field("nextFollowUpDate"), args.startDate),
            q.lte(q.field("nextFollowUpDate"), args.endDate),
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }

    return patients;
  },
});

// Get all patients (not just new leads) for Patients tab
export const getAllPatients = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role === "admin") {
      // Admins see all patients except new leads and treatment_done
      return await ctx.db
        .query("leads")
        .filter(q => 
          q.and(
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned patients except new leads and treatment_done
      return await ctx.db
        .query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done"),
            q.neq(q.field("status"), "new"),
            q.neq(q.field("status"), "new_lead")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }
  },
});

// Get all leads for marketing analysis (including new leads)
export const getAllLeadsForMarketing = query({
  args: { 
    paginationOpts: paginationOptsValidator 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Fetch user document to check role
    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role === "admin") {
      // Admins see all leads except treatment_done
      return await ctx.db
        .query("leads")
        .filter(q => q.neq(q.field("status"), "treatment_done"))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (userDoc.role === "salesperson") {
      // Salespersons see only their assigned leads except treatment_done
      return await ctx.db
        .query("leads")
        .filter(q => 
          q.and(
            q.eq(q.field("assignedTo"), userId),
            q.neq(q.field("status"), "treatment_done")
          )
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      throw new Error("Invalid user role");
    }
  },
});
