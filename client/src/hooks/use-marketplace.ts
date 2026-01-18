import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Listing, Bid, InsertListing, InsertBid } from "@shared/schema";

export function useListings() {
  return useQuery<Listing[]>({
    queryKey: ["/api/listings"],
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useMyListings() {
  return useQuery<Listing[]>({
    queryKey: ["/api/my-listings"],
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useListing(id: number | undefined) {
  return useQuery<Listing>({
    queryKey: ["/api/listings", id],
    enabled: !!id,
  });
}

export function useListingBids(listingId: number | undefined) {
  return useQuery<Bid[]>({
    queryKey: ["/api/listings", listingId, "bids"],
    enabled: !!listingId,
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<InsertListing, "sellerId">) => {
      const res = await apiRequest("POST", "/api/listings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Listing>) => {
      const res = await apiRequest("PATCH", `/api/listings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
    },
  });
}

export function useWithdrawListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/listings/${id}/withdraw`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/listings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
    },
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { listingId: number; amount: string }) => {
      const res = await apiRequest("POST", "/api/bids", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", variables.listingId, "bids"] });
    },
  });
}

export function useUpdateBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bidId, status }: { bidId: number; status: "accepted" | "rejected" }) => {
      const res = await apiRequest("PATCH", `/api/bids/${bidId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}
