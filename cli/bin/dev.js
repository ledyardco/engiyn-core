#!/usr/bin/env node

/**
 * Engiyn CLI - Main entry point
 * 
 * This is the main entry point for the Engiyn CLI.
 * It sets up the commander.js program and registers all commands.
 */

const { program } = require('commander');
const chalk = require('chalk');
const { startServer, checkServerStatus } = require('../lib/utils/server');
const { version } = require('../package.json');

// Import commands
const cloudCommands = require('../lib/commands/cloud');
const serverCommands = require('../lib/commands/server');
const pluginCommands = require('../lib/commands/plugin');

// Set up the program
program
  .name('dev')
  .description('Engiyn Core CLI')
  .version(version);

// Check if the server is running
const serverRunning = checkServerStatus();

// Register commands
cloudCommands(program);
serverCommands(program);
pluginCommands(program);

// Add a help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    program.outputHelp();
  });

// Add a status command
program
  .command('status')
  .description('Check the status of the Engiyn server')
  .action(async () => {
    const status = await checkServerStatus();
    if (status) {
      console.log(chalk.green('✓ Engiyn server is running'));
    } else {
      console.log(chalk.yellow('! Engiyn server is not running'));
      console.log(chalk.gray('  Run `dev server start` to start the server'));
    }
  });

// Add a start command as an alias for server start
program
  .command('start')
  .description('Start the Engiyn server')
  .action(async () => {
    await startServer();
  });

// Parse arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length === 2) {
  program.outputHelp();
}
