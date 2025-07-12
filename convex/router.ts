import { httpRouter } from "convex/server";
import { httpAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const http = httpRouter();

// Internal mutation: lead ekleme
export const importLead = internalMutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
    email: v.string(),
    assignedTo: v.id("users"),
    salesPerson: v.string(),
    adName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Aynı telefon numarasına sahip bir lead var mı kontrol et
    const existingLead = await ctx.db
      .query("leads")
      .filter(q => q.eq(q.field("phone"), args.phone))
      .first();
    
    // Eğer aynı telefon numarasına sahip lead varsa, görmezden gel
    if (existingLead) {
      console.log(`Duplicate phone number detected: ${args.phone}. Lead ignored.`);
      return null;
    }
    
    const [firstName, ...rest] = (args.fullName || "").split(" ");
    const lastName = rest.join(" ");
    await ctx.db.insert("leads", {
      firstName,
      lastName,
      phone: args.phone,
      email: args.email || "",
      country: "",
      treatmentType: "",
      budget: undefined,
      source: "advertisement",
      adName: args.adName || "",
      notes: args.notes || "",
      preferredDate: "",
      medicalHistory: "",
      salesPerson: args.salesPerson,
      assignedTo: args.assignedTo,
      status: "new",
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

http.route({
  path: "/import-lead",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { fullName, phone, email, assignedTo, salesPerson, adName, notes } = await req.json();
    await ctx.runMutation(internal.router.importLead, {
      fullName,
      phone,
      email: email || "",
      assignedTo: (assignedTo || "k17b8r7g0bx4c7re0b5dtt5r8x7jkrde"),
      salesPerson: salesPerson || "Yunus Emre Nerez",
      adName: adName || "",
      notes: notes || "",
    });
    return new Response("OK", { status: 200 });
  }),
});

export default http;
