"use client";

import { useState, useEffect } from "react";

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth state
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("vibely.user");
        if (storedUser) {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
        }
      } catch (error) {
        console.warn("Error loading stored user data:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = user !== null && isLoading === false;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
