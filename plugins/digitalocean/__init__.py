"""
DigitalOcean provider plugin for Engiyn
"""

from flask import Blueprint, jsonify, request
import click
import requests

# API Configuration
DO_API_URL = 'https://api.digitalocean.com/v2'

def do_headers(api_key):
    """Create authorization headers for DigitalOcean API."""
    return {'Authorization': f'Bearer {api_key}'}

# --- Server Management ---
def list_servers(api_key):
    """List all droplets in DigitalOcean."""
    r = requests.get(f'{DO_API_URL}/droplets', headers=do_headers(api_key))
    return r.json()

def create_server(api_key, name, region='nyc3', size='s-1vcpu-1gb', image='ubuntu-22-04-x64'):
    """Create a new droplet in DigitalOcean."""
    data = {
        'name': name,
        'region': region,
        'size': size,
        'image': image
    }
    r = requests.post(f'{DO_API_URL}/droplets', headers=do_headers(api_key), json=data)
    return r.json()

def delete_server(api_key, server_id):
    """Delete a droplet in DigitalOcean."""
    r = requests.delete(f'{DO_API_URL}/droplets/{server_id}', headers=do_headers(api_key))
    return r.status_code == 204

def get_server(api_key, server_id):
    """Get droplet details from DigitalOcean."""
    r = requests.get(f'{DO_API_URL}/droplets/{server_id}', headers=do_headers(api_key))
    return r.json()

def list_regions(api_key):
    """List available regions in DigitalOcean."""
    r = requests.get(f'{DO_API_URL}/regions', headers=do_headers(api_key))
    return r.json()

def list_sizes(api_key):
    """List available droplet sizes in DigitalOcean."""
    r = requests.get(f'{DO_API_URL}/sizes', headers=do_headers(api_key))
    return r.json()

def list_images(api_key):
    """List available images in DigitalOcean."""
    r = requests.get(f'{DO_API_URL}/images', headers=do_headers(api_key))
    return r.json()

# --- HTTP Endpoints ---
def register_http(bp):
    """Register HTTP endpoints with Flask blueprint."""
    
    @bp.route('/servers', methods=['GET'])
    def get_servers():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        return jsonify(list_servers(api_key))
    
    @bp.route('/servers/create', methods=['POST'])
    def create_new_server():
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
        data = request.json
        name = data.get('name', 'engiyn-server')
        region = data.get('region', 'nyc3')
        size = data.get('size', 's-1vcpu-1gb')
        image = data.get('image', 'ubuntu-22-04-x64')
        
        return jsonify(create_server(api_key, name, region, size, image))
    
    @bp.route('/servers/delete', methods=['POST'])
    def delete_existing_server():
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
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
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
        return jsonify(get_server(api_key, server_id))
    
    @bp.route('/regions', methods=['GET'])
    def get_available_regions():
        """List available regions."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
        return jsonify(list_regions(api_key))
    
    @bp.route('/sizes', methods=['GET'])
    def get_available_sizes():
        """List available sizes."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
        return jsonify(list_sizes(api_key))
    
    @bp.route('/images', methods=['GET'])
    def get_available_images():
        """List available images."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            return jsonify({'error': 'No DigitalOcean API key configured'}), 400
        
        return jsonify(list_images(api_key))

# --- CLI Commands ---
def register_cli(cli_group):
    """Register CLI commands with Click group."""
    
    @cli_group.command('list')
    def list_cmd():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            click.echo('Error: No DigitalOcean API key configured')
            return
        
        droplets = list_servers(api_key)
        if 'droplets' in droplets:
            for droplet in droplets['droplets']:
                click.echo(f"{droplet['id']} - {droplet['name']} - {droplet['status']}")
        else:
            click.echo('No droplets found')
    
    @cli_group.command('create')
    @click.argument('name')
    @click.option('--region', default='nyc3', help='Region slug')
    @click.option('--size', default='s-1vcpu-1gb', help='Size slug')
    @click.option('--image', default='ubuntu-22-04-x64', help='Image slug')
    def create_cmd(name, region, size, image):
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            click.echo('Error: No DigitalOcean API key configured')
            return
        
        result = create_server(api_key, name, region, size, image)
        if 'droplet' in result:
            droplet = result['droplet']
            click.echo(f"Created droplet: {droplet['id']} - {droplet['name']} - {droplet['status']}")
        else:
            click.echo(f"Error creating droplet: {result.get('message', 'Unknown error')}")
    
    @cli_group.command('delete')
    @click.argument('server_id', type=int)
    def delete_cmd(server_id):
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            click.echo('Error: No DigitalOcean API key configured')
            return
        
        ok = delete_server(api_key, server_id)
        click.echo(f"Droplet {server_id} {'deleted' if ok else 'could not be deleted'}")
    
    @cli_group.command('regions')
    def regions_cmd():
        """List available regions."""
        from cloudbridge import load_config
        api_key = load_config().get('DIGITALOCEAN_API_KEY')
        if not api_key:
            click.echo('Error: No DigitalOcean API key configured')
            return
        
        regions = list_regions(api_key)
        if 'regions' in regions:
            for region in regions['regions']:
                click.echo(f"{region['slug']} - {region['name']}")
        else:
            click.echo('No regions found')
