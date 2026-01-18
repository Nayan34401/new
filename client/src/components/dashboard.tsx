import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { TrendingUp, Package, Gavel, ShoppingCart, Newspaper, ExternalLink, Landmark, X, Calendar, FileText, IndianRupee, Loader2, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/pages/home";
import { useMarketIntelligence } from "@/hooks/use-market-intelligence";
import { useDashboardStats, type BuyerStats, type FarmerStats } from "@/hooks/use-dashboard-stats";

interface DashboardProps {
  userRole: UserRole;
}

interface NewsItem {
  id: number;
  title: string;
  source: string;
  image: string;
  time: string;
  fullContent: string;
  impact: string;
  keyPoints: string[];
}

interface SchemeItem {
  id: number;
  title: string;
  ministry: string;
  image: string;
  deadline: string;
  eligibility: string;
  benefits: string;
  description: string;
  keyFeatures: string[];
  howToApply: string[];
  documents: string[];
}

const mockNews: NewsItem[] = [
  {
    id: 1,
    title: "Wheat prices surge 15% amid global supply concerns",
    source: "Agri Times",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=200&fit=crop",
    time: "2 hours ago",
    fullContent: "Global wheat prices have surged by 15% over the past week due to growing concerns about supply disruptions in major wheat-producing regions. The price increase is attributed to unfavorable weather conditions in Europe and reduced export quotas from key exporters.",
    impact: "Positive for wheat farmers, higher selling prices expected",
    keyPoints: [
      "Current MSP for wheat: ₹2,275 per quintal",
      "Expected market price: ₹2,400-2,600 per quintal",
      "Best time to sell: Next 2-3 weeks",
      "Storage recommendation: Hold if you have proper storage facilities"
    ]
  },
  {
    id: 2,
    title: "Government announces new MSP for Kharif crops",
    source: "Economic Daily",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=200&fit=crop",
    time: "5 hours ago",
    fullContent: "The Cabinet Committee on Economic Affairs has approved the Minimum Support Prices for Kharif Marketing Season 2026-27. The highest increase has been given to oilseeds and pulses to encourage farmers to shift to these crops and achieve self-sufficiency.",
    impact: "Guaranteed prices for major crops",
    keyPoints: [
      "Paddy MSP increased to ₹2,300 per quintal (up 5.4%)",
      "Jowar MSP: ₹3,180 per quintal",
      "Bajra MSP: ₹2,500 per quintal",
      "Groundnut MSP: ₹6,377 per quintal",
      "Soybean MSP: ₹4,600 per quintal"
    ]
  },
  {
    id: 3,
    title: "Tech innovations transforming Indian agriculture",
    source: "Farm Tech Weekly",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=200&fit=crop",
    time: "1 day ago",
    fullContent: "From drone-based crop monitoring to AI-powered pest detection, technology is revolutionizing how Indian farmers work. Several startups are now offering affordable tech solutions specifically designed for small and marginal farmers.",
    impact: "Increased efficiency and reduced costs",
    keyPoints: [
      "Drone spraying reduces pesticide use by 30%",
      "Soil sensors help optimize fertilizer usage",
      "Weather apps with hyperlocal forecasting",
      "Mobile apps for direct market access",
      "Government subsidies available for agri-tech adoption"
    ]
  }
];

const mockSchemes: SchemeItem[] = [
  {
    id: 1,
    title: "PM-KISAN Samman Nidhi",
    ministry: "Ministry of Agriculture",
    image: "https://images.unsplash.com/photo-1589923188651-268a9765e432?w=400&h=200&fit=crop",
    deadline: "Ongoing",
    eligibility: "All land-holding farmer families",
    benefits: "₹6,000 per year in 3 installments",
    description: "Under this scheme, the government provides income support of ₹6,000 per year to all farmer families across the country in three equal installments of ₹2,000 each. The amount is directly transferred to the bank accounts of the beneficiaries.",
    keyFeatures: [
      "Direct benefit transfer to bank account",
      "₹2,000 every 4 months",
      "No middlemen involved",
      "Over 11 crore farmers benefited"
    ],
    howToApply: [
      "Visit nearest Common Service Centre (CSC)",
      "Apply online at pmkisan.gov.in",
      "Contact local agriculture office",
      "Apply through PM-KISAN mobile app"
    ],
    documents: [
      "Aadhaar Card",
      "Land ownership documents",
      "Bank account details",
      "Mobile number linked to Aadhaar"
    ]
  },
  {
    id: 2,
    title: "Pradhan Mantri Fasal Bima Yojana",
    ministry: "Ministry of Agriculture",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=200&fit=crop",
    deadline: "Before sowing season",
    eligibility: "All farmers growing notified crops",
    benefits: "Crop insurance at minimal premium",
    description: "PMFBY provides comprehensive crop insurance coverage against crop loss due to natural calamities, pests, and diseases. Farmers pay only 2% premium for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops.",
    keyFeatures: [
      "Lowest premium rates for farmers",
      "Coverage from pre-sowing to post-harvest",
      "Use of technology for quick claim settlement",
      "No cap on government subsidy"
    ],
    howToApply: [
      "Apply through bank while taking crop loan",
      "Register at PMFBY portal",
      "Visit nearest agriculture office",
      "Apply through CSC centres"
    ],
    documents: [
      "Aadhaar Card",
      "Bank passbook",
      "Land records (Khatauni/RoR)",
      "Sowing certificate from agriculture officer"
    ]
  },
  {
    id: 3,
    title: "Kisan Credit Card (KCC)",
    ministry: "Ministry of Finance",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
    deadline: "Ongoing",
    eligibility: "All farmers, sharecroppers, tenant farmers",
    benefits: "Easy credit at 4% interest rate",
    description: "KCC provides farmers with affordable credit for their agricultural needs including crop production, post-harvest expenses, and consumption needs. With timely repayment, farmers can avail interest subvention bringing effective rate to just 4%.",
    keyFeatures: [
      "Credit limit up to ₹3 lakh at 4% interest",
      "Flexible repayment options",
      "Personal accident insurance cover",
      "ATM-enabled card for easy access"
    ],
    howToApply: [
      "Apply at any bank branch",
      "Apply online through bank portals",
      "Visit local agriculture office",
      "Apply through PM-KISAN portal"
    ],
    documents: [
      "Aadhaar Card & PAN Card",
      "Land documents",
      "Passport size photographs",
      "Application form"
    ]
  }
];

export function Dashboard({ userRole }: DashboardProps) {
  const { t } = useTranslation();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeItem | null>(null);
  const { data: marketData, isLoading: marketLoading } = useMarketIntelligence();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();

  const news = marketData?.news || [];
  const prices = marketData?.prices || [];

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const farmerStats = dashboardStats?.stats as FarmerStats | undefined;
  const buyerStats = dashboardStats?.stats as BuyerStats | undefined;

  const stats = userRole === "farmer" 
    ? [
        { label: t("Projected Revenue"), value: statsLoading ? "..." : formatCurrency(farmerStats?.projectedRevenue || 0), icon: TrendingUp, color: "bg-primary/10 text-primary" },
        { label: t("Active Listings"), value: statsLoading ? "..." : String(farmerStats?.activeListings || 0), icon: Package, color: "bg-orange-100 text-orange-600" },
        { label: t("Total Orders"), value: statsLoading ? "..." : String(farmerStats?.totalOrders || 0), icon: ShoppingCart, color: "bg-blue-100 text-blue-600" },
      ]
    : [
        { label: t("Projected Spending"), value: statsLoading ? "..." : formatCurrency(buyerStats?.projectedSpending || 0), icon: TrendingUp, color: "bg-primary/10 text-primary" },
        { label: t("Active Bids"), value: statsLoading ? "..." : String(buyerStats?.activeBids || 0), icon: Gavel, color: "bg-orange-100 text-orange-600" },
        { label: t("Won Auctions"), value: statsLoading ? "..." : String(buyerStats?.wonAuctions || 0), icon: ShoppingCart, color: "bg-blue-100 text-blue-600" },
      ];

  return (
    <div className="space-y-8">
      <Card className="border-2 border-border shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-2xl text-primary">{t("Dashboard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${stat.color} rounded-2xl p-6`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                </div>
                <p className="text-4xl font-black">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Intelligence Feed */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground">{t("Market Intelligence")}</h2>
          </div>
          {marketData?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(marketData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* Real-time Commodity Prices */}
        {prices.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {prices.slice(0, 8).map((price, i) => (
                <motion.div
                  key={price.commodity}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border-2 border-border rounded-xl p-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">{price.commodity}</span>
                    <span className={`flex items-center text-xs font-bold ${price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {price.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(price.change)}%
                    </span>
                  </div>
                  <div className="text-lg font-bold text-primary">₹{price.avgPrice}</div>
                  <div className="text-xs text-muted-foreground">per {price.unit} · {price.market}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {marketLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">{t("Loading...")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {news.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Card 
                  className="group cursor-pointer border-2 border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
                  data-testid={`news-card-${item.id}`}
                  onClick={() => setSelectedNews(item)}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">{item.source} · {item.time}</p>
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-3 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("Read More")} <ExternalLink className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Government Schemes Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Landmark className="w-6 h-6 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">{t("Government Schemes")}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mockSchemes.map((scheme, i) => (
            <motion.div
              key={scheme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Card 
                className="group cursor-pointer border-2 border-border hover:border-green-500/30 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
                data-testid={`scheme-card-${scheme.id}`}
                onClick={() => setSelectedScheme(scheme)}
              >
                <div className="relative h-36 overflow-hidden">
                  <img 
                    src={scheme.image} 
                    alt={scheme.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute bottom-3 left-3 bg-green-600 text-white">
                    {scheme.deadline}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">{scheme.ministry}</p>
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-green-600 transition-colors">
                    {scheme.title}
                  </h3>
                  <p className="text-sm text-green-600 font-bold mt-2">{scheme.benefits}</p>
                  <div className="flex items-center gap-1 mt-3 text-green-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Know more <ExternalLink className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* News Detail Modal */}
      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl pr-8">
              {selectedNews?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNews && (
            <div className="space-y-5">
              <img 
                src={selectedNews.image} 
                alt={selectedNews.title}
                className="w-full h-48 object-cover rounded-2xl"
              />
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-semibold">{selectedNews.source}</span>
                <span>·</span>
                <span>{selectedNews.time}</span>
              </div>

              <p className="text-foreground leading-relaxed">
                {selectedNews.fullContent}
              </p>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <p className="text-xs font-bold uppercase text-primary mb-2">Market Impact</p>
                <p className="text-foreground font-medium">{selectedNews.impact}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Key Takeaways</p>
                <div className="space-y-2">
                  {selectedNews.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-accent rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setSelectedNews(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scheme Detail Modal */}
      <Dialog open={!!selectedScheme} onOpenChange={() => setSelectedScheme(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl pr-8 text-green-700">
              {selectedScheme?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedScheme && (
            <div className="space-y-5">
              <img 
                src={selectedScheme.image} 
                alt={selectedScheme.title}
                className="w-full h-48 object-cover rounded-2xl"
              />
              
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <Landmark className="w-3 h-3 mr-1" />
                  {selectedScheme.ministry}
                </Badge>
                <Badge className="bg-green-600">
                  <Calendar className="w-3 h-3 mr-1" />
                  {selectedScheme.deadline}
                </Badge>
              </div>

              <p className="text-foreground leading-relaxed">
                {selectedScheme.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                  <p className="text-xs font-bold uppercase text-green-600 mb-2">Benefits</p>
                  <p className="text-green-700 font-bold text-lg">{selectedScheme.benefits}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <p className="text-xs font-bold uppercase text-blue-600 mb-2">Eligibility</p>
                  <p className="text-blue-700 font-medium">{selectedScheme.eligibility}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Key Features</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedScheme.keyFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-accent rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <p className="text-sm text-foreground">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-3">How to Apply</p>
                <div className="space-y-2">
                  {selectedScheme.howToApply.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                      <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Required Documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedScheme.documents.map((doc, idx) => (
                    <Badge key={idx} variant="outline" className="py-2 px-3">
                      {doc}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedScheme(null)} className="rounded-xl">
              Close
            </Button>
            <Button className="rounded-xl bg-green-600 hover:bg-green-700">
              Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
