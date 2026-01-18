import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for Replit OIDC identities
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // For local auth - stores hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Marketplace-specific fields
  role: varchar("role"), // 'farmer' or 'buyer'
  phone: varchar("phone"),
  location: varchar("location"),
  bio: varchar("bio"),
  farmName: varchar("farm_name"),
  farmSize: varchar("farm_size"),
  isVerified: varchar("is_verified"),
  language: varchar("language").default("english"),
  // Admin and moderation fields
  isAdmin: varchar("is_admin").default("false"), // 'true' or 'false'
  isSuspended: varchar("is_suspended").default("false"), // 'true' or 'false'
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
