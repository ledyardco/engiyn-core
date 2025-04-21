/**
 * Engiyn Dashboard - Multi-Cloud Status Monitor
 * 
 * A real-time dashboard for monitoring instances across multiple cloud providers
 * using the Engiyn Core infrastructure.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = process.env.PORT || 3000;
const ENGIYN_API_URL = 'http://localhost:5005';
const CHECK_INTERVAL = '*/1 * * * *'; // Every minute

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store for our monitoring data
const monitoringData = {
  providers: {},
  servers: {},
  history: {},
  lastUpdate: null
};

// Function to check if Engiyn server is running
async function checkEngiynServer() {
  try {
    const response = await axios.get(`${ENGIYN_API_URL}/status`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Function to start Engiyn server if not running
async function ensureEngiynServerRunning() {
  const isRunning = await checkEngiynServer();
  if (!isRunning) {
    console.log('Engiyn server is not running. Attempting to start...');
    
    // Try to start the server using the CLI
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const engiynProcess = spawn(pythonCmd, [path.join(__dirname, '..', 'cloudbridge.py')], {
      detached: true,
      stdio: 'ignore'
    });
    
    engiynProcess.unref();
    
    // Wait for server to start
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await checkEngiynServer();
      if (status) {
        console.log('Engiyn server started successfully');
        return true;
      }
      attempts++;
    }
    
    console.error('Failed to start Engiyn server');
    return false;
  }
  
  return true;
}

// Function to fetch cloud providers
async function fetchCloudProviders() {
  try {
    const response = await axios.get(`${ENGIYN_API_URL}/plugins`);
    return response.data.plugins || [];
  } catch (error) {
    console.error('Error fetching cloud providers:', error.message);
    return [];
  }
}

// Function to fetch servers for a provider
async function fetchServers(provider) {
  try {
    const response = await axios.get(`${ENGIYN_API_URL}/plugins/${provider}/servers`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching servers for ${provider}:`, error.message);
    return { error: error.message };
  }
}

// Function to update monitoring data
async function updateMonitoringData() {
  console.log('Updating monitoring data...');
  
  // Ensure Engiyn server is running
  const serverRunning = await ensureEngiynServerRunning();
  if (!serverRunning) {
    console.error('Cannot update monitoring data: Engiyn server is not running');
    return;
  }
  
  // Fetch cloud providers
  const providers = await fetchCloudProviders();
  monitoringData.providers = providers;
  
  // Fetch servers for each provider
  for (const provider of providers) {
    const serverData = await fetchServers(provider);
    
    // Extract server data based on provider
    let servers = [];
    if (provider === 'hetzner' && serverData.servers) {
      servers = serverData.servers.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        provider,
        ip: s.public_net?.ipv4?.ip || 'N/A',
        created: s.created,
        type: s.server_type,
        location: s.datacenter?.location?.name || 'Unknown'
      }));
    } else if (provider === 'digitalocean' && serverData.droplets) {
      servers = serverData.droplets.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        provider,
        ip: s.networks?.v4?.[0]?.ip_address || 'N/A',
        created: s.created_at,
        type: s.size_slug,
        location: s.region?.name || 'Unknown'
      }));
    } else if (provider === 'vultr' && serverData.instances) {
      servers = serverData.instances.map(s => ({
        id: s.id,
        name: s.label,
        status: s.status,
        provider,
        ip: s.main_ip || 'N/A',
        created: s.date_created,
        type: s.plan,
        location: s.region || 'Unknown'
      }));
    }
    
    // Update server data
    monitoringData.servers[provider] = servers;
    
    // Update history
    const timestamp = new Date().toISOString();
    if (!monitoringData.history[provider]) {
      monitoringData.history[provider] = [];
    }
    
    // Keep only the last 24 data points (24 hours if checking hourly)
    if (monitoringData.history[provider].length >= 24) {
      monitoringData.history[provider].shift();
    }
    
    monitoringData.history[provider].push({
      timestamp,
      serverCount: servers.length,
      activeCount: servers.filter(s => ['running', 'active'].includes(s.status.toLowerCase())).length
    });
  }
  
  monitoringData.lastUpdate = new Date().toISOString();
  
  // Emit updated data to all connected clients
  io.emit('monitoring-data', monitoringData);
  
  // Save data to disk for persistence
  fs.writeFileSync(
    path.join(__dirname, 'data.json'),
    JSON.stringify(monitoringData, null, 2)
  );
  
  console.log('Monitoring data updated successfully');
}

// Load data from disk if available
try {
  if (fs.existsSync(path.join(__dirname, 'data.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
    Object.assign(monitoringData, data);
    console.log('Loaded monitoring data from disk');
  }
} catch (error) {
  console.error('Error loading monitoring data from disk:', error.message);
}

// Schedule regular updates
cron.schedule(CHECK_INTERVAL, updateMonitoringData);

// API Routes
app.get('/api/monitoring-data', (req, res) => {
  res.json(monitoringData);
});

app.post('/api/refresh', async (req, res) => {
  await updateMonitoringData();
  res.json({ success: true });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current data to the new client
  socket.emit('monitoring-data', monitoringData);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  
  // Initial data update
  updateMonitoringData();
});
