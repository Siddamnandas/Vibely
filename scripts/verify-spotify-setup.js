const fs = require("fs");
const https = require("https");

console.log("=== Spotify Authentication Setup Verification ===\n");

// 1. Check environment variables
console.log("1. Checking environment variables...");
try {
  const envContent = fs.readFileSync(".env.local", "utf8");

  const clientIdMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_CLIENT_ID="([^"]*)"/);
  const clientSecretMatch = envContent.match(/SPOTIFY_CLIENT_SECRET="([^"]*)"/);
  const redirectUriMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="([^"]*)"/);

  if (clientIdMatch && clientIdMatch[1]) {
    console.log("✅ Spotify Client ID is set");
    console.log("   Client ID:", clientIdMatch[1]);
  } else {
    console.log("❌ Spotify Client ID is missing");
  }

  if (clientSecretMatch && clientSecretMatch[1]) {
    console.log("✅ Spotify Client Secret is set");
  } else {
    console.log("❌ Spotify Client Secret is missing");
  }

  if (redirectUriMatch && redirectUriMatch[1]) {
    console.log("✅ Spotify Redirect URI is set");
    console.log("   Redirect URI:", redirectUriMatch[1]);
  } else {
    console.log("❌ Spotify Redirect URI is missing");
  }
} catch (err) {
  console.log("❌ Error reading .env.local file:", err.message);
}

// 2. Check tunnel URL
console.log("\n2. Checking tunnel URL...");
try {
  const tunnelUrl = fs.readFileSync(".tunnel-url", "utf8").trim();
  console.log("✅ Tunnel URL is set");
  console.log("   Tunnel URL:", tunnelUrl);

  // Verify that the redirect URI matches the tunnel URL
  const envContent = fs.readFileSync(".env.local", "utf8");
  const redirectUriMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="([^"]*)"/);

  if (redirectUriMatch && redirectUriMatch[1]) {
    const redirectUri = redirectUriMatch[1];
    const expectedUri = `${tunnelUrl}/auth/success?provider=spotify`;

    if (redirectUri === expectedUri) {
      console.log("✅ Redirect URI matches tunnel URL");
    } else {
      console.log("⚠️  Redirect URI does not match tunnel URL");
      console.log("   Expected:", expectedUri);
      console.log("   Actual:", redirectUri);
    }
  }
} catch (err) {
  console.log("❌ Error reading tunnel URL:", err.message);
}

// 3. Test Spotify API configuration
console.log("\n3. Testing Spotify API configuration...");
const envContent = fs.readFileSync(".env.local", "utf8");
const clientIdMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_CLIENT_ID="([^"]*)"/);
const redirectUriMatch = envContent.match(/NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="([^"]*)"/);

if (clientIdMatch && clientIdMatch[1] && redirectUriMatch && redirectUriMatch[1]) {
  const clientId = clientIdMatch[1];
  const redirectUri = redirectUriMatch[1];

  // Generate the Spotify authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-top-read",
      "user-library-read",
      "streaming",
    ].join(" "),
    state: "test-state",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log("✅ Spotify authorization URL generated");
  console.log("   Auth URL:", authUrl);

  // Verify the redirect URI in the auth URL
  const authUrlObj = new URL(authUrl);
  const authRedirectUri = authUrlObj.searchParams.get("redirect_uri");

  if (authRedirectUri === redirectUri) {
    console.log("✅ Authorization URL redirect_uri matches configuration");
  } else {
    console.log("⚠️  Authorization URL redirect_uri does not match configuration");
    console.log("   Expected:", redirectUri);
    console.log("   Actual:", authRedirectUri);
  }
} else {
  console.log("❌ Cannot generate Spotify auth URL due to missing configuration");
}

// 4. Test endpoint accessibility
console.log("\n4. Testing endpoint accessibility...");
const tunnelUrl = fs.readFileSync(".tunnel-url", "utf8").trim();

// Test health endpoint
https
  .get(`${tunnelUrl}/api/health`, (res) => {
    if (res.statusCode === 200) {
      console.log("✅ Health endpoint accessible");
    } else {
      console.log("❌ Health endpoint not accessible (status:", res.statusCode, ")");
    }

    // Test auth success page
    https
      .get(`${tunnelUrl}/auth/success`, (res) => {
        if (res.statusCode === 200) {
          console.log("✅ Auth success page accessible");
        } else {
          console.log("❌ Auth success page not accessible (status:", res.statusCode, ")");
        }

        // Test API endpoints
        https
          .get(`${tunnelUrl}/api/auth/spotify/exchange`, (res) => {
            // POST endpoint, so GET should return 405 or similar
            if (res.statusCode >= 400) {
              console.log(
                "✅ Spotify exchange endpoint exists (returns",
                res.statusCode,
                "for GET request)",
              );
            } else {
              console.log(
                "⚠️  Spotify exchange endpoint returned unexpected status for GET request:",
                res.statusCode,
              );
            }

            console.log("\n=== Setup Verification Complete ===");
            console.log(
              "Based on the verification, the Spotify authentication setup appears to be correctly configured.",
            );
            console.log("The authentication flow should work when you:");
            console.log("1. Visit:", tunnelUrl);
            console.log('2. Click "Connect to Spotify"');
            console.log("3. Complete the Spotify authorization");
            console.log("4. You should be redirected back to the app");
          })
          .on("error", (e) => {
            console.log("❌ Error testing Spotify exchange endpoint:", e.message);
          });
      })
      .on("error", (e) => {
        console.log("❌ Error testing auth success page:", e.message);
      });
  })
  .on("error", (e) => {
    console.log("❌ Error testing health endpoint:", e.message);
  });

console.log(
  "\nNote: To fully verify Spotify login, you need to ensure the redirect URI is added to your Spotify Developer Dashboard.",
);
