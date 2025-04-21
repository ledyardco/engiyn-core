# Engiyn Multi-Cloud Dashboard

A real-time dashboard for monitoring cloud infrastructure across multiple providers using Engiyn Core.

## Features

- **Real-time Monitoring**: Live updates of server status across all cloud providers
- **Multi-Cloud Support**: Works with Hetzner, DigitalOcean, and Vultr
- **Server Management**: Create and delete servers directly from the dashboard
- **Metrics Visualization**: Track server counts and status over time
- **Filtering**: Filter servers by provider and status

## Screenshots

![Dashboard Overview](https://via.placeholder.com/800x450?text=Engiyn+Dashboard)

## Installation

```bash
# Install dependencies
npm install

# Start the dashboard server
npm start
```

The dashboard will be available at http://localhost:3000

## Requirements

- Engiyn Core server running on http://localhost:5005
- Configured cloud provider API keys
- Node.js 16+

## How It Works

1. The dashboard connects to the Engiyn Core server via HTTP and WebSockets
2. It fetches data about available cloud providers and servers
3. Server metrics are collected and displayed in real-time
4. The dashboard can create and delete servers via the Engiyn API

## Architecture

- **Express.js**: Backend server for API endpoints and static file serving
- **Socket.IO**: Real-time updates between server and clients
- **Chart.js**: Data visualization for server metrics
- **Node-cron**: Scheduled tasks for regular data updates

## Development

```bash
# Install dependencies
npm install

# Start in development mode with auto-reload
npm run dev
```

## Using with Engiyn CLI

You can use the Engiyn CLI alongside the dashboard:

```bash
# Add a cloud provider
dev cloud add hetzner

# List servers (will also appear in dashboard)
dev server list

# Create a server (will appear in dashboard)
dev server create
```

## Next Steps

- Add server performance metrics (CPU, memory, disk)
- Implement cost tracking and budgeting
- Add alerting for server status changes
- Support for more cloud providers
