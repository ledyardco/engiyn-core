# Engiyn Core

The core engine for Engiyn plugins: multi-cloud, AI/IDE, and protocol integrations.

Features:
- Plugin manifest spec (`plugin_schema.json`)
- Python & Node.js SDKs (`python-sdk/`, `node-sdk/`)
- Hello-world plugin template (`templates/hello-world-plugin`)
- CI workflow (`.github/workflows/ci.yml`)

Get started by reviewing the manifest schema and SDK examples.

## Quickstart

**Python SDK**
```bash
cd python-sdk
pip install .
``` 

**Node.js SDK**
```bash
cd node-sdk
npm install
``` 

**Hello-World Plugin**
```bash
# Start core server
FLASK_APP=templates/hello-world-plugin/index.py flask run
# Access endpoint
curl http://localhost:5005/hello
# Or via CLI
dev hello
```

## Usage

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

## Plugin Development

1. Copy `templates/hello-world-plugin` to `plugins/<your-plugin>`
2. Update `plugin.json`: name, version, type, entrypoint
3. Implement `register_http(app)` and/or `register_cli(cli)` in your module
4. Place plugin folder under `plugins/` and restart the core

## AI Model Integration

- The `plugin_schema.json` file defines plugin capabilities for LLMs
- Models can discover plugins by scanning `plugins/*/plugin.json`
- Example prompt for an AI agent:
```text
"You are the Engiyn AI assistant. List all available plugins and their HTTP endpoints."
```
- After discovery, models should call the registered HTTP endpoints or CLI commands accordingly
