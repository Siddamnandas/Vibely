const { spawn } = require("child_process");
const fs = require("fs");

// Start localtunnel first
console.log("Starting localtunnel on port 3002...");

const lt = spawn("npx", ["localtunnel", "--port", "3002"], {
  stdio: ["pipe", "pipe", "pipe"],
});

let tunnelUrl = null;
let nextStarted = false;

lt.stdout.on("data", (data) => {
  const output = data.toString();
  console.log("[Localtunnel]", output);

  // Capture the URL
  if (!tunnelUrl) {
    const urlMatch = output.match(/https:\/\/[^\s]+\.loca\.lt/);
    if (urlMatch) {
      tunnelUrl = urlMatch[0];
      console.log("Tunnel URL captured:", tunnelUrl);
      fs.writeFileSync(".tunnel-url", tunnelUrl);

      // Update .env.local with the new URL
      const envPath = ".env.local";
      try {
        let envContent = fs.readFileSync(envPath, "utf8");
        const newRedirectUri = `${tunnelUrl}/auth/success?provider=spotify`;
        const regex = /NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="[^"]*"/;
        const replacement = `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI="${newRedirectUri}"`;

        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, replacement);
        } else {
          envContent += `\nNEXT_PUBLIC_SPOTIFY_REDIRECT_URI="${newRedirectUri}"`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log("Updated .env.local with tunnel URL");
        console.log(`Redirect URI: ${newRedirectUri}`);
      } catch (err) {
        console.error("Error updating .env.local:", err);
      }

      // Start Next.js dev server if not already started
      if (!nextStarted) {
        startNextDev();
      }
    }
  }
});

lt.stderr.on("data", (data) => {
  console.error("[Localtunnel Error]", data.toString());
});

lt.on("close", (code) => {
  console.log(`Localtunnel process exited with code ${code}`);
});

// Function to start Next.js dev server
function startNextDev() {
  if (nextStarted) return;

  nextStarted = true;
  console.log("Starting Next.js development server...");

  const next = spawn("npm", ["run", "dev"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  next.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("[Next.js]", output);
  });

  next.stderr.on("data", (data) => {
    console.error("[Next.js Error]", data.toString());
  });

  next.on("close", (code) => {
    console.log(`Next.js process exited with code ${code}`);
  });

  // Handle process interruption
  process.on("SIGINT", () => {
    console.log("Shutting down processes...");
    next.kill();
    lt.kill();
    process.exit(0);
  });
}

console.log("Starting development environment with tunnel...");
console.log("This may take a moment...");
