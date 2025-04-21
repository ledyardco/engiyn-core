/**
 * Plugin commands for the Engiyn CLI
 * 
 * Handles commands for managing Engiyn plugins:
 * - dev plugin list
 * - dev plugin info
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const { table } = require('table');
const ora = require('ora');
const api = require('../utils/api');
const { checkServerStatus, startServer } = require('../utils/server');

/**
 * Register plugin commands with the CLI
 * @param {Object} program Commander program
 */
function registerCommands(program) {
  const plugin = program
    .command('plugin')
    .description('Manage Engiyn plugins');
  
  // List plugins
  plugin
    .command('list')
    .description('List all available plugins')
    .action(async () => {
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
          console.log(chalk.red('✗ Server must be running to list plugins'));
          return;
        }
      }
      
      // Get the list of plugins
      const spinner = ora('Fetching plugins...').start();
      try {
        const plugins = await api.listPlugins();
        spinner.succeed('Plugins fetched successfully');
        
        if (plugins.length === 0) {
          console.log(chalk.yellow('No plugins found'));
          return;
        }
        
        // Display the plugins
        const data = [
          ['Name', 'Type'],
          ...plugins.map(plugin => [
            chalk.blue(plugin),
            getPluginType(plugin)
          ])
        ];
        
        console.log(table(data));
      } catch (error) {
        spinner.fail(`Error fetching plugins: ${error.message}`);
      }
    });
  
  // Get plugin info
  plugin
    .command('info')
    .description('Get information about a plugin')
    .argument('[name]', 'Plugin name')
    .action(async (name) => {
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
          console.log(chalk.red('✗ Server must be running to get plugin info'));
          return;
        }
      }
      
      // Get the list of plugins
      const spinner = ora('Fetching plugins...').start();
      try {
        const plugins = await api.listPlugins();
        
        // If no name is specified, prompt for one
        if (!name) {
          if (plugins.length === 0) {
            spinner.fail('No plugins found');
            return;
          }
          
          spinner.stop();
          const { selectedPlugin } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedPlugin',
              message: 'Select a plugin:',
              choices: plugins
            }
          ]);
          name = selectedPlugin;
          spinner.start('Fetching plugin info...');
        } else if (!plugins.includes(name)) {
          spinner.fail(`Unknown plugin: ${name}`);
          console.log(chalk.gray(`Available plugins: ${plugins.join(', ')}`));
          return;
        }
        
        // Get plugin info
        try {
          const info = await api.getPluginInfo(name);
          spinner.succeed(`Plugin info for ${name} fetched successfully`);
          
          // Display the plugin info
          console.log(chalk.bold(`\nPlugin: ${chalk.blue(name)}`));
          console.log(`Type: ${getPluginType(name)}`);
          console.log(`Description: ${info.description || 'No description'}`);
          console.log(`Version: ${info.version || 'Unknown'}`);
          console.log(`Entrypoint: ${info.entrypoint || 'Unknown'}`);
          
          // Display endpoints if available
          if (info.endpoints && info.endpoints.length > 0) {
            console.log(chalk.bold('\nEndpoints:'));
            for (const endpoint of info.endpoints) {
              console.log(`- ${endpoint.method} ${endpoint.path}: ${endpoint.description || 'No description'}`);
            }
          }
          
          // Display commands if available
          if (info.commands && info.commands.length > 0) {
            console.log(chalk.bold('\nCommands:'));
            for (const command of info.commands) {
              console.log(`- ${command.name}: ${command.description || 'No description'}`);
            }
          }
        } catch (error) {
          spinner.fail(`Error fetching plugin info: ${error.message}`);
          
          // Fallback to basic info
          console.log(chalk.bold(`\nPlugin: ${chalk.blue(name)}`));
          console.log(`Type: ${getPluginType(name)}`);
          console.log(`API Endpoints: ${chalk.gray('http://localhost:5005')}/plugins/${name}/*`);
        }
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
}

/**
 * Get the type of a plugin based on its name
 * @param {string} name Plugin name
 * @returns {string} Plugin type
 */
function getPluginType(name) {
  if (['hetzner', 'digitalocean', 'vultr'].includes(name)) {
    return 'cloud';
  } else if (name === 'hello-world') {
    return 'template';
  } else {
    return 'unknown';
  }
}

module.exports = registerCommands;
