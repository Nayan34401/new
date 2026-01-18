import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gavel, Edit2, Trash2, Eye, Package, MapPin, Scale, IndianRupee, X, GitCompare, Activity, MessageCircle, TrendingUp, AlertCircle, Check, XCircle, Star, ShieldCheck, Send, Navigation, SlidersHorizontal, Filter, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { UserRole } from "@/pages/home";
import { useToast } from "@/hooks/use-toast";
import { useListings, useMyListings, useCreateListing, usePlaceBid, useUpdateBid, useWithdrawListing, useDeleteListing, useUpdateListing, useListingBids } from "@/hooks/use-marketplace";
import { useAuth } from "@/hooks/use-auth";
import type { Listing as DBListing, Bid as DBBid } from "@shared/schema";

interface CropActivity {
  date: string;
  action: string;
  details: string;
}

interface Review {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

interface ChatMessage {
  id: string;
  sender: "buyer" | "seller";
  message: string;
  time: string;
}

interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  crop: string;
  quantity: string;
  unit: string;
  price: string;
  location: string;
  seller: string;
  image: string;
  bids: Bid[];
  cropActivity: CropActivity[];
  status: "active" | "withdrawn";
  isVerified: boolean;
  verificationStatus: string;
  verificationNotes?: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  distance: number;
  lat: number;
  lng: number;
  chatMessages: ChatMessage[];
}

interface Bid {
  id: string;
  bidder: string;
  amount: string;
  time: string;
  status: "pending" | "accepted" | "rejected";
}

const mockListings: Listing[] = [
  {
    id: "1",
    sellerId: "mock-seller-1",
    sellerName: "Ramesh Farms",
    crop: "Organic Tomatoes",
    quantity: "500",
    unit: "kg",
    price: "45",
    location: "Nashik, Maharashtra",
    seller: "Ramesh Farms",
    image: "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=200&h=200&fit=crop",
    bids: [
      { id: "b1", bidder: "Fresh Mart", amount: "48", time: "2 min ago", status: "pending" },
      { id: "b2", bidder: "Veggie Co", amount: "46", time: "15 min ago", status: "pending" },
    ],
    cropActivity: [
      { date: "Jan 5, 2026", action: "Harvested", details: "Fresh harvest from organic farm" },
      { date: "Dec 28, 2025", action: "Pesticide Free", details: "No pesticides used in last 30 days" },
      { date: "Dec 15, 2025", action: "Watering", details: "Drip irrigation applied" },
      { date: "Nov 20, 2025", action: "Planted", details: "Organic seeds from certified supplier" },
    ],
    status: "active",
    isVerified: true,
    verificationStatus: "approved",
    rating: 4.8,
    reviewCount: 23,
    reviews: [
      { id: "r1", reviewer: "Fresh Mart", rating: 5, comment: "Excellent quality tomatoes, delivered on time!", date: "Jan 3, 2026" },
      { id: "r2", reviewer: "Veggie Express", rating: 4, comment: "Good produce, slightly smaller than expected.", date: "Dec 28, 2025" },
    ],
    distance: 25,
    lat: 19.9975,
    lng: 73.7898,
    chatMessages: [
      { id: "c1", sender: "buyer", message: "Hi, are these tomatoes organic certified?", time: "10:30 AM" },
      { id: "c2", sender: "seller", message: "Yes, we have NPOP organic certification. I can share the certificate.", time: "10:32 AM" },
      { id: "c3", sender: "buyer", message: "Great! What's your best price for bulk order?", time: "10:35 AM" },
    ],
  },
  {
    id: "2",
    sellerId: "mock-seller-2",
    sellerName: "Punjab Agro",
    crop: "Basmati Rice",
    quantity: "2000",
    unit: "kg",
    price: "85",
    location: "Karnal, Haryana",
    seller: "Punjab Agro",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop",
    bids: [
      { id: "b3", bidder: "Rice World", amount: "88", time: "1 hour ago", status: "pending" },
    ],
    cropActivity: [
      { date: "Jan 3, 2026", action: "Processed", details: "Cleaned and packaged" },
      { date: "Dec 20, 2025", action: "Harvested", details: "Premium grade basmati" },
      { date: "Aug 15, 2025", action: "Planted", details: "Traditional basmati variety" },
    ],
    status: "active",
    isVerified: true,
    verificationStatus: "approved",
    rating: 4.5,
    reviewCount: 45,
    reviews: [
      { id: "r3", reviewer: "Rice World", rating: 5, comment: "Premium quality basmati, very aromatic!", date: "Dec 15, 2025" },
    ],
    distance: 85,
    lat: 29.6857,
    lng: 76.9905,
    chatMessages: [],
  },
  {
    id: "3",
    sellerId: "mock-seller-3",
    sellerName: "Konkan Farms",
    crop: "Fresh Mangoes",
    quantity: "1000",
    unit: "kg",
    price: "120",
    location: "Ratnagiri, Maharashtra",
    seller: "Konkan Farms",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&h=200&fit=crop",
    bids: [],
    cropActivity: [
      { date: "Jan 8, 2026", action: "Harvested", details: "Alphonso variety, naturally ripened" },
      { date: "Dec 25, 2025", action: "Quality Check", details: "No spots or blemishes" },
      { date: "Mar 15, 2025", action: "Flowering", details: "Healthy mango blossoms" },
    ],
    status: "active",
    isVerified: false,
    verificationStatus: "pending",
    rating: 4.2,
    reviewCount: 12,
    reviews: [
      { id: "r4", reviewer: "Fruit Bazaar", rating: 4, comment: "Sweet mangoes but delivery was delayed.", date: "Apr 20, 2025" },
    ],
    distance: 45,
    lat: 16.9902,
    lng: 73.3120,
    chatMessages: [],
  },
];

interface MarketplaceProps {
  userRole: UserRole;
}

export function Marketplace({ userRole }: MarketplaceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: apiListings, isLoading: listingsLoading } = userRole === "farmer" ? useMyListings() : useListings();
  const createListingMutation = useCreateListing();
  const placeBidMutation = usePlaceBid();
  const updateBidMutation = useUpdateBid();
  const withdrawListingMutation = useWithdrawListing();
  const deleteListingMutation = useDeleteListing();
  const updateListingMutation = useUpdateListing();
  
  const convertToUIListing = (dbListing: DBListing): Listing => {
    const sellerName = dbListing.sellerId === user?.id ? "Your Farm" : `Seller ${dbListing.sellerId.slice(0, 8)}`;
    return {
      id: String(dbListing.id),
      sellerId: dbListing.sellerId,
      sellerName: sellerName,
      crop: dbListing.crop,
      quantity: dbListing.quantity,
      unit: dbListing.unit,
      price: String(dbListing.price),
      location: dbListing.location,
      seller: sellerName,
      image: dbListing.image || "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop",
      bids: [],
      cropActivity: [],
      status: (dbListing.status as "active" | "withdrawn") || "active",
      isVerified: dbListing.verificationStatus === "approved",
      verificationStatus: dbListing.verificationStatus || "pending",
      verificationNotes: dbListing.verificationNotes || undefined,
      rating: 0,
      reviewCount: 0,
      reviews: [],
      distance: 0,
      lat: Number(dbListing.lat) || 19.0760,
      lng: Number(dbListing.lng) || 72.8777,
      chatMessages: [],
    };
  };
  
  const listings: Listing[] = (apiListings || []).map(convertToUIListing);
  
  const [showNewListing, setShowNewListing] = useState(false);
  const [bidModal, setBidModal] = useState<Listing | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [compareModal, setCompareModal] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [activityModal, setActivityModal] = useState<Listing | null>(null);
  const [chatModal, setChatModal] = useState<Listing | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [editPriceModal, setEditPriceModal] = useState<Listing | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [reviewBidsModal, setReviewBidsModal] = useState<Listing | null>(null);
  const [bidError, setBidError] = useState("");
  const [reviewsModal, setReviewsModal] = useState<Listing | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  // Fetch real bids for the currently open modal (buyer bid modal or farmer review modal)
  const currentListingId = bidModal?.id || reviewBidsModal?.id;
  const { data: apiBids, isLoading: bidsLoading } = useListingBids(currentListingId ? Number(currentListingId) : undefined);
  
  // Convert DB bids to UI bids
  const convertToUIBid = (dbBid: DBBid): Bid => {
    let timeStr = "just now";
    if (dbBid.createdAt) {
      const timeDiff = Date.now() - new Date(dbBid.createdAt).getTime();
      const minutes = Math.floor(timeDiff / 60000);
      const hours = Math.floor(timeDiff / 3600000);
      const days = Math.floor(timeDiff / 86400000);
      
      if (days > 0) timeStr = `${days} day${days > 1 ? "s" : ""} ago`;
      else if (hours > 0) timeStr = `${hours} hour${hours > 1 ? "s" : ""} ago`;
      else if (minutes > 0) timeStr = `${minutes} min ago`;
    }
    
    return {
      id: String(dbBid.id),
      bidder: `Buyer ${dbBid.bidderId.slice(0, 8)}`,
      amount: dbBid.amount,
      time: timeStr,
      status: dbBid.status as "pending" | "accepted" | "rejected",
    };
  };
  
  // Get bids for the current modal from API (with defensive check)
  const normalizedApiBids = Array.isArray(apiBids) ? apiBids : [];
  const modalBids: Bid[] = normalizedApiBids.map(convertToUIBid);
  
  const [radiusFilter, setRadiusFilter] = useState(100);
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [newListing, setNewListing] = useState({
    crop: "",
    quantity: "",
    unit: "kg",
    price: "",
    location: "",
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatModal?.chatMessages]);

  const handleGetLocation = () => {
    setLocationStatus("loading");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationStatus("success");
        },
        () => {
          setUserLocation({ lat: 19.0760, lng: 72.8777 });
          setLocationStatus("success");
        }
      );
    } else {
      setUserLocation({ lat: 19.0760, lng: 72.8777 });
      setLocationStatus("success");
    }
  };

  const filteredListings = listings.filter(l => {
    if (l.status === "withdrawn" && userRole === "buyer") return false;
    if (verifiedOnly && !l.isVerified) return false;
    if (userLocation && l.distance > radiusFilter) return false;
    return true;
  });

  const handleCreateListing = async () => {
    if (!newListing.crop || !newListing.quantity || !newListing.price) return;
    
    try {
      await createListingMutation.mutateAsync({
        crop: newListing.crop,
        quantity: newListing.quantity,
        unit: newListing.unit,
        price: newListing.price,
        location: newListing.location || "Unknown",
        image: null,
        lat: null,
        lng: null,
        status: "active",
      });
      
      toast({
        title: "Listing Created",
        description: "Your crop listing has been published to the marketplace.",
      });
      
      setNewListing({ crop: "", quantity: "", unit: "kg", price: "", location: "" });
      setShowNewListing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTopBid = (bids: Bid[]) => {
    if (!Array.isArray(bids) || bids.length === 0) return null;
    return bids.reduce((max, bid) => 
      parseInt(bid.amount) > parseInt(max.amount) ? bid : max
    , bids[0]);
  };

  const handlePlaceBid = async () => {
    if (!bidModal || !bidAmount) return;
    
    const topBid = getTopBid(modalBids);
    const minRequired = topBid ? parseInt(topBid.amount) + 1 : parseInt(bidModal.price) + 1;
    
    if (parseInt(bidAmount) < minRequired) {
      setBidError(`Bid must be at least ₹${minRequired} (higher than ${topBid ? 'current top bid' : 'base price'})`);
      return;
    }
    
    try {
      await placeBidMutation.mutateAsync({
        listingId: parseInt(bidModal.id),
        amount: bidAmount,
      });
      
      toast({
        title: "Bid Placed",
        description: `Your bid of ₹${bidAmount} has been submitted.`,
      });
      
      setBidAmount("");
      setBidError("");
      setBidModal(null);
    } catch (error: any) {
      setBidError(error.message || "Failed to place bid");
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteListingMutation.mutateAsync(parseInt(id));
      toast({
        title: "Listing Deleted",
        description: "Your listing has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete listing.",
        variant: "destructive",
      });
    }
  };

  const [withdrawModal, setWithdrawModal] = useState<Listing | null>(null);
  const [upiId, setUpiId] = useState("");

  const handleWithdrawListing = async () => {
    if (!withdrawModal || !upiId.trim()) return;
    
    try {
      await withdrawListingMutation.mutateAsync(parseInt(withdrawModal.id));
      toast({
        title: "Listing Withdrawn",
        description: `Payment will be sent to UPI: ${upiId}`,
      });
      setUpiId("");
      setWithdrawModal(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to withdraw listing.",
        variant: "destructive",
      });
    }
  };

  const handleEditPrice = async () => {
    if (!editPriceModal || !newPrice) return;
    
    try {
      await updateListingMutation.mutateAsync({
        id: parseInt(editPriceModal.id),
        price: newPrice,
      });
      toast({
        title: "Price Updated",
        description: `New price: ₹${newPrice}`,
      });
      setNewPrice("");
      setEditPriceModal(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update price.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptBid = async (listingId: string, bidId: string) => {
    try {
      await updateBidMutation.mutateAsync({
        bidId: parseInt(bidId),
        status: "accepted",
      });
      
      setReviewBidsModal(null);
      toast({
        title: "Bid Accepted",
        description: "Order created! Check the Orders section.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept bid.",
        variant: "destructive",
      });
    }
  };

  const handleRejectBid = async (listingId: string, bidId: string) => {
    try {
      await updateBidMutation.mutateAsync({
        bidId: parseInt(bidId),
        status: "rejected",
      });
      toast({
        title: "Bid Rejected",
        description: "The bid has been declined.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject bid.",
        variant: "destructive",
      });
    }
  };

  const toggleCompareSelection = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(i => i !== id));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const getCompareListings = () => {
    return listings.filter(l => selectedForCompare.includes(l.id));
  };

  const handleSendChatMessage = () => {
    if (!chatModal || !chatMessage.trim()) return;
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: userRole === "buyer" ? "buyer" : "seller",
      message: chatMessage,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    
    setChatModal(prev => prev ? { ...prev, chatMessages: [...prev.chatMessages, newMsg] } : null);
    setChatMessage("");
    
    toast({
      title: "Message Sent",
      description: "Your message has been delivered.",
    });
  };

  const handleSubmitReview = () => {
    if (!reviewsModal || !newReview.comment.trim()) return;
    
    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback!",
    });
    
    setNewReview({ rating: 5, comment: "" });
    setReviewsModal(null);
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const starSize = size === "sm" ? "w-3 h-3" : "w-5 h-5";
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`${starSize} ${star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} 
          />
        ))}
      </div>
    );
  };

  const activeListings = userRole === "farmer" ? listings : filteredListings;
  
  // Separate listings by verification status for farmers - use verificationStatus directly from converted listings
  const pendingVerificationListings = userRole === "farmer" 
    ? listings.filter(l => l.verificationStatus === "pending")
    : [];
  const rejectedListings = userRole === "farmer"
    ? listings.filter(l => l.verificationStatus === "rejected" || l.verificationStatus === "flagged")
    : [];
  const approvedListings = userRole === "farmer"
    ? listings.filter(l => l.verificationStatus === "approved")
    : filteredListings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">
          {userRole === "farmer" ? t("My Listings") : t("Browse Marketplace")}
        </h1>
        <div className="flex gap-3 flex-wrap">
          {userRole === "buyer" && (
            <>
              <Button 
                data-testid="button-filters"
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="rounded-xl"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                {t("Filters")}
              </Button>
              <Button 
                data-testid="button-compare-listings"
                onClick={() => setCompareModal(true)}
                variant="outline"
                className="rounded-xl border-primary text-primary hover:bg-primary hover:text-white"
              >
                <GitCompare className="w-5 h-5 mr-2" />
                {t("Compare")} ({selectedForCompare.length})
              </Button>
            </>
          )}
          {userRole === "farmer" && (
            <Button 
              data-testid="button-new-listing"
              onClick={() => setShowNewListing(true)}
              className="rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t("New Listing")}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && userRole === "buyer" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-primary/20 bg-primary/5 rounded-2xl">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Location & Distance
                    </Label>
                    {!userLocation ? (
                      <Button 
                        onClick={handleGetLocation}
                        variant="outline"
                        className="w-full rounded-xl"
                        disabled={locationStatus === "loading"}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {locationStatus === "loading" ? "Getting location..." : "Enable Location"}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Within {radiusFilter} km</span>
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Location enabled
                          </Badge>
                        </div>
                        <Slider
                          value={[radiusFilter]}
                          onValueChange={(v) => setRadiusFilter(v[0])}
                          min={10}
                          max={200}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10 km</span>
                          <span>200 km</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verification
                    </Label>
                    <div 
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        verifiedOnly 
                          ? "bg-green-50 border-green-500 text-green-700" 
                          : "bg-card border-border hover:border-green-300"
                      }`}
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          verifiedOnly ? "bg-green-500 border-green-500" : "border-muted-foreground/30"
                        }`}>
                          {verifiedOnly && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Verified Farmers Only</p>
                          <p className="text-xs text-muted-foreground">Show only verified sellers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Active Filters
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {userLocation && (
                        <Badge className="bg-blue-100 text-blue-700 py-1 px-3">
                          <MapPin className="w-3 h-3 mr-1" />
                          {radiusFilter} km radius
                        </Badge>
                      )}
                      {verifiedOnly && (
                        <Badge className="bg-green-100 text-green-700 py-1 px-3">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Verified only
                        </Badge>
                      )}
                      {!userLocation && !verifiedOnly && (
                        <span className="text-sm text-muted-foreground">No filters active</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewListing && userRole === "farmer" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-primary/30 bg-primary/5 rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Create New Listing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Crop Name</Label>
                    <Input
                      data-testid="input-new-crop"
                      placeholder="e.g. Tomatoes"
                      value={newListing.crop}
                      onChange={(e) => setNewListing({ ...newListing, crop: e.target.value })}
                      className="mt-2 rounded-xl border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Quantity</Label>
                    <Input
                      data-testid="input-new-quantity"
                      type="number"
                      placeholder="500"
                      value={newListing.quantity}
                      onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                      className="mt-2 rounded-xl border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Unit</Label>
                    <Select value={newListing.unit} onValueChange={(v) => setNewListing({ ...newListing, unit: v })}>
                      <SelectTrigger data-testid="select-new-unit" className="mt-2 rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="quintal">Quintals</SelectItem>
                        <SelectItem value="ton">Tons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Price (₹/unit)</Label>
                    <Input
                      data-testid="input-new-price"
                      type="number"
                      placeholder="45"
                      value={newListing.price}
                      onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                      className="mt-2 rounded-xl border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Location</Label>
                    <Input
                      data-testid="input-new-location"
                      placeholder="City, State"
                      value={newListing.location}
                      onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                      className="mt-2 rounded-xl border-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewListing(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    data-testid="button-create-listing"
                    onClick={handleCreateListing}
                    className="rounded-xl"
                  >
                    Create Listing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Verification Section for Farmers */}
      {userRole === "farmer" && pendingVerificationListings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-lg text-amber-700">{t("Pending Verification")} ({pendingVerificationListings.length})</h2>
          </div>
          <Card className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700 mb-3">
                {t("These listings are awaiting admin verification before they appear in the marketplace.")}
              </p>
              <div className="space-y-3">
                {pendingVerificationListings.map((listing) => (
                  <div 
                    key={listing.id} 
                    className="flex items-center gap-4 p-3 bg-white rounded-xl border border-amber-200"
                    data-testid={`pending-listing-${listing.id}`}
                  >
                    <img 
                      src={listing.image} 
                      alt={listing.crop}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{listing.crop}</h4>
                      <p className="text-sm text-muted-foreground">
                        {listing.quantity} {listing.unit} · ₹{listing.price}/{listing.unit}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      <Clock className="w-3 h-3 mr-1" />
                      {t("Pending Review")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejected/Flagged Section for Farmers */}
      {userRole === "farmer" && rejectedListings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-lg text-red-700">{t("Rejected Listings")} ({rejectedListings.length})</h2>
          </div>
          <Card className="border-2 border-red-200 bg-red-50/50 rounded-2xl">
            <CardContent className="p-4">
              <p className="text-sm text-red-700 mb-3">
                {t("These listings were not approved. Please review the notes and update your listings.")}
              </p>
              <div className="space-y-3">
                {rejectedListings.map((listing) => (
                  <div 
                    key={listing.id} 
                    className="flex items-center gap-4 p-3 bg-white rounded-xl border border-red-200"
                    data-testid={`rejected-listing-${listing.id}`}
                  >
                    <img 
                      src={listing.image} 
                      alt={listing.crop}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{listing.crop}</h4>
                      <p className="text-sm text-muted-foreground">
                        {listing.quantity} {listing.unit} · ₹{listing.price}/{listing.unit}
                      </p>
                      {listing.verificationNotes && (
                        <p className="text-xs text-red-600 mt-1">
                          <strong>Reason:</strong> {listing.verificationNotes}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {listing.verificationStatus === "flagged" ? t("Flagged") : t("Rejected")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approved/Active Listings Section */}
      {userRole === "farmer" && approvedListings.length > 0 && (
        <div className="flex items-center gap-2 mt-6">
          <Check className="w-5 h-5 text-green-500" />
          <h2 className="font-bold text-lg text-green-700">{t("Approved & Live")} ({approvedListings.length})</h2>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {(userRole === "farmer" ? approvedListings : activeListings).map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card 
                className={`border-2 rounded-2xl hover:shadow-lg transition-all ${
                  listing.status === "withdrawn" ? "opacity-60 bg-muted/30" : ""
                } ${selectedForCompare.includes(listing.id) ? "ring-2 ring-primary" : ""}`}
                data-testid={`listing-${listing.id}`}
              >
                <CardContent className="p-5 flex items-center gap-5">
                  {userRole === "buyer" && (
                    <div 
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                        selectedForCompare.includes(listing.id) 
                          ? "bg-primary border-primary text-white" 
                          : "border-muted-foreground/30 hover:border-primary"
                      }`}
                      onClick={() => toggleCompareSelection(listing.id)}
                      data-testid={`checkbox-compare-${listing.id}`}
                    >
                      {selectedForCompare.includes(listing.id) && <Check className="w-4 h-4" />}
                    </div>
                  )}
                  
                  <img 
                    src={listing.image} 
                    alt={listing.crop}
                    className="w-24 h-24 rounded-xl object-cover bg-accent"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg text-foreground">{listing.crop}</h3>
                      {listing.isVerified && (
                        <Badge className="bg-green-100 text-green-700 border-none">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {listing.status === "withdrawn" && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Withdrawn
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Scale className="w-4 h-4" />
                        {listing.quantity} {listing.unit}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {listing.location}
                        {userLocation && (
                          <span className="text-xs text-blue-600 ml-1">({listing.distance} km)</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <span 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-primary flex items-center gap-1"
                        onClick={() => setReviewsModal(listing)}
                      >
                        by <span className="font-semibold">{listing.seller}</span>
                      </span>
                      <div 
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => setReviewsModal(listing)}
                      >
                        {renderStars(listing.rating)}
                        <span className="text-xs text-muted-foreground ml-1">
                          {listing.rating.toFixed(1)} ({listing.reviewCount})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-black text-primary">
                      <IndianRupee className="w-5 h-5" />
                      {listing.price}
                      <span className="text-sm font-normal text-muted-foreground">/{listing.unit}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {userRole === "buyer" ? (
                      <>
                        <Button 
                          data-testid={`button-bid-${listing.id}`}
                          onClick={() => {
                            setBidModal(listing);
                            setBidError("");
                          }}
                          className="rounded-xl"
                        >
                          <Gavel className="w-4 h-4 mr-2" />
                          Bid
                        </Button>
                        <Button 
                          data-testid={`button-activity-${listing.id}`}
                          onClick={() => setActivityModal(listing)}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          View Activity
                        </Button>
                        <Button 
                          data-testid={`button-chat-${listing.id}`}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('switch-tab', { 
                              detail: {
                                tab: 'messages',
                                chatContext: {
                                  listingId: listing.id,
                                  sellerId: listing.sellerId,
                                  sellerName: listing.sellerName || `Seller`,
                                  cropName: listing.crop,
                                }
                              }
                            }));
                          }}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat with Seller
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          data-testid={`button-review-bids-${listing.id}`}
                          onClick={() => setReviewBidsModal(listing)}
                          className="rounded-xl"
                          disabled={listing.status === "withdrawn"}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review Bids
                        </Button>
                        <Button 
                          data-testid={`button-edit-price-${listing.id}`}
                          onClick={() => {
                            setEditPriceModal(listing);
                            setNewPrice(listing.price);
                          }}
                          variant="outline"
                          className="rounded-xl"
                          disabled={listing.status === "withdrawn"}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Price
                        </Button>
                        <div className="flex gap-2">
                          <Button 
                            data-testid={`button-withdraw-${listing.id}`}
                            variant="outline"
                            onClick={() => setWithdrawModal(listing)}
                            className="rounded-xl flex-1 text-amber-600 hover:bg-amber-50"
                            disabled={listing.status === "withdrawn"}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            data-testid={`button-delete-listing-${listing.id}`}
                            variant="outline"
                            onClick={() => handleDeleteListing(listing.id)}
                            className="rounded-xl flex-1 text-destructive hover:bg-destructive hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {activeListings.length === 0 && (
          <Card className="border-2 rounded-2xl">
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No listings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {verifiedOnly ? "Try removing the 'Verified only' filter" : "Adjust your filters to see more results"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bid Modal for Buyers */}
      <Dialog open={!!bidModal} onOpenChange={() => { setBidModal(null); setBidError(""); }}>
        <DialogContent className="rounded-3xl max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-3">
              <img 
                src={bidModal?.image} 
                alt={bidModal?.crop}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <span>{bidModal?.crop}</span>
                <p className="text-sm font-normal text-muted-foreground">
                  {bidModal?.quantity} {bidModal?.unit} · Base: ₹{bidModal?.price}/{bidModal?.unit}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {bidModal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Latest Bids */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Latest Bids</h3>
                
                {bidsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {!bidsLoading && modalBids.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                    <Gavel className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No bids yet. Be the first!</p>
                  </div>
                )}
                
                {!bidsLoading && modalBids.length > 0 && (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {modalBids
                      .slice()
                      .sort((a, b) => parseInt(b.amount) - parseInt(a.amount))
                      .map((bid, index) => (
                      <div 
                        key={bid.id}
                        className={`flex items-center justify-between py-3 ${index < modalBids.length - 1 ? 'border-b' : ''}`}
                      >
                        <div>
                          <p className="font-semibold text-foreground">{bid.bidder}</p>
                          <p className="text-xs text-muted-foreground">{bid.time}</p>
                        </div>
                        <p className="text-lg font-black text-primary">₹{parseInt(bid.amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right Side - Place Your Bid */}
              <div className="space-y-4 p-4 bg-accent/50 rounded-2xl">
                <h3 className="font-bold text-lg">Place Your Bid</h3>
                
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Your Offer (₹)
                  </Label>
                  <Input
                    data-testid="input-bid-amount"
                    type="number"
                    placeholder={`Min: ₹${getTopBid(modalBids) ? parseInt(getTopBid(modalBids)!.amount) + 1 : parseInt(bidModal.price) + 1}`}
                    value={bidAmount}
                    onChange={(e) => { setBidAmount(e.target.value); setBidError(""); }}
                    className="mt-2 rounded-xl border-2 text-xl font-bold h-14"
                  />
                </div>
                
                {/* Quick Increment Buttons */}
                <div className="flex gap-2">
                  <Button
                    data-testid="button-bid-plus-10"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      const currentBid = parseInt(bidAmount) || (getTopBid(modalBids) ? parseInt(getTopBid(modalBids)!.amount) : parseInt(bidModal.price));
                      setBidAmount(String(currentBid + 10));
                      setBidError("");
                    }}
                  >
                    +10
                  </Button>
                  <Button
                    data-testid="button-bid-plus-20"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      const currentBid = parseInt(bidAmount) || (getTopBid(modalBids) ? parseInt(getTopBid(modalBids)!.amount) : parseInt(bidModal.price));
                      setBidAmount(String(currentBid + 20));
                      setBidError("");
                    }}
                  >
                    +20
                  </Button>
                  <Button
                    data-testid="button-bid-plus-50"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      const currentBid = parseInt(bidAmount) || (getTopBid(modalBids) ? parseInt(getTopBid(modalBids)!.amount) : parseInt(bidModal.price));
                      setBidAmount(String(currentBid + 50));
                      setBidError("");
                    }}
                  >
                    +50
                  </Button>
                </div>
                
                {bidError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {bidError}
                  </p>
                )}
                
                <Button 
                  data-testid="button-submit-bid"
                  onClick={handlePlaceBid}
                  className="w-full rounded-xl h-12 text-lg bg-primary hover:bg-primary/90"
                  disabled={!bidAmount}
                >
                  Post Bid
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Must be higher than {getTopBid(modalBids) ? `₹${parseInt(getTopBid(modalBids)!.amount).toLocaleString()}` : `₹${parseInt(bidModal.price).toLocaleString()}`}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setBidModal(null); setBidError(""); }} className="rounded-xl">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Listings Modal */}
      <Dialog open={compareModal} onOpenChange={setCompareModal}>
        <DialogContent className="rounded-3xl max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <GitCompare className="w-6 h-6" />
              Compare Listings
            </DialogTitle>
          </DialogHeader>
          
          {selectedForCompare.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Select listings from the marketplace to compare them</p>
              <p className="text-sm mt-2">Click the circles next to listings to add them</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getCompareListings().map((listing) => {
                  const totalValue = parseInt(listing.quantity) * parseInt(listing.price);
                  
                  return (
                    <Card key={listing.id} className="border-2 rounded-2xl">
                      <CardContent className="p-4 space-y-3">
                        <img 
                          src={listing.image} 
                          alt={listing.crop}
                          className="w-full h-24 rounded-xl object-cover"
                        />
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-center flex-1">{listing.crop}</h3>
                          {listing.isVerified && (
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {renderStars(listing.rating)}
                          <span className="text-xs text-muted-foreground ml-1">{listing.rating.toFixed(1)}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Price:</span>
                            <span className="font-bold">₹{listing.price}/{listing.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="font-bold">{listing.quantity} {listing.unit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Value:</span>
                            <span className="font-bold">₹{totalValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-muted-foreground">Distance:</span>
                            <span className="font-bold">{listing.distance} km</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => { setCompareModal(false); setBidModal(listing); }}
                          className="w-full rounded-xl"
                          size="sm"
                        >
                          <Gavel className="w-4 h-4 mr-2" />
                          Bid Now
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedForCompare([])} className="rounded-xl">
              Clear All
            </Button>
            <Button onClick={() => setCompareModal(false)} className="rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Crop Activity Modal */}
      <Dialog open={!!activityModal} onOpenChange={() => setActivityModal(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Crop Activity
            </DialogTitle>
          </DialogHeader>
          
          {activityModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-2xl">
                <img 
                  src={activityModal.image} 
                  alt={activityModal.crop}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold">{activityModal.crop}</h3>
                  <p className="text-sm text-muted-foreground">
                    by {activityModal.seller}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Activity Timeline (from Farmer)
                </Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activityModal.cropActivity.map((activity, idx) => (
                    <div 
                      key={idx}
                      className="flex gap-4 p-3 bg-card border rounded-xl"
                    >
                      <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.date}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setActivityModal(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={!!chatModal} onOpenChange={() => setChatModal(null)}>
        <DialogContent className="rounded-3xl max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p>Chat with {userRole === "buyer" ? chatModal?.seller : "Buyer"}</p>
                <p className="text-sm font-normal text-muted-foreground">{chatModal?.crop}</p>
              </div>
              {chatModal?.isVerified && (
                <Badge className="bg-green-100 text-green-700 ml-auto">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {chatModal && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-accent/30 rounded-2xl">
                {chatModal.chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Start a conversation</p>
                    <p className="text-sm mt-1">Discuss price, quality, and pickup details</p>
                  </div>
                ) : (
                  chatModal.chatMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender === (userRole === "buyer" ? "buyer" : "seller") ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.sender === (userRole === "buyer" ? "buyer" : "seller")
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-white border rounded-bl-sm"
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === (userRole === "buyer" ? "buyer" : "seller")
                            ? "text-white/70"
                            : "text-muted-foreground"
                        }`}>{msg.time}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="flex gap-2 mt-4">
                <Input
                  data-testid="input-chat-message"
                  placeholder="Type your message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  className="flex-1 rounded-xl border-2"
                />
                <Button 
                  data-testid="button-send-message"
                  onClick={handleSendChatMessage}
                  className="rounded-xl"
                  disabled={!chatMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reviews Modal */}
      <Dialog open={!!reviewsModal} onOpenChange={() => setReviewsModal(null)}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400" />
              Farmer Reviews
            </DialogTitle>
          </DialogHeader>
          
          {reviewsModal && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-2xl">
                <img 
                  src={reviewsModal.image} 
                  alt={reviewsModal.crop}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{reviewsModal.seller}</h3>
                    {reviewsModal.isVerified && (
                      <Badge className="bg-green-100 text-green-700">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(reviewsModal.rating, "lg")}
                    <span className="text-lg font-bold">{reviewsModal.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({reviewsModal.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>

              {userRole === "buyer" && (
                <div className="p-4 border-2 border-dashed rounded-2xl space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Leave a Review</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-8 h-8 cursor-pointer transition-all ${
                          star <= newReview.rating 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-gray-300 hover:text-amber-300"
                        }`}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                      />
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your experience with this farmer..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="rounded-xl border-2"
                  />
                  <Button 
                    onClick={handleSubmitReview}
                    className="w-full rounded-xl"
                    disabled={!newReview.comment.trim()}
                  >
                    Submit Review
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  All Reviews ({reviewsModal.reviews.length})
                </Label>
                {reviewsModal.reviews.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No reviews yet</p>
                  </div>
                ) : (
                  reviewsModal.reviews.map((review) => (
                    <div key={review.id} className="p-4 bg-card border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{review.reviewer}</p>
                        <p className="text-xs text-muted-foreground">{review.date}</p>
                      </div>
                      <div className="mb-2">{renderStars(review.rating)}</div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setReviewsModal(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Modal for Farmers */}
      <Dialog open={!!editPriceModal} onOpenChange={() => setEditPriceModal(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Edit2 className="w-6 h-6" />
              Edit Price
            </DialogTitle>
          </DialogHeader>
          
          {editPriceModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-2xl">
                <img 
                  src={editPriceModal.image} 
                  alt={editPriceModal.crop}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold">{editPriceModal.crop}</h3>
                  <p className="text-sm text-muted-foreground">
                    Current: ₹{editPriceModal.price}/{editPriceModal.unit}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  New Price (₹/{editPriceModal.unit})
                </Label>
                <Input
                  data-testid="input-new-price-edit"
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="mt-2 rounded-xl border-2 text-lg font-bold"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPriceModal(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              data-testid="button-save-price"
              onClick={handleEditPrice}
              className="rounded-xl"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal with UPI */}
      <Dialog open={!!withdrawModal} onOpenChange={() => setWithdrawModal(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2 text-amber-600">
              <XCircle className="w-6 h-6" />
              Withdraw Listing
            </DialogTitle>
          </DialogHeader>
          
          {withdrawModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-2xl">
                <img 
                  src={withdrawModal.image} 
                  alt={withdrawModal.crop}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold">{withdrawModal.crop}</h3>
                  <p className="text-sm text-muted-foreground">
                    {withdrawModal.quantity} {withdrawModal.unit} · ₹{withdrawModal.price}/{withdrawModal.unit}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-sm text-amber-700">
                  Withdrawing this listing will remove it from the marketplace. Any pending bids will be cancelled.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Enter UPI ID for Payment
                </Label>
                <Input
                  data-testid="input-upi-id"
                  type="text"
                  placeholder="yourname@upi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mt-2 rounded-xl border-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Payment for any accepted bids will be transferred to this UPI ID
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawModal(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              data-testid="button-confirm-withdraw"
              onClick={handleWithdrawListing}
              className="rounded-xl bg-amber-600 hover:bg-amber-700"
              disabled={!upiId.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Bids Modal for Farmers */}
      <Dialog open={!!reviewBidsModal} onOpenChange={() => setReviewBidsModal(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Gavel className="w-6 h-6" />
              Review Bids
            </DialogTitle>
          </DialogHeader>
          
          {reviewBidsModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent rounded-2xl">
                <img 
                  src={reviewBidsModal.image} 
                  alt={reviewBidsModal.crop}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold">{reviewBidsModal.crop}</h3>
                  <p className="text-sm text-muted-foreground">
                    Base: ₹{reviewBidsModal.price}/{reviewBidsModal.unit}
                  </p>
                </div>
              </div>

              {bidsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : modalBids.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No bids received yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    All Bids
                  </Label>
                  {modalBids.map((bid) => (
                    <div 
                      key={bid.id}
                      className={`p-4 border rounded-xl ${
                        bid.status === "accepted" ? "bg-green-50 border-green-200" :
                        bid.status === "rejected" ? "bg-red-50 border-red-200" :
                        "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold">{bid.bidder}</p>
                          <p className="text-xs text-muted-foreground">{bid.time}</p>
                        </div>
                        <p className="text-xl font-black text-primary">₹{bid.amount}</p>
                      </div>
                      {bid.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button 
                            data-testid={`button-accept-bid-${bid.id}`}
                            size="sm"
                            onClick={() => handleAcceptBid(reviewBidsModal.id, bid.id)}
                            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            data-testid={`button-reject-bid-${bid.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectBid(reviewBidsModal.id, bid.id)}
                            className="flex-1 rounded-xl text-destructive hover:bg-destructive hover:text-white"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge className={
                          bid.status === "accepted" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }>
                          {bid.status === "accepted" ? "Accepted" : "Rejected"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setReviewBidsModal(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
