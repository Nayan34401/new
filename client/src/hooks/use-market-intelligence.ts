import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

interface CommodityPrice {
  commodity: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  change: number;
  market: string;
}

interface MarketIntelligence {
  news: NewsItem[];
  prices: CommodityPrice[];
  lastUpdated: string;
}

export function useMarketIntelligence() {
  return useQuery<MarketIntelligence>({
    queryKey: ["/api/market-intelligence"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/market-intelligence");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}
