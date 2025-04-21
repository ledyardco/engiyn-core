/**
 * Engiyn SDK for Node.js
 * Provides utilities for loading and validating plugin manifests
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Load schema
const loadSchema = () => {
  const schemaPath = path.resolve(__dirname, '../plugin_schema.json');
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
};

/**
 * Load and validate a plugin manifest
 * @param {string} manifestPath - Path to the plugin.json manifest
 * @returns {object} The validated manifest
 */
const loadManifest = (manifestPath) => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const schema = loadSchema();
  
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  
  if (!validate(manifest)) {
    throw new Error(`Invalid plugin manifest: ${JSON.stringify(validate.errors)}`);
  }
  
  return manifest;
};

/**
 * Plugin class for Node.js
 */
class Plugin {
  /**
   * Create a new Plugin instance
   * @param {object} manifest - The plugin manifest
   */
  constructor(manifest) {
    this.manifest = manifest;
  }
  
  /**
   * Register HTTP endpoints with Express
   * @param {object} app - Express app instance
   */
  registerHttp(app) {
    // Implementation will depend on how plugins expose HTTP endpoints
    console.log(`Registering HTTP endpoints for ${this.manifest.name}`);
  }
  
  /**
   * Register CLI commands
   * @param {object} cli - CLI command group
   */
  registerCli(cli) {
    // Implementation will depend on CLI framework
    console.log(`Registering CLI commands for ${this.manifest.name}`);
  }
}

module.exports = {
  loadManifest,
  Plugin
};
