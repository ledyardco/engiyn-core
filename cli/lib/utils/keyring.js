/**
 * Keyring utilities for the Engiyn CLI
 * 
 * Provides secure storage for API keys and other sensitive information.
 */

const keytar = require('keytar');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Service name for keytar
const SERVICE_NAME = 'engiyn-cli';

// Fallback config file for environments without keytar support
const CONFIG_DIR = path.join(os.homedir(), '.engiyn');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Initialize the keyring
 * Ensures the config directory exists if needed
 */
function init() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
  }
}

/**
 * Check if keytar is available
 * @returns {boolean} True if keytar is available
 */
function isKeytarAvailable() {
  try {
    // Try to use keytar
    keytar.findCredentials(SERVICE_NAME);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get a value from the keyring
 * @param {string} key Key to get
 * @returns {Promise<string>} Value
 */
async function get(key) {
  if (isKeytarAvailable()) {
    return await keytar.getPassword(SERVICE_NAME, key);
  } else {
    // Fallback to config file
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config[key];
  }
}

/**
 * Set a value in the keyring
 * @param {string} key Key to set
 * @param {string} value Value to set
 * @returns {Promise<void>}
 */
async function set(key, value) {
  if (isKeytarAvailable()) {
    await keytar.setPassword(SERVICE_NAME, key, value);
  } else {
    // Fallback to config file
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config[key] = value;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
}

/**
 * Delete a value from the keyring
 * @param {string} key Key to delete
 * @returns {Promise<boolean>} True if deleted
 */
async function del(key) {
  if (isKeytarAvailable()) {
    return await keytar.deletePassword(SERVICE_NAME, key);
  } else {
    // Fallback to config file
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (config[key]) {
      delete config[key];
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      return true;
    }
    return false;
  }
}

/**
 * List all keys in the keyring
 * @returns {Promise<Array<string>>} List of keys
 */
async function list() {
  if (isKeytarAvailable()) {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    return credentials.map(cred => cred.account);
  } else {
    // Fallback to config file
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return Object.keys(config);
  }
}

// Initialize the keyring
init();

module.exports = {
  get,
  set,
  del,
  list,
  isKeytarAvailable
};
