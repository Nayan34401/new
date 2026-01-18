import { 
  listings, bids, orders, messages, users, supportTickets, supportMessages, announcements,
  type User, type UpsertUser,
  type Listing, type InsertListing,
  type Bid, type InsertBid,
  type Order, type InsertOrder,
  type Message, type InsertMessage,
  type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage,
  type Announcement, type InsertAnnouncement,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, sql, count, sum } from "drizzle-orm";

export interface BuyerStats {
  projectedSpending: number;
  activeBids: number;
  wonAuctions: number;
}

export interface FarmerStats {
  projectedRevenue: number;
  activeListings: number;
  totalOrders: number;
}

export interface AdminStats {
  totalUsers: number;
  totalFarmers: number;
  totalBuyers: number;
  totalListings: number;
  totalOrders: number;
  totalBids: number;
  verifiedFarmers: number;
  suspendedUsers: number;
  pendingListings: number;
  totalRevenue: number;
  openTickets: number;
}

export interface UserActivity {
  listingsCount: number;
  ordersCount: number;
  bidsCount: number;
  listings: Listing[];
  orders: Order[];
  bids: Bid[];
}

export interface ListingStats {
  popularCrops: { crop: string; count: number }[];
  priceRanges: { crop: string; avgPrice: number; minPrice: number; maxPrice: number }[];
}
import { drizzle } from "drizzle-orm/node-postgres";

export interface IStorage {
  // Users (extends Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  createLocalUser(userData: { email: string; password: string; role: string }): Promise<User>;
  updateUserProfile(id: string, data: { phone?: string; location?: string; bio?: string; farmName?: string; farmSize?: string; language?: string }): Promise<User>;

  // Listings
  getListings(): Promise<Listing[]>;
  getListingsByUser(userId: string): Promise<Listing[]>;
  getListing(id: number): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, data: Partial<Listing>): Promise<Listing>;
  deleteListing(id: number): Promise<void>;

  // Bids
  getBid(id: number): Promise<Bid | undefined>;
  getBidsByListing(listingId: number): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBid(id: number, data: Partial<Bid>): Promise<Bid>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(userId: string, role: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, status: string): Promise<Order>;
  
  // Transactional operations
  acceptBidAndCreateOrder(bidId: number, listingId: number): Promise<{ bid: Bid; order: Order }>;

  // Messages
  getConversations(userId: string): Promise<{ partnerId: string; lastMessage: Message }[]>;
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  getMessagesByListing(userId: string, partnerId: string, listingId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Dashboard Stats
  getBuyerStats(userId: string): Promise<BuyerStats>;
  getFarmerStats(userId: string): Promise<FarmerStats>;
  
  // Admin operations
  getAdminStats(): Promise<AdminStats>;
  getAllUsers(): Promise<User[]>;
  setUserVerified(userId: string, isVerified: boolean): Promise<User>;
  setUserSuspended(userId: string, isSuspended: boolean): Promise<User>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User>;
  
  // Extended Admin operations
  getUserActivity(userId: string): Promise<UserActivity>;
  getPendingListings(): Promise<Listing[]>;
  getAllListings(): Promise<Listing[]>;
  updateListingVerification(listingId: number, status: string, notes?: string): Promise<Listing>;
  getAllOrders(): Promise<Order[]>;
  getListingStats(): Promise<ListingStats>;
  
  // Support Tickets
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(userId?: string): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  updateSupportTicket(id: number, data: Partial<SupportTicket>): Promise<SupportTicket>;
  getSupportMessages(ticketId: number): Promise<SupportMessage[]>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  
  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncements(audience?: string): Promise<Announcement[]>;
  updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createLocalUser(userData: { email: string; password: string; role: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      password: userData.password,
      role: userData.role,
    }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: { phone?: string; location?: string; bio?: string; farmName?: string; farmSize?: string; language?: string }): Promise<User> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getListings(): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.status, "active")).orderBy(desc(listings.createdAt));
  }

  async getListingsByUser(userId: string): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.sellerId, userId)).orderBy(desc(listings.createdAt));
  }

  async getListing(id: number): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db.insert(listings).values(insertListing).returning();
    return listing;
  }

  async updateListing(id: number, data: Partial<Listing>): Promise<Listing> {
    const [listing] = await db.update(listings).set(data).where(eq(listings.id, id)).returning();
    return listing;
  }

  async deleteListing(id: number): Promise<void> {
    await db.delete(listings).where(eq(listings.id, id));
  }

  async getBid(id: number): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getBidsByListing(listingId: number): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.listingId, listingId)).orderBy(desc(bids.createdAt));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    return bid;
  }

  async updateBid(id: number, data: Partial<Bid>): Promise<Bid> {
    const [bid] = await db.update(bids).set(data).where(eq(bids.id, id)).returning();
    return bid;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrders(userId: string, role: string): Promise<Order[]> {
    if (role === 'farmer') {
      return await db.select().from(orders).where(eq(orders.sellerId, userId)).orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).where(eq(orders.buyerId, userId)).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, status: string): Promise<Order> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }

  async acceptBidAndCreateOrder(bidId: number, listingId: number): Promise<{ bid: Bid; order: Order }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock listing row to prevent race conditions
      const listingResult = await client.query(
        'SELECT * FROM listings WHERE id = $1 FOR UPDATE',
        [listingId]
      );
      if (listingResult.rows.length === 0) {
        throw new Error("Listing not found");
      }
      const listing = listingResult.rows[0];
      
      // Verify listing is still active within transaction
      if (listing.status !== "active") {
        throw new Error("Listing is no longer active");
      }
      
      // Get and verify bid belongs to this listing and is pending
      const bidResult = await client.query(
        'SELECT * FROM bids WHERE id = $1 AND listing_id = $2 AND status = $3',
        [bidId, listingId, "pending"]
      );
      if (bidResult.rows.length === 0) {
        throw new Error("Bid not found, does not belong to this listing, or has already been processed");
      }
      const bid = bidResult.rows[0];
      
      // Accept the winning bid
      const updatedBidResult = await client.query(
        'UPDATE bids SET status = $1 WHERE id = $2 RETURNING *',
        ["accepted", bidId]
      );
      const updatedBid = updatedBidResult.rows[0];
      
      // Reject all other pending bids for this listing
      await client.query(
        'UPDATE bids SET status = $1 WHERE listing_id = $2 AND id != $3 AND status = $4',
        ["rejected", listingId, bidId, "pending"]
      );
      
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (listing_id, seller_id, buyer_id, crop, quantity, unit, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [listing.id, listing.seller_id, bid.bidder_id, listing.crop, listing.quantity, listing.unit, bid.amount, "accepted"]
      );
      const order = orderResult.rows[0];
      
      // Mark listing as sold
      await client.query(
        'UPDATE listings SET status = $1 WHERE id = $2',
        ["sold", listingId]
      );
      
      await client.query('COMMIT');
      
      // Map snake_case to camelCase for return types
      return {
        bid: {
          id: updatedBid.id,
          listingId: updatedBid.listing_id,
          bidderId: updatedBid.bidder_id,
          amount: updatedBid.amount,
          status: updatedBid.status,
          createdAt: updatedBid.created_at,
        },
        order: {
          id: order.id,
          listingId: order.listing_id,
          sellerId: order.seller_id,
          buyerId: order.buyer_id,
          crop: order.crop,
          quantity: order.quantity,
          unit: order.unit,
          totalPrice: order.total_price,
          status: order.status,
          createdAt: order.created_at,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getConversations(userId: string): Promise<{ partnerId: string; lastMessage: Message }[]> {
    const allMessages = await db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(desc(messages.createdAt));
    
    const conversations = new Map<string, Message>();
    for (const msg of allMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, msg);
      }
    }
    
    return Array.from(conversations.entries()).map(([partnerId, lastMessage]) => ({
      partnerId,
      lastMessage
    }));
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    return await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }

  async getMessagesByListing(userId: string, partnerId: string, listingId: number): Promise<Message[]> {
    return await db.select().from(messages).where(
      and(
        eq(messages.listingId, listingId),
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
          and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId))
        )
      )
    ).orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getBuyerStats(userId: string): Promise<BuyerStats> {
    // Get active bids count and projected spending
    const bidStats = await db.select({
      count: count(),
      total: sum(bids.amount)
    }).from(bids).where(
      and(eq(bids.bidderId, userId), eq(bids.status, "pending"))
    );
    
    // Get won auctions (orders where user is buyer)
    const orderStats = await db.select({
      count: count()
    }).from(orders).where(eq(orders.buyerId, userId));
    
    return {
      projectedSpending: Number(bidStats[0]?.total) || 0,
      activeBids: Number(bidStats[0]?.count) || 0,
      wonAuctions: Number(orderStats[0]?.count) || 0
    };
  }

  async getFarmerStats(userId: string): Promise<FarmerStats> {
    // Get active listings count
    const listingStats = await db.select({
      count: count()
    }).from(listings).where(
      and(eq(listings.sellerId, userId), eq(listings.status, "active"))
    );
    
    // Get projected revenue (sum of pending bids on user's listings)
    const revenueResult = await db.select({
      total: sum(bids.amount)
    }).from(bids)
      .innerJoin(listings, eq(bids.listingId, listings.id))
      .where(
        and(eq(listings.sellerId, userId), eq(bids.status, "pending"))
      );
    
    // Get total orders where user is seller
    const orderStats = await db.select({
      count: count()
    }).from(orders).where(eq(orders.sellerId, userId));
    
    return {
      projectedRevenue: Number(revenueResult[0]?.total) || 0,
      activeListings: Number(listingStats[0]?.count) || 0,
      totalOrders: Number(orderStats[0]?.count) || 0
    };
  }

  async getAdminStats(): Promise<AdminStats> {
    const [userStats] = await db.select({
      totalUsers: count(),
    }).from(users);
    
    const [farmerStats] = await db.select({
      count: count(),
    }).from(users).where(eq(users.role, "farmer"));
    
    const [buyerStats] = await db.select({
      count: count(),
    }).from(users).where(eq(users.role, "buyer"));
    
    const [listingStats] = await db.select({
      count: count(),
    }).from(listings);
    
    const [orderStats] = await db.select({
      count: count(),
    }).from(orders);
    
    const [bidStats] = await db.select({
      count: count(),
    }).from(bids);
    
    const [verifiedStats] = await db.select({
      count: count(),
    }).from(users).where(eq(users.isVerified, "true"));
    
    const [suspendedStats] = await db.select({
      count: count(),
    }).from(users).where(eq(users.isSuspended, "true"));
    
    const [pendingStats] = await db.select({
      count: count(),
    }).from(listings).where(eq(listings.verificationStatus, "pending"));
    
    const [revenueStats] = await db.select({
      total: sum(orders.totalPrice),
    }).from(orders);
    
    const [ticketStats] = await db.select({
      count: count(),
    }).from(supportTickets).where(eq(supportTickets.status, "open"));
    
    return {
      totalUsers: Number(userStats?.totalUsers) || 0,
      totalFarmers: Number(farmerStats?.count) || 0,
      totalBuyers: Number(buyerStats?.count) || 0,
      totalListings: Number(listingStats?.count) || 0,
      totalOrders: Number(orderStats?.count) || 0,
      totalBids: Number(bidStats?.count) || 0,
      verifiedFarmers: Number(verifiedStats?.count) || 0,
      suspendedUsers: Number(suspendedStats?.count) || 0,
      pendingListings: Number(pendingStats?.count) || 0,
      totalRevenue: Number(revenueStats?.total) || 0,
      openTickets: Number(ticketStats?.count) || 0,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async setUserVerified(userId: string, isVerified: boolean): Promise<User> {
    const [user] = await db.update(users)
      .set({ isVerified: isVerified ? "true" : "false", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setUserSuspended(userId: string, isSuspended: boolean): Promise<User> {
    const [user] = await db.update(users)
      .set({ isSuspended: isSuspended ? "true" : "false", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User> {
    const [user] = await db.update(users)
      .set({ isAdmin: isAdmin ? "true" : "false", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserActivity(userId: string): Promise<UserActivity> {
    const userListings = await db.select().from(listings).where(eq(listings.sellerId, userId)).orderBy(desc(listings.createdAt));
    const userOrders = await db.select().from(orders).where(
      or(eq(orders.sellerId, userId), eq(orders.buyerId, userId))
    ).orderBy(desc(orders.createdAt));
    const userBids = await db.select().from(bids).where(eq(bids.bidderId, userId)).orderBy(desc(bids.createdAt));
    
    return {
      listingsCount: userListings.length,
      ordersCount: userOrders.length,
      bidsCount: userBids.length,
      listings: userListings,
      orders: userOrders,
      bids: userBids,
    };
  }

  async getPendingListings(): Promise<Listing[]> {
    return await db.select().from(listings).where(eq(listings.verificationStatus, "pending")).orderBy(desc(listings.createdAt));
  }

  async getAllListings(): Promise<Listing[]> {
    return await db.select().from(listings).orderBy(desc(listings.createdAt));
  }

  async updateListingVerification(listingId: number, status: string, notes?: string): Promise<Listing> {
    const [listing] = await db.update(listings)
      .set({ verificationStatus: status, verificationNotes: notes || null })
      .where(eq(listings.id, listingId))
      .returning();
    return listing;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getListingStats(): Promise<ListingStats> {
    const cropCounts = await db.select({
      crop: listings.crop,
      count: count(),
    }).from(listings).where(eq(listings.status, "active")).groupBy(listings.crop).orderBy(desc(count()));
    
    const priceStats = await db.select({
      crop: listings.crop,
      avgPrice: sql<number>`AVG(${listings.price}::numeric)`,
      minPrice: sql<number>`MIN(${listings.price}::numeric)`,
      maxPrice: sql<number>`MAX(${listings.price}::numeric)`,
    }).from(listings).where(eq(listings.status, "active")).groupBy(listings.crop);
    
    return {
      popularCrops: cropCounts.map(c => ({ crop: c.crop, count: Number(c.count) })),
      priceRanges: priceStats.map(p => ({
        crop: p.crop,
        avgPrice: Number(p.avgPrice) || 0,
        minPrice: Number(p.minPrice) || 0,
        maxPrice: Number(p.maxPrice) || 0,
      })),
    };
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async getSupportTickets(userId?: string): Promise<SupportTicket[]> {
    if (userId) {
      return await db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
    }
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async updateSupportTicket(id: number, data: Partial<SupportTicket>): Promise<SupportTicket> {
    const [ticket] = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  async getSupportMessages(ticketId: number): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticketId)).orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [created] = await db.insert(supportMessages).values(message).returning();
    return created;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async getAnnouncements(audience?: string): Promise<Announcement[]> {
    if (audience && audience !== "all") {
      return await db.select().from(announcements).where(
        and(
          eq(announcements.isActive, "true"),
          or(eq(announcements.targetAudience, audience), eq(announcements.targetAudience, "all"))
        )
      ).orderBy(desc(announcements.createdAt));
    }
    return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async updateAnnouncement(id: number, data: Partial<Announcement>): Promise<Announcement> {
    const [ann] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return ann;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }
}

export const storage = new DatabaseStorage();
