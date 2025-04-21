/**
 * Server utilities for the Engiyn CLI
 * 
 * Handles starting, stopping, and checking the status of the Engiyn server.
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const os = require('os');

// Server configuration
const SERVER_URL = 'http://localhost:5005';
const SERVER_TIMEOUT = 5000; // 5 seconds

/**
 * Check if the Engiyn server is running
 * @returns {Promise<boolean>} True if the server is running
 */
async function checkServerStatus() {
  try {
    const response = await axios.get(`${SERVER_URL}/status`, { timeout: SERVER_TIMEOUT });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Start the Engiyn server
 * @returns {Promise<boolean>} True if the server was started successfully
 */
async function startServer() {
  // Check if the server is already running
  const serverRunning = await checkServerStatus();
  if (serverRunning) {
    console.log(chalk.green('✓ Engiyn server is already running'));
    return true;
  }

  // Find the Python executable
  const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
  
  // Get the path to the cloudbridge.py file
  const cloudbridgePath = path.resolve(process.cwd(), 'cloudbridge.py');
  
  // Start the spinner
  const spinner = ora('Starting Engiyn server...').start();
  
  // Start the server
  const server = spawn(pythonCmd, [cloudbridgePath], {
    detached: true,
    stdio: 'ignore'
  });
  
  // Unref the child process so it can run independently
  server.unref();
  
  // Wait for the server to start
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const status = await checkServerStatus();
    if (status) {
      spinner.succeed('Engiyn server started successfully');
      return true;
    }
    attempts++;
    spinner.text = `Starting Engiyn server... (${attempts}/${maxAttempts})`;
  }
  
  spinner.fail('Failed to start Engiyn server');
  return false;
}

/**
 * Stop the Engiyn server
 * @returns {Promise<boolean>} True if the server was stopped successfully
 */
async function stopServer() {
  // Check if the server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log(chalk.yellow('! Engiyn server is not running'));
    return true;
  }
  
  // Start the spinner
  const spinner = ora('Stopping Engiyn server...').start();
  
  try {
    // Send a shutdown request to the server
    await axios.post(`${SERVER_URL}/shutdown`, {}, { timeout: SERVER_TIMEOUT });
    
    // Wait for the server to stop
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await checkServerStatus();
      if (!status) {
        spinner.succeed('Engiyn server stopped successfully');
        return true;
      }
      attempts++;
      spinner.text = `Stopping Engiyn server... (${attempts}/${maxAttempts})`;
    }
    
    spinner.fail('Failed to stop Engiyn server gracefully');
    return false;
  } catch (error) {
    spinner.fail(`Error stopping Engiyn server: ${error.message}`);
    return false;
  }
}

module.exports = {
  checkServerStatus,
  startServer,
  stopServer,
  SERVER_URL
};
