/**
 * API client for the Engiyn server
 * 
 * Provides methods for interacting with the Engiyn server API.
 */

const axios = require('axios');
const { SERVER_URL } = require('./server');

/**
 * Create an API client for the Engiyn server
 * @returns {Object} API client
 */
function createApiClient() {
  const client = axios.create({
    baseURL: SERVER_URL,
    timeout: 10000
  });
  
  return {
    /**
     * Get the status of the Engiyn server
     * @returns {Promise<Object>} Server status
     */
    getStatus: async () => {
      const response = await client.get('/status');
      return response.data;
    },
    
    /**
     * List all available plugins
     * @returns {Promise<Array>} List of plugins
     */
    listPlugins: async () => {
      const response = await client.get('/plugins');
      return response.data.plugins;
    },
    
    /**
     * List all cloud providers
     * @returns {Promise<Array>} List of cloud providers
     */
    listCloudProviders: async () => {
      // Filter plugins by type 'cloud'
      const response = await client.get('/plugins');
      return response.data.plugins;
    },
    
    /**
     * List servers for a specific provider
     * @param {string} provider Provider name
     * @returns {Promise<Array>} List of servers
     */
    listServers: async (provider) => {
      const response = await client.get(`/plugins/${provider}/servers`);
      return response.data;
    },
    
    /**
     * Create a server for a specific provider
     * @param {string} provider Provider name
     * @param {Object} options Server options
     * @returns {Promise<Object>} Created server
     */
    createServer: async (provider, options) => {
      const response = await client.post(`/plugins/${provider}/servers/create`, options);
      return response.data;
    },
    
    /**
     * Delete a server for a specific provider
     * @param {string} provider Provider name
     * @param {string} serverId Server ID
     * @returns {Promise<Object>} Result of the deletion
     */
    deleteServer: async (provider, serverId) => {
      const response = await client.post(`/plugins/${provider}/servers/delete`, { server_id: serverId });
      return response.data;
    },
    
    /**
     * Get server details for a specific provider
     * @param {string} provider Provider name
     * @param {string} serverId Server ID
     * @returns {Promise<Object>} Server details
     */
    getServer: async (provider, serverId) => {
      const response = await client.get(`/plugins/${provider}/servers/${serverId}`);
      return response.data;
    }
  };
}

// Export a singleton instance of the API client
module.exports = createApiClient();
