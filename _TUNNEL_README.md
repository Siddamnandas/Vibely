# Vibely Development Tunnel Setup

This document explains how to set up and use the localtunnel for Spotify OAuth development.

## Why Use a Tunnel?

Spotify requires HTTPS redirect URIs for OAuth, which localhost doesn't provide. We use localtunnel to create a secure HTTPS endpoint that forwards to your local development server.

## Prerequisites

1. Next.js development server running on port 3002
2. Spotify Developer account with an application configured

## Setup Instructions

### 1. Start the Development Server

In one terminal, start the Next.js development server:

```bash
npm run dev
```

This will start the server on port 3002.

### 2. Start the Tunnel

In another terminal, start the tunnel:

```bash
npm run tunnel
```

This will:

- Create a secure HTTPS URL for your local server
- Automatically update your `.env.local` file with the correct redirect URI
- Display the Spotify configuration information
- Prevent multiple tunnel instances from running

### 3. Configure Spotify Developer Dashboard

The tunnel script will display the redirect URI you need to add to your Spotify application:

```
📋 Spotify Configuration Info:
   Add this redirect URI to your Spotify Developer Dashboard:
   https://your-tunnel-url.loca.lt/auth/success?provider=spotify
```

Add this URL to your Spotify application's "Redirect URIs" section.

### 4. Test the Setup

Visit your tunnel URL in a browser to access your development application:
https://your-tunnel-url.loca.lt

### 5. Stop the Tunnel

When you're done developing, stop the tunnel:

```bash
npm run tunnel:stop
```

## Troubleshooting

### "Tunnel process is already running" Error

If you see this message, it means a tunnel is already running. You can stop it with:

```bash
npm run tunnel:stop
```

### Tunnel Not Responding

If the tunnel URL doesn't respond:

1. Make sure the Next.js development server is running
2. Check that no firewall is blocking the connection
3. Restart the tunnel with `npm run tunnel:stop` followed by `npm run tunnel`

### Configuration Not Updating

If your `.env.local` file isn't updating:

1. Check that the tunnel script has write permissions to the file
2. Manually verify the redirect URI matches the tunnel URL

## Additional Commands

- `npm run show-spotify-config` - Display current Spotify configuration
- `npm run tunnel:stop` - Stop any running tunnel processes

## How It Works

The tunnel script:

1. Starts localtunnel on port 3002
2. Captures the generated HTTPS URL
3. Updates `.env.local` with the correct redirect URI
4. Monitors the tunnel connection with heartbeat checks
5. Automatically restarts if the connection fails
6. Prevents multiple instances from running simultaneously
