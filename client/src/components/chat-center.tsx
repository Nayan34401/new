import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  CheckCheck, 
  Image as ImageIcon,
  Paperclip,
  Smile,
  Circle,
  IndianRupee,
  ShieldCheck,
  Package,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface UIMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

interface UIChat {
  id: string;
  partnerId: string;
  listingId: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  crop: string;
  price: string;
}

interface PendingChat {
  listingId: number;
  sellerId: string;
  sellerName: string;
  cropName: string;
}

interface ChatCenterProps {
  userRole: string;
  pendingChat?: PendingChat | null;
  onChatOpened?: () => void;
}

export function ChatCenter({ userRole, pendingChat, onChatOpened }: ChatCenterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: apiConversations, isLoading: conversationsLoading } = useConversations();
  const sendMessageMutation = useSendMessage();
  
  const chats: UIChat[] = (apiConversations || []).map((conv: any) => {
    const lastMsg = conv.lastMessage;
    const lastMessageText = typeof lastMsg === 'string' 
      ? lastMsg 
      : (lastMsg?.content || "Start a conversation");
    const lastMsgTime = typeof lastMsg === 'object' && lastMsg?.createdAt 
      ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "");
    
    const listingId = conv.listingId || (typeof lastMsg === 'object' ? lastMsg?.listingId : undefined);
    
    return {
      id: `${listingId}-${conv.partnerId}`,
      partnerId: conv.partnerId,
      listingId: listingId,
      name: conv.partnerName || `User ${conv.partnerId.slice(0, 8)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.partnerId}`,
      lastMessage: lastMessageText,
      time: lastMsgTime,
      unread: conv.unreadCount || 0,
      online: true,
      crop: conv.listingCrop || "Crop",
      price: "View listing",
    };
  });
  
  const [activeChat, setActiveChat] = useState<UIChat | null>(null);
  const [localMessages, setLocalMessages] = useState<UIMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Handle pending chat from marketplace "Chat with Seller" button
  useEffect(() => {
    if (pendingChat) {
      // Create a temporary chat entry for the new conversation
      const newChat: UIChat = {
        id: `${pendingChat.listingId}-${pendingChat.sellerId}`,
        partnerId: pendingChat.sellerId,
        listingId: pendingChat.listingId,
        name: pendingChat.sellerName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingChat.sellerId}`,
        lastMessage: "Start chatting about this listing",
        time: "",
        unread: 0,
        online: true,
        crop: pendingChat.cropName,
        price: "View listing",
      };
      setActiveChat(newChat);
      onChatOpened?.();
    }
  }, [pendingChat, onChatOpened]);
  
  const { data: apiMessages } = useMessages(activeChat?.listingId, activeChat?.partnerId);
  
  const messages: UIMessage[] = (apiMessages || []).map((msg: any) => ({
    id: String(msg.id || Math.random()),
    senderId: msg.senderId === user?.id ? "me" : "other",
    text: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
    timestamp: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
    status: "read" as const,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) {
      console.log("Send blocked - no message or no active chat", { newMessage, activeChat });
      return;
    }
    
    console.log("Sending message:", { 
      listingId: activeChat.listingId, 
      receiverId: activeChat.partnerId, 
      content: newMessage 
    });
    
    try {
      const result = await sendMessageMutation.mutateAsync({
        listingId: activeChat.listingId,
        receiverId: activeChat.partnerId,
        content: newMessage,
      });
      console.log("Message sent successfully:", result);
      setNewMessage("");
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-card border-2 rounded-3xl overflow-hidden shadow-xl">
      {/* Sidebar */}
      <div className="w-80 border-r-2 flex flex-col bg-muted/10">
        <div className="p-4 border-b-2">
          <h2 className="text-xl font-bold text-primary font-display mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 rounded-xl border-2 bg-white" placeholder="Search chats..." />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading conversations...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a chat from a listing</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-primary/5 ${activeChat?.id === chat.id ? "bg-primary/10 border-r-4 border-primary" : ""}`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback>{chat.name[0]}</AvatarFallback>
                    </Avatar>
                    {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold truncate">{chat.name}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{chat.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">{chat.crop}</Badge>
                      {chat.unread > 0 && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">{chat.unread}</Badge>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b-2 flex items-center justify-between bg-white z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border shadow-sm">
                <AvatarImage src={activeChat.avatar} />
                <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{activeChat.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-500" /> Online
                  </span>
                  <span className="text-[10px] text-muted-foreground">• Negotiating: {activeChat.crop} ({activeChat.price})</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="rounded-xl"><Phone className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="rounded-xl"><Video className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/5" ref={scrollRef}>
            <div className="flex justify-center mb-6">
              <div className="px-4 py-1 bg-white border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today</div>
            </div>
            
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] group`}>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    msg.senderId === "me" 
                      ? "bg-primary text-white rounded-br-sm" 
                      : "bg-white border text-foreground rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 px-1 ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                    {msg.senderId === "me" && <CheckCheck className="w-3 h-3 text-primary" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Negotiate Tooltip */}
          <div className="px-6 py-2 bg-primary/5 border-t border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary">
              <ShieldCheck className="w-3 h-3" />
              SECURE ESCROW CHAT
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Current Offer:</span>
              <Badge className="bg-primary text-white text-[10px]">{activeChat.price}</Badge>
              <Button size="sm" variant="outline" className="h-6 rounded-lg text-[10px] font-bold">Counter Offer</Button>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t-2 bg-white">
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-2xl border-2 border-transparent focus-within:border-primary/20 transition-all">
              <Button size="icon" variant="ghost" className="rounded-xl text-muted-foreground"><Paperclip className="w-5 h-5" /></Button>
              <Button size="icon" variant="ghost" className="rounded-xl text-muted-foreground"><ImageIcon className="w-5 h-5" /></Button>
              <Input 
                className="border-none bg-transparent focus-visible:ring-0 text-sm" 
                placeholder="Type your message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button size="icon" variant="ghost" className="rounded-xl text-muted-foreground"><Smile className="w-5 h-5" /></Button>
              <Button 
                type="button"
                data-testid="send-message-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendMessage();
                }}
                disabled={!newMessage.trim() || !activeChat || sendMessageMutation.isPending}
                className="rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-white w-10 h-10 p-0 disabled:opacity-50"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/5">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Select a Chat</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Open a conversation to discuss quality, negotiate prices and finalize logistics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
  );
}
