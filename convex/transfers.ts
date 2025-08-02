import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Hasta arama fonksiyonu
export const searchPatients = query({
  args: { 
    query: v.string(),
    transferType: v.union(v.literal("give"), v.literal("take"))
  },
  returns: v.array(v.object({
    _id: v.id("leads"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    status: v.string(),
    assignedTo: v.optional(v.id("users")),
    salesPerson: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    const q = args.query.trim().toLowerCase();
    if (!q) return [];

    let leads;
    if (args.transferType === "give") {
      // Benden başkasına: Sadece kendi hastalarımı göster
      leads = await ctx.db.query("leads")
        .filter(q => q.eq(q.field("assignedTo"), userId))
        .collect();
    } else {
      // Başkasından bana: Başkalarının hastalarını göster
      leads = await ctx.db.query("leads")
        .filter(q => q.neq(q.field("assignedTo"), userId))
        .collect();
    }

    // Normalize fonksiyonu
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/gi, "").replace(/\s+/g, "");
    const normalizedQ = normalize(q);

    return leads
      .filter(lead => {
        const firstName = lead.firstName ? normalize(lead.firstName) : "";
        const lastName = lead.lastName ? normalize(lead.lastName) : "";
        const fullName = (lead.firstName && lead.lastName) ? normalize(lead.firstName + lead.lastName) : "";
        const email = lead.email ? normalize(lead.email) : "";
        const phone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
        const qDigits = normalizedQ.replace(/\D/g, "");

        return (
          firstName.includes(normalizedQ) ||
          lastName.includes(normalizedQ) ||
          fullName.includes(normalizedQ) ||
          email.includes(normalizedQ) ||
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
        assignedTo: lead.assignedTo,
        salesPerson: lead.salesPerson,
      }));
  },
});

// Takas isteği oluşturma
export const createTransferRequest = mutation({
  args: {
    patientId: v.id("leads"),
    toUserId: v.id("users"),
    transferType: v.union(v.literal("give"), v.literal("take")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("patientTransfers"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role !== "salesperson" && userDoc.role !== "admin") {
      throw new Error("Only salespersons and admins can create transfer requests");
    }

    // Hasta kontrolü
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Patient not found");

    // Hedef kullanıcı kontrolü
    const toUser = await ctx.db.get(args.toUserId);
    if (!toUser) throw new Error("Target user not found");

    // Transfer tipine göre kontrol
    if (args.transferType === "give") {
      // Benden başkasına: Hasta bana ait olmalı
      if (patient.assignedTo !== userId) {
        throw new Error("You can only transfer your own patients");
      }
    } else {
      // Başkasından bana: Hasta başkasına ait olmalı
      if (patient.assignedTo === userId) {
        throw new Error("You cannot request to take your own patient");
      }
    }

    // Zaten bekleyen istek var mı kontrol et
    const existingRequest = await ctx.db.query("patientTransfers")
      .filter(q => 
        q.and(
          q.eq(q.field("patientId"), args.patientId),
          q.eq(q.field("fromUserId"), userId),
          q.eq(q.field("toUserId"), args.toUserId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      throw new Error("A pending transfer request already exists for this patient");
    }

    const now = Date.now();
    const transferId = await ctx.db.insert("patientTransfers", {
      patientId: args.patientId,
      fromUserId: userId,
      toUserId: args.toUserId,
      transferType: args.transferType,
      status: "pending",
      reason: args.reason,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Bildirim oluştur
    await ctx.db.insert("transferNotifications", {
      transferId,
      userId: args.toUserId,
      type: "request_created",
      isRead: false,
      createdAt: now,
    });

    return transferId;
  },
});

// Takas isteklerini listele (kullanıcıya göre)
export const listTransferRequests = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("patientTransfers"),
    patientId: v.id("leads"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    transferType: v.union(v.literal("give"), v.literal("take")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    // İlişkili veriler
    patient: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
      phone: v.string(),
      status: v.string(),
    }),
    fromUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    toUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    approvedByUser: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
    rejectedByUser: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    let transfers;
    if (userDoc.role === "admin") {
      // Admin tüm istekleri görür
      transfers = await ctx.db.query("patientTransfers")
        .order("desc")
        .collect();
    } else {
      // Satışçı sadece kendi isteklerini görür
      transfers = await ctx.db.query("patientTransfers")
        .filter(q => 
          q.or(
            q.eq(q.field("fromUserId"), userId),
            q.eq(q.field("toUserId"), userId)
          )
        )
        .order("desc")
        .collect();
    }

    // İlişkili verileri yükle
    const result = [];
    for (const transfer of transfers) {
      const patient = await ctx.db.get(transfer.patientId);
      const fromUser = await ctx.db.get(transfer.fromUserId);
      const toUser = await ctx.db.get(transfer.toUserId);
      const approvedByUser = transfer.approvedBy ? await ctx.db.get(transfer.approvedBy) : null;
      const rejectedByUser = transfer.rejectedBy ? await ctx.db.get(transfer.rejectedBy) : null;

      if (patient && fromUser && toUser) {
        result.push({
          _id: transfer._id,
          patientId: transfer.patientId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          transferType: transfer.transferType,
          status: transfer.status,
          reason: transfer.reason,
          notes: transfer.notes,
          createdAt: transfer.createdAt,
          updatedAt: transfer.updatedAt,
          approvedAt: transfer.approvedAt,
          approvedBy: transfer.approvedBy,
          rejectedAt: transfer.rejectedAt,
          rejectedBy: transfer.rejectedBy,
          rejectionReason: transfer.rejectionReason,
          patient: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            status: patient.status,
          },
          fromUser: {
            name: fromUser.name,
            email: fromUser.email,
          },
          toUser: {
            name: toUser.name,
            email: toUser.email,
          },
          approvedByUser: approvedByUser ? {
            name: approvedByUser.name,
            email: approvedByUser.email,
          } : undefined,
          rejectedByUser: rejectedByUser ? {
            name: rejectedByUser.name,
            email: rejectedByUser.email,
          } : undefined,
        });
      }
    }

    return result;
  },
});

// Takas isteğini onayla (sadece admin)
export const approveTransferRequest = mutation({
  args: {
    transferId: v.id("patientTransfers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role !== "admin") {
      throw new Error("Only admins can approve transfer requests");
    }

    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer request not found");

    if (transfer.status !== "pending") {
      throw new Error("Transfer request is not pending");
    }

    const now = Date.now();

    // Transfer durumunu güncelle
    await ctx.db.patch(args.transferId, {
      status: "approved",
      approvedAt: now,
      approvedBy: userId,
      updatedAt: now,
    });

    // Hasta atamasını güncelle
    if (transfer.transferType === "give") {
      // Benden başkasına: Hastayı hedef kullanıcıya ata
      await ctx.db.patch(transfer.patientId, {
        assignedTo: transfer.toUserId,
        updatedAt: now,
      });
    } else {
      // Başkasından bana: Hastayı isteği yapan kullanıcıya ata
      await ctx.db.patch(transfer.patientId, {
        assignedTo: transfer.fromUserId,
        updatedAt: now,
      });
    }

    // Bildirim oluştur
    await ctx.db.insert("transferNotifications", {
      transferId: args.transferId,
      userId: transfer.fromUserId,
      type: "request_approved",
      isRead: false,
      createdAt: now,
    });

    return null;
  },
});

// Takas isteğini reddet (sadece admin)
export const rejectTransferRequest = mutation({
  args: {
    transferId: v.id("patientTransfers"),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    if (userDoc.role !== "admin") {
      throw new Error("Only admins can reject transfer requests");
    }

    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer request not found");

    if (transfer.status !== "pending") {
      throw new Error("Transfer request is not pending");
    }

    const now = Date.now();

    // Transfer durumunu güncelle
    await ctx.db.patch(args.transferId, {
      status: "rejected",
      rejectedAt: now,
      rejectedBy: userId,
      rejectionReason: args.rejectionReason,
      updatedAt: now,
    });

    // Bildirim oluştur
    await ctx.db.insert("transferNotifications", {
      transferId: args.transferId,
      userId: transfer.fromUserId,
      type: "request_rejected",
      isRead: false,
      createdAt: now,
    });

    return null;
  },
});

// Bildirimleri listele
export const listNotifications = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("transferNotifications"),
    transferId: v.id("patientTransfers"),
    type: v.union(v.literal("request_created"), v.literal("request_approved"), v.literal("request_rejected")),
    isRead: v.boolean(),
    createdAt: v.number(),
    transfer: v.object({
      patientId: v.id("leads"),
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
      transferType: v.union(v.literal("give"), v.literal("take")),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      reason: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
    patient: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
      phone: v.string(),
    }),
    fromUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    toUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notifications = await ctx.db.query("transferNotifications")
      .filter(q => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();

    const result = [];
    for (const notification of notifications) {
      const transfer = await ctx.db.get(notification.transferId);
      const patient = transfer ? await ctx.db.get(transfer.patientId) : null;
      const fromUser = transfer ? await ctx.db.get(transfer.fromUserId) : null;
      const toUser = transfer ? await ctx.db.get(transfer.toUserId) : null;

      if (transfer && patient && fromUser && toUser) {
        result.push({
          _id: notification._id,
          transferId: notification.transferId,
          type: notification.type,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          transfer: {
            patientId: transfer.patientId,
            fromUserId: transfer.fromUserId,
            toUserId: transfer.toUserId,
            transferType: transfer.transferType,
            status: transfer.status,
            reason: transfer.reason,
            notes: transfer.notes,
          },
          patient: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
          },
          fromUser: {
            name: fromUser.name,
            email: fromUser.email,
          },
          toUser: {
            name: toUser.name,
            email: toUser.email,
          },
        });
      }
    }

    return result;
  },
});

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("transferNotifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return null;
  },
});

// Okunmamış bildirim sayısını getir
export const getUnreadNotificationCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const notifications = await ctx.db.query("transferNotifications")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("isRead"), false)
        )
      )
      .collect();

    return notifications.length;
  },
});

// Son 7 günlük takas geçmişini getir
export const getTransferHistory = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("patientTransfers"),
    patientId: v.id("leads"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    transferType: v.union(v.literal("give"), v.literal("take")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    patient: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
      phone: v.string(),
      status: v.string(),
    }),
    fromUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    toUser: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    approvedByUser: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
    rejectedByUser: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userDoc = await ctx.db.get(userId);
    if (!userDoc) throw new Error("User not found");

    const days = args.days || 7;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    let transfers;
    if (userDoc.role === "admin") {
      // Admin tüm geçmişi görür
      transfers = await ctx.db.query("patientTransfers")
        .filter(q => q.gte(q.field("createdAt"), cutoffDate))
        .order("desc")
        .collect();
    } else {
      // Satışçı sadece kendi geçmişini görür
      transfers = await ctx.db.query("patientTransfers")
        .filter(q => 
          q.and(
            q.or(
              q.eq(q.field("fromUserId"), userId),
              q.eq(q.field("toUserId"), userId)
            ),
            q.gte(q.field("createdAt"), cutoffDate)
          )
        )
        .order("desc")
        .collect();
    }

    // İlişkili verileri yükle
    const result = [];
    for (const transfer of transfers) {
      const patient = await ctx.db.get(transfer.patientId);
      const fromUser = await ctx.db.get(transfer.fromUserId);
      const toUser = await ctx.db.get(transfer.toUserId);
      const approvedByUser = transfer.approvedBy ? await ctx.db.get(transfer.approvedBy) : null;
      const rejectedByUser = transfer.rejectedBy ? await ctx.db.get(transfer.rejectedBy) : null;

      if (patient && fromUser && toUser) {
        result.push({
          _id: transfer._id,
          patientId: transfer.patientId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          transferType: transfer.transferType,
          status: transfer.status,
          reason: transfer.reason,
          notes: transfer.notes,
          createdAt: transfer.createdAt,
          updatedAt: transfer.updatedAt,
          approvedAt: transfer.approvedAt,
          approvedBy: transfer.approvedBy,
          rejectedAt: transfer.rejectedAt,
          rejectedBy: transfer.rejectedBy,
          rejectionReason: transfer.rejectionReason,
          patient: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            status: patient.status,
          },
          fromUser: {
            name: fromUser.name,
            email: fromUser.email,
          },
          toUser: {
            name: toUser.name,
            email: toUser.email,
          },
          approvedByUser: approvedByUser ? {
            name: approvedByUser.name,
            email: approvedByUser.email,
          } : undefined,
          rejectedByUser: rejectedByUser ? {
            name: rejectedByUser.name,
            email: rejectedByUser.email,
          } : undefined,
        });
      }
    }

    return result;
  },
}); 