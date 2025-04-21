# Engiyn CLI

A unified command-line interface for Engiyn Core, providing a seamless experience for managing cloud providers, servers, and plugins.

## Features

- **Cloud Provider Management**: Add, list, and remove cloud provider API keys
- **Server Management**: Create, list, and delete servers across multiple cloud providers
- **Plugin Management**: List and get information about available plugins
- **Server Control**: Start and stop the Engiyn server

## Installation

```bash
# From the engiyn-core directory
cd cli
npm install
npm link  # Makes the 'dev' command available globally
```

## Usage

```bash
# Get help
dev help

# Start the Engiyn server
dev server start

# List cloud providers
dev cloud list

# Add a cloud provider API key
dev cloud add [provider]

# List servers across all providers
dev server list

# Create a new server
dev server create

# Delete a server
dev server delete

# List available plugins
dev plugin list

# Get information about a plugin
dev plugin info [name]
```

## Security

API keys are stored securely using the system's keyring (via the keytar library). On platforms where keytar is not available, keys are stored in `~/.engiyn/config.json`.

## Building a Standalone Binary

```bash
# From the cli directory
npm run build
```

This creates standalone binaries in the `dist` directory for Windows, macOS, and Linux.

## Development

The CLI is built with the following libraries:

- **Commander.js**: Command-line interface
- **Inquirer**: Interactive prompts
- **Axios**: HTTP client for API communication
- **Chalk**: Terminal string styling
- **Ora**: Elegant terminal spinners
- **Keytar**: Secure credential storage
- **Table**: Pretty console tables

To add a new command, create a module in `lib/commands/` and register it in `bin/dev.js`.
