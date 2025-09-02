const fs = require("fs");
const path = require("path");

// Function to check if tunnel is already running
function checkTunnelRunning() {
  try {
    // Check if tunnel PID file exists
    const pidFile = path.join(__dirname, "..", ".tunnel.pid");
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, "utf8").trim();
      // Check if process with this PID is still running
      try {
        process.kill(pid, 0); // This doesn't actually kill the process, just checks if it exists
        console.log(`_tunnel process is already running with PID ${pid}`);
        console.log("Please stop the existing tunnel process before starting a new one:");
        console.log("  pkill -f robust-tunnel.js");
        return true;
      } catch (err) {
        // Process doesn't exist, remove the PID file
        fs.unlinkSync(pidFile);
        return false;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Function to save current process PID
function savePid() {
  try {
    const pidFile = path.join(__dirname, "..", ".tunnel.pid");
    fs.writeFileSync(pidFile, process.pid.toString());
  } catch (err) {
    console.error("Failed to save PID file:", err.message);
  }
}

// Function to remove PID file
function removePid() {
  try {
    const pidFile = path.join(__dirname, "..", ".tunnel.pid");
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch (err) {
    // Ignore errors
  }
}

module.exports = {
  checkTunnelRunning,
  savePid,
  removePid,
};
