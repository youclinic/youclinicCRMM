import { httpRouter } from "convex/server";
import { httpAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getTurkeyTimestamp } from "./utils";

const http = httpRouter();

// Internal mutation: lead ekleme
export const importLead = internalMutation({
  args: {
    fullName: v.string(),
    phone: v.union(v.string(), v.number()),
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
    
    // Phone'u string'e çevir
    const phoneStr = String(args.phone);
    
    // Notes alanını kullan (Google Apps Script'ten gelecek)
    let notes = args.notes || "";
    
    await ctx.db.insert("leads", {
      firstName,
      lastName,
      phone: phoneStr,
      email: args.email || "",
      country: "",
      treatmentType: "",
      budget: undefined,
      source: "advertisement",
      adName: args.adName || "",
      notes: notes,
      preferredDate: "",
      medicalHistory: "",
      salesPerson: args.salesPerson,
      assignedTo: args.assignedTo,
      status: "new",
      files: [],
      createdAt: getTurkeyTimestamp(),
      updatedAt: getTurkeyTimestamp(),
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

// Internal query: dosya URL'si alma
export const getFileUrlInternal = internalQuery({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

http.route({
  path: "/api/files/:fileId",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const fileId = url.pathname.split('/').pop();
    
    if (!fileId) {
      return new Response("File ID required", { status: 400 });
    }
    
    try {
      const fileUrl = await ctx.runQuery(internal.router.getFileUrlInternal, { 
        fileId: fileId as any 
      });
      
      if (!fileUrl) {
        return new Response("File not found", { status: 404 });
      }
      
      // Redirect to the actual file URL
      return new Response(null, {
        status: 302,
        headers: {
          Location: fileUrl
        }
      });
    } catch (error) {
      console.error("Error getting file URL:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Internal query: proforma invoice data
export const getProformaInvoiceData = internalQuery({
  args: { invoiceId: v.id("proformaInvoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;
    
    const patient = await ctx.db.get(invoice.patientId);
    const createdBy = await ctx.db.get(invoice.createdBy);
    
    return {
      invoice,
      patient,
      createdBy,
    };
  },
});

http.route({
  path: "/api/proforma/:invoiceId",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const invoiceId = url.pathname.split('/').pop();
    
    if (!invoiceId) {
      return new Response("Invoice ID required", { status: 400 });
    }
    
    try {
      const data = await ctx.runQuery(internal.router.getProformaInvoiceData, { 
        invoiceId: invoiceId as any 
      });
      
      if (!data) {
        return new Response("Invoice not found", { status: 404 });
      }
      
      // Return invoice data as JSON for now
      // Later we'll implement PDF generation
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      console.error("Error getting invoice data:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http;
