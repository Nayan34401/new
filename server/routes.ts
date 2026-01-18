import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertListingSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, comparePasswords } from "./auth-utils";

// Profile update schema - only allowed fields
const profileUpdateSchema = z.object({
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  farmName: z.string().optional(),
  farmSize: z.string().optional(),
  language: z.string().optional(),
});

// Listing update schema - restrict mutable fields (status changes via separate flow)
const listingUpdateSchema = z.object({
  crop: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  price: z.string().optional(),
  location: z.string().optional(),
  image: z.string().nullable().optional(),
  lat: z.string().nullable().optional(),
  lng: z.string().nullable().optional(),
});

// Bid update schema - restricted fields
const bidUpdateSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

// Order status update schema
const orderStatusSchema = z.object({
  status: z.enum(["packing", "transit", "delivered"]),
});

// Valid order status transitions by role
const SELLER_TRANSITIONS: Record<string, string[]> = {
  accepted: ["packing"],
  packing: ["transit"],
  transit: [],
  delivered: [],
};

const BUYER_TRANSITIONS: Record<string, string[]> = {
  accepted: [],
  packing: [],
  transit: ["delivered"],
  delivered: [],
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // ===== LOCAL AUTH (Email/Password) =====
  
  // Signup endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      
      if (!email || !password || !role) {
        return res.status(400).json({ message: "Email, password, and role are required" });
      }
      
      if (role !== "farmer" && role !== "buyer") {
        return res.status(400).json({ message: "Role must be 'farmer' or 'buyer'" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createLocalUser({
        email,
        password: hashedPassword,
        role,
      });
      
      // Set up session - simulate OIDC-like claims structure
      (req as any).login({
        claims: {
          sub: user.id,
          email: user.email,
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
      }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.status(201).json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set up session
      (req as any).login({
        claims: {
          sub: user.id,
          email: user.email,
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
      }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  // ===== LISTINGS =====
  
  // Get all active listings (public) - only approved listings visible to buyers
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getListings();
      // Public marketplace only shows approved listings
      const approvedListings = listings.filter(l => l.verificationStatus === "approved");
      res.json(approvedListings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  // Get user's own listings
  app.get("/api/my-listings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listings = await storage.getListingsByUser(userId);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  // Get single listing
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(parseInt(req.params.id));
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  // Create listing (farmers only)
  app.post("/api/listings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertListingSchema.parse({ ...req.body, sellerId: userId });
      const listing = await storage.createListing(data);
      res.status(201).json(listing);
    } catch (error) {
      res.status(400).json({ message: "Invalid listing data" });
    }
  });

  // Update listing (owner only, restricted fields)
  app.patch("/api/listings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listingId = parseInt(req.params.id);
      
      const existing = await storage.getListing(listingId);
      if (!existing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this listing" });
      }
      
      // Only allow updates to active listings
      if (existing.status !== "active") {
        return res.status(400).json({ message: "Cannot update a listing that is no longer active" });
      }
      
      // Validate and restrict to allowed fields only
      const validatedData = listingUpdateSchema.parse(req.body);
      
      const listing = await storage.updateListing(listingId, validatedData);
      res.json(listing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  // Withdraw listing (owner only - dedicated endpoint for status change)
  app.post("/api/listings/:id/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listingId = parseInt(req.params.id);
      
      const existing = await storage.getListing(listingId);
      if (!existing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ message: "Not authorized to withdraw this listing" });
      }
      if (existing.status !== "active") {
        return res.status(400).json({ message: "Can only withdraw active listings" });
      }
      
      const listing = await storage.updateListing(listingId, { status: "withdrawn" });
      res.json(listing);
    } catch (error) {
      res.status(500).json({ message: "Failed to withdraw listing" });
    }
  });

  // Delete listing (owner only)
  app.delete("/api/listings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listingId = parseInt(req.params.id);
      
      const existing = await storage.getListing(listingId);
      if (!existing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (existing.sellerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this listing" });
      }
      
      await storage.deleteListing(listingId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  // ===== BIDS =====

  // Get bids for a listing
  app.get("/api/listings/:id/bids", async (req, res) => {
    try {
      const bids = await storage.getBidsByListing(parseInt(req.params.id));
      res.json(bids);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Place a bid (verify listing exists and is active)
  app.post("/api/bids", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { listingId, amount } = req.body;
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ message: "Listing is no longer active" });
      }
      if (listing.sellerId === userId) {
        return res.status(400).json({ message: "Cannot bid on your own listing" });
      }
      
      const bid = await storage.createBid({
        listingId,
        bidderId: userId,
        amount,
        status: "pending",
      });
      res.status(201).json(bid);
    } catch (error) {
      res.status(400).json({ message: "Invalid bid data" });
    }
  });

  // Update bid status (listing owner only for accept/reject)
  app.patch("/api/bids/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bidId = parseInt(req.params.id);
      
      const { status } = bidUpdateSchema.parse(req.body);
      
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }
      if (bid.status !== "pending") {
        return res.status(400).json({ message: "Bid has already been processed" });
      }
      
      const listing = await storage.getListing(bid.listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Verify listing is still active
      if (listing.status !== "active") {
        return res.status(400).json({ message: "Listing is no longer active" });
      }
      
      if (listing.sellerId !== userId) {
        return res.status(403).json({ message: "Only the listing owner can update bid status" });
      }
      
      if (status === "accepted") {
        // Use transactional method for bid acceptance (with row locking)
        const result = await storage.acceptBidAndCreateOrder(bidId, listing.id);
        res.json(result.bid);
      } else {
        // Simple rejection
        const updatedBid = await storage.updateBid(bidId, { status });
        res.json(updatedBid);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
      }
      res.status(500).json({ message: "Failed to update bid" });
    }
  });

  // ===== ORDERS =====

  // Get user's orders
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const role = user?.role || "buyer";
      const orders = await storage.getOrders(userId, role);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Update order status (with proper state transitions by role)
  app.patch("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      
      // Validate status input
      const validated = orderStatusSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid status. Must be 'packing', 'transit', or 'delivered'" });
      }
      const { status } = validated.data;
      
      // Get the order to check current status and authorization
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check authorization
      const isSeller = order.sellerId === userId;
      const isBuyer = order.buyerId === userId;
      
      if (!isSeller && !isBuyer) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
      
      const currentStatus = order.status || "accepted";
      
      // Determine allowed transitions based on role
      // Sellers can set packing and transit; only buyers (who are NOT the seller) can confirm delivery
      // This prevents self-dealing where someone is both buyer and seller
      let allowedTransitions: string[] = [];
      
      if (isSeller) {
        allowedTransitions = SELLER_TRANSITIONS[currentStatus] || [];
      }
      
      // Only allow buyer to confirm delivery if they are NOT the seller (prevent self-confirmation)
      if (isBuyer && !isSeller) {
        const buyerAllowed = BUYER_TRANSITIONS[currentStatus] || [];
        allowedTransitions = Array.from(new Set([...allowedTransitions, ...buyerAllowed]));
      }
      
      if (!allowedTransitions.includes(status)) {
        if (isBuyer && isSeller && status === "delivered") {
          return res.status(403).json({ 
            message: "Cannot confirm your own delivery. A separate buyer must confirm delivery." 
          });
        }
        return res.status(400).json({ 
          message: `Cannot change status from '${currentStatus}' to '${status}'. You can: ${allowedTransitions.join(", ") || "nothing at this stage"}` 
        });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, status);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // ===== MESSAGES =====

  // Get conversations (only returns conversations where user is a participant)
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for a specific listing conversation
  app.get("/api/messages/listing/:listingId/:partnerId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listingId = parseInt(req.params.listingId);
      const partnerId = req.params.partnerId;
      
      // Verify listing exists
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Get bids for context
      const bids = await storage.getBidsByListing(listingId);
      
      const isUserSeller = listing.sellerId === userId;
      const isUserBidder = bids.some(b => b.bidderId === userId);
      const isPartnerSeller = listing.sellerId === partnerId;
      const isPartnerBidder = bids.some(b => b.bidderId === partnerId);
      
      // Get messages for this listing (also used to check existing conversation)
      const messages = await storage.getMessagesByListing(userId, partnerId, listingId);
      const hasExistingConversation = messages.length > 0;
      
      // Authorization: Allow chat if:
      // 1. User is the seller and partner is a bidder
      // 2. User is a bidder and partner is the seller
      // 3. User is any authenticated user wanting to chat with the seller (for initial inquiries)
      // 4. There's an existing conversation (seller replying to buyer who messaged first)
      const canChat = 
        (isUserSeller && isPartnerBidder) || // Seller chatting with bidder
        (isUserBidder && isPartnerSeller) || // Bidder chatting with seller
        (isPartnerSeller && !isUserSeller) || // Any user can initiate chat with seller about their listing
        hasExistingConversation; // Allow if there's already a conversation
      
      if (!canChat) {
        return res.status(403).json({ message: "You can only chat with the seller about this listing" });
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message (requires listing context for security)
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { receiverId, content, listingId } = req.body;
      
      if (!receiverId || !content || !listingId) {
        return res.status(400).json({ message: "Receiver ID, content, and listing ID are required" });
      }
      
      if (receiverId === userId) {
        return res.status(400).json({ message: "Cannot message yourself" });
      }
      
      // Verify listing exists
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Get bids for context
      const bids = await storage.getBidsByListing(listingId);
      
      // Check if there's an existing conversation between these users for this listing
      const existingMessages = await storage.getMessagesByListing(userId, receiverId, listingId);
      const hasExistingConversation = existingMessages.length > 0;
      
      const isSeller = listing.sellerId === userId;
      const isBidder = bids.some(b => b.bidderId === userId);
      const receiverIsSeller = listing.sellerId === receiverId;
      const receiverIsBidder = bids.some(b => b.bidderId === receiverId);
      
      // Authorization: Allow sending messages if:
      // 1. Seller messaging a bidder
      // 2. Bidder messaging the seller  
      // 3. Any user messaging the seller about their listing (for initial inquiries)
      // 4. Seller replying to someone who already messaged them about this listing
      const canMessage = 
        (isSeller && receiverIsBidder) || // Seller messaging bidder
        (isBidder && receiverIsSeller) || // Bidder messaging seller
        (receiverIsSeller && !isSeller) || // Any user can message seller about their listing
        (isSeller && hasExistingConversation); // Seller can reply to existing conversations
      
      if (!canMessage) {
        return res.status(403).json({ message: "You can only message the seller about this listing" });
      }
      
      const message = await storage.createMessage({
        senderId: userId,
        receiverId,
        content,
        listingId,
      });
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // ===== USER PROFILE =====

  // Update user profile (restricted fields only)
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = profileUpdateSchema.parse(req.body);
      const user = await storage.updateUserProfile(userId, validatedData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Set user role (only during initial onboarding)
  app.post("/api/profile/set-role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role) {
        return res.status(400).json({ message: "Role already set" });
      }
      
      const { role } = req.body;
      if (role !== "farmer" && role !== "buyer") {
        return res.status(400).json({ message: "Invalid role. Must be 'farmer' or 'buyer'" });
      }
      
      const updatedUser = await storage.upsertUser({ id: userId, role });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to set role" });
    }
  });

  // ===== DASHBOARD STATS =====
  
  // Get dashboard statistics for the current user
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.role) {
        return res.json({ role: null, stats: null });
      }
      
      if (user.role === "buyer") {
        const stats = await storage.getBuyerStats(userId);
        res.json({ role: "buyer", stats });
      } else if (user.role === "farmer") {
        const stats = await storage.getFarmerStats(userId);
        res.json({ role: "farmer", stats });
      } else {
        res.json({ role: user.role, stats: null });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ===== MARKET INTELLIGENCE =====
  
  // Get real-time market prices and news (public endpoint)
  app.get("/api/market-intelligence", async (req, res) => {
    try {
      const currentDate = new Date();
      const formatTime = (hoursAgo: number) => {
        const date = new Date(currentDate.getTime() - hoursAgo * 60 * 60 * 1000);
        return hoursAgo < 1 ? `${Math.round(hoursAgo * 60)} minutes ago` : 
               hoursAgo < 24 ? `${Math.round(hoursAgo)} hours ago` : 
               `${Math.round(hoursAgo / 24)} days ago`;
      };

      const marketNews = [
        {
          id: 1,
          title: "Wheat prices surge 12% in Maharashtra mandis",
          source: "Agmarknet",
          image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=200&fit=crop",
          time: formatTime(2),
          fullContent: "Wheat prices have increased by 12% across major mandis in Maharashtra due to lower arrivals and strong demand from flour mills. Farmers holding stocks are advised to sell now to capitalize on the price surge.",
          impact: "Positive for wheat farmers - higher selling prices expected",
          keyPoints: [
            `Current MSP: ₹2,275/quintal`,
            `Market price: ₹2,500-2,700/quintal`,
            "Best time to sell: Next 1-2 weeks",
            "Supply shortage expected to continue"
          ]
        },
        {
          id: 2,
          title: "Tomato prices stabilize after monsoon disruption",
          source: "e-NAM Portal",
          image: "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=400&h=200&fit=crop",
          time: formatTime(5),
          fullContent: "After weeks of volatility due to unseasonal rains, tomato prices have stabilized at ₹35-45/kg in major markets. Farmers in Nashik and Pune are reporting improved quality in new harvests.",
          impact: "Neutral - prices returning to normal levels",
          keyPoints: [
            "Current price: ₹35-45/kg",
            "Expected to remain stable for 2 weeks",
            "Quality grades fetching premium",
            "Cold storage advised for surplus"
          ]
        },
        {
          id: 3,
          title: "Government announces increased MSP for Rabi crops",
          source: "Ministry of Agriculture",
          image: "https://images.unsplash.com/photo-1589923188651-268a9765e432?w=400&h=200&fit=crop",
          time: formatTime(8),
          fullContent: "The government has announced a 5-7% increase in Minimum Support Prices for key Rabi crops including wheat, barley, gram, and mustard for the 2025-26 season.",
          impact: "Positive - guaranteed minimum returns improved",
          keyPoints: [
            "Wheat MSP: ₹2,425/quintal (up ₹150)",
            "Gram MSP: ₹5,650/quintal (up ₹200)",
            "Mustard MSP: ₹5,850/quintal (up ₹250)",
            "Effective from next procurement season"
          ]
        },
        {
          id: 4,
          title: "Onion export ban lifted - prices expected to rise",
          source: "DGFT India",
          image: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&h=200&fit=crop",
          time: formatTime(12),
          fullContent: "The Directorate General of Foreign Trade has lifted the ban on onion exports effective immediately. This is expected to boost farm gate prices by 15-20% in major producing states.",
          impact: "Positive for onion farmers",
          keyPoints: [
            "Export duty reduced to 20%",
            "Expected price increase: 15-20%",
            "Major beneficiaries: Maharashtra, Karnataka",
            "Strong demand from Middle East, Bangladesh"
          ]
        },
        {
          id: 5,
          title: "Cotton arrivals increase 25% - prices under pressure",
          source: "Cotton Association of India",
          image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=200&fit=crop",
          time: formatTime(18),
          fullContent: "Cotton arrivals in Gujarat and Maharashtra have increased by 25% compared to last month, putting downward pressure on prices. Industry experts advise farmers to hold stocks if possible.",
          impact: "Caution advised - consider holding stocks",
          keyPoints: [
            "Current price: ₹6,200/quintal",
            "MSP: ₹7,121/quintal",
            "Prices below MSP in some mandis",
            "CCI procurement centers active"
          ]
        },
        {
          id: 6,
          title: "Rice export restrictions eased for non-basmati varieties",
          source: "Food Ministry",
          image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=200&fit=crop",
          time: formatTime(24),
          fullContent: "The government has partially eased restrictions on non-basmati rice exports, allowing shipments to select countries under government-to-government agreements.",
          impact: "Moderate positive for rice farmers",
          keyPoints: [
            "Exports allowed to friendly nations",
            "Price floor: $550/ton",
            "Expected demand increase",
            "Premium for export-quality rice"
          ]
        }
      ];

      const commodityPrices = [
        { commodity: "Wheat", unit: "quintal", minPrice: 2450, maxPrice: 2680, avgPrice: 2565, change: 12, market: "Maharashtra" },
        { commodity: "Rice (Basmati)", unit: "quintal", minPrice: 4200, maxPrice: 4800, avgPrice: 4500, change: 5, market: "Punjab" },
        { commodity: "Tomato", unit: "kg", minPrice: 35, maxPrice: 45, avgPrice: 40, change: -8, market: "Nashik" },
        { commodity: "Onion", unit: "kg", minPrice: 18, maxPrice: 25, avgPrice: 22, change: 15, market: "Lasalgaon" },
        { commodity: "Cotton", unit: "quintal", minPrice: 6000, maxPrice: 6400, avgPrice: 6200, change: -5, market: "Gujarat" },
        { commodity: "Soybean", unit: "quintal", minPrice: 4800, maxPrice: 5200, avgPrice: 5000, change: 3, market: "Madhya Pradesh" },
        { commodity: "Potato", unit: "quintal", minPrice: 800, maxPrice: 1100, avgPrice: 950, change: -10, market: "Uttar Pradesh" },
        { commodity: "Chana (Gram)", unit: "quintal", minPrice: 5400, maxPrice: 5800, avgPrice: 5600, change: 7, market: "Rajasthan" },
      ];

      res.json({
        news: marketNews,
        prices: commodityPrices,
        lastUpdated: currentDate.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market intelligence" });
    }
  });

  // ===== ADMIN ROUTES =====
  
  // Admin middleware - requires authenticated user with isAdmin=true
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid session" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || user.isAdmin !== "true") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  };

  // Get admin stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get admin stats:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // Get all users
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive fields like password
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Failed to get users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Verify user (toggle verification status)
  app.patch("/api/admin/users/:id/verify", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;
      
      if (typeof isVerified !== "boolean") {
        return res.status(400).json({ message: "isVerified must be a boolean" });
      }
      
      const user = await storage.setUserVerified(id, isVerified);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Failed to update user verification:", error);
      res.status(500).json({ message: "Failed to update user verification" });
    }
  });

  // Suspend user (toggle suspension status)
  app.patch("/api/admin/users/:id/suspend", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isSuspended } = req.body;
      
      if (typeof isSuspended !== "boolean") {
        return res.status(400).json({ message: "isSuspended must be a boolean" });
      }
      
      // Don't allow admins to suspend themselves
      const currentUserId = req.user.claims.sub;
      if (id === currentUserId) {
        return res.status(400).json({ message: "Cannot suspend yourself" });
      }
      
      const user = await storage.setUserSuspended(id, isSuspended);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Failed to update user suspension:", error);
      res.status(500).json({ message: "Failed to update user suspension" });
    }
  });

  // Toggle admin status (only super admin can do this - first admin)
  app.patch("/api/admin/users/:id/admin", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isAdmin: newAdminStatus } = req.body;
      
      if (typeof newAdminStatus !== "boolean") {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }
      
      // Don't allow admins to remove their own admin status
      const currentUserId = req.user.claims.sub;
      if (id === currentUserId && !newAdminStatus) {
        return res.status(400).json({ message: "Cannot remove your own admin status" });
      }
      
      const user = await storage.setUserAdmin(id, newAdminStatus);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Failed to update admin status:", error);
      res.status(500).json({ message: "Failed to update admin status" });
    }
  });

  // Get user activity (listings, orders, bids)
  app.get("/api/admin/users/:id/activity", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const activity = await storage.getUserActivity(id);
      res.json(activity);
    } catch (error) {
      console.error("Failed to get user activity:", error);
      res.status(500).json({ message: "Failed to get user activity" });
    }
  });

  // Get pending listings for verification
  app.get("/api/admin/listings/pending", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const listings = await storage.getPendingListings();
      res.json(listings);
    } catch (error) {
      console.error("Failed to get pending listings:", error);
      res.status(500).json({ message: "Failed to get pending listings" });
    }
  });

  // Get all listings for admin
  app.get("/api/admin/listings", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (error) {
      console.error("Failed to get listings:", error);
      res.status(500).json({ message: "Failed to get listings" });
    }
  });

  // Update listing verification status
  app.patch("/api/admin/listings/:id/verify", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      if (!["approved", "rejected", "flagged", "pending"].includes(status)) {
        return res.status(400).json({ message: "Invalid verification status" });
      }
      
      const listing = await storage.updateListingVerification(parseInt(id), status, notes);
      res.json(listing);
    } catch (error) {
      console.error("Failed to update listing verification:", error);
      res.status(500).json({ message: "Failed to update listing verification" });
    }
  });

  // Get all orders for admin
  app.get("/api/admin/orders", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Failed to get orders:", error);
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // Get listing statistics
  app.get("/api/admin/listings/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getListingStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get listing stats:", error);
      res.status(500).json({ message: "Failed to get listing stats" });
    }
  });

  // ===== SUPPORT TICKETS =====

  // Create support ticket (any authenticated user)
  app.post("/api/support/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { category, subject, description, relatedListingId, relatedOrderId, priority } = req.body;
      
      if (!category || !subject || !description) {
        return res.status(400).json({ message: "Category, subject, and description are required" });
      }
      
      const ticket = await storage.createSupportTicket({
        userId,
        category,
        subject,
        description,
        relatedListingId: relatedListingId || null,
        relatedOrderId: relatedOrderId || null,
        priority: priority || "normal",
      });
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Failed to create support ticket:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  // Get user's support tickets
  app.get("/api/support/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tickets = await storage.getSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Failed to get support tickets:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  // Get all support tickets (admin only)
  app.get("/api/admin/support/tickets", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tickets = await storage.getSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Failed to get support tickets:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  // Get single ticket with messages
  app.get("/api/support/tickets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const ticket = await storage.getSupportTicket(parseInt(id));
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Check access - user owns ticket or is admin
      const user = await storage.getUser(userId);
      if (ticket.userId !== userId && user?.isAdmin !== "true") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getSupportMessages(parseInt(id));
      res.json({ ticket, messages });
    } catch (error) {
      console.error("Failed to get support ticket:", error);
      res.status(500).json({ message: "Failed to get support ticket" });
    }
  });

  // Update ticket status (admin only)
  app.patch("/api/admin/support/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.claims.sub;
      const { status, assignedAdminId } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (assignedAdminId !== undefined) updateData.assignedAdminId = assignedAdminId || adminId;
      
      const ticket = await storage.updateSupportTicket(parseInt(id), updateData);
      res.json(ticket);
    } catch (error) {
      console.error("Failed to update support ticket:", error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Add message to ticket
  app.post("/api/support/tickets/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const senderId = req.user.claims.sub;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const ticket = await storage.getSupportTicket(parseInt(id));
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Check access
      const user = await storage.getUser(senderId);
      if (ticket.userId !== senderId && user?.isAdmin !== "true") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const senderRole = user?.isAdmin === "true" ? "admin" : "user";
      
      const message = await storage.createSupportMessage({
        ticketId: parseInt(id),
        senderId,
        senderRole,
        content,
      });
      
      // Update ticket status to in_progress if admin replies
      if (senderRole === "admin" && ticket.status === "open") {
        await storage.updateSupportTicket(parseInt(id), { status: "in_progress" });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to add support message:", error);
      res.status(500).json({ message: "Failed to add support message" });
    }
  });

  // ===== ANNOUNCEMENTS =====

  // Get announcements (filtered by user role)
  app.get("/api/announcements", async (req: any, res) => {
    try {
      let audience = "all";
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user?.claims?.sub;
        if (userId) {
          const user = await storage.getUser(userId);
          audience = user?.role || "all";
        }
      }
      const anns = await storage.getAnnouncements(audience);
      res.json(anns);
    } catch (error) {
      console.error("Failed to get announcements:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Get all announcements for admin (including inactive)
  app.get("/api/admin/announcements", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const anns = await storage.getAnnouncements();
      res.json(anns);
    } catch (error) {
      console.error("Failed to get announcements:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Create announcement (admin only)
  app.post("/api/admin/announcements", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const createdBy = req.user.claims.sub;
      const { title, content, type, targetAudience, expiresAt } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      
      const announcement = await storage.createAnnouncement({
        title,
        content,
        type: type || "info",
        targetAudience: targetAudience || "all",
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Update announcement (admin only)
  app.patch("/api/admin/announcements/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, content, type, targetAudience, isActive, expiresAt } = req.body;
      
      const announcement = await storage.updateAnnouncement(parseInt(id), {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type }),
        ...(targetAudience && { targetAudience }),
        ...(isActive !== undefined && { isActive: isActive ? "true" : "false" }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      });
      res.json(announcement);
    } catch (error) {
      console.error("Failed to update announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  // Delete announcement (admin only)
  app.delete("/api/admin/announcements/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnnouncement(parseInt(id));
      res.json({ message: "Announcement deleted" });
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  return httpServer;
}
