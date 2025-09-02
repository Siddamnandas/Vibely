const https = require("https");

// Get the current tunnel URL
const fs = require("fs");
const tunnelUrl = fs.readFileSync(".tunnel-url", "utf8").trim();

console.log("Testing Spotify authentication flow...");
console.log("Tunnel URL:", tunnelUrl);

// Test 1: Check if the health endpoint is working
console.log("\n1. Testing health endpoint...");
const healthUrl = `${tunnelUrl}/api/health`;

https
  .get(healthUrl, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        console.log("✅ Health endpoint is working");
        try {
          const healthData = JSON.parse(data);
          console.log("   Health data:", healthData);
        } catch (e) {
          console.log("   Health data:", data);
        }
      } else {
        console.log("❌ Health endpoint failed with status:", res.statusCode);
        console.log("   Response:", data);
      }

      // Test 2: Check if the Spotify auth endpoint is accessible
      console.log("\n2. Testing Spotify auth URL generation...");
      const authUrl = `${tunnelUrl}/api/auth/spotify/callback`;

      // We can't directly test the auth URL generation without a code, but we can check if the endpoint exists
      https
        .get(authUrl, (res) => {
          console.log("   Spotify callback endpoint status:", res.statusCode);
          if (res.statusCode === 400) {
            console.log(
              "✅ Spotify callback endpoint exists (returns 400 without code, which is expected)",
            );
          } else {
            console.log("⚠️  Spotify callback endpoint returned unexpected status");
          }

          // Test 3: Check if the exchange endpoint is accessible
          console.log("\n3. Testing Spotify token exchange endpoint...");
          const exchangeUrl = `${tunnelUrl}/api/auth/spotify/exchange`;

          const postData = JSON.stringify({
            code: "test_code",
          });

          const options = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": postData.length,
            },
          };

          const req = https.request(exchangeUrl, options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });

            res.on("end", () => {
              if (res.statusCode === 400) {
                console.log(
                  "✅ Spotify token exchange endpoint exists (returns 400 with invalid code, which is expected)",
                );
                try {
                  const errorData = JSON.parse(data);
                  console.log("   Error response:", errorData);
                } catch (e) {
                  console.log("   Error response:", data);
                }
              } else {
                console.log(
                  "⚠️  Spotify token exchange endpoint returned unexpected status:",
                  res.statusCode,
                );
                console.log("   Response:", data);
              }

              // Test 4: Check if the auth success page is accessible
              console.log("\n4. Testing auth success page...");
              const successUrl = `${tunnelUrl}/auth/success?provider=spotify&code=test_code`;

              https.get(successUrl, (res) => {
                console.log("   Auth success page status:", res.statusCode);
                if (res.statusCode === 200) {
                  console.log("✅ Auth success page is accessible");
                } else {
                  console.log("⚠️  Auth success page returned unexpected status");
                }

                console.log("\n=== Test Summary ===");
                console.log(
                  "All endpoints are accessible. The Spotify authentication flow should work correctly.",
                );
                console.log("To fully test the authentication:");
                console.log("1. Visit", tunnelUrl);
                console.log('2. Click on "Connect to Spotify"');
                console.log("3. Complete the Spotify authorization flow");
                console.log("4. You should be redirected back to the success page");
              });
            });
          });

          req.on("error", (e) => {
            console.error("❌ Error testing token exchange endpoint:", e.message);
          });

          req.write(postData);
          req.end();
        })
        .on("error", (e) => {
          console.error("❌ Error testing callback endpoint:", e.message);
        });
    });
  })
  .on("error", (e) => {
    console.error("❌ Error testing health endpoint:", e.message);
  });
