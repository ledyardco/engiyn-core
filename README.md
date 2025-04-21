# Engiyn Core

The core engine for Engiyn plugins: multi-cloud, AI/IDE, and protocol integrations.

## Features

- **Plugin System**: Extensible plugin architecture with manifest spec (`plugin_schema.json`)
- **Multi-Cloud Support**: Built-in plugins for Hetzner, DigitalOcean, and Vultr
- **SDK Libraries**: Python & Node.js SDKs for plugin development
- **Unified CLI**: Command-line interface for managing cloud resources
- **Plugin Templates**: Hello-world plugin template for quick starts
- **CI/CD Pipeline**: Automated testing and publishing

Get started by reviewing the manifest schema and SDK examples.

## Quickstart

### Install Core
```bash
# Install Python SDK
pip install -e .

# Install CLI
cd cli
npm install
npm link  # Makes the 'dev' command available globally
```

### Start the Server
```bash
# Start the Engiyn server
python cloudbridge.py
# Or use the CLI
dev server start
```

### Configure Cloud Providers
```bash
# Add your cloud provider API key
dev cloud add hetzner
dev cloud add digitalocean
dev cloud add vultr
```

### Manage Servers
```bash
# List all servers
dev server list

# Create a new server
dev server create

# Delete a server
dev server delete
```

## Architecture

### Plugin Loader
```python
# Load all plugins from the plugins directory
from cloudbridge import PluginLoader

loader = PluginLoader()
plugins = loader.load_all_plugins()

# Register HTTP endpoints with Flask
loader.register_http_endpoints(app)

# Register CLI commands with Click
loader.register_cli_commands(cli)
```

### Python SDK
```python
from engiyn_sdk import Plugin
plugin = Plugin('templates/hello-world-plugin/plugin.json')
plugin.register_http(app)
```

### Node.js SDK
```js
const { loadManifest, Plugin } = require('engiyn-sdk');
const manifest = loadManifest('templates/hello-world-plugin/plugin.json');
const plugin = new Plugin(manifest);
plugin.registerHttp(app);
```

### CLI
```bash
# Get help
dev help

# List cloud providers
dev cloud list

# List servers
dev server list

# List plugins
dev plugin list
```

## Plugin Development

1. Create a new plugin directory in `plugins/<your-plugin>`
2. Create a `plugin.json` manifest:
   ```json
   {
     "name": "your-plugin",
     "version": "0.1.0",
     "type": "cloud",
     "entrypoint": "your_plugin",
     "description": "Your plugin description"
   }
   ```
3. Implement your plugin in `__init__.py`:
   ```python
   def register_http(bp):
       # Register HTTP endpoints with Flask blueprint
       @bp.route('/hello', methods=['GET'])
       def hello():
           return 'Hello from your plugin!'
   
   def register_cli(cli_group):
       # Register CLI commands with Click group
       @cli_group.command('hello')
       def hello_cmd():
           click.echo('Hello from your plugin!')
   ```
4. Restart the Engiyn server to load your plugin

## Cloud Provider Support

Engiyn Core includes built-in plugins for the following cloud providers:

- **Hetzner Cloud**: Create and manage servers in Hetzner Cloud
- **DigitalOcean**: Manage droplets in DigitalOcean
- **Vultr**: Create and manage instances in Vultr

Each provider plugin implements a consistent API for server management:
- List servers: `GET /plugins/{provider}/servers`
- Create server: `POST /plugins/{provider}/servers/create`
- Delete server: `POST /plugins/{provider}/servers/delete`
- Get server details: `GET /plugins/{provider}/servers/{id}`

## AI Model Integration

- The `plugin_schema.json` file defines plugin capabilities for LLMs
- Models can discover plugins by scanning `plugins/*/plugin.json`
- Example prompt for an AI agent:
```text
"You are the Engiyn AI assistant. List all available cloud providers and their capabilities."
```
- After discovery, models can call the registered HTTP endpoints or CLI commands
