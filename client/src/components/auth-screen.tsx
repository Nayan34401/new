import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserRole = "farmer" | "buyer";

export function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("farmer");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const body = isSignup 
        ? { email, password, role } 
        : { email, password };
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Authentication failed");
        setIsLoading(false);
        return;
      }

      // Reload page to trigger auth state refresh
      window.location.href = "/";
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
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
            <h1 className="font-display text-3xl font-bold text-foreground">Krishi Bazaar</h1>
            <p className="text-muted-foreground mt-2">Digital Farmer Marketplace</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl mb-6 text-sm border-l-4 border-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label className="text-sm font-semibold text-muted-foreground">I am a...</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger data-testid="select-role" className="mt-2 h-12 rounded-xl border-2 border-primary/20 focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">👨‍🌾 I am a Farmer (Seller)</SelectItem>
                      <SelectItem value="buyer">🛒 I am a Buyer</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Email Address</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="input-email"
                  type="email"
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="input-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 focus:border-primary"
                />
              </div>
            </div>

            <Button
              data-testid="button-submit"
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 transition-all"
            >
              {isLoading ? "Please wait..." : (isSignup ? "Create Account" : "Sign In")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="px-4 text-sm font-semibold text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <Button
              data-testid="button-google"
              variant="outline"
              className="w-full h-12 rounded-xl border-2 hover:bg-accent"
              onClick={handleGoogleLogin}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
              Sign in with Google
            </Button>
          </div>

          <p className="text-center mt-8 text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Krishi Bazaar?"}{" "}
            <button
              data-testid="button-toggle-auth"
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-primary font-bold hover:underline"
            >
              {isSignup ? "Sign In" : "Create Account"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
