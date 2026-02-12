# NTIC - NestJS Module Integration CLI

A powerful CLI tool to manage version-based NestJS module boilerplates from a centralized GitLab repository with local caching and smart dependency resolution.

## Key Features

### Version-Based Module Management
- Support for multiple NestJS versions (e.g., v10, v11, v12+)
- Organize modules in GitLab with version-specific branches (`v10`, `v11`, etc.)
- Use `init@version` and `add@version` syntax to work with specific versions

### Smart Local Caching
- Automatic caching of modules in `~/.ntic` directory
- First-time setup clones the entire version repository
- Subsequent uses check for updates via latest commit comparison
- Save bandwidth by avoiding repeated downloads

### Metadata Management
- **ntic.json** - Stores project configuration and installed modules
- Tracks NestJS version and all installed modules with metadata
- Replaces module.json in code for cleaner projects

### Environment-Aware Installation
- **installationPlace** - Control where modules go (`src` or `lib`)
- **installWhenInit** - Auto-install modules during `init` (perfect for "common" modules)
- Automatic environment variable management

## Installation

```bash
npm install -g @sugarnest/ntic
```

Or use directly:

```bash
npx @sugarnest/ntic <command>
```

> ⚠️ **Warning:** Currently only support self setup method below

Clone cli tool on repository

```bash
git clone ntic-repo-url
```

Install dependencies

```bash
npm install
```

Build Cli

```bash
npm run build
```

Link with bin

```bash
npm link
```

Test command

```bash
ntic
```

## Setup

### 1. Configure GitLab Access

```bash
ntic setup
```

Choose between:
- **Personal Access Token** - Recommended for CI/CD environments
- **SSH Key** - Better for local development

### 2. Configure Repository

```bash
ntic setup
```

Provide:
- GitLab URL (e.g., `https://gitlab.com`)
- Repository URL (e.g., `https://gitlab.com/group/modules-repo`)

## Repository Structure

```
modules-repo/
  v10/
    package.json
    tsconfig.json
    src/
      modules/
        common/
          module.json
            ...
        auth/
          module.json
            ...
        database/
          module.json
            ...

  v11/
    package.json
    tsconfig.json
    src/
      modules/
        common/
          module.json
          ...
```

## Usage

### Initialize a Project

Detect version from package.json and initialize:

```bash
ntic init
```

Explicitly set version:

```bash
ntic init@11
```

This command:
- Creates `src/lib` directory
- Sets up `@lib` path alias in `tsconfig.json`
- Creates `ntic.json` with version information
- Auto-installs modules with `installWhenInit: true` (like "common")
- Sets up environment variables

### Add Modules

Add modules interactively (uses version from ntic.json):

```bash
ntic add
```

Add from specific version:

```bash
ntic add@10
```

Add specific modules:

```bash
ntic add@11 -m auth,database,cache
```

### List Modules

View all available modules for a version:

```bash
ntic list
```

List specific version modules:

```bash
ntic list@10
```

Shows currently configured default version.

### Override Default

Always use `@version` suffix to override:

```bash
ntic init@10    # Use v10 even if default is v11
ntic add@12     # Use v12 specifically
```

## Cache Management

### View Cache Information

```bash
ntic cache-info
```

Shows:
- Cached versions
- Cache size per version
- Last update time
- Latest commit hash

### Clear Cache

Clear specific version:

```bash
ntic cache-clear 11
```

Clear all caches:

```bash
ntic cache-clear
```

## Module Metadata Format

Create `module.json` in each module directory:

```json
{
  "name": "auth",
  "version": "1.0.0",
  "description": "JWT authentication with Passport.js",
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
      "description": "Token expiration time",
      "required": false,
      "defaultValue": "24h",
      "example": "24h"
    }
  ],
  "dependentModules": ["common"],
  "installationPlace": "lib",
  "installWhenInit": false
}
```

### Metadata Fields

- **name** (string, required): Module identifier
- **version** (string, required): Semantic version
- **description** (string, optional): Module description
- **dependencies** (object): Production NPM packages
- **devDependencies** (object): Development NPM packages
- **peerDependencies** (object): Packages consuming project must have
- **environmentVariables** (array): Environment variables needed
- **dependentModules** (array): Other modules this depends on
- **installationPlace** (`"src" | "lib"`, default: `"lib"`):
  - `"lib"` → `src/lib/{moduleName}`
  - `"src"` → `src/{moduleName}`
- **installWhenInit** (boolean, default: false):
  - Set `true` to auto-install during `init`
  - Perfect for "common" utilities every project needs

## ntic.json Format

Created automatically during initialization:

```json
{
  "version": "11",
  "modules": [
    {
      "name": "common",
      "version": "1.0.0",
      "installationPlace": "src",
      "installWhenInit": true
    },
    {
      "name": "auth",
      "version": "1.0.0",
      "installationPlace": "lib"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

## Workflow Example

### 1. Create New NestJS Project

```bash
nest new my-app
cd my-app
```

### 2. Set Up NTIC

```bash
# Configure GitLab once
ntic setup

# Initialize project
ntic init
# → Creates ntic.json with v11
# → Auto-installs common module
# → Sets up environment variables
```

### 3. Add More Modules

```bash
ntic add
# → Shows modules from cache
# → Lets you choose what to add
# → Installs dependencies
# → Updates ntic.json
```

### 4. Manage Versions

```bash
# Check what's cached
ntic cache-info

# Update cache (automatic, but can force)
ntic add@11

# Clear old versions
ntic cache-clear 10
```

## Common Patterns

### Auto-Install "Common" Utilities

Set `installWhenInit: true` in common module:

```bash
ntic init
# → Automatically installs common
# → Logger, validators, decorators ready to use
```

### Version-Specific Features

Create version-specific modules:

```bash
# Repository branches: v10, v11, v12
# Each with slightly different implementations

ntic init@10    # Get v10-specific modules
ntic init@12    # Get v12-specific modules
```

### Dependency Chains

Modules can depend on others:

```json
{
  "name": "auth",
  "dependentModules": ["database", "cache", "common"]
}
```

When installing auth, all dependencies are automatically installed in correct order.

## Troubleshooting

### Cache Not Updating

Clear and rebuild:

```bash
ntic cache-clear 11
ntic add@11
```

### GitLab Authentication Failed

Re-run setup:

```bash
ntic setup
# Choose different auth method or update token
```

### Module Not Found

Verify repository structure and version:

```bash
ntic list@11     # Check what modules exist for v11
ntic cache-info  # Verify cache is populated
```

### Permission Denied in ~/.ntic

Ensure permissions are correct:

```bash
ls -la ~/.ntic
# Should be writable by current user
```

## Environment Variables

NTIC uses these environment variables:

- `NTIC_CACHE_DIR` - Override default cache location (default: `~/.ntic`)
- `NTIC_CONFIG_DIR` - Override config location (default: `~/.ntic/config`)

## Development

### Contributing Modules

1. Create module folder: `src/modules/my-module/`
2. Add `module.json` with metadata
3. Add source code
4. Push to appropriate version branch
5. Modules auto-available after push

## CLI Command Reference

```
ntic setup                    Setup GitLab authentication
ntic init [version]          Initialize NestJS project
ntic add [version]           Add modules to project
ntic list [version]          List available/installed modules
ntic cache-info              Show cache information
ntic cache-clear [version]   Clear cache
```

## License

Proprietary - For internal company use only

## Support

For issues or feature requests, contact the DevOps team.
