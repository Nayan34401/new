import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Users, ShieldCheck, Package, ShoppingCart, Gavel, 
  UserCheck, UserX, Shield, ChevronLeft, Search, 
  BadgeCheck, Ban, RefreshCw, Loader2, ClipboardList,
  MessageSquare, Megaphone, TrendingUp, IndianRupee,
  Eye, Check, X, AlertTriangle, Plus, Clock, Send, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminStats {
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

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  phone: string | null;
  location: string | null;
  farmName: string | null;
  isVerified: string | null;
  isAdmin: string | null;
  isSuspended: string | null;
  createdAt: string;
}

interface Listing {
  id: number;
  sellerId: string;
  crop: string;
  quantity: string;
  unit: string;
  price: string;
  location: string;
  status: string;
  verificationStatus: string | null;
  verificationNotes: string | null;
  createdAt: string;
}

interface Order {
  id: number;
  listingId: number;
  sellerId: string;
  buyerId: string;
  crop: string;
  quantity: string;
  unit: string;
  totalPrice: string;
  status: string;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  userId: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface SupportMessage {
  id: number;
  ticketId: number;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  targetAudience: string;
  isActive: string;
  createdAt: string;
}

interface Bid {
  id: number;
  listingId: number;
  bidderId: string;
  amount: string;
  status: string;
  createdAt: string;
}

interface UserActivity {
  listingsCount: number;
  ordersCount: number;
  bidsCount: number;
  listings: Listing[];
  orders: Order[];
  bids: Bid[];
}

interface ListingStats {
  popularCrops: { crop: string; count: number }[];
  priceRanges: { crop: string; avgPrice: number; minPrice: number; maxPrice: number }[];
}

interface CurrentUser {
  id: string;
  email: string | null;
  isAdmin: string | null;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "info", targetAudience: "all" });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [listingFilter, setListingFilter] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: userLoading } = useQuery<CurrentUser>({
    queryKey: ["/api/auth/user"],
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: pendingListings } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings/pending"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: allListings } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: allOrders } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: supportTickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support/tickets"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: ticketMessages, isLoading: messagesLoading } = useQuery<{ ticket: SupportTicket; messages: SupportMessage[] }>({
    queryKey: ["/api/support/tickets", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return { ticket: selectedTicket, messages: [] };
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!selectedTicket,
  });

  const sendAdminReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedTicket) throw new Error("No ticket selected");
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicket?.id] });
      setTicketReply("");
    },
    onError: () => {
      toast({ title: "Failed to send reply", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages?.messages]);

  const { data: adminAnnouncements } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: listingStats } = useQuery<ListingStats>({
    queryKey: ["/api/admin/listings/stats"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity>({
    queryKey: ["/api/admin/users", selectedUserId, "activity"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUserId}/activity`);
      if (!res.ok) throw new Error("Failed to fetch user activity");
      return res.json();
    },
    enabled: !!selectedUserId && currentUser?.isAdmin === "true",
  });

  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified }),
      });
      if (!res.ok) throw new Error("Failed to update verification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User verification updated" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, isSuspended }: { userId: string; isSuspended: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended }),
      });
      if (!res.ok) throw new Error("Failed to update suspension");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User suspension updated" });
    },
  });

  const verifyListingMutation = useMutation({
    mutationFn: async ({ listingId, status, notes }: { listingId: number; status: string; notes?: string }) => {
      const res = await fetch(`/api/admin/listings/${listingId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedListing(null);
      setVerificationNotes("");
      toast({ title: "Listing verification updated" });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type: string; targetAudience: string }) => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setShowAnnouncementDialog(false);
      setNewAnnouncement({ title: "", content: "", type: "info", targetAudience: "all" });
      toast({ title: "Announcement created" });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number; status: string }) => {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Ticket updated" });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast({ title: "Announcement deleted" });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser || currentUser.isAdmin !== "true") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
        <Button onClick={() => setLocation("/")} data-testid="back-home-btn">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  const filteredUsers = users?.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.farmName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Farmers", value: stats?.totalFarmers || 0, icon: UserCheck, color: "bg-green-100 text-green-600" },
    { label: "Buyers", value: stats?.totalBuyers || 0, icon: ShoppingCart, color: "bg-purple-100 text-purple-600" },
    { label: "Pending Listings", value: stats?.pendingListings || 0, icon: Clock, color: "bg-yellow-100 text-yellow-600" },
    { label: "Total Listings", value: stats?.totalListings || 0, icon: Package, color: "bg-orange-100 text-orange-600" },
    { label: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart, color: "bg-cyan-100 text-cyan-600" },
    { label: "Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: IndianRupee, color: "bg-emerald-100 text-emerald-600", isFormatted: true },
    { label: "Open Tickets", value: stats?.openTickets || 0, icon: MessageSquare, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-4 px-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={() => setLocation("/")}
              data-testid="back-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10"
            onClick={() => refetchStats()}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="listings" data-testid="tab-listings">
              Listings {(stats?.pendingListings || 0) > 0 && <Badge variant="destructive" className="ml-1">{stats?.pendingListings}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="support" data-testid="tab-support">
              Support {(stats?.openTickets || 0) > 0 && <Badge variant="destructive" className="ml-1">{stats?.openTickets}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`${stat.color} border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className="w-5 h-5" />
                          <span className="text-xs font-semibold uppercase">{stat.label}</span>
                        </div>
                        <p className="text-3xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          {statsLoading ? "..." : (stat as any).isFormatted ? stat.value : stat.value}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {listingStats && (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Popular Crops
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {listingStats.popularCrops.length > 0 ? (
                        <div className="space-y-3">
                          {listingStats.popularCrops.slice(0, 5).map((crop, i) => (
                            <div key={crop.crop} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                                <span className="font-medium">{crop.crop}</span>
                              </div>
                              <Badge variant="secondary">{crop.count} listings</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No active listings</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5" />
                        Price Ranges
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {listingStats.priceRanges.length > 0 ? (
                        <div className="space-y-3">
                          {listingStats.priceRanges.slice(0, 5).map((p) => (
                            <div key={p.crop} className="flex items-center justify-between">
                              <span className="font-medium">{p.crop}</span>
                              <div className="text-sm text-muted-foreground">
                                ₹{p.minPrice.toFixed(0)} - ₹{p.maxPrice.toFixed(0)} (avg: ₹{p.avgPrice.toFixed(0)})
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No price data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="search-users-input"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {user.firstName || user.lastName 
                                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim() 
                                  : "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === "farmer" ? "default" : "secondary"}>
                              {user.role || "No role"}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.location || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.isVerified === "true" && (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <BadgeCheck className="w-3 h-3 mr-1" /> Verified
                                </Badge>
                              )}
                              {user.isSuspended === "true" && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <Ban className="w-3 h-3 mr-1" /> Suspended
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserId(user.id)}
                                data-testid={`view-activity-btn-${user.id}`}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verifyUserMutation.mutate({ userId: user.id, isVerified: user.isVerified !== "true" })}
                                data-testid={`verify-btn-${user.id}`}
                              >
                                {user.isVerified === "true" ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              </Button>
                              <Button
                                variant={user.isSuspended === "true" ? "outline" : "destructive"}
                                size="sm"
                                onClick={() => suspendMutation.mutate({ userId: user.id, isSuspended: user.isSuspended !== "true" })}
                                disabled={user.id === currentUser.id}
                                data-testid={`suspend-btn-${user.id}`}
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Listing Moderation</CardTitle>
                <Select value={listingFilter} onValueChange={setListingFilter}>
                  <SelectTrigger className="w-40" data-testid="listing-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Listings</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allListings
                      ?.filter(listing => listingFilter === "all" || (listing.verificationStatus || "pending") === listingFilter)
                      .map((listing) => (
                      <TableRow key={listing.id} data-testid={`listing-row-${listing.id}`}>
                        <TableCell className="font-medium">{listing.crop}</TableCell>
                        <TableCell>{listing.sellerId.slice(0, 8)}...</TableCell>
                        <TableCell>₹{listing.price}/{listing.unit}</TableCell>
                        <TableCell>
                          <Badge variant={listing.status === "active" ? "default" : "secondary"}>{listing.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            listing.verificationStatus === "approved" ? "default" :
                            listing.verificationStatus === "rejected" ? "destructive" :
                            listing.verificationStatus === "flagged" ? "outline" : "secondary"
                          }>
                            {listing.verificationStatus || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedListing(listing)}
                              data-testid={`review-listing-${listing.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Review
                            </Button>
                            {listing.verificationStatus !== "approved" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => verifyListingMutation.mutate({ listingId: listing.id, status: "approved" })}
                                data-testid={`approve-listing-${listing.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            {listing.verificationStatus !== "rejected" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verifyListingMutation.mutate({ listingId: listing.id, status: "rejected" })}
                                data-testid={`reject-listing-${listing.id}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                            {listing.verificationStatus !== "flagged" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => verifyListingMutation.mutate({ listingId: listing.id, status: "flagged" })}
                                data-testid={`flag-listing-${listing.id}`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Order Oversight</CardTitle>
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-40" data-testid="order-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="packing">Packing</SelectItem>
                    <SelectItem value="transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Crop</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrders
                      ?.filter(order => orderFilter === "all" || order.status === orderFilter)
                      .map((order) => (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.crop} ({order.quantity} {order.unit})</TableCell>
                        <TableCell>₹{order.totalPrice}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === "delivered" ? "default" :
                            order.status === "transit" ? "secondary" : "outline"
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!allOrders || allOrders.length === 0 || (orderFilter !== "all" && allOrders.filter(o => o.status === orderFilter).length === 0)) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Support Center</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supportTickets?.map((ticket) => (
                      <TableRow key={ticket.id} data-testid={`ticket-row-${ticket.id}`}>
                        <TableCell className="font-medium">#{ticket.id}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            ticket.priority === "urgent" ? "destructive" :
                            ticket.priority === "high" ? "default" : "secondary"
                          }>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            ticket.status === "resolved" ? "default" :
                            ticket.status === "in_progress" ? "secondary" : "outline"
                          }>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                              data-testid={`chat-ticket-${ticket.id}`}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Chat
                            </Button>
                            {ticket.status === "open" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateTicketMutation.mutate({ ticketId: ticket.id, status: "in_progress" })}
                              >
                                Accept
                              </Button>
                            )}
                            {ticket.status === "in_progress" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateTicketMutation.mutate({ ticketId: ticket.id, status: "resolved" })}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!supportTickets || supportTickets.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No support tickets</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>System Announcements</CardTitle>
                <Button onClick={() => setShowAnnouncementDialog(true)} data-testid="create-announcement-btn">
                  <Plus className="w-4 h-4 mr-2" /> New Announcement
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminAnnouncements?.map((ann) => (
                    <Card key={ann.id} className={ann.isActive === "true" ? "border-primary" : "opacity-50"}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={ann.type === "warning" ? "destructive" : ann.type === "success" ? "default" : "secondary"}>
                                {ann.type}
                              </Badge>
                              <Badge variant="outline">{ann.targetAudience}</Badge>
                              {ann.isActive !== "true" && (
                                <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold">{ann.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{ann.content}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className="text-xs text-muted-foreground">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                              data-testid={`delete-announcement-${ann.id}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!adminAnnouncements || adminAnnouncements.length === 0) && (
                    <p className="text-center py-8 text-muted-foreground">No announcements yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Listing</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Crop:</span> <strong>{selectedListing.crop}</strong></div>
                <div><span className="text-sm text-muted-foreground">Price:</span> <strong>₹{selectedListing.price}/{selectedListing.unit}</strong></div>
                <div><span className="text-sm text-muted-foreground">Quantity:</span> <strong>{selectedListing.quantity} {selectedListing.unit}</strong></div>
                <div><span className="text-sm text-muted-foreground">Location:</span> <strong>{selectedListing.location}</strong></div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Verification Notes</label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add notes for the farmer..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => {
              if (selectedListing) verifyListingMutation.mutate({ listingId: selectedListing.id, status: "rejected", notes: verificationNotes });
            }}>
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button variant="default" onClick={() => {
              if (selectedListing) verifyListingMutation.mutate({ listingId: selectedListing.id, status: "approved", notes: verificationNotes });
            }}>
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
            />
            <Textarea
              placeholder="Content"
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={newAnnouncement.type} onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, type: v })}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newAnnouncement.targetAudience} onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, targetAudience: v })}>
                <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="farmers">Farmers Only</SelectItem>
                  <SelectItem value="buyers">Buyers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Activity</DialogTitle>
          </DialogHeader>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : userActivity ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{userActivity.listingsCount}</p>
                    <p className="text-sm text-muted-foreground">Listings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{userActivity.ordersCount}</p>
                    <p className="text-sm text-muted-foreground">Orders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{userActivity.bidsCount}</p>
                    <p className="text-sm text-muted-foreground">Bids</p>
                  </CardContent>
                </Card>
              </div>

              {userActivity.listings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Listings</h3>
                  <div className="space-y-2">
                    {userActivity.listings.slice(0, 5).map(listing => (
                      <div key={listing.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{listing.crop}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">₹{listing.price}/{listing.unit}</span>
                          <Badge variant={listing.status === "active" ? "default" : "secondary"}>{listing.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userActivity.orders.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Orders</h3>
                  <div className="space-y-2">
                    {userActivity.orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>Order #{order.id}: {order.crop}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">₹{order.totalPrice}</span>
                          <Badge variant={order.status === "delivered" ? "default" : "secondary"}>{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userActivity.bids.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Bids</h3>
                  <div className="space-y-2">
                    {userActivity.bids.slice(0, 5).map(bid => (
                      <div key={bid.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>Bid #{bid.id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">₹{bid.amount}</span>
                          <Badge variant={bid.status === "accepted" ? "default" : bid.status === "rejected" ? "destructive" : "secondary"}>{bid.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userActivity.listingsCount === 0 && userActivity.ordersCount === 0 && userActivity.bidsCount === 0 && (
                <p className="text-center text-muted-foreground py-4">No activity found for this user</p>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Failed to load user activity</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket Chat Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  {selectedTicket?.subject}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{selectedTicket?.category}</Badge>
                  <Badge variant={
                    selectedTicket?.priority === "urgent" ? "destructive" :
                    selectedTicket?.priority === "high" ? "default" : "secondary"
                  }>
                    {selectedTicket?.priority}
                  </Badge>
                  <Badge variant={
                    selectedTicket?.status === "resolved" ? "default" :
                    selectedTicket?.status === "in_progress" ? "secondary" : "outline"
                  }>
                    {selectedTicket?.status}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Original Description */}
            <Card className="mb-3 bg-muted/50 flex-shrink-0">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">User Request:</p>
                <p className="text-sm">{selectedTicket?.description}</p>
                <p className="text-xs text-muted-foreground mt-2">User ID: {selectedTicket?.userId}</p>
              </CardContent>
            </Card>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : ticketMessages?.messages && ticketMessages.messages.length > 0 ? (
                ticketMessages.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-3 ${
                      msg.senderRole === "admin" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      <p className="text-xs font-semibold mb-1">
                        {msg.senderRole === "admin" ? "You (Admin)" : "User"}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedTicket?.status !== "closed" && (
              <div className="flex gap-2 mt-3 pt-3 border-t flex-shrink-0">
                <Input
                  value={ticketReply}
                  onChange={(e) => setTicketReply(e.target.value)}
                  placeholder="Type your reply to the user..."
                  className="flex-1"
                  data-testid="input-admin-ticket-reply"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && ticketReply.trim()) {
                      e.preventDefault();
                      sendAdminReplyMutation.mutate(ticketReply);
                    }
                  }}
                />
                <Button 
                  onClick={() => sendAdminReplyMutation.mutate(ticketReply)}
                  disabled={!ticketReply.trim() || sendAdminReplyMutation.isPending}
                  data-testid="send-admin-reply-btn"
                >
                  {sendAdminReplyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
