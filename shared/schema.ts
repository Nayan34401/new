import { pgTable, text, serial, integer, timestamp, decimal, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models for Replit Auth
export * from "./models/auth";

// Listings table - references auth users via varchar ID
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id").notNull(), // References auth users.id (varchar)
  crop: text("crop").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  price: decimal("price").notNull(),
  location: text("location").notNull(),
  image: text("image"),
  status: text("status").default("active"), // 'active', 'withdrawn', 'sold'
  verificationStatus: text("verification_status").default("pending"), // 'pending', 'approved', 'rejected', 'flagged'
  verificationNotes: text("verification_notes"),
  lat: decimal("lat"),
  lng: decimal("lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bids table
export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  bidderId: varchar("bidder_id").notNull(), // References auth users.id (varchar)
  amount: decimal("amount").notNull(),
  status: text("status").default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table - unique constraint ensures only one order per listing
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  sellerId: varchar("seller_id").notNull(), // References auth users.id (varchar)
  buyerId: varchar("buyer_id").notNull(), // References auth users.id (varchar)
  crop: text("crop").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  totalPrice: decimal("total_price").notNull(),
  status: text("status").default("accepted"), // 'accepted', 'packing', 'transit', 'delivered'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_order_per_listing").on(table.listingId),
]);

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(), // References auth users.id (varchar)
  receiverId: varchar("receiver_id").notNull(), // References auth users.id (varchar)
  listingId: integer("listing_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  category: text("category").notNull(), // 'query', 'dispute', 'complaint', 'other'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  relatedListingId: integer("related_listing_id"),
  relatedOrderId: integer("related_order_id"),
  assignedAdminId: varchar("assigned_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Messages table (for ticket conversations)
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // 'user', 'admin'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Announcements table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default("info"), // 'info', 'warning', 'success', 'alert'
  targetAudience: text("target_audience").default("all"), // 'all', 'farmers', 'buyers'
  isActive: text("is_active").default("true"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Insert schemas
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, createdAt: true });
export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });

// Types
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
