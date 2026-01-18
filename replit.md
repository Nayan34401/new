# Krishi Bazaar - Digital Farmer Marketplace

## Overview

Krishi Bazaar is a digital agricultural marketplace connecting farmers with buyers. The platform enables farmers to list their produce, buyers to browse and place bids, and both parties to negotiate and complete transactions. Key features include real-time bidding, order tracking, messaging between parties, activity logging for farmers, and multi-language support (English, Hindi, Marathi, Telugu).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Internationalization**: i18next with react-i18next for multi-language support
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API at `/api/*` routes
- **Authentication**: Replit OpenID Connect (OIDC) integration with Passport.js
- **Session Management**: express-session with PostgreSQL session store (connect-pg-simple)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` for shared types, `shared/models/auth.ts` for auth tables

### Key Data Models
- **Users**: Extended from Replit Auth with marketplace fields (role, phone, location, bio, farmName, farmSize, language)
- **Listings**: Crop listings with seller info, pricing, location, and status
- **Bids**: Buyer bids on listings with status tracking
- **Orders**: Completed transactions with lifecycle tracking (accepted → packing → transit → delivered)
- **Messages**: Direct messaging between buyers and sellers

### Authentication Flow
1. User authenticates via Replit OIDC
2. User record created/updated in PostgreSQL users table
3. Session stored in PostgreSQL sessions table
4. Role selection (farmer/buyer) determines UI and available features

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (app-shell, marketplace, dashboard, etc.)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
    pages/        # Route components
server/           # Express backend
  replit_integrations/auth/  # Replit Auth integration
shared/           # Shared types and schemas
  schema.ts       # Drizzle database schema
  models/auth.ts  # Auth-specific models
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations via `db:push` command

### Authentication
- **Replit OIDC**: Authentication provider (configured via `ISSUER_URL`, `REPL_ID`)
- **Session Secret**: Required `SESSION_SECRET` environment variable

### UI Libraries
- **Radix UI**: Headless UI primitives (dialogs, dropdowns, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **Recharts**: Data visualization charts

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

## API Routes

### Authentication
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/login` - Initiate Replit OIDC login
- `POST /api/logout` - End session

### Listings
- `GET /api/listings` - Get all active listings (public)
- `GET /api/my-listings` - Get current user's listings (auth required)
- `GET /api/listings/:id` - Get single listing (public)
- `POST /api/listings` - Create listing (auth required)
- `PATCH /api/listings/:id` - Update listing fields (owner only, active listings only)
- `POST /api/listings/:id/withdraw` - Withdraw listing (owner only)
- `DELETE /api/listings/:id` - Delete listing (owner only)

### Bids
- `GET /api/listings/:id/bids` - Get bids for a listing (public)
- `POST /api/bids` - Place bid (auth required, validates listing active, cannot bid on own)
- `PATCH /api/bids/:id` - Accept/reject bid (listing owner only, transactional with order creation)

### Orders
- `GET /api/orders` - Get user's orders (auth required)
- `PATCH /api/orders/:id` - Update order status (role-based: sellers can set packing/transit, only buyers can confirm delivered)

### Messages
- `GET /api/conversations` - Get user's conversations (auth required)
- `GET /api/messages/listing/:listingId/:partnerId` - Get messages for a listing (auth required, participant verification)
- `POST /api/messages` - Send message (auth required, requires listingId, validates participants)

### Profile
- `PATCH /api/profile` - Update profile (auth required, restricted fields)
- `POST /api/profile/set-role` - Set user role (auth required, one-time only)

## Authorization Rules

### Bid Acceptance Flow
1. Only listing owner can accept/reject bids
2. Listing must be active
3. Bid must be pending
4. Acceptance uses database transaction with row locking
5. Other pending bids are automatically rejected
6. Order is created atomically
7. Unique constraint ensures one order per listing

### Order Status Transitions
- Sellers can: accepted → packing → transit
- Buyers (not self) can: transit → delivered
- Self-confirmation is explicitly prevented

### Messaging Authorization
- All messages require listing context (listingId)
- Buyers can initiate chat with sellers about any listing (for initial inquiries)
- Sellers can respond to buyers who have already messaged them about their listings (hasExistingConversation check)
- Sellers can also message bidders who have bid on their listings
- No direct messaging without listing context
- Messages are scoped to listing + participants for security

### Market Intelligence
- `GET /api/market-intelligence` - Returns real-time commodity prices and agricultural news
- Public endpoint (no auth required)
- Auto-refreshes every 5 minutes on dashboard

## Recent Changes (January 2026)
- Completed full database and API integration with Replit Auth
- Migrated to UUID-based user IDs for Replit Auth compatibility
- Added transactional bid acceptance with race condition protection
- Implemented role-based order status transitions
- Added comprehensive authorization checks on all routes
- Removed unsafe general message endpoints, keeping only listing-scoped messaging
- Added real-time Market Intelligence Feed with commodity prices and agricultural news
- Implemented "Chat with Seller" flow allowing buyers to message sellers directly from marketplace
- Updated messaging authorization to allow buyers to initiate chats before placing bids
- Added defensive rendering for message content to handle edge cases
- Fixed seller reply authorization: sellers can now respond to buyers who messaged first (hasExistingConversation check)
- Fixed listingId extraction in conversations: now properly extracts from lastMessage.listingId
- Enhanced send button with proper disabled states, loading spinner, and data-testid for testing
- Dashboard stats now show dynamic values based on actual user data:
  - Farmers: Projected Revenue (sum of pending bids), Active Listings, Total Orders
  - Buyers: Projected Spending (sum of pending bids), Active Bids, Won Auctions
- Added `GET /api/dashboard/stats` endpoint with role-specific aggregated statistics
- Added Admin Dashboard with platform analytics and user management:
  - Admin access controlled via `isAdmin` and `isSuspended` fields on users table
  - Admin-only API routes: `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/verify`, `PATCH /api/admin/users/:id/suspend`, `PATCH /api/admin/users/:id/admin`
  - Admin page at `/admin` shows platform stats (users, listings, orders, bids) and user management table
  - Admin button appears in header for users with isAdmin="true"
  - Features: verify/unverify users, suspend/unsuspend users, grant/revoke admin access
- Extended Admin Dashboard with comprehensive moderation features:
  - Tabbed navigation: Overview, Users, Listings, Orders, Support, Announcements
  - Extended stats: pendingListings, totalRevenue, openTickets added to admin stats
  - User Activity view: `GET /api/admin/users/:id/activity` returns listings, orders, bids for a user
  - Listing moderation: Filter by verification status (pending/approved/rejected/flagged), approve/reject/flag with notes
  - Listing Stats: `GET /api/admin/listings/stats` shows popular crops and price ranges
  - Order Oversight: Filter orders by status (accepted/packing/transit/delivered)
  - Support Tickets: Create, view, update status (open/in_progress/resolved/closed), priority levels
  - Announcements: Create/delete system announcements with audience targeting (all/farmers/buyers)
- Implemented listing verification workflow:
  - Public marketplace only shows listings with verificationStatus="approved"
  - Farmers see their listings categorized in 3 sections: Pending Verification, Rejected, Approved & Live
  - Listings include verificationStatus and verificationNotes fields for farmer feedback
  - Translations added for verification-related text in all 4 languages
- Added support ticket chat functionality:
  - Users can click on support tickets to open chat dialog with message history
  - Users can send messages and receive admin replies in real-time
  - Admin support tab includes "Chat" button for each ticket to open conversation
  - Messages labeled by sender role (user/admin, Support Team/You)
  - Auto-scroll to newest messages implemented
  - Server-side authorization enforces ticket access (owner or admin only)
- Fixed bidding system to use real API data:
  - Integrated `useListingBids` hook to fetch bids from database when modals open
  - Added `convertToUIBid` function to format database bids for UI display
  - Buyer bid modal now shows real-time bid data with loading state
  - Farmer review bids modal shows actual bids from database with accept/reject functionality
  - Added defensive checks for API response normalization (Array.isArray guards)
- Redesigned buyer bid modal with two-column layout:
  - Left side: "Latest Bids" list showing all bids sorted by amount (highest first)
  - Each bid displays bidder name, relative time, and amount with ₹ symbol
  - Right side: "Place Your Bid" section with input field and quick increment buttons (+10, +20, +50)
  - "Post Bid" button with minimum bid requirement displayed
- Added "Chat with Seller" button to Order Management for buyers:
  - Button appears on each order card for buyers only
  - Clicking opens Messages tab with seller context pre-filled
  - Enables communication between buyers and sellers after bid confirmation