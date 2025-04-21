"""
Hetzner Cloud provider plugin for Engiyn
"""

from flask import Blueprint, jsonify, request
import click
import requests

# API Configuration
HETZNER_API_URL = 'https://api.hetzner.cloud/v1'

def hetzner_headers(api_key):
    """Create authorization headers for Hetzner API."""
    return {'Authorization': f'Bearer {api_key}'}

# --- Server Management ---
def list_servers(api_key):
    """List all servers in Hetzner Cloud."""
    r = requests.get(f'{HETZNER_API_URL}/servers', headers=hetzner_headers(api_key))
    return r.json()

def create_server(api_key, name, server_type='cx21', image='ubuntu-22.04', location='ash'):
    """Create a new server in Hetzner Cloud."""
    data = {
        'name': name,
        'server_type': server_type,
        'image': image,
        'location': location
    }
    r = requests.post(f'{HETZNER_API_URL}/servers', headers=hetzner_headers(api_key), json=data)
    return r.json()

def delete_server(api_key, server_id):
    """Delete a server in Hetzner Cloud."""
    r = requests.delete(f'{HETZNER_API_URL}/servers/{server_id}', headers=hetzner_headers(api_key))
    return r.status_code == 204

def get_server(api_key, server_id):
    """Get server details from Hetzner Cloud."""
    r = requests.get(f'{HETZNER_API_URL}/servers/{server_id}', headers=hetzner_headers(api_key))
    return r.json()

def list_images(api_key):
    """List available images in Hetzner Cloud."""
    r = requests.get(f'{HETZNER_API_URL}/images', headers=hetzner_headers(api_key))
    return r.json()

# --- HTTP Endpoints ---
def register_http(bp):
    """Register HTTP endpoints with Flask blueprint."""
    
    @bp.route('/servers', methods=['GET'])
    def get_servers():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Hetzner API key configured'}), 400
        return jsonify(list_servers(api_key))
    
    @bp.route('/servers/create', methods=['POST'])
    def create_new_server():
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Hetzner API key configured'}), 400
        
        data = request.json
        name = data.get('name', 'engiyn-server')
        server_type = data.get('server_type', 'cx21')
        image = data.get('image', 'ubuntu-22.04')
        location = data.get('location', 'ash')
        
        return jsonify(create_server(api_key, name, server_type, image, location))
    
    @bp.route('/servers/delete', methods=['POST'])
    def delete_existing_server():
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Hetzner API key configured'}), 400
        
        data = request.json
        server_id = data.get('server_id')
        if not server_id:
            return jsonify({'error': 'Missing server_id'}), 400
        
        ok = delete_server(api_key, server_id)
        return jsonify({'status': 'ok' if ok else 'error'})
    
    @bp.route('/servers/<int:server_id>', methods=['GET'])
    def get_server_details(server_id):
        """Get server details."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Hetzner API key configured'}), 400
        
        return jsonify(get_server(api_key, server_id))
    
    @bp.route('/images', methods=['GET'])
    def get_available_images():
        """List available images."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Hetzner API key configured'}), 400
        
        return jsonify(list_images(api_key))

# --- CLI Commands ---
def register_cli(cli_group):
    """Register CLI commands with Click group."""
    
    @cli_group.command('list')
    def list_cmd():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            click.echo('Error: No Hetzner API key configured')
            return
        
        servers = list_servers(api_key)
        if 'servers' in servers:
            for server in servers['servers']:
                click.echo(f"{server['id']} - {server['name']} - {server['status']}")
        else:
            click.echo('No servers found')
    
    @cli_group.command('create')
    @click.argument('name')
    @click.option('--type', default='cx21', help='Server type')
    @click.option('--image', default='ubuntu-22.04', help='Image name')
    @click.option('--location', default='ash', help='Location')
    def create_cmd(name, type, image, location):
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            click.echo('Error: No Hetzner API key configured')
            return
        
        result = create_server(api_key, name, type, image, location)
        if 'server' in result:
            server = result['server']
            click.echo(f"Created server: {server['id']} - {server['name']} - {server['status']}")
        else:
            click.echo(f"Error creating server: {result.get('error', {}).get('message', 'Unknown error')}")
    
    @cli_group.command('delete')
    @click.argument('server_id', type=int)
    def delete_cmd(server_id):
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('HETZNER_API_KEY')
        if not api_key:
            click.echo('Error: No Hetzner API key configured')
            return
        
        ok = delete_server(api_key, server_id)
        click.echo(f"Server {server_id} {'deleted' if ok else 'could not be deleted'}")
