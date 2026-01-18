import { AppShell } from "@/components/app-shell";
import { AuthScreen } from "@/components/auth-screen";
import { RoleSelectionScreen } from "@/components/role-selection-screen";
import { useAuth } from "@/hooks/use-auth";

export type UserRole = "farmer" | "buyer" | null;

export interface User {
  id?: string;
  email: string;
  role: UserRole;
  isAdmin?: string | null;
  isSuspended?: string | null;
}

export default function Home() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // If user is authenticated but hasn't selected a role yet
  if (!user.role) {
    return <RoleSelectionScreen userId={user.id} />;
  }

  // Map the backend user to the expected format
  const appUser: User = {
    id: user.id,
    email: user.email || "",
    role: user.role as UserRole,
    isAdmin: user.isAdmin,
    isSuspended: user.isSuspended,
  };

  return <AppShell user={appUser} onLogout={logout} />;
}
