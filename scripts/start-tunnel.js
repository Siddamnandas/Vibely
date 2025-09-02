const localtunnel = require("localtunnel");

(async () => {
  const tunnel = await localtunnel({ port: 3002 });

  console.log("Localtunnel started!");
  console.log("Public URL:", tunnel.url);
  console.log("Add this URL to your Spotify Dashboard:");
  console.log(`${tunnel.url}/auth/success?provider=spotify`);

  // Save the tunnel URL to a file for later reference
  require("fs").writeFileSync(".tunnel-url", tunnel.url);

  tunnel.on("close", () => {
    console.log("Localtunnel closed");
  });

  // Handle process interruption
  process.on("SIGINT", () => {
    console.log("Shutting down localtunnel...");
    tunnel.close();
    process.exit(0);
  });
})();
