import { useQuery } from "@tanstack/react-query";

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

interface DashboardStatsResponse {
  role: "buyer" | "farmer" | null;
  stats: BuyerStats | FarmerStats | null;
}

export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
