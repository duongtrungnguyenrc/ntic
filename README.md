# NestJS Template Injection CLI

A powerful CLI tool to integrate pre-written NestJS module boilerplates from your internal GitLab repository.

## Features

- **Setup Command**: Configure GitLab authentication (Token or SSH)
- **Init Command**: Initialize NestJS projects for module integration
  - Automatically creates `src/lib` directory
  - Sets up path aliases in `tsconfig.json`
  - Manages environment variables
- **Add Command**: Install modules with automatic dependency resolution
  - Interactive module selection
  - Dependency graph resolution (installs dependent modules automatically)
  - Automatic package.json updates
  - Environment variable management
- **List Command**: View available and installed modules

## Installation

```bash
npm install -g @sugarnest/ntic
```

Or for development:

```bash
cd cli
npm install
npm run build
npm start
```

## Usage

### 1. Initial Setup

Configure your GitLab connection and authentication:

```bash
ntic setup
```

This command will prompt you for:
- GitLab server URL (default: https://gitlab.com)
- Authentication method (Personal Access Token or SSH Key)
- GitLab project ID/path where modules are stored

### 2. Initialize Your Project

Initialize a NestJS project to use modules:

```bash
ntic init
```

Or with specific options:

```bash
ntic init --project /path/to/project --alias @lib
```

This command will:
- Detect your NestJS project
- Create `src/lib` directory
- Add path alias to `tsconfig.json`
- Initialize `.env` and `.env.example` files

### 3. Add Modules

Add modules to your project:

```bash
ntic add
```

Or directly specify modules:

```bash
ntic add --modules auth,database --project /path/to/project
```

The command will:
- List available modules
- Show module descriptions and dependencies
- Resolve all dependency trees
- Download module source code
- Update `package.json` with dependencies
- Update environment variable files

### 4. List Modules

View available and installed modules:

```bash
ntic list
```

Options:
- `--available`: Show only available modules
- `--installed`: Show only installed modules
- `--project <path>`: Specify project path

## Module Structure

Each module should follow this structure in your GitLab repository:

```
modules/
├── auth/
│   ├── module.json          # Metadata
│   ├── src/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── ...
│   └── package.json         # Module-specific deps (optional)
├── database/
│   ├── module.json
│   ├── src/
│   │   └── ...
│   └── package.json
└── cache/
    ├── module.json
    ├── src/
    │   └── ...
    └── package.json
```

### Module Metadata (module.json)

Each module must include a `module.json` file with metadata:

```json
{
  "name": "auth",
  "version": "1.0.0",
  "description": "Authentication module with JWT support",
  "dependencies": {
    "@nestjs/jwt": "^11.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0"
  },
  "environmentVariables": [
    {
      "name": "JWT_SECRET",
      "description": "Secret key for JWT signing",
      "required": true,
      "example": "your-secret-key-here"
    },
    {
      "name": "JWT_EXPIRATION",
      "description": "JWT token expiration time",
      "required": false,
      "defaultValue": "24h",
      "example": "24h"
    }
  ],
  "dependentModules": ["database"]
}
```

## Configuration

Configuration is stored in `~/.ntic/config.json`:

```json
{
  "gitlabUrl": "https://gitlab.com",
  "gitlabToken": "glpat-xxxxxxxxxxxxx",
  "modulesRegistry": "company/nestjs-modules",
  "sshKey": "/home/user/.ssh/id_rsa"
}
```

## Example Workflow

```bash
# 1. Setup CLI
ntic setup
# Follow prompts to configure GitLab

# 2. Create/Navigate to NestJS project
cd my-nestjs-app

# 3. Initialize project
ntic init

# 4. View available modules
ntic list

# 5. Add modules
ntic add
# Select: auth, database, cache

# 6. Install dependencies
npm install

# 7. Update .env with required variables
# Edit .env file and add required values

# 8. Use modules in your code
import { AuthService } from '@lib/auth/auth.service';
```

## API Reference

### setupCommand
Configures GitLab authentication and CLI settings.

Options:
- Interactive prompts for authentication method
- Support for both token and SSH key authentication

### initCommand
Initializes a NestJS project for module integration.

Options:
- `-p, --project <path>`: Project directory (default: current)
- `-a, --alias <alias>`: Path alias name (default: @lib)

### addCommand
Adds modules to a NestJS project with automatic dependency resolution.

Options:
- `-p, --project <path>`: Project directory (default: current)
- `-m, --modules <names>`: Comma-separated module names (interactive if not provided)

### listCommand
Lists available and installed modules.

Options:
- `-p, --project <path>`: Project directory (default: current)
- `-a, --available`: Show only available modules
- `-i, --installed`: Show only installed modules

## Troubleshooting

### GitLab Authentication Failed
- Verify your GitLab token has `read_repository` scope
- Check GitLab URL is correct (include https://)
- Try `ntic setup` again to update credentials

### Module Not Found
- Verify module exists in GitLab repository
- Check module path structure matches expected format
- Run `ntic list` to see available modules

### Path Alias Not Working
- Ensure `tsconfig.json` was updated correctly
- Verify your IDE recognizes the path alias
- Try rebuilding your project

### Dependency Conflicts
- Check for conflicting versions in dependent modules
- Review `package.json` for manual adjustments
- Consider updating dependent modules

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run watch

# Run CLI locally
npm run dev -- <command>
```

## License

Internal Company License
