import { useState } from "react";
import { motion } from "framer-motion";
import { Leaf, User, ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface RoleSelectionScreenProps {
  userId: string;
}

export function RoleSelectionScreen({ userId }: RoleSelectionScreenProps) {
  const [selectedRole, setSelectedRole] = useState<"farmer" | "buyer" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError("Please select a role to continue");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/profile/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (err) {
      setError("Failed to set role. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/30 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl shadow-xl border border-border p-10">
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Leaf className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-foreground">Welcome to Krishi Bazaar!</h1>
            <p className="text-muted-foreground mt-2">Tell us how you'll use the platform</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl mb-6 text-sm border-l-4 border-destructive"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <motion.button
              data-testid="role-farmer"
              type="button"
              onClick={() => setSelectedRole("farmer")}
              className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                selectedRole === "farmer"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedRole === "farmer" ? "bg-primary text-white" : "bg-muted"
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">I am a Farmer</h3>
                  <p className="text-muted-foreground text-sm">Sell your produce directly to buyers</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              data-testid="role-buyer"
              type="button"
              onClick={() => setSelectedRole("buyer")}
              className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                selectedRole === "buyer"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedRole === "buyer" ? "bg-primary text-white" : "bg-muted"
                }`}>
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">I am a Buyer</h3>
                  <p className="text-muted-foreground text-sm">Browse and purchase fresh produce</p>
                </div>
              </div>
            </motion.button>
          </div>

          <Button
            data-testid="button-continue"
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 mt-8"
          >
            {isSubmitting ? "Setting up..." : "Continue"}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
