import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  leads: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
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
    nextFollowUpDate: v.optional(v.string()), // Sıradaki follow-up tarihi
    followUpCount: v.optional(v.number()), // Kaçıncı follow-up'ta olduğu
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
    .index("by_nextFollowUpDate", ["nextFollowUpDate"]),
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    authId: v.optional(v.string()),
    role: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  }).index("by_authId", ["authId"]),
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
