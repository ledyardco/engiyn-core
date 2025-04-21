"""
Test the plugin loader functionality.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add parent directory to path to import cloudbridge
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from cloudbridge import PluginLoader, Plugin

class TestPluginLoader(unittest.TestCase):
    """Test cases for the plugin loader."""
    
    def test_discover_plugins(self):
        """Test plugin discovery."""
        # Create a mock for os.listdir to return our test plugins
        with patch('os.path.exists', return_value=True), \
             patch('os.listdir', return_value=['hetzner', 'digitalocean', 'vultr', '__pycache__']), \
             patch('os.path.isdir', return_value=True):
            
            loader = PluginLoader()
            plugins = loader.discover_plugins()
            
            # Should find our three plugins but not __pycache__
            self.assertEqual(len(plugins), 3)
            self.assertIn('hetzner', plugins)
            self.assertIn('digitalocean', plugins)
            self.assertIn('vultr', plugins)
            self.assertNotIn('__pycache__', plugins)
    
    def test_load_plugin(self):
        """Test loading a single plugin."""
        # Mock the manifest file and module loading
        mock_manifest = {
            'name': 'test-plugin',
            'version': '0.1.0',
            'type': 'cloud',
            'entrypoint': 'test_module'
        }
        
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', MagicMock()), \
             patch('json.load', return_value=mock_manifest), \
             patch('importlib.import_module', return_value=MagicMock()):
            
            loader = PluginLoader()
            plugin = loader.load_plugin('test-plugin')
            
            # Verify the plugin was loaded correctly
            self.assertIsInstance(plugin, Plugin)
            self.assertEqual(plugin.name, 'test-plugin')
            self.assertEqual(plugin.manifest, mock_manifest)
    
    def test_register_http(self):
        """Test HTTP endpoint registration."""
        # Create a mock plugin with register_http method
        mock_module = MagicMock()
        mock_plugin = Plugin('test', {}, mock_module)
        
        # Create a mock Flask blueprint
        mock_blueprint = MagicMock()
        
        # Call register_http
        mock_plugin.register_http(mock_blueprint)
        
        # Verify register_http was called on the module
        mock_module.register_http.assert_called_once_with(mock_blueprint)
    
    def test_register_cli(self):
        """Test CLI command registration."""
        # Create a mock plugin with register_cli method
        mock_module = MagicMock()
        mock_plugin = Plugin('test', {}, mock_module)
        
        # Create a mock Click group
        mock_cli_group = MagicMock()
        
        # Call register_cli
        mock_plugin.register_cli(mock_cli_group)
        
        # Verify register_cli was called on the module
        mock_module.register_cli.assert_called_once_with(mock_cli_group)

if __name__ == '__main__':
    unittest.main()
