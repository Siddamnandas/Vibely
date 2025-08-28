"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

// Import the actual client-side Firebase auth instance
import { auth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function AuthPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both email and password.",
      });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        variant: "default",
        className: "bg-green-500 text-white",
        title: "Login Successful!",
        description: "Welcome back!",
      });
      router.push("/"); // Navigate to home page on successful login
    } catch (error: any) {
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/invalid-email":
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password.";
            break;
          case "auth/network-request-failed":
            errorMessage = "Network error. Please check your internet connection.";
            break;
          default:
            errorMessage = `Login failed: ${error.message}`;
        }
      }
      toast({ variant: "destructive", title: "Login Failed", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: "Please enter both email and password.",
      });
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        variant: "default",
        className: "bg-green-500 text-white",
        title: "Signup Successful!",
        description: "Your account has been created.",
      });
      // The Cloud Function 'createUserDocument' will now create the user's Firestore document.
      router.push("/"); // Navigate to home page on successful signup
    } catch (error: any) {
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "That email address is already in use!";
            break;
          case "auth/invalid-email":
            errorMessage = "That email address is invalid!";
            break;
          case "auth/weak-password":
            errorMessage =
              "Password is too weak. Please choose a stronger password (at least 6 characters).";
            break;
          default:
            errorMessage = `Signup failed: ${error.message}`;
        }
      }
      toast({ variant: "destructive", title: "Signup Failed", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Reset fields when switching tabs
  const onTabChange = () => {
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-900 p-4">
      <Tabs defaultValue="login" className="w-full max-w-md" onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">
            <LogIn className="mr-2 h-4 w-4" /> Login
          </TabsTrigger>
          <TabsTrigger value="signup">
            <UserPlus className="mr-2 h-4 w-4" /> Sign Up
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Access your account to continue generating album art.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Login
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button onClick={handleSignup} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign Up
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
