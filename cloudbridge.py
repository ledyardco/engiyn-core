"""
Engiyn Cloud Bridge - Plugin Loader and API Server

This module provides the core functionality for loading plugins, registering their
HTTP endpoints and CLI commands, and exposing them through a unified API.
"""

import os
import sys
import json
import importlib
import pkgutil
from typing import Dict, List, Any, Optional

from flask import Flask, Blueprint, request, jsonify
import click
from threading import Thread

# Configuration paths
CONFIG_DIR = os.path.join(os.path.expanduser('~'), '.engiyn_cloud_bridge')
CONFIG_PATH = os.path.join(CONFIG_DIR, 'config.json')

# Initialize Flask app
app = Flask(__name__)

class Plugin:
    """
    Represents a loaded plugin with its manifest and module.
    """
    def __init__(self, name: str, manifest: Dict[str, Any], module: Any):
        self.name = name
        self.manifest = manifest
        self.module = module
    
    def register_http(self, app: Flask) -> None:
        """Register HTTP endpoints with the Flask app."""
        if hasattr(self.module, 'register_http'):
            self.module.register_http(app)
    
    def register_cli(self, cli_group: click.Group) -> None:
        """Register CLI commands with the Click group."""
        if hasattr(self.module, 'register_cli'):
            self.module.register_cli(cli_group)

class PluginLoader:
    """
    Responsible for discovering, loading, and registering plugins.
    """
    def __init__(self, plugins_dir: str = 'plugins'):
        self.plugins_dir = plugins_dir
        self.plugins: Dict[str, Plugin] = {}
    
    def discover_plugins(self) -> List[str]:
        """Discover available plugins in the plugins directory."""
        if not os.path.exists(self.plugins_dir):
            return []
        
        return [name for name in os.listdir(self.plugins_dir) 
                if os.path.isdir(os.path.join(self.plugins_dir, name))
                and not name.startswith('__')]
    
    def load_plugin(self, plugin_name: str) -> Optional[Plugin]:
        """Load a plugin by name."""
        plugin_dir = os.path.join(self.plugins_dir, plugin_name)
        manifest_path = os.path.join(plugin_dir, 'plugin.json')
        
        if not os.path.exists(manifest_path):
            print(f"Warning: No manifest found for plugin {plugin_name}")
            return None
        
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Add plugin directory to Python path
            if plugin_dir not in sys.path:
                sys.path.insert(0, plugin_dir)
            
            # Import the module specified in the manifest
            module_name = manifest.get('entrypoint', plugin_name)
            module = importlib.import_module(module_name)
            
            return Plugin(plugin_name, manifest, module)
        except Exception as e:
            print(f"Error loading plugin {plugin_name}: {e}")
            return None
    
    def load_all_plugins(self) -> Dict[str, Plugin]:
        """Discover and load all available plugins."""
        plugin_names = self.discover_plugins()
        
        for name in plugin_names:
            plugin = self.load_plugin(name)
            if plugin:
                self.plugins[name] = plugin
        
        return self.plugins
    
    def register_http_endpoints(self, app: Flask) -> None:
        """Register HTTP endpoints for all loaded plugins."""
        for name, plugin in self.plugins.items():
            # Create a blueprint for each plugin
            bp = Blueprint(name, __name__, url_prefix=f'/plugins/{name}')
            
            # Register plugin's HTTP endpoints
            plugin.register_http(bp)
            
            # Register the blueprint with the app
            app.register_blueprint(bp)
    
    def register_cli_commands(self, cli: click.Group) -> None:
        """Register CLI commands for all loaded plugins."""
        for name, plugin in self.plugins.items():
            # Create a command group for each plugin
            group = click.Group(name=name, help=f"Commands for {name} plugin")
            
            # Register plugin's CLI commands
            plugin.register_cli(group)
            
            # Add the group to the main CLI
            cli.add_command(group)

# --- Configuration Management ---
def load_config() -> Dict[str, Any]:
    """Load configuration from file."""
    if not os.path.exists(CONFIG_PATH):
        return {}
    
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to file."""
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)
    
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config, f, indent=2)

# --- License Check (Placeholder) ---
def check_license() -> Dict[str, str]:
    """Check if the license is valid."""
    # For PoC, always return active
    return {'status': 'active'}

# --- Load env.local for provider API keys ---
def load_env_local() -> None:
    """Load environment variables from env.local file."""
    env_file = os.path.join(os.getcwd(), 'env.local')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()

# --- API Endpoints ---
@app.route('/plugins', methods=['GET'])
def list_plugins():
    """List all available plugins."""
    plugin_loader = PluginLoader()
    plugins = plugin_loader.discover_plugins()
    return jsonify({'plugins': plugins})

@app.route('/status', methods=['GET'])
def get_status():
    """Get the status of the cloud bridge."""
    return jsonify({
        'status': 'running',
        'license': check_license(),
        'config': load_config()
    })

# --- CLI Onboarding (first run) ---
def onboarding():
    """Run first-time onboarding if needed."""
    if not os.path.exists(CONFIG_PATH):
        print('Welcome to Engiyn Cloud Bridge!')
        print('Let\'s link your cloud account.')
        
        # Load plugins to get available providers
        plugin_loader = PluginLoader()
        plugin_names = plugin_loader.discover_plugins()
        
        cfg = load_config()
        
        # Try to load API keys from env.local first
        load_env_local()
        
        for name in plugin_names:
            env_key = os.getenv(f'{name.upper()}_API_KEY')
            if env_key:
                print(f'Loaded {name} API key from env.local')
                cfg[f'{name.upper()}_API_KEY'] = env_key
            else:
                api_key = input(f'Enter your {name} API key: ').strip()
                cfg[f'{name.upper()}_API_KEY'] = api_key
        
        save_config(cfg)
        print('API keys saved. You can now use the local API at http://localhost:5005/')

# --- Main Entrypoint ---
def run_flask():
    """Run the Flask app."""
    app.run(host='127.0.0.1', port=5005)

@click.group()
def cli():
    """Engiyn Cloud Bridge CLI."""
    pass

def initialize():
    """Initialize the cloud bridge."""
    # Load environment variables
    load_env_local()
    
    # Load plugins
    plugin_loader = PluginLoader()
    plugins = plugin_loader.load_all_plugins()
    
    # Register HTTP endpoints
    plugin_loader.register_http_endpoints(app)
    
    # Register CLI commands
    plugin_loader.register_cli_commands(cli)
    
    print(f"Loaded {len(plugins)} plugins: {', '.join(plugins.keys())}")

if __name__ == '__main__':
    # Run onboarding if needed
    onboarding()
    
    # Initialize plugins and endpoints
    initialize()
    
    # Start Flask in a thread
    Thread(target=run_flask).start()
    
    # Run CLI
    cli()
