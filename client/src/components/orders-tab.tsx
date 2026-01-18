import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  FileText, 
  Download, 
  Clock, 
  IndianRupee, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Loader2,
  MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import type { Order as DBOrder } from "@shared/schema";

interface UIOrder {
  id: string;
  dbId: number;
  listingId: number;
  sellerId: string;
  crop: string;
  quantity: string;
  unit: string;
  totalPrice: string;
  seller: string;
  buyer: string;
  status: "accepted" | "packing" | "transit" | "delivered";
  date: string;
  image: string;
}

export function OrdersTab({ userRole }: { userRole: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: apiOrders, isLoading } = useOrders();
  const updateStatusMutation = useUpdateOrderStatus();
  
  const convertToUIOrder = (dbOrder: DBOrder): UIOrder => ({
    id: `ORD-${String(dbOrder.id).padStart(3, '0')}`,
    dbId: dbOrder.id,
    listingId: dbOrder.listingId,
    sellerId: dbOrder.sellerId,
    crop: dbOrder.crop,
    quantity: dbOrder.quantity,
    unit: dbOrder.unit,
    totalPrice: String(dbOrder.totalPrice),
    seller: dbOrder.sellerId === user?.id ? "Your Farm" : `Seller ${dbOrder.sellerId.slice(0, 8)}`,
    buyer: dbOrder.buyerId === user?.id ? "You" : `Buyer ${dbOrder.buyerId.slice(0, 8)}`,
    status: (dbOrder.status as UIOrder["status"]) || "accepted",
    date: dbOrder.createdAt ? new Date(dbOrder.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop",
  });
  
  const orders: UIOrder[] = (apiOrders || []).map(convertToUIOrder);
  
  const [selectedOrder, setSelectedOrder] = useState<UIOrder | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [statusUpdateModal, setStatusUpdateModal] = useState<UIOrder | null>(null);

  const getStatusStep = (status: UIOrder["status"]) => {
    switch (status) {
      case "accepted": return 25;
      case "packing": return 50;
      case "transit": return 75;
      case "delivered": return 100;
      default: return 0;
    }
  };

  const getStatusIcon = (status: UIOrder["status"]) => {
    switch (status) {
      case "accepted": return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case "packing": return <Package className="w-5 h-5 text-orange-500" />;
      case "transit": return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary font-display">{t("Order Management")}</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-primary/5">Active: 2</Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">Completed: 15</Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden border-2 hover:border-primary/30 transition-all cursor-pointer" onClick={() => setSelectedOrder(order)}>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-32 md:h-auto overflow-hidden">
                  <img src={order.image} alt={order.crop} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{order.id}</span>
                        <span>•</span>
                        <span>{order.date}</span>
                      </div>
                      <h3 className="text-lg font-bold">{order.crop}</h3>
                      <p className="text-sm text-muted-foreground">
                        {userRole === "farmer" ? `Buyer: ${order.buyer}` : `Seller: ${order.seller}`}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="flex items-center text-xl font-black text-primary">
                        <IndianRupee className="w-4 h-4" />
                        {order.totalPrice}
                      </div>
                      <Badge className="capitalize" variant={order.status === "delivered" ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
                      {userRole === "farmer" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-lg text-[10px] font-bold uppercase"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusUpdateModal(order);
                          }}
                        >
                          Update Status
                        </Button>
                      )}
                      {userRole === "buyer" && (
                        <Button 
                          data-testid={`button-chat-seller-${order.dbId}`}
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-lg text-[10px] font-bold uppercase"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('switch-tab', { 
                              detail: {
                                tab: 'messages',
                                chatContext: {
                                  listingId: String(order.listingId),
                                  sellerId: order.sellerId,
                                  sellerName: order.seller,
                                  cropName: order.crop,
                                }
                              }
                            }));
                          }}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat with Seller
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                      <span>Order Progress</span>
                      <span>{getStatusStep(order.status)}%</span>
                    </div>
                    <Progress value={getStatusStep(order.status)} className={`h-2 ${order.status === 'delivered' ? '[&>div]:bg-green-500' : ''}`} />
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground pt-1">
                      <span className={order.status === "accepted" || order.status === "packing" || order.status === "transit" || order.status === "delivered" ? "text-primary" : ""}>{t("Accepted")}</span>
                      <span className={order.status === "packing" || order.status === "transit" || order.status === "delivered" ? "text-primary" : ""}>{t("Packing")}</span>
                      <span className={order.status === "transit" || order.status === "delivered" ? "text-primary" : ""}>{t("Transit")}</span>
                      <span className={order.status === "delivered" ? "text-primary" : ""}>{t("Delivered")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Order Details: {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-2xl">
                <img src={selectedOrder.image} alt={selectedOrder.crop} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedOrder.crop}</h3>
                  <p className="text-muted-foreground">{selectedOrder.quantity} {selectedOrder.unit} • ₹{selectedOrder.totalPrice}</p>
                </div>
                <Button variant="outline" className="rounded-xl" onClick={() => setShowInvoice(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Invoice
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Tracking Status</h4>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-muted">
                  {[
                    { label: "Bid Accepted", time: "Jan 13, 09:00 AM", status: "accepted", desc: "Price finalized and escrow payment initiated." },
                    { label: "Packing Produce", time: "Jan 13, 02:30 PM", status: "packing", desc: "Farmer is sorting and packing high-quality produce." },
                    { label: "In Transit", time: "Estimated Jan 14", status: "transit", desc: "Logistics partner assigned for pickup." },
                    { label: "Delivered", time: "-", status: "delivered", desc: "Payment will be released upon buyer confirmation." }
                  ].map((step, i) => (
                    <div key={i} className="relative flex items-start gap-4 ml-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-sm z-10 ${
                        getStatusStep(selectedOrder.status) >= (i + 1) * 25 ? "bg-primary border-primary text-white" : "bg-white border-muted"
                      }`}>
                        {getStatusStep(selectedOrder.status) >= (i + 1) * 25 ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-muted" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${getStatusStep(selectedOrder.status) >= (i + 1) * 25 ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                          <span className="text-xs text-muted-foreground">{step.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Escrow Security</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Your payment of ₹{selectedOrder.totalPrice} is held securely in escrow. It will only be released to {selectedOrder.seller} once you confirm delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setSelectedOrder(null)}>Close</Button>
            {selectedOrder?.status !== "delivered" && (
              <Button className="rounded-xl flex-1">Confirm Receipt</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Invoice Modal */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl">
          <div className="bg-white p-8" id="invoice-content">
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-primary">KISHAN BAZAAR.</span>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black uppercase text-muted/20 tracking-tighter">Tax Invoice</h2>
                <p className="text-sm font-bold mt-1">Invoice #{selectedOrder?.id?.replace('ORD', 'INV')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Seller / Farmer</p>
                <p className="font-bold text-lg">{selectedOrder?.seller}</p>
                <p className="text-sm text-muted-foreground">Certified Organic Farm #232</p>
                <p className="text-sm text-muted-foreground">Nashik, Maharashtra, 422001</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Buyer</p>
                <p className="font-bold text-lg">{selectedOrder?.buyer}</p>
                <p className="text-sm text-muted-foreground">GSTIN: 27AABCM1234F1Z5</p>
                <p className="text-sm text-muted-foreground">Mumbai, Maharashtra, 400001</p>
              </div>
            </div>

            <table className="w-full mb-12">
              <thead>
                <tr className="border-b-2 border-primary/10">
                  <th className="text-left py-4 text-[10px] font-black uppercase text-muted-foreground">Description</th>
                  <th className="text-center py-4 text-[10px] font-black uppercase text-muted-foreground">Qty</th>
                  <th className="text-right py-4 text-[10px] font-black uppercase text-muted-foreground">Price</th>
                  <th className="text-right py-4 text-[10px] font-black uppercase text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-muted/10">
                  <td className="py-6">
                    <p className="font-bold">{selectedOrder?.crop}</p>
                    <p className="text-xs text-muted-foreground">Grade A Quality, Fresh Harvest</p>
                  </td>
                  <td className="text-center font-bold">{selectedOrder?.quantity} {selectedOrder?.unit}</td>
                  <td className="text-right font-bold">₹{(parseInt(selectedOrder?.totalPrice.replace(',', '') || '0') / parseInt(selectedOrder?.quantity || '1')).toFixed(2)}</td>
                  <td className="text-right font-black">₹{selectedOrder?.totalPrice}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end mb-12">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">₹{selectedOrder?.totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (0% GST - Agri)</span>
                  <span className="font-bold">₹0.00</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t-2 border-primary/10">
                  <span className="font-black text-primary">Total Amount</span>
                  <span className="text-2xl font-black text-primary">₹{selectedOrder?.totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-xs font-bold text-green-700">Digitally Verified & Paid via Escrow</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl h-8 text-[10px] font-black uppercase">
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
                <Button size="sm" className="rounded-xl h-8 text-[10px] font-black uppercase">
                  Print
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal (Farmer only) */}
      <Dialog open={!!statusUpdateModal} onOpenChange={() => setStatusUpdateModal(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Update Delivery Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the current stage for <strong>{statusUpdateModal?.crop}</strong> (Order {statusUpdateModal?.id})
            </p>
            <div className="grid gap-3">
              {(["accepted", "packing", "transit", "delivered"] as UIOrder["status"][]).map((s) => (
                <Button
                  key={s}
                  variant={statusUpdateModal?.status === s ? "default" : "outline"}
                  className="justify-start h-12 rounded-xl capitalize"
                  disabled={updateStatusMutation.isPending}
                  onClick={async () => {
                    try {
                      await updateStatusMutation.mutateAsync({
                        orderId: statusUpdateModal!.dbId,
                        status: s,
                      });
                      toast({
                        title: "Status Updated",
                        description: `Order status changed to ${s}`,
                      });
                      setStatusUpdateModal(null);
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to update status",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {getStatusIcon(s)}
                  <span className="ml-3 font-semibold">{s}</span>
                  {statusUpdateModal?.status === s && <CheckCircle2 className="ml-auto w-4 h-4" />}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl w-full" onClick={() => setStatusUpdateModal(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
