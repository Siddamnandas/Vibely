const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { checkTunnelRunning, savePid, removePid } = require("./check-tunnel");

// Configuration
const PORT = 3002;
const RESTART_DELAY = 5000;
const MAX_RESTART_ATTEMPTS = 5;
let restartAttempts = 0;
let currentTunnelUrl = null;
let ltProcess = null;

// Check if tunnel is already running
if (checkTunnelRunning()) {
  process.exit(1);
}

// Save current PID
savePid();

// Function to update .env.local file
function updateEnvFile(url) {
  const envPath = ".env.local";
  try {
    let envContent = fs.readFileSync(envPath, "utf8");
    const newRedirectUri = `${url}/auth/success?provider=spotify`;
    const regex = /NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="[^"]*"/;
    const replacement = `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="${newRedirectUri}"`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, replacement);
    } else {
      // Add the line if it doesn't exist
      envContent += `\nNEXT_PUBLIC_SPOTIFY_REDIRECT_URI="${newRedirectUri}"\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env.local with tunnel URL");
    console.log(`   Redirect URI: ${newRedirectUri}`);
    return true;
  } catch (err) {
    console.error("❌ Error updating .env.local:", err.message);
    return false;
  }
}

// Function to verify .env.local was updated
function verifyEnvUpdate(url) {
  try {
    const envContent = fs.readFileSync(".env.local", "utf8");
    const expectedUri = `${url}/auth/success?provider=spotify`;
    const regex = new RegExp(`NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="${expectedUri}"`);
    return regex.test(envContent);
  } catch (err) {
    console.error("❌ Error verifying .env.local update:", err.message);
    return false;
  }
}

// Function to test if the tunnel URL is working
function testTunnelUrl(url, callback) {
  const testUrl = `${url}/api/health`;

  // Use https module for https URLs
  const httpModule = url.startsWith("https") ? require("https") : require("http");

  const req = httpModule.get(testUrl, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      callback(null, res.statusCode === 200, data);
    });
  });

  req.on("error", (err) => {
    callback(err, false, null);
  });

  req.setTimeout(10000, () => {
    req.destroy();
    callback(new Error("Timeout"), false, null);
  });
}

// Function to start localtunnel
function startLocaltunnel() {
  console.log(`🚀 Starting localtunnel on port ${PORT}...`);

  // Kill any existing process
  if (ltProcess) {
    ltProcess.kill();
    ltProcess = null;
  }

  ltProcess = spawn("npx", ["localtunnel", "--port", PORT.toString()], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let urlCaptured = false;
  let heartbeatTimer = null;

  // Set up heartbeat to detect if tunnel is still alive
  function setupHeartbeat(url) {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }

    heartbeatTimer = setInterval(async () => {
      testTunnelUrl(url, (err, success, data) => {
        if (success) {
          console.log(`💓 Tunnel heartbeat OK: ${url}`);
        } else {
          console.warn(
            `⚠️  Tunnel heartbeat failed for ${url}:`,
            err ? err.message : "Health check failed",
          );
          // If heartbeat fails, restart the tunnel
          console.log("🔄 Restarting tunnel due to failed heartbeat...");
          restartTunnel();
        }
      });
    }, 60000); // Check every 60 seconds
  }

  ltProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("[Localtunnel]", output.trim());

    // Capture the URL
    if (!urlCaptured) {
      const urlMatch = output.match(/https:\/\/[^\s]+\.loca\.lt/);
      if (urlMatch) {
        const url = urlMatch[0];
        currentTunnelUrl = url;
        console.log("🔗 Tunnel URL captured:", url);
        fs.writeFileSync(".tunnel-url", url);
        urlCaptured = true;
        restartAttempts = 0; // Reset restart attempts on successful connection

        // Update .env.local with the new URL
        if (updateEnvFile(url)) {
          // Verify the update
          if (verifyEnvUpdate(url)) {
            console.log("✅ .env.local update verified");
          } else {
            console.warn("⚠️  .env.local update could not be verified");
          }
        }

        // Set up heartbeat monitoring after a short delay to allow the app to start
        setTimeout(() => {
          setupHeartbeat(url);
        }, 15000);

        // Show configuration info
        console.log("\n📋 Spotify Configuration Info:");
        console.log(`   Add this redirect URI to your Spotify Developer Dashboard:`);
        console.log(`   ${url}/auth/success?provider=spotify`);
        console.log(`\n🌐 Your application will be accessible at: ${url}\n`);

        // Test the tunnel after a short delay
        setTimeout(() => {
          testTunnelUrl(url, (err, success, data) => {
            if (success) {
              console.log("✅ Tunnel connection test successful");
            } else {
              console.warn("⚠️  Tunnel connection test failed:", err ? err.message : "No response");
            }
          });
        }, 10000);
      }
    }
  });

  ltProcess.stderr.on("data", (data) => {
    const errorOutput = data.toString();
    console.error("[Localtunnel Error]", errorOutput.trim());

    // Check for specific error patterns that indicate we should restart
    if (
      errorOutput.includes("ECONNRESET") ||
      errorOutput.includes("ETIMEDOUT") ||
      errorOutput.includes("ENOTFOUND") ||
      errorOutput.includes("socket hang up") ||
      errorOutput.includes("connect ECONNREFUSED")
    ) {
      console.log("📡 Network error detected, will restart tunnel...");
      restartTunnel();
    }
  });

  ltProcess.on("close", (code) => {
    console.log(`\n🚪 Localtunnel process exited with code ${code}`);

    // Clear heartbeat timer
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    // Restart logic with attempt limiting
    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(
        `⏳ Restarting in ${RESTART_DELAY / 1000} seconds... (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`,
      );
      setTimeout(startLocaltunnel, RESTART_DELAY);
    } else {
      console.error(
        `❌ Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Please check your network connection and try again.`,
      );
      process.exit(1);
    }
  });

  ltProcess.on("error", (err) => {
    console.error("💥 Failed to start localtunnel process:", err.message);

    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(
        `⏳ Retrying in ${RESTART_DELAY / 1000} seconds... (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`,
      );
      setTimeout(startLocaltunnel, RESTART_DELAY);
    } else {
      console.error(
        `❌ Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Please check your setup and try again.`,
      );
      process.exit(1);
    }
  });
}

// Function to restart the tunnel
function restartTunnel() {
  console.log("🔄 Restarting tunnel...");
  if (ltProcess) {
    ltProcess.kill();
    ltProcess = null;
  }

  // Clear any existing timers
  setTimeout(startLocaltunnel, 1000);
}

// Handle process interruption
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down localtunnel...");
  removePid();
  if (ltProcess) {
    ltProcess.kill();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down localtunnel...");
  removePid();
  if (ltProcess) {
    ltProcess.kill();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  removePid();
  process.exit(1);
});

// Start the tunnel
console.log(`🚀 Localtunnel will expose port ${PORT} with automatic restart on failure`);
console.log("🔒 Ensuring only one instance runs at a time...\n");
startLocaltunnel();
