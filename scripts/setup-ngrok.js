#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up ngrok tunnel (SIMPLE SOLUTION)\n");

// Check if ngrok is installed
console.log("📋 Steps to get your permanent ngrok URL:");
console.log("");
console.log("1. Sign up at: https://ngrok.com/ (free)");
console.log("2. Install ngrok (already in your project):");
console.log("   npm install -D ngrok");
console.log("");
console.log("3. Get your authtoken:");
console.log("   npx ngrok authtoken YOUR_TOKEN_HERE");
console.log("");
console.log("4. Start the tunnel:");
console.log("   npx ngrok http 3002");
console.log("");
console.log("5. Copy the HTTPS URL (eg: https://random.ngrok-free.app)");
console.log("6. Add this URL to Spotify with /auth/success?provider=spotify");
console.log("");
console.log("⚡ This gives you ONE stable HTTPS URL that never changes!");
console.log("");
console.log("💡 Pro Tip: Use ngrok instead of localtunnel for stable tunnels");
console.log("   • ngrok gives consistent URLs");
console.log("   • Works with HTTPS (secure for Spotify)");
console.log("   • Just 1 URL to add to Spotify forever!");
console.log("");
console.log("🚀 Would you like me to help you set this up?");

// Create a simple setup script for future use
const setupScript = `#!/usr/bin/env node

console.log('🔗 Ngrok Setup Guide:');
console.log('1. Get authtoken: npx ngrok authtoken YOUR_TOKEN');
console.log('2. Start tunnel: npx ngrok http 3002');
console.log('3. Copy HTTPS URL and add to Spotify');
console.log('4. Use npm run dev in another terminal');

module.exports = {};
`;

fs.writeFileSync(path.join(__dirname, "ngrok-guide.js"), setupScript);
console.log("\n✅ Created ngrok-guide.js for reference");

// Show current development approach
console.log("\n🔧 Current Recommended Setup:");
console.log("npm run dev                    # Local development");
console.log("npx ngrok http 3002           # When you need HTTPS");
console.log("");
console.log("🎯 This gives you the best of both worlds!");
console.log("   • localhost for development (fast)");
console.log("   • ngrok when you need Spotify auth (secure)");

console.log("\n📋 Your Spotify redirect URI will be:");
console.log("   YOUR_NGROK_URL/auth/success?provider=spotify");
console.log("   (Replace YOUR_NGROK_URL with your ngrok HTTPS URL)");

console.log("\n🎉 Done! Choose ngrok for the simple, secure solution! 🚀");
