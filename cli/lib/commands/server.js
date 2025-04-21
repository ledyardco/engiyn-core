/**
 * Server commands for the Engiyn CLI
 * 
 * Handles commands for managing cloud servers:
 * - dev server list
 * - dev server create
 * - dev server delete
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const { table } = require('table');
const ora = require('ora');
const api = require('../utils/api');
const keyring = require('../utils/keyring');
const { checkServerStatus, startServer, stopServer } = require('../utils/server');

/**
 * Register server commands with the CLI
 * @param {Object} program Commander program
 */
function registerCommands(program) {
  const server = program
    .command('server')
    .description('Manage cloud servers');
  
  // Start the Engiyn server
  server
    .command('start')
    .description('Start the Engiyn server')
    .action(async () => {
      await startServer();
    });
  
  // Stop the Engiyn server
  server
    .command('stop')
    .description('Stop the Engiyn server')
    .action(async () => {
      await stopServer();
    });
  
  // List servers
  server
    .command('list')
    .description('List all servers')
    .option('-p, --provider <provider>', 'Filter by cloud provider')
    .action(async (options) => {
      // Check if the server is running
      const serverRunning = await checkServerStatus();
      if (!serverRunning) {
        console.log(chalk.yellow('! Engiyn server is not running'));
        const { start } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'start',
            message: 'Do you want to start the server?',
            default: true
          }
        ]);
        
        if (start) {
          await startServer();
        } else {
          console.log(chalk.red('✗ Server must be running to list servers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        
        // Filter providers if specified
        let selectedProviders = providers;
        if (options.provider) {
          if (!providers.includes(options.provider)) {
            spinner.fail(`Unknown provider: ${options.provider}`);
            console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));
            return;
          }
          selectedProviders = [options.provider];
        }
        
        spinner.text = 'Fetching servers...';
        
        // Get servers for each provider
        const allServers = [];
        for (const provider of selectedProviders) {
          try {
            // Check if the provider is configured
            const key = await keyring.get(`${provider.toUpperCase()}_API_KEY`);
            if (!key) {
              console.log(chalk.yellow(`! ${provider} is not configured, skipping`));
              continue;
            }
            
            const servers = await api.listServers(provider);
            
            // Extract server data based on provider response format
            let providerServers = [];
            if (provider === 'hetzner' && servers.servers) {
              providerServers = servers.servers.map(s => ({
                id: s.id,
                name: s.name,
                status: s.status,
                provider
              }));
            } else if (provider === 'digitalocean' && servers.droplets) {
              providerServers = servers.droplets.map(s => ({
                id: s.id,
                name: s.name,
                status: s.status,
                provider
              }));
            } else if (provider === 'vultr' && servers.instances) {
              providerServers = servers.instances.map(s => ({
                id: s.id,
                name: s.label,
                status: s.status,
                provider
              }));
            }
            
            allServers.push(...providerServers);
          } catch (error) {
            console.log(chalk.yellow(`! Error fetching servers for ${provider}: ${error.message}`));
          }
        }
        
        spinner.succeed('Servers fetched successfully');
        
        if (allServers.length === 0) {
          console.log(chalk.yellow('No servers found'));
          return;
        }
        
        // Display the servers
        const data = [
          ['ID', 'Name', 'Status', 'Provider'],
          ...allServers.map(server => [
            chalk.blue(server.id.toString()),
            server.name,
            getStatusColor(server.status)(server.status),
            server.provider
          ])
        ];
        
        console.log(table(data));
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
  
  // Create a server
  server
    .command('create')
    .description('Create a new server')
    .option('-p, --provider <provider>', 'Cloud provider')
    .option('-n, --name <name>', 'Server name')
    .option('-t, --type <type>', 'Server type/size')
    .option('-i, --image <image>', 'Server image/OS')
    .option('-r, --region <region>', 'Server region/location')
    .action(async (options) => {
      // Check if the server is running
      const serverRunning = await checkServerStatus();
      if (!serverRunning) {
        console.log(chalk.yellow('! Engiyn server is not running'));
        const { start } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'start',
            message: 'Do you want to start the server?',
            default: true
          }
        ]);
        
        if (start) {
          await startServer();
        } else {
          console.log(chalk.red('✗ Server must be running to create servers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        spinner.succeed('Cloud providers fetched successfully');
        
        // Prompt for provider if not specified
        let provider = options.provider;
        if (!provider) {
          // Get the list of configured providers
          const configuredProviders = [];
          for (const p of providers) {
            const key = await keyring.get(`${p.toUpperCase()}_API_KEY`);
            if (key) {
              configuredProviders.push(p);
            }
          }
          
          if (configuredProviders.length === 0) {
            console.log(chalk.yellow('No cloud providers configured'));
            console.log(chalk.gray('Use `dev cloud add` to configure a provider'));
            return;
          }
          
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Select a cloud provider:',
              choices: configuredProviders
            }
          ]);
          provider = selectedProvider;
        } else if (!providers.includes(provider)) {
          console.log(chalk.red(`✗ Unknown provider: ${provider}`));
          console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));
          return;
        }
        
        // Check if the provider is configured
        const key = await keyring.get(`${provider.toUpperCase()}_API_KEY`);
        if (!key) {
          console.log(chalk.yellow(`! ${provider} is not configured`));
          console.log(chalk.gray(`Use \`dev cloud add ${provider}\` to configure it`));
          return;
        }
        
        // Prompt for server details
        const serverOptions = {};
        
        // Name
        if (!options.name) {
          const { name } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Enter server name:',
              default: `engiyn-server-${Math.floor(Math.random() * 1000)}`
            }
          ]);
          serverOptions.name = name;
        } else {
          serverOptions.name = options.name;
        }
        
        // Provider-specific options
        if (provider === 'hetzner') {
          if (!options.type) {
            const { type } = await inquirer.prompt([
              {
                type: 'list',
                name: 'type',
                message: 'Select server type:',
                choices: ['cx11', 'cx21', 'cx31', 'cx41', 'cx51']
              }
            ]);
            serverOptions.server_type = type;
          } else {
            serverOptions.server_type = options.type;
          }
          
          if (!options.image) {
            const { image } = await inquirer.prompt([
              {
                type: 'list',
                name: 'image',
                message: 'Select server image:',
                choices: ['ubuntu-20.04', 'ubuntu-22.04', 'debian-11', 'debian-12']
              }
            ]);
            serverOptions.image = image;
          } else {
            serverOptions.image = options.image;
          }
          
          if (!options.region) {
            const { location } = await inquirer.prompt([
              {
                type: 'list',
                name: 'location',
                message: 'Select server location:',
                choices: ['nbg1', 'fsn1', 'hel1', 'ash']
              }
            ]);
            serverOptions.location = location;
          } else {
            serverOptions.location = options.region;
          }
        } else if (provider === 'digitalocean') {
          if (!options.type) {
            const { size } = await inquirer.prompt([
              {
                type: 'list',
                name: 'size',
                message: 'Select server size:',
                choices: ['s-1vcpu-1gb', 's-1vcpu-2gb', 's-2vcpu-2gb', 's-2vcpu-4gb']
              }
            ]);
            serverOptions.size = size;
          } else {
            serverOptions.size = options.type;
          }
          
          if (!options.image) {
            const { image } = await inquirer.prompt([
              {
                type: 'list',
                name: 'image',
                message: 'Select server image:',
                choices: ['ubuntu-20-04-x64', 'ubuntu-22-04-x64', 'debian-11-x64', 'debian-12-x64']
              }
            ]);
            serverOptions.image = image;
          } else {
            serverOptions.image = options.image;
          }
          
          if (!options.region) {
            const { region } = await inquirer.prompt([
              {
                type: 'list',
                name: 'region',
                message: 'Select server region:',
                choices: ['nyc1', 'nyc3', 'sfo3', 'ams3', 'sgp1']
              }
            ]);
            serverOptions.region = region;
          } else {
            serverOptions.region = options.region;
          }
        } else if (provider === 'vultr') {
          if (!options.type) {
            const { plan } = await inquirer.prompt([
              {
                type: 'list',
                name: 'plan',
                message: 'Select server plan:',
                choices: ['vc2-1c-1gb', 'vc2-1c-2gb', 'vc2-2c-4gb', 'vc2-4c-8gb']
              }
            ]);
            serverOptions.plan = plan;
          } else {
            serverOptions.plan = options.type;
          }
          
          if (!options.region) {
            const { region } = await inquirer.prompt([
              {
                type: 'list',
                name: 'region',
                message: 'Select server region:',
                choices: ['ewr', 'ord', 'dfw', 'sea', 'lax']
              }
            ]);
            serverOptions.region = region;
          } else {
            serverOptions.region = options.region;
          }
          
          if (!options.image) {
            serverOptions.os_id = 387; // Ubuntu 22.04
          } else {
            // Map image names to OS IDs
            const osMap = {
              'ubuntu-20-04': 387,
              'ubuntu-22-04': 1743,
              'debian-11': 477,
              'debian-12': 2237
            };
            serverOptions.os_id = osMap[options.image] || 387;
          }
        }
        
        // Create the server
        spinner.text = 'Creating server...';
        spinner.start();
        
        const result = await api.createServer(provider, serverOptions);
        
        // Handle provider-specific responses
        if (provider === 'hetzner' && result.server) {
          spinner.succeed(`Server created successfully: ${result.server.name} (${result.server.id})`);
        } else if (provider === 'digitalocean' && result.droplet) {
          spinner.succeed(`Droplet created successfully: ${result.droplet.name} (${result.droplet.id})`);
        } else if (provider === 'vultr' && result.instance) {
          spinner.succeed(`Instance created successfully: ${result.instance.label} (${result.instance.id})`);
        } else {
          spinner.fail(`Error creating server: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
  
  // Delete a server
  server
    .command('delete')
    .description('Delete a server')
    .option('-p, --provider <provider>', 'Cloud provider')
    .option('-i, --id <id>', 'Server ID')
    .action(async (options) => {
      // Check if the server is running
      const serverRunning = await checkServerStatus();
      if (!serverRunning) {
        console.log(chalk.yellow('! Engiyn server is not running'));
        const { start } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'start',
            message: 'Do you want to start the server?',
            default: true
          }
        ]);
        
        if (start) {
          await startServer();
        } else {
          console.log(chalk.red('✗ Server must be running to delete servers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        
        // Prompt for provider if not specified
        let provider = options.provider;
        if (!provider) {
          // Get the list of configured providers
          const configuredProviders = [];
          for (const p of providers) {
            const key = await keyring.get(`${p.toUpperCase()}_API_KEY`);
            if (key) {
              configuredProviders.push(p);
            }
          }
          
          if (configuredProviders.length === 0) {
            spinner.fail('No cloud providers configured');
            console.log(chalk.gray('Use `dev cloud add` to configure a provider'));
            return;
          }
          
          spinner.stop();
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Select a cloud provider:',
              choices: configuredProviders
            }
          ]);
          provider = selectedProvider;
          spinner.start('Fetching servers...');
        } else if (!providers.includes(provider)) {
          spinner.fail(`Unknown provider: ${provider}`);
          console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));
          return;
        }
        
        // Check if the provider is configured
        const key = await keyring.get(`${provider.toUpperCase()}_API_KEY`);
        if (!key) {
          spinner.fail(`${provider} is not configured`);
          console.log(chalk.gray(`Use \`dev cloud add ${provider}\` to configure it`));
          return;
        }
        
        // Get servers for the provider
        const servers = await api.listServers(provider);
        
        // Extract server data based on provider response format
        let providerServers = [];
        if (provider === 'hetzner' && servers.servers) {
          providerServers = servers.servers.map(s => ({
            id: s.id,
            name: s.name,
            status: s.status
          }));
        } else if (provider === 'digitalocean' && servers.droplets) {
          providerServers = servers.droplets.map(s => ({
            id: s.id,
            name: s.name,
            status: s.status
          }));
        } else if (provider === 'vultr' && servers.instances) {
          providerServers = servers.instances.map(s => ({
            id: s.id,
            name: s.label,
            status: s.status
          }));
        }
        
        spinner.succeed('Servers fetched successfully');
        
        if (providerServers.length === 0) {
          console.log(chalk.yellow(`No servers found for ${provider}`));
          return;
        }
        
        // Prompt for server ID if not specified
        let serverId = options.id;
        if (!serverId) {
          const { selectedServer } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedServer',
              message: 'Select a server to delete:',
              choices: providerServers.map(s => ({
                name: `${s.name} (${s.id}) - ${s.status}`,
                value: s.id
              }))
            }
          ]);
          serverId = selectedServer;
        } else if (!providerServers.find(s => s.id.toString() === serverId.toString())) {
          console.log(chalk.red(`✗ Server with ID ${serverId} not found`));
          return;
        }
        
        // Confirm deletion
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete server ${serverId}?`,
            default: false
          }
        ]);
        
        if (!confirm) {
          console.log(chalk.gray('Operation cancelled'));
          return;
        }
        
        // Delete the server
        spinner.text = 'Deleting server...';
        spinner.start();
        
        const result = await api.deleteServer(provider, serverId);
        
        if (result.status === 'ok') {
          spinner.succeed(`Server ${serverId} deleted successfully`);
        } else {
          spinner.fail(`Error deleting server: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
}

/**
 * Get a color function for a server status
 * @param {string} status Server status
 * @returns {Function} Chalk color function
 */
function getStatusColor(status) {
  status = status.toLowerCase();
  if (status === 'running' || status === 'active') {
    return chalk.green;
  } else if (status === 'starting' || status === 'provisioning') {
    return chalk.blue;
  } else if (status === 'stopping' || status === 'off') {
    return chalk.yellow;
  } else if (status === 'error' || status === 'failed') {
    return chalk.red;
  } else {
    return chalk.gray;
  }
}

module.exports = registerCommands;
