import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Phone, MapPin, Camera, Save, Building, Globe, HelpCircle, Bell, MessageSquare, Plus, Loader2, Clock, CheckCircle, Send, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User as UserType } from "@/pages/home";
import i18n from "@/i18n";

interface SupportTicket {
  id: number;
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

interface ProfilePageProps {
  user: UserType;
}

export function ProfilePage({ user }: ProfilePageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ category: "query", subject: "", description: "", priority: "normal" });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState({
    name: user.role === "farmer" ? "Ramesh Kumar" : "Vikram Patel",
    email: user.email,
    phone: "+91 98765 43210",
    location: "Nashik, Maharashtra",
    bio: user.role === "farmer" 
      ? "Third generation farmer specializing in organic vegetables. Committed to sustainable farming practices." 
      : "Wholesale buyer looking for quality organic produce at competitive prices.",
    farmName: "Green Valley Farms",
    farmSize: "25 acres",
  });

  const [settings, setSettings] = useState({
    language: i18n.language || "english",
    notifications: true,
    marketing: false,
    autoTranslate: true
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets"],
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

  const sendMessageMutation = useMutation({
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
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages?.messages]);

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicket) => {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setShowNewTicket(false);
      setNewTicket({ category: "query", subject: "", description: "", priority: "normal" });
      toast({ title: "Support ticket created", description: "We'll get back to you soon!" });
    },
    onError: () => {
      toast({ title: "Failed to create ticket", variant: "destructive" });
    },
  });

  const handleSave = () => {
    i18n.changeLanguage(settings.language);
    toast({
      title: t("Settings Saved") || "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const initials = profile.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-primary">{t("Account")}</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg">{t("Profile")}</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg">{t("Settings")}</TabsTrigger>
            <TabsTrigger value="support" className="rounded-lg" data-testid="tab-support">
              <MessageSquare className="w-4 h-4 mr-1" /> Support
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" ? (
            <Card className="border-2 rounded-3xl overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary to-primary/70" />
              <CardContent className="relative pt-0 pb-6 px-6">
                <div className="flex items-end gap-4 -mt-12 mb-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button 
                      data-testid="button-change-avatar"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="pb-2">
                    <h2 className="font-bold text-xl">{profile.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <User className="w-3 h-3" /> Full Name
                      </Label>
                      <Input
                        data-testid="input-name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="mt-2 rounded-xl border-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3 h-3" /> Email
                      </Label>
                      <Input
                        data-testid="input-email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="mt-2 rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Phone
                      </Label>
                      <Input
                        data-testid="input-phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="mt-2 rounded-xl border-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Location
                      </Label>
                      <Input
                        data-testid="input-location"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="mt-2 rounded-xl border-2"
                      />
                    </div>
                  </div>

                  {user.role === "farmer" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                          <Building className="w-3 h-3" /> Farm Name
                        </Label>
                        <Input
                          data-testid="input-farm-name"
                          value={profile.farmName}
                          onChange={(e) => setProfile({ ...profile, farmName: e.target.value })}
                          className="mt-2 rounded-xl border-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                          Farm Size
                        </Label>
                        <Input
                          data-testid="input-farm-size"
                          value={profile.farmSize}
                          onChange={(e) => setProfile({ ...profile, farmSize: e.target.value })}
                          className="mt-2 rounded-xl border-2"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Bio</Label>
                    <Textarea
                      data-testid="input-bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="mt-2 rounded-xl border-2 min-h-[100px]"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <Button 
                    data-testid="button-save-profile"
                    onClick={() => {
                      handleSave();
                      toast({
                        title: t("Profile Updated"),
                        description: t("Your personal details have been saved."),
                      });
                    }}
                    className="w-full rounded-xl h-12 text-base font-bold"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : activeTab === "settings" ? (
            <div className="space-y-4">
              <Card className="border-2 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    {t("Language & Regional")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{t("App Language")}</p>
                      <p className="text-xs text-muted-foreground">Select your preferred regional language</p>
                    </div>
                    <Select value={settings.language} onValueChange={(v) => setSettings({...settings, language: v})}>
                      <SelectTrigger className="w-40 rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">Hindi (हिन्दी)</SelectItem>
                        <SelectItem value="marathi">Marathi (మరాठी)</SelectItem>
                        <SelectItem value="telugu">Telugu (తెలుగు)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{t("AI Smart Translation")}</p>
                      <p className="text-xs text-muted-foreground">Auto-translate activity logs using AI</p>
                    </div>
                    <Switch 
                      checked={settings.autoTranslate} 
                      onCheckedChange={(v) => setSettings({...settings, autoTranslate: v})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    {t("Notifications")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{t("Order Updates")}</p>
                      <p className="text-xs text-muted-foreground">Get notified about status changes</p>
                    </div>
                    <Switch 
                      checked={settings.notifications} 
                      onCheckedChange={(v) => setSettings({...settings, notifications: v})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-3xl bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-primary">Community Knowledge Forum</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Join the space where farmers ask questions and share expertise.
                      </p>
                      <Button className="rounded-xl w-full" variant="outline">
                        Explore Forum
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleSave}
                className="w-full rounded-xl h-12 text-base font-bold"
              >
                {t("Apply Settings")}
              </Button>
            </div>
          ) : activeTab === "support" ? (
            <div className="space-y-4">
              <Card className="border-2 rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    My Support Tickets
                  </CardTitle>
                  <Button onClick={() => setShowNewTicket(true)} data-testid="create-ticket-btn">
                    <Plus className="w-4 h-4 mr-2" /> New Ticket
                  </Button>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : tickets && tickets.length > 0 ? (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <Card 
                          key={ticket.id} 
                          className="border rounded-xl cursor-pointer hover:border-primary/50 transition-colors" 
                          data-testid={`ticket-${ticket.id}`}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{ticket.category}</Badge>
                                  <Badge variant={
                                    ticket.status === "resolved" ? "default" :
                                    ticket.status === "in_progress" ? "secondary" : "outline"
                                  }>
                                    {ticket.status === "open" && <Clock className="w-3 h-3 mr-1" />}
                                    {ticket.status === "resolved" && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {ticket.status}
                                  </Badge>
                                </div>
                                <h4 className="font-semibold">{ticket.subject}</h4>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                                <p className="text-xs text-primary mt-2">Click to view conversation</p>
                              </div>
                              <span className="text-xs text-muted-foreground ml-2">
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No support tickets yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Create a ticket if you need help</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newTicket.category} onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="query">General Query</SelectItem>
                    <SelectItem value="dispute">Dispute</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Describe your issue in detail..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
            <Button 
              onClick={() => createTicketMutation.mutate(newTicket)}
              disabled={!newTicket.subject || !newTicket.description || createTicketMutation.isPending}
              data-testid="submit-ticket-btn"
            >
              {createTicketMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Ticket
            </Button>
          </DialogFooter>
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
                <p className="text-xs text-muted-foreground mb-1">Original Request:</p>
                <p className="text-sm">{selectedTicket?.description}</p>
              </CardContent>
            </Card>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : ticketMessages?.messages && ticketMessages.messages.length > 0 ? (
                  ticketMessages.messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.senderRole === "admin" ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        msg.senderRole === "admin" 
                          ? "bg-muted" 
                          : "bg-primary text-primary-foreground"
                      }`}>
                        <p className="text-xs font-semibold mb-1">
                          {msg.senderRole === "admin" ? "Support Team" : "You"}
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
                    <p className="text-sm">No messages yet. Our support team will respond soon.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {selectedTicket?.status !== "closed" && selectedTicket?.status !== "resolved" && (
              <div className="flex gap-2 mt-3 pt-3 border-t flex-shrink-0">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  data-testid="input-ticket-message"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      sendMessageMutation.mutate(newMessage);
                    }
                  }}
                />
                <Button 
                  onClick={() => sendMessageMutation.mutate(newMessage)}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="send-ticket-message-btn"
                >
                  {sendMessageMutation.isPending ? (
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
