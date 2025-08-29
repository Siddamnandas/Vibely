"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Create a provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Changed from true to false for better UX

  useEffect(() => {
    console.log("🔐 Auth provider initializing...");

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log("⏰ Auth timeout - proceeding without user");
      setLoading(false);
    }, 1000); // Reduced from 3 seconds to 1 second

    // Subscribe to the Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      console.log("🔐 Auth state changed:", user ? "User found" : "No user");
      setUser(user);
      setLoading(false);
    });

    // Unsubscribe from the listener when the component unmounts
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const value = { user, loading };

  // Render a loading screen while checking auth state, then render children
  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen w-full items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

// Create a custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
