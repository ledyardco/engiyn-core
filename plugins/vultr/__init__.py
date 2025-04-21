"""
Vultr provider plugin for Engiyn
"""

from flask import Blueprint, jsonify, request
import click
import requests

# API Configuration
VULTR_API_URL = 'https://api.vultr.com/v2'

def vultr_headers(api_key):
    """Create authorization headers for Vultr API."""
    return {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

# --- Server Management ---
def list_servers(api_key):
    """List all instances in Vultr."""
    r = requests.get(f'{VULTR_API_URL}/instances', headers=vultr_headers(api_key))
    return r.json()

def create_server(api_key, name, plan='vc2-1c-1gb', region='ewr', os_id=387):  # 387 = Ubuntu 22.04
    """Create a new instance in Vultr."""
    data = {
        'label': name,
        'plan': plan,
        'region': region,
        'os_id': os_id
    }
    r = requests.post(f'{VULTR_API_URL}/instances', headers=vultr_headers(api_key), json=data)
    return r.json()

def delete_server(api_key, server_id):
    """Delete an instance in Vultr."""
    r = requests.delete(f'{VULTR_API_URL}/instances/{server_id}', headers=vultr_headers(api_key))
    return r.status_code == 204

def get_server(api_key, server_id):
    """Get instance details from Vultr."""
    r = requests.get(f'{VULTR_API_URL}/instances/{server_id}', headers=vultr_headers(api_key))
    return r.json()

def list_plans(api_key):
    """List available plans in Vultr."""
    r = requests.get(f'{VULTR_API_URL}/plans', headers=vultr_headers(api_key))
    return r.json()

def list_regions(api_key):
    """List available regions in Vultr."""
    r = requests.get(f'{VULTR_API_URL}/regions', headers=vultr_headers(api_key))
    return r.json()

def list_os(api_key):
    """List available operating systems in Vultr."""
    r = requests.get(f'{VULTR_API_URL}/os', headers=vultr_headers(api_key))
    return r.json()

# --- HTTP Endpoints ---
def register_http(bp):
    """Register HTTP endpoints with Flask blueprint."""
    
    @bp.route('/servers', methods=['GET'])
    def get_servers():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        return jsonify(list_servers(api_key))
    
    @bp.route('/servers/create', methods=['POST'])
    def create_new_server():
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        data = request.json
        name = data.get('name', 'engiyn-server')
        plan = data.get('plan', 'vc2-1c-1gb')
        region = data.get('region', 'ewr')
        os_id = data.get('os_id', 387)  # 387 = Ubuntu 22.04
        
        return jsonify(create_server(api_key, name, plan, region, os_id))
    
    @bp.route('/servers/delete', methods=['POST'])
    def delete_existing_server():
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        data = request.json
        server_id = data.get('server_id')
        if not server_id:
            return jsonify({'error': 'Missing server_id'}), 400
        
        ok = delete_server(api_key, server_id)
        return jsonify({'status': 'ok' if ok else 'error'})
    
    @bp.route('/servers/<server_id>', methods=['GET'])
    def get_server_details(server_id):
        """Get server details."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        return jsonify(get_server(api_key, server_id))
    
    @bp.route('/plans', methods=['GET'])
    def get_available_plans():
        """List available plans."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        return jsonify(list_plans(api_key))
    
    @bp.route('/regions', methods=['GET'])
    def get_available_regions():
        """List available regions."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        return jsonify(list_regions(api_key))
    
    @bp.route('/os', methods=['GET'])
    def get_available_os():
        """List available operating systems."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            return jsonify({'error': 'No Vultr API key configured'}), 400
        
        return jsonify(list_os(api_key))

# --- CLI Commands ---
def register_cli(cli_group):
    """Register CLI commands with Click group."""
    
    @cli_group.command('list')
    def list_cmd():
        """List all servers."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            click.echo('Error: No Vultr API key configured')
            return
        
        instances = list_servers(api_key)
        if 'instances' in instances:
            for instance in instances['instances']:
                click.echo(f"{instance['id']} - {instance['label']} - {instance['status']}")
        else:
            click.echo('No instances found')
    
    @cli_group.command('create')
    @click.argument('name')
    @click.option('--plan', default='vc2-1c-1gb', help='Plan ID')
    @click.option('--region', default='ewr', help='Region code')
    @click.option('--os-id', default=387, help='OS ID (387 = Ubuntu 22.04)')
    def create_cmd(name, plan, region, os_id):
        """Create a new server."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            click.echo('Error: No Vultr API key configured')
            return
        
        result = create_server(api_key, name, plan, region, os_id)
        if 'instance' in result:
            instance = result['instance']
            click.echo(f"Created instance: {instance['id']} - {instance['label']} - {instance['status']}")
        else:
            click.echo(f"Error creating instance: {result.get('error', {}).get('message', 'Unknown error')}")
    
    @cli_group.command('delete')
    @click.argument('server_id')
    def delete_cmd(server_id):
        """Delete a server."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            click.echo('Error: No Vultr API key configured')
            return
        
        ok = delete_server(api_key, server_id)
        click.echo(f"Instance {server_id} {'deleted' if ok else 'could not be deleted'}")
    
    @cli_group.command('plans')
    def plans_cmd():
        """List available plans."""
        from cloudbridge import load_config
        api_key = load_config().get('VULTR_API_KEY')
        if not api_key:
            click.echo('Error: No Vultr API key configured')
            return
        
        plans = list_plans(api_key)
        if 'plans' in plans:
            for plan in plans['plans']:
                click.echo(f"{plan['id']} - {plan['vcpu_count']} vCPU, {plan['memory']} MB RAM, ${plan['monthly_cost']}/mo")
        else:
            click.echo('No plans found')
