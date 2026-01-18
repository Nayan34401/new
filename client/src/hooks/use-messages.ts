import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

interface Conversation {
  partnerId: string;
  partnerName: string;
  listingId: number;
  listingCrop: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useMessages(listingId: number | undefined, partnerId: string | undefined) {
  return useQuery<Message[]>({
    queryKey: ["/api/messages/listing", listingId, partnerId],
    enabled: !!listingId && !!partnerId,
    staleTime: 5000,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { listingId: number; receiverId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/listing", variables.listingId, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
}
