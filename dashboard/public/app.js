/**
 * Engiyn Dashboard - Frontend Application
 * 
 * Handles real-time updates, UI interactions, and data visualization
 * for the multi-cloud monitoring dashboard.
 */

// Connect to Socket.IO server
const socket = io();

// DOM Elements
const engiynStatusEl = document.getElementById('engiyn-status');
const lastUpdateEl = document.getElementById('last-update');
const totalServersEl = document.getElementById('total-servers');
const activeServersEl = document.getElementById('active-servers');
const providersListEl = document.getElementById('providers-list');
const serversTableEl = document.getElementById('servers-table');
const serversTbodyEl = document.getElementById('servers-tbody');
const providerFilterEl = document.getElementById('provider-filter');
const statusFilterEl = document.getElementById('status-filter');
const refreshBtnEl = document.getElementById('refresh-btn');
const createServerBtnEl = document.getElementById('create-server-btn');
const createServerModalEl = document.getElementById('create-server-modal');
const createServerFormEl = document.getElementById('create-server-form');
const serverProviderEl = document.getElementById('server-provider');
const closeModalEl = document.querySelector('.close');
const cancelBtnEl = document.querySelector('.cancel');

// Chart instance
let serversChart = null;

// Current monitoring data
let currentData = null;

// Initialize the dashboard
function initDashboard() {
  // Set up event listeners
  refreshBtnEl.addEventListener('click', refreshData);
  createServerBtnEl.addEventListener('click', openCreateServerModal);
  closeModalEl.addEventListener('click', closeCreateServerModal);
  cancelBtnEl.addEventListener('click', closeCreateServerModal);
  createServerFormEl.addEventListener('submit', handleCreateServer);
  providerFilterEl.addEventListener('change', filterServers);
  statusFilterEl.addEventListener('change', filterServers);
  
  // Set up Socket.IO event listeners
  socket.on('connect', () => {
    console.log('Connected to server');
    updateEngiynStatus(true);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateEngiynStatus(false);
  });
  
  socket.on('monitoring-data', (data) => {
    console.log('Received monitoring data:', data);
    updateDashboard(data);
  });
  
  // Initial data fetch
  fetchData();
}

// Fetch data from the API
async function fetchData() {
  try {
    const response = await fetch('/api/monitoring-data');
    const data = await response.json();
    updateDashboard(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    updateEngiynStatus(false);
  }
}

// Refresh data manually
async function refreshData() {
  refreshBtnEl.disabled = true;
  refreshBtnEl.textContent = 'Refreshing...';
  
  try {
    const response = await fetch('/api/refresh', {
      method: 'POST'
    });
    await response.json();
  } catch (error) {
    console.error('Error refreshing data:', error);
  } finally {
    refreshBtnEl.disabled = false;
    refreshBtnEl.textContent = 'Refresh Data';
  }
}

// Update Engiyn server status indicator
function updateEngiynStatus(isRunning) {
  if (isRunning) {
    engiynStatusEl.textContent = 'Running';
    engiynStatusEl.style.color = 'var(--success-color)';
  } else {
    engiynStatusEl.textContent = 'Offline';
    engiynStatusEl.style.color = 'var(--danger-color)';
  }
}

// Update the dashboard with new data
function updateDashboard(data) {
  if (!data) return;
  
  currentData = data;
  
  // Update status bar
  if (data.lastUpdate) {
    lastUpdateEl.textContent = formatDate(data.lastUpdate);
  }
  
  // Count total and active servers
  let totalServers = 0;
  let activeServers = 0;
  
  Object.values(data.servers || {}).forEach(providerServers => {
    totalServers += providerServers.length;
    activeServers += providerServers.filter(server => 
      ['running', 'active'].includes(server.status.toLowerCase())
    ).length;
  });
  
  totalServersEl.textContent = totalServers;
  activeServersEl.textContent = activeServers;
  
  // Update providers list
  updateProvidersList(data);
  
  // Update servers table
  updateServersTable(data);
  
  // Update chart
  updateServersChart(data);
  
  // Update provider filter options
  updateProviderFilter(data.providers || []);
}

// Update the providers list
function updateProvidersList(data) {
  if (!data.providers || !data.servers) return;
  
  providersListEl.innerHTML = '';
  
  data.providers.forEach(provider => {
    const servers = data.servers[provider] || [];
    const activeServers = servers.filter(server => 
      ['running', 'active'].includes(server.status.toLowerCase())
    ).length;
    
    const providerItem = document.createElement('div');
    providerItem.className = 'provider-item';
    providerItem.innerHTML = `
      <div class="provider-icon">${provider.charAt(0).toUpperCase()}</div>
      <div class="provider-info">
        <div class="provider-name">${capitalizeFirstLetter(provider)}</div>
        <div class="provider-stats">
          ${servers.length} servers (${activeServers} active)
        </div>
      </div>
    `;
    
    providersListEl.appendChild(providerItem);
  });
  
  if (data.providers.length === 0) {
    providersListEl.innerHTML = '<div class="loading">No providers found</div>';
  }
}

// Update the servers table
function updateServersTable(data) {
  if (!data.servers) return;
  
  // Get current filter values
  const providerFilter = providerFilterEl.value;
  const statusFilter = statusFilterEl.value;
  
  // Flatten all servers into a single array
  let allServers = [];
  Object.entries(data.servers).forEach(([provider, servers]) => {
    allServers = allServers.concat(servers.map(server => ({
      ...server,
      provider
    })));
  });
  
  // Apply filters
  if (providerFilter !== 'all') {
    allServers = allServers.filter(server => server.provider === providerFilter);
  }
  
  if (statusFilter !== 'all') {
    allServers = allServers.filter(server => {
      const status = server.status.toLowerCase();
      if (statusFilter === 'running') {
        return ['running', 'active'].includes(status);
      } else if (statusFilter === 'stopped') {
        return ['stopped', 'off'].includes(status);
      }
      return true;
    });
  }
  
  // Clear table
  serversTbodyEl.innerHTML = '';
  
  // Add rows
  if (allServers.length === 0) {
    serversTbodyEl.innerHTML = '<tr><td colspan="7" class="loading">No servers found</td></tr>';
    return;
  }
  
  allServers.forEach(server => {
    const row = document.createElement('tr');
    
    // Determine status class
    let statusClass = 'status-unknown';
    const status = server.status.toLowerCase();
    if (['running', 'active'].includes(status)) {
      statusClass = 'status-running';
    } else if (['starting', 'provisioning'].includes(status)) {
      statusClass = 'status-starting';
    } else if (['stopped', 'off'].includes(status)) {
      statusClass = 'status-stopped';
    }
    
    row.innerHTML = `
      <td>${server.name}</td>
      <td>${capitalizeFirstLetter(server.provider)}</td>
      <td><span class="status-badge ${statusClass}">${server.status}</span></td>
      <td>${server.ip || 'N/A'}</td>
      <td>${server.type || 'N/A'}</td>
      <td>${server.location || 'N/A'}</td>
      <td class="server-actions">
        <button class="view-btn" data-id="${server.id}" data-provider="${server.provider}">View</button>
        <button class="danger delete-btn" data-id="${server.id}" data-provider="${server.provider}">Delete</button>
      </td>
    `;
    
    // Add event listeners to buttons
    row.querySelector('.view-btn').addEventListener('click', () => viewServer(server));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteServer(server));
    
    serversTbodyEl.appendChild(row);
  });
}

// Update the servers chart
function updateServersChart(data) {
  if (!data.history) return;
  
  const ctx = document.getElementById('servers-chart').getContext('2d');
  
  // Prepare data for the chart
  const datasets = [];
  const providers = Object.keys(data.history);
  
  providers.forEach((provider, index) => {
    const history = data.history[provider] || [];
    
    // Get colors based on index
    const colors = getChartColors(index);
    
    datasets.push({
      label: `${capitalizeFirstLetter(provider)} - Total`,
      data: history.map(entry => entry.serverCount),
      borderColor: colors.total,
      backgroundColor: colors.totalBg,
      borderWidth: 2,
      tension: 0.4,
      fill: false
    });
    
    datasets.push({
      label: `${capitalizeFirstLetter(provider)} - Active`,
      data: history.map(entry => entry.activeCount),
      borderColor: colors.active,
      backgroundColor: colors.activeBg,
      borderWidth: 2,
      tension: 0.4,
      fill: false
    });
  });
  
  // Get labels (timestamps)
  const labels = providers.length > 0 && data.history[providers[0]]
    ? data.history[providers[0]].map(entry => formatChartDate(entry.timestamp))
    : [];
  
  // Destroy existing chart if it exists
  if (serversChart) {
    serversChart.destroy();
  }
  
  // Create new chart
  serversChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  });
}

// Update provider filter options
function updateProviderFilter(providers) {
  // Save current selection
  const currentValue = providerFilterEl.value;
  
  // Clear options except "All Providers"
  while (providerFilterEl.options.length > 1) {
    providerFilterEl.remove(1);
  }
  
  // Add options for each provider
  providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = capitalizeFirstLetter(provider);
    providerFilterEl.appendChild(option);
  });
  
  // Restore selection if it still exists
  if (currentValue !== 'all' && providers.includes(currentValue)) {
    providerFilterEl.value = currentValue;
  }
  
  // Update server provider dropdown in create form
  serverProviderEl.innerHTML = '';
  providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = capitalizeFirstLetter(provider);
    serverProviderEl.appendChild(option);
  });
}

// Filter servers based on selected filters
function filterServers() {
  if (currentData) {
    updateServersTable(currentData);
  }
}

// Open the create server modal
function openCreateServerModal() {
  createServerModalEl.style.display = 'block';
}

// Close the create server modal
function closeCreateServerModal() {
  createServerModalEl.style.display = 'none';
  createServerFormEl.reset();
}

// Handle create server form submission
async function handleCreateServer(event) {
  event.preventDefault();
  
  const provider = serverProviderEl.value;
  const name = document.getElementById('server-name').value;
  const type = document.getElementById('server-type').value;
  const location = document.getElementById('server-location').value;
  
  // Map UI values to provider-specific parameters
  const serverOptions = { name };
  
  if (provider === 'hetzner') {
    // Map type to Hetzner server types
    const typeMap = {
      small: 'cx11',
      medium: 'cx21',
      large: 'cx31'
    };
    
    // Map location to Hetzner locations
    const locationMap = {
      us: 'ash',
      eu: 'nbg1',
      asia: 'hel1'
    };
    
    serverOptions.server_type = typeMap[type] || 'cx11';
    serverOptions.location = locationMap[location] || 'nbg1';
    serverOptions.image = 'ubuntu-22.04';
  } else if (provider === 'digitalocean') {
    // Map type to DigitalOcean sizes
    const typeMap = {
      small: 's-1vcpu-1gb',
      medium: 's-1vcpu-2gb',
      large: 's-2vcpu-2gb'
    };
    
    // Map location to DigitalOcean regions
    const locationMap = {
      us: 'nyc1',
      eu: 'ams3',
      asia: 'sgp1'
    };
    
    serverOptions.size = typeMap[type] || 's-1vcpu-1gb';
    serverOptions.region = locationMap[location] || 'nyc1';
    serverOptions.image = 'ubuntu-22-04-x64';
  } else if (provider === 'vultr') {
    // Map type to Vultr plans
    const typeMap = {
      small: 'vc2-1c-1gb',
      medium: 'vc2-1c-2gb',
      large: 'vc2-2c-4gb'
    };
    
    // Map location to Vultr regions
    const locationMap = {
      us: 'ewr',
      eu: 'fra',
      asia: 'nrt'
    };
    
    serverOptions.plan = typeMap[type] || 'vc2-1c-1gb';
    serverOptions.region = locationMap[location] || 'ewr';
    serverOptions.os_id = 387; // Ubuntu 22.04
  }
  
  try {
    const response = await fetch(`/api/plugins/${provider}/servers/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serverOptions)
    });
    
    const result = await response.json();
    console.log('Server creation result:', result);
    
    // Close modal and refresh data
    closeCreateServerModal();
    refreshData();
    
    // Show success message
    alert(`Server creation initiated. It may take a few minutes to complete.`);
  } catch (error) {
    console.error('Error creating server:', error);
    alert(`Error creating server: ${error.message}`);
  }
}

// View server details
function viewServer(server) {
  alert(`Server Details:\nName: ${server.name}\nID: ${server.id}\nProvider: ${server.provider}\nStatus: ${server.status}\nIP: ${server.ip || 'N/A'}\nType: ${server.type || 'N/A'}\nLocation: ${server.location || 'N/A'}`);
}

// Delete a server
async function deleteServer(server) {
  if (!confirm(`Are you sure you want to delete server "${server.name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/plugins/${server.provider}/servers/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ server_id: server.id })
    });
    
    const result = await response.json();
    console.log('Server deletion result:', result);
    
    // Refresh data
    refreshData();
    
    // Show success message
    alert(`Server "${server.name}" deletion initiated.`);
  } catch (error) {
    console.error('Error deleting server:', error);
    alert(`Error deleting server: ${error.message}`);
  }
}

// Helper function to format dates
function formatDate(dateString) {
  return moment(dateString).format('MMM D, YYYY h:mm A');
}

// Helper function to format chart dates
function formatChartDate(dateString) {
  return moment(dateString).format('HH:mm');
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to get chart colors
function getChartColors(index) {
  const colorSets = [
    {
      total: 'rgba(52, 152, 219, 1)',
      totalBg: 'rgba(52, 152, 219, 0.2)',
      active: 'rgba(46, 204, 113, 1)',
      activeBg: 'rgba(46, 204, 113, 0.2)'
    },
    {
      total: 'rgba(155, 89, 182, 1)',
      totalBg: 'rgba(155, 89, 182, 0.2)',
      active: 'rgba(142, 68, 173, 1)',
      activeBg: 'rgba(142, 68, 173, 0.2)'
    },
    {
      total: 'rgba(230, 126, 34, 1)',
      totalBg: 'rgba(230, 126, 34, 0.2)',
      active: 'rgba(211, 84, 0, 1)',
      activeBg: 'rgba(211, 84, 0, 0.2)'
    }
  ];
  
  return colorSets[index % colorSets.length];
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);
