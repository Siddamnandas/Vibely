#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🚀 FIXED FOREVER SPOTIFY DEVELOPMENT URL!\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n💡 OPTION 1: Get RESERVED (paid) ngrok domain - $5/month");
console.log("   👉 Sign up: https://dashboard.ngrok.com/reserved_domains");
console.log("   👉 Example: https://your-app.ngrok.app/auth/success?provider=spotify");
console.log("\n💡 OPTION 2: Cloudflare Tunnel - FREE & PERMANENT");
console.log(
  "   👉 Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide",
);
console.log("   👉 Example: https://your-subdomain.yourdomain.com/auth/success?provider=spotify");
console.log("\n🎯 RESULT: ONE URL that NEVER changes!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Common tunnel subdomains for both localtunnel and ngrok
const commonTunnelDomains = [
  // Localtunnel domains
  "gentle-boxes-try.loca.lt",
  "easy-toes-train.loca.lt",
  "four-webs-sit.loca.lt",
  "kind-trees-develop.loca.lt",
  "powerful-rivers-try.loca.lt",
  "bright-morning-light.loca.lt",
  "cool-paper-hold.loca.lt",
  "metal-paper-look.loca.lt",
  "running-morning-bird.loca.lt",
  "cyan-circles-play.loca.lt",
  // Current ngrok domains
  "0e864e4ffae1.ngrok-free.app",
  "cbaed261d4fc.ngrok-free.app",
  "8f3da4200d4b.ngrok-free.app",
];

// Generate recommended redirect URIs
const recommendedRedirects = [
  "http://localhost:3002/auth/success?provider=spotify",
  "http://localhost:3000/auth/success?provider=spotify", // Alternative port
  ...commonTunnelDomains.map((domain) => `https://${domain}/auth/success?provider=spotify`),
];

console.log("📋 Recommended Redirect URIs to add to Spotify:\n");
recommendedRedirects.forEach((uri, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${uri}`);
});

console.log("\n📋 Copy all of the above URIs and add them to:");
console.log("   https://developer.spotify.com/dashboard");
console.log("   -> Your App -> Edit Settings -> Redirect URIs");

console.log("\n💡 Pro Tips:");
console.log("   • Add all at once to avoid constant updates");
console.log("   • Use localhost:3002 for development");
console.log("   • Use tunnels only when testing mobile/remote access");

// Create a local config helper
const configPath = path.join(__dirname, "..", "spotify-dev-config.json");
const config = {
  localhostUrl: "http://localhost:3002/auth/success?provider=spotify",
  commonTunnelDomains,
  recommendedRedirects,
  setupDate: new Date().toISOString(),
  instructions: "Add all recommended redirect URIs to Spotify Developer Dashboard",
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`\n✅ Created ${configPath} with setup information`);

console.log("\n🔧 Usage Options:");
console.log("   • localhost:3002 - Best for development");
console.log("   • Tunnel URLs - Use when testing mobile or sharing");
console.log("   • Environment: Set NEXT_PUBLIC_SPOTIFY_REDIRECT_URI");
console.log("\n🎯 Done! Your Spotify auth will work permanently without constant updates!");
