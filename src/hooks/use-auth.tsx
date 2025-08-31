"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuestMode: boolean;
  signInAsGuest: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false, // Default to false to prevent blocking
  isGuestMode: false,
  signInAsGuest: async () => {},
});

// Create a provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    console.log("🔐 Auth provider initializing...");

    // Set aggressive timeout for Firebase auth check
    const timeoutId = setTimeout(() => {
      console.log("⏰ Firebase auth timeout - enabling guest mode");
      setLoading(false);
      setIsGuestMode(true);
    }, 500); // 500ms timeout for immediate app access

    // Subscribe to the Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        clearTimeout(timeoutId);
        console.log("🔐 Auth state changed:", user ? "User found" : "No user");
        setUser(user);
        setLoading(false);
        setIsGuestMode(false); // Clear guest mode when auth succeeds
      },
      (error) => {
        console.warn("🔐 Auth error:", error);
        clearTimeout(timeoutId);
        setLoading(false);
        setIsGuestMode(true); // Enable guest mode on auth error
      }
    );

    // Unsubscribe from the listener when the component unmounts
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signInAsGuest = async () => {
    // Minimal guest sign-in: mark guest mode and clear user
    setIsGuestMode(true);
    setUser(null);
  };

  const value = { user, loading, isGuestMode, signInAsGuest };

  // Render app shell immediately instead of loading screen
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
