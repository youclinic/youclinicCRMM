import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  leads: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    country: v.optional(v.string()),
    treatmentType: v.string(),
    budget: v.optional(v.string()),
    status: v.string(), // "new", "contacted", "qualified", "converted", "lost", "treatment_done"
    source: v.string(), // "website", "referral", "social_media", "advertisement"
    adName: v.optional(v.string()), // Name of the advertisement that generated this lead
    notes: v.optional(v.string()),
    preferredDate: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    salesPerson: v.optional(v.string()), // Name of the salesperson
    saleDate: v.optional(v.string()), // Treatment sold date
    price: v.optional(v.number()), // Total treatment cost
    deposit: v.optional(v.number()), // Deposit amount paid
    currency: v.optional(v.string()), // Currency of the amounts (e.g., "USD", "EUR")
    statusUpdatedAt: v.optional(v.number()), // Timestamp of the last status update
    createdAt: v.optional(v.number()), // Timestamp of when the lead was created
    updatedAt: v.optional(v.number()), // Timestamp of the last update
    treatmentDoneAt: v.optional(v.number()), // Timestamp when treatment was marked as done
    consultation1Date: v.optional(v.string()), // First consultation date
    consultation2Date: v.optional(v.string()), // Second consultation date
    consultation3Date: v.optional(v.string()), // Third consultation date
    consultation4Date: v.optional(v.string()), // Fourth consultation date
    consultation1Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))), // First consultation status
    consultation2Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))), // Second consultation status
    consultation3Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))), // Third consultation status
    consultation4Status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"))), // Fourth consultation status
    consultation1Notes: v.optional(v.string()), // First consultation notes
    consultation2Notes: v.optional(v.string()), // Second consultation notes
    consultation3Notes: v.optional(v.string()), // Third consultation notes
    consultation4Notes: v.optional(v.string()), // Fourth consultation notes
    nextFollowUpDate: v.optional(v.string()), // Sıradaki follow-up tarihi
    followUpCount: v.optional(v.number()), // Kaçıncı follow-up'ta olduğu
    arrivalDate: v.optional(v.string()), // Türkiye'ye geliş tarihi
    files: v.optional(v.array(v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      uploadedAt: v.number(),
    }))),
  })
    .index("by_status", ["status"])
    .index("by_treatment", ["treatmentType"])
    .index("by_assigned", ["assignedTo"])
    .index("by_salesperson", ["salesPerson"])
    .index("by_nextFollowUpDate", ["nextFollowUpDate"])
    .index("by_arrivalDate", ["arrivalDate"])
    .index("by_createdAt", ["createdAt"])
    .index("by_assignedTo_and_status", ["assignedTo", "status"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_assignedTo_and_status_and_createdAt", ["assignedTo", "status", "createdAt"])
    .index("by_phone", ["phone"])
    // New indexes for better filtering and sorting
    .index("by_assignedTo_and_createdAt", ["assignedTo", "createdAt"])
    .index("by_status_and_treatmentType", ["status", "treatmentType"])
    .index("by_assignedTo_and_status_and_treatmentType", ["assignedTo", "status", "treatmentType"])
    .index("by_nextFollowUpDate_and_status", ["nextFollowUpDate", "status"])
    .index("by_assignedTo_and_nextFollowUpDate_and_status", ["assignedTo", "nextFollowUpDate", "status"])
    .index("by_nextFollowUpDate_and_treatmentType", ["nextFollowUpDate", "treatmentType"])
    .index("by_assignedTo_and_nextFollowUpDate_and_treatmentType", ["assignedTo", "nextFollowUpDate", "treatmentType"])
    .index("by_nextFollowUpDate_and_status_and_treatmentType", ["nextFollowUpDate", "status", "treatmentType"])
    .index("by_assignedTo_and_nextFollowUpDate_and_status_and_treatmentType", ["assignedTo", "nextFollowUpDate", "status", "treatmentType"])
    .index("by_nextFollowUpDate_and_createdAt", ["nextFollowUpDate", "createdAt"])
    .index("by_assignedTo_and_nextFollowUpDate_and_createdAt", ["assignedTo", "nextFollowUpDate", "createdAt"]),
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    authId: v.optional(v.string()),
    role: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    phone: v.optional(v.string()),
  }).index("by_authId", ["authId"]),
  calendarEvents: defineTable({
    userId: v.id("users"), // Etkinliği oluşturan satışçı
    title: v.string(), // Etkinlik başlığı (örn: "Maryam'ı Ara")
    description: v.optional(v.string()), // Etkinlik açıklaması
    eventDate: v.string(), // Etkinlik tarihi (YYYY-MM-DD formatında)
    eventTime: v.optional(v.string()), // Etkinlik saati (HH:MM formatında)
    isCompleted: v.boolean(), // Etkinlik tamamlandı mı?
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))), // Öncelik seviyesi
    createdAt: v.number(), // Oluşturulma zamanı
    updatedAt: v.number(), // Güncellenme zamanı
  })
    .index("by_user", ["userId"])
    .index("by_date", ["eventDate"])
    .index("by_user_and_date", ["userId", "eventDate"])
    .index("by_user_and_completed", ["userId", "isCompleted"]),
  patientTransfers: defineTable({
    patientId: v.id("leads"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    transferType: v.union(v.literal("give"), v.literal("take")), // "give" = benden başkasına, "take" = başkasından bana
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
  })
    .index("by_status", ["status"])
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_created_at", ["createdAt"]),
  transferNotifications: defineTable({
    transferId: v.id("patientTransfers"),
    userId: v.id("users"),
    type: v.union(v.literal("request_created"), v.literal("request_approved"), v.literal("request_rejected")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_transfer", ["transferId"])
    .index("by_created_at", ["createdAt"]),
  proformaInvoices: defineTable({
    patientId: v.id("leads"),
    createdBy: v.id("users"),
    invoiceNumber: v.string(),
    invoiceDate: v.string(), // YYYY-MM-DD formatında
    items: v.array(v.object({
      description: v.string(),
      amount: v.number(),
    })),
    total: v.number(),
    deposit: v.number(),
    remaining: v.number(),
    currency: v.optional(v.string()), // USD, EUR, TRY, etc.
    salespersonPhone: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_created_by", ["createdBy"])
    .index("by_date", ["invoiceDate"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
  logs: defineTable({
    type: v.string(), // 'login' | 'status_update' | 'tab_visit'
    userId: v.id("users"),
    userName: v.string(),
    timestamp: v.string(), // ISO string with seconds
    details: v.object({
      patientId: v.optional(v.id("leads")),
      patientName: v.optional(v.string()),
      oldStatus: v.optional(v.string()),
      newStatus: v.optional(v.string()),
      tab: v.optional(v.string()),
    }),
  }),
});
