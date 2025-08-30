"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Crown,
  Bell,
  Settings,
  BarChart,
  FileText,
  Music,
  Camera,
  Download,
  LogOut,
  Edit,
  Trash2,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useMusicData } from "@/hooks/use-music-data";
import { subscriptionService, SUBSCRIPTION_PLANS } from "@/lib/subscription";
import type { UserSubscription } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { toast } = useToast();
  const { provider, spotify, appleMusic } = useMusicData();
  const [userData, setUserData] = useState({
    name: "Jane Doe",
    email: "jane@example.com",
    joinDate: "March 2024",
    avatar: "https://picsum.photos/200",
    coversCreated: 47,
    minutesListened: 10420,
    topGenre: "Indie Pop",
  });

  const [settings, setSettings] = useState({
    notifications: true,
    autoSave: false,
    highQuality: true,
    analytics: true,
  });

  // Safe handling for when subscription/plan might be undefined
  const [subscriptionData, setSubscriptionData] = useState<UserSubscription | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const sub = await subscriptionService.getCurrentSubscription("user1");
        setSubscriptionData(sub);
      } catch (error) {
        console.error("Failed to load subscription:", error);
        // Set default subscription
        setSubscriptionData({
          userId: "user1",
          plan: SUBSCRIPTION_PLANS[0], // Freemium plan
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
          coversUsedThisMonth: 0,
        });
      }
    };
    loadSubscription();
  }, []);

  const handleSettingChange = (setting: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [setting]: value }));
    toast({
      title: "Settings Updated",
      description: `${setting} has been ${value ? "enabled" : "disabled"}.`,
    });
  };

  const handleSignOut = () => {
    // Implement sign out logic
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0E0F12] text-white">
      <div className="container mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-4">
            <Avatar className="w-24 h-24 border-4 border-[#9FFFA2]/30">
              <AvatarImage src={userData.avatar} alt="Profile picture" />
              <AvatarFallback className="bg-gradient-to-br from-[#9FFFA2] to-[#FF6F91] text-black text-2xl font-black">
                {userData.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#8FD3FF] hover:bg-[#8FD3FF]/80 text-black"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          <h1 className="text-3xl font-black mb-2">{userData.name}</h1>
          <p className="text-white/70">{userData.email}</p>
          <p className="text-white/50 text-sm">Member since {userData.joinDate}</p>
        </motion.header>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <BarChart className="text-[#8FD3FF]" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-[#9FFFA2] mb-1">
                    {userData.coversCreated}
                  </div>
                  <div className="text-white/60 text-sm">Covers Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#FF6F91] mb-1">
                    {userData.minutesListened.toLocaleString()}
                  </div>
                  <div className="text-white/60 text-sm">Minutes Listened</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#FFD36E] mb-1">{userData.topGenre}</div>
                  <div className="text-white/60 text-sm">Top Genre</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Music Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <Music className="text-[#9FFFA2]" />
                Music Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Spotify Connection */}
              <div className="flex items-center justify-between p-4 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Spotify</h4>
                    <p className="text-white/60 text-sm">
                      {spotify.isAuthenticated
                        ? `Connected as ${spotify.user?.display_name || "User"}`
                        : "Not connected"}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${spotify.isAuthenticated ? "bg-[#1DB954]/20 text-[#1DB954]" : "bg-white/10 text-white/60"}`}
                >
                  {spotify.isAuthenticated ? "Connected" : "Disconnected"}
                </Badge>
              </div>

              {/* Apple Music Connection */}
              <div className="flex items-center justify-between p-4 bg-[#FA243C]/10 border border-[#FA243C]/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FA243C] rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Apple Music</h4>
                    <p className="text-white/60 text-sm">
                      {appleMusic.isAuthenticated
                        ? `Connected as ${appleMusic.user?.attributes?.name || "User"}`
                        : "Not connected"}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${appleMusic.isAuthenticated ? "bg-[#FA243C]/20 text-[#FA243C]" : "bg-white/10 text-white/60"}`}
                >
                  {appleMusic.isAuthenticated ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <Link href="/subscription">
            <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 hover:bg-white/10 transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown
                      className={`${subscriptionData?.plan?.tier === "premium" ? "text-[#FFD36E]" : "text-white/50"}`}
                    />
                    Subscription
                  </div>
                  <Badge
                    className={`${subscriptionData?.plan?.tier === "premium" ? "bg-gradient-to-r from-[#9FFFA2] to-[#FFD36E] text-black" : "bg-[#8FD3FF]/20 text-[#8FD3FF]"}`}
                  >
                    {subscriptionData?.plan?.tier === "premium" ? "PREMIUM" : "FREEMIUM"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-2">
                      {subscriptionData?.plan?.tier === "premium"
                        ? "Unlimited covers, no watermarks, HD export"
                        : `${subscriptionData?.coversUsedThisMonth || 0}/3 covers used this month`}
                    </p>
                    {subscriptionData?.plan?.tier !== "premium" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90"
                      >
                        Upgrade to Premium
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <Settings className="text-[#8FD3FF]" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="flex items-center gap-3 cursor-pointer">
                  <Bell className="text-[#FFD36E]" />
                  <div>
                    <div className="font-medium">Push Notifications</div>
                    <div className="text-white/60 text-sm">Get notified about new features</div>
                  </div>
                </Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingChange("notifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save" className="flex items-center gap-3 cursor-pointer">
                  <Download className="text-[#9FFFA2]" />
                  <div>
                    <div className="font-medium">Auto-save Covers</div>
                    <div className="text-white/60 text-sm">Automatically save generated covers</div>
                  </div>
                </Label>
                <Switch
                  id="auto-save"
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => handleSettingChange("autoSave", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="high-quality" className="flex items-center gap-3 cursor-pointer">
                  <Camera className="text-[#FF6F91]" />
                  <div>
                    <div className="font-medium">High Quality Processing</div>
                    <div className="text-white/60 text-sm">Use maximum resolution for covers</div>
                  </div>
                </Label>
                <Switch
                  id="high-quality"
                  checked={settings.highQuality}
                  onCheckedChange={(checked) => handleSettingChange("highQuality", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="analytics" className="flex items-center gap-3 cursor-pointer">
                  <BarChart className="text-[#8FD3FF]" />
                  <div>
                    <div className="font-medium">Usage Analytics</div>
                    <div className="text-white/60 text-sm">
                      Help improve the app with usage data
                    </div>
                  </div>
                </Label>
                <Switch
                  id="analytics"
                  checked={settings.analytics}
                  onCheckedChange={(checked) => handleSettingChange("analytics", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-4"
        >
          <Button
            variant="outline"
            className="w-full justify-start text-left p-6 border-white/20 hover:bg-white/5"
            onClick={() =>
              toast({
                title: "Export Data",
                description: "Your data export will be ready shortly.",
              })
            }
          >
            <Download className="mr-4 text-[#8FD3FF]" />
            <div>
              <div className="font-medium">Export My Data</div>
              <div className="text-white/60 text-sm">Download all your covers and data</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-left p-6 border-white/20 hover:bg-white/5"
            onClick={() =>
              toast({
                title: "Account Deleted",
                description: "Your account deletion request has been processed.",
                variant: "destructive",
              })
            }
          >
            <Trash2 className="mr-4 text-[#FF6F91]" />
            <div>
              <div className="font-medium">Delete Account</div>
              <div className="text-white/60 text-sm">Permanently remove your account and data</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-left p-6 border-[#FF6F91]/20 hover:bg-[#FF6F91]/5 text-[#FF6F91] hover:text-[#FF6F91]"
            onClick={handleSignOut}
          >
            <LogOut className="mr-4" />
            <div>
              <div className="font-medium">Sign Out</div>
              <div className="text-white/60 text-sm">Sign out of your account</div>
            </div>
          </Button>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12 pb-8"
        >
          <p className="text-white/40 text-sm">Vibely v1.0.0 • Built with ❤️ for music lovers</p>
        </motion.div>
      </div>
    </div>
  );
}
