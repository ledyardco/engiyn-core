/**
 * Cloud provider commands for the Engiyn CLI
 * 
 * Handles commands for managing cloud providers:
 * - dev cloud list
 * - dev cloud add
 * - dev cloud remove
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const { table } = require('table');
const ora = require('ora');
const api = require('../utils/api');
const keyring = require('../utils/keyring');
const { checkServerStatus, startServer } = require('../utils/server');

/**
 * Register cloud commands with the CLI
 * @param {Object} program Commander program
 */
function registerCommands(program) {
  const cloud = program
    .command('cloud')
    .description('Manage cloud providers');
  
  // List cloud providers
  cloud
    .command('list')
    .description('List all configured cloud providers')
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
          console.log(chalk.red('✗ Server must be running to list cloud providers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        spinner.succeed('Cloud providers fetched successfully');
        
        if (providers.length === 0) {
          console.log(chalk.yellow('No cloud providers configured'));
          return;
        }
        
        // Get API keys for each provider
        const keys = [];
        for (const provider of providers) {
          const key = await keyring.get(`${provider.toUpperCase()}_API_KEY`);
          keys.push({
            name: provider,
            configured: key ? '✓' : '✗'
          });
        }
        
        // Display the providers
        const data = [
          ['Provider', 'Configured'],
          ...keys.map(key => [
            chalk.blue(key.name),
            key.configured === '✓' ? chalk.green(key.configured) : chalk.red(key.configured)
          ])
        ];
        
        console.log(table(data));
      } catch (error) {
        spinner.fail(`Error fetching cloud providers: ${error.message}`);
      }
    });
  
  // Add a cloud provider
  cloud
    .command('add')
    .description('Add or update a cloud provider API key')
    .argument('[provider]', 'Cloud provider name')
    .action(async (provider) => {
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
          console.log(chalk.red('✗ Server must be running to add cloud providers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        spinner.succeed('Cloud providers fetched successfully');
        
        // If no provider is specified, prompt for one
        if (!provider) {
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Select a cloud provider:',
              choices: providers
            }
          ]);
          provider = selectedProvider;
        } else if (!providers.includes(provider)) {
          console.log(chalk.red(`✗ Unknown provider: ${provider}`));
          console.log(chalk.gray(`Available providers: ${providers.join(', ')}`));
          return;
        }
        
        // Prompt for the API key
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API key:`,
            mask: '*'
          }
        ]);
        
        // Save the API key
        await keyring.set(`${provider.toUpperCase()}_API_KEY`, apiKey);
        console.log(chalk.green(`✓ ${provider} API key saved successfully`));
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
  
  // Remove a cloud provider
  cloud
    .command('remove')
    .description('Remove a cloud provider API key')
    .argument('[provider]', 'Cloud provider name')
    .action(async (provider) => {
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
          console.log(chalk.red('✗ Server must be running to remove cloud providers'));
          return;
        }
      }
      
      // Get the list of cloud providers
      const spinner = ora('Fetching cloud providers...').start();
      try {
        const providers = await api.listCloudProviders();
        spinner.succeed('Cloud providers fetched successfully');
        
        // If no provider is specified, prompt for one
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
            return;
          }
          
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Select a cloud provider to remove:',
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
          return;
        }
        
        // Confirm removal
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to remove the ${provider} API key?`,
            default: false
          }
        ]);
        
        if (confirm) {
          await keyring.del(`${provider.toUpperCase()}_API_KEY`);
          console.log(chalk.green(`✓ ${provider} API key removed successfully`));
        } else {
          console.log(chalk.gray('Operation cancelled'));
        }
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    });
}

module.exports = registerCommands;
