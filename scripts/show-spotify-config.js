const fs = require("fs");
const path = require("path");

// Read the current tunnel URL
try {
  const tunnelUrl = fs.readFileSync(".tunnel-url", "utf8").trim();
  console.log("=== Spotify OAuth Configuration ===");
  console.log("Current Tunnel URL:", tunnelUrl);
  console.log("");
  console.log("Add this redirect URI to your Spotify Developer Dashboard:");
  console.log(`${tunnelUrl}/auth/success?provider=spotify`);
  console.log("");
  console.log("Steps to configure:");
  console.log("1. Go to https://developer.spotify.com/dashboard");
  console.log('2. Select your "Vibely" application');
  console.log('3. Click "Edit Settings"');
  console.log('4. In the "Redirect URIs" section, add the URL above');
  console.log('5. Click "Save"');
  console.log("");
  console.log("Your application will be accessible at:");
  console.log(tunnelUrl);
  console.log("");

  // Also show the current .env.local configuration
  try {
    const envContent = fs.readFileSync(".env.local", "utf8");
    const redirectUriMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="([^"]*)"/);
    if (redirectUriMatch) {
      console.log("Current .env.local redirect URI:");
      console.log(redirectUriMatch[1]);
      console.log("");
    }

    // Show other relevant Spotify configuration
    const clientIdMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_CLIENT_ID="([^"]*)"/);
    if (clientIdMatch) {
      console.log("Spotify Client ID:");
      console.log(clientIdMatch[1]);
    }
  } catch (envErr) {
    console.log("Could not read .env.local file");
  }
} catch (err) {
  console.error("Error reading tunnel URL:", err.message);
  console.log("");
  console.log("Please make sure the tunnel is running first.");
  console.log("Start the tunnel with: node scripts/robust-tunnel.js");
}
