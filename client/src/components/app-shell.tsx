import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Leaf, LogOut, LayoutDashboard, ClipboardList, Store, UserCircle, MessageSquare, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dashboard } from "@/components/dashboard";
import { ActivityLog } from "@/components/activity-log";
import { Marketplace } from "@/components/marketplace";
import { ProfilePage } from "@/components/profile-page";
import { ChatCenter } from "@/components/chat-center";
import { OrdersTab } from "@/components/orders-tab";
import type { User } from "@/pages/home";

type Tab = "dashboard" | "activity" | "marketplace" | "messages" | "orders" | "profile";

interface ChatContext {
  listingId: number;
  sellerId: string;
  sellerName: string;
  cropName: string;
}

interface AppShellProps {
  user: User;
  onLogout: () => void;
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [pendingChat, setPendingChat] = useState<ChatContext | null>(null);
  const isAdmin = user.isAdmin === "true";

  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent<Tab | { tab: Tab; chatContext?: ChatContext }>) => {
      if (typeof e.detail === 'string') {
        setActiveTab(e.detail);
      } else {
        setActiveTab(e.detail.tab);
        if (e.detail.chatContext) {
          setPendingChat(e.detail.chatContext);
        }
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switch-tab', handleSwitchTab as EventListener);
  }, []);

  const tabs = [
    { id: "dashboard" as Tab, label: t("Dashboard"), icon: LayoutDashboard },
    ...(user.role === "farmer" ? [{ id: "activity" as Tab, label: t("Activity"), icon: ClipboardList }] : []),
    { id: "marketplace" as Tab, label: t("Market"), icon: Store },
    { id: "messages" as Tab, label: t("Messages"), icon: MessageSquare },
    { id: "orders" as Tab, label: t("Orders"), icon: Truck },
    { id: "profile" as Tab, label: t("Profile"), icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">KB.</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white border-none px-4 py-1.5 text-xs font-bold uppercase tracking-wider"
            >
              {user.role === "farmer" ? t("Farmer") : t("Buyer")}
            </Badge>
            {isAdmin && (
              <Button
                data-testid="admin-dashboard-link"
                variant="secondary"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="bg-orange-500 text-white hover:bg-orange-600 font-bold"
              >
                <Shield className="w-4 h-4 mr-2" />
                {t("Admin")}
              </Button>
            )}
            <Button
              data-testid="button-logout"
              variant="secondary"
              size="sm"
              onClick={onLogout}
              className="bg-white text-primary hover:bg-white/90 font-bold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("Logout")}
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-2 py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all
                  ${activeTab === tab.id 
                    ? "bg-white text-primary shadow-md border-2 border-primary/20" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/5 rounded-xl -z-10"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "dashboard" && <Dashboard userRole={user.role ?? "buyer"} />}
          {activeTab === "activity" && user.role === "farmer" && <ActivityLog />}
          {activeTab === "marketplace" && <Marketplace userRole={user.role ?? "buyer"} />}
          {activeTab === "messages" && <ChatCenter userRole={user.role ?? "buyer"} pendingChat={pendingChat} onChatOpened={() => setPendingChat(null)} />}
          {activeTab === "orders" && <OrdersTab userRole={user.role ?? "buyer"} />}
          {activeTab === "profile" && <ProfilePage user={user} />}
        </motion.div>
      </main>
    </div>
  );
}
