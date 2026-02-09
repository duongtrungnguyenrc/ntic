# Deployment Guide

This guide covers how to set up and deploy the NestJS Modules CLI in your organization.

## Internal Deployment

### 1. GitLab Repository Setup

Create a GitLab repository to host the CLI and modules:

```bash
# Create the main modules repository
git init --bare nestjs-modules.git
cd nestjs-modules.git
git config core.bare true
```

### 2. Repository Structure

Organize your repository with this structure:

```
nestjs-modules/
├── modules/
│   ├── auth/
│   │   ├── module.json
│   │   └── src/
│   ├── database/
│   │   ├── module.json
│   │   └── src/
│   ├── cache/
│   │   ├── module.json
│   │   └── src/
│   └── logging/
│       ├── module.json
│       └── src/
├── .gitignore
└── README.md
```

### 3. Publishing the CLI

#### Option A: NPM Registry

Publish to your private NPM registry:

```bash
cd cli
npm version patch  # or minor/major
npm publish --registry=https://your-npm-registry.com
```

Update `package.json` with your registry:

```json
{
  "publishConfig": {
    "registry": "https://your-npm-registry.com"
  }
}
```

#### Option B: Direct Installation

Developers can install directly from GitLab:

```bash
npm install @company/nestjs-modules-cli@git+https://gitlab.com/company/nestjs-modules-cli.git
```

Or with SSH:

```bash
npm install git+ssh://git@gitlab.com:company/nestjs-modules-cli.git
```

### 4. GitLab CI/CD Pipeline

Create `.gitlab-ci.yml` for the CLI project:

```yaml
stages:
  - lint
  - build
  - test
  - publish

variables:
  NODE_VERSION: "18"

lint:
  stage: lint
  image: node:$NODE_VERSION
  script:
    - cd cli
    - npm install
    - npm run build

build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - cd cli
    - npm install
    - npm run build
  artifacts:
    paths:
      - cli/dist/
    expire_in: 1 week

publish:
  stage: publish
  image: node:$NODE_VERSION
  script:
    - cd cli
    - npm install
    - npm run build
    - echo "@company:registry=https://your-npm-registry.com" >> ~/.npmrc
    - echo "//your-npm-registry.com:_authToken=$NPM_TOKEN" >> ~/.npmrc
    - npm publish
  only:
    - tags
```

### 5. Environment Variables

Set up these GitLab CI/CD variables:

- `NPM_TOKEN`: Your private NPM registry token
- `GITLAB_TOKEN`: For accessing private repositories

## Module Creation Guide

### Creating a New Module

1. **Create module directory**:

```bash
mkdir -p modules/my-module/src
cd modules/my-module
```

2. **Create module.json**:

```json
{
  "name": "my-module",
  "version": "1.0.0",
  "description": "My custom NestJS module",
  "dependencies": {
    "@nestjs/common": "^10.0.0"
  },
  "environmentVariables": [
    {
      "name": "MY_MODULE_CONFIG",
      "description": "Configuration for my module",
      "required": false,
      "example": "config-value"
    }
  ],
  "dependentModules": []
}
```

3. **Create module source code**:

```bash
# Create the main module file
cat > src/my-module.module.ts << 'EOF'
import { Module } from '@nestjs/common';

@Module({})
export class MyModule {}
EOF
```

4. **Add to Git**:

```bash
git add modules/my-module/
git commit -m "feat: add my-module"
git push origin main
```

### Module Dependencies

If your module depends on other modules:

```json
{
  "name": "advanced-module",
  "version": "1.0.0",
  "description": "Advanced module requiring database",
  "dependentModules": ["database"]
}
```

The CLI will automatically install `database` module first, then `advanced-module`.

## Organization Guidelines

### Naming Conventions

- Module names: `lowercase-with-hyphens`
- Version: Follow semantic versioning (e.g., `1.0.0`)
- Descriptions: Clear, concise English

### Code Quality

- **Linting**: Use ESLint with shared config
- **Testing**: Include unit tests in modules
- **Documentation**: Add README in each module directory
- **TypeScript**: Strict mode enabled

### Module Checklist

Before publishing a module:

- [ ] `module.json` is valid and complete
- [ ] Environment variables are documented
- [ ] Dependencies are correctly specified
- [ ] Code follows NestJS best practices
- [ ] TypeScript compiles without errors
- [ ] README.md is included
- [ ] Tests pass (if applicable)

## Security Considerations

### GitLab Access

1. **Create a GitLab Group**: Organize modules under a group
2. **Manage Permissions**: Use group-level access control
3. **SSH Keys**: Developers should use SSH keys for authentication

### Credentials Management

```bash
# Users should NOT commit credentials
# Use personal access tokens with limited scope:
# - read_repository (for CLI)
# - write_repository (for CI/CD)
```

### Environment Variables

Never commit sensitive data:

```bash
# ✗ Don't do this
echo "API_KEY=secret123" >> .env

# ✓ Do this
echo "API_KEY=" >> .env.example
```

## Troubleshooting

### Authentication Issues

```bash
# Test GitLab connection
curl -H "PRIVATE-TOKEN: your-token" https://gitlab.com/api/v4/user

# Test SSH
ssh -T git@gitlab.com
```

### Module Discovery

```bash
# List modules in GitLab project
curl -H "PRIVATE-TOKEN: token" \
  https://gitlab.com/api/v4/projects/company%2Fnestjs-modules/repository/tree?path=modules
```

### Dependency Conflicts

- Check `package.json` for peer dependency mismatches
- Update modules to compatible versions
- Consider using `npm audit` to find vulnerabilities

## Monitoring & Maintenance

### Regular Updates

1. Review dependencies monthly
2. Update NestJS and node versions
3. Security patches for dependencies

### Deprecation Policy

For deprecated modules:

```json
{
  "name": "old-module",
  "deprecated": {
    "message": "Use new-module instead",
    "replacement": "new-module",
    "until": "2025-12-31"
  }
}
```

## Support & Documentation

- Create GitLab Wiki for internal documentation
- Use GitLab Issues for module bugs and feature requests
- Set up Slack/Teams notifications for updates

## Example: Complete Workflow

```bash
# 1. Create new module
mkdir -p modules/redis-cache/src
cd modules/redis-cache

# 2. Create module.json
cat > module.json << 'EOF'
{
  "name": "redis-cache",
  "version": "1.0.0",
  "description": "Redis caching module",
  "dependencies": {
    "@nestjs/cache-manager": "^1.0.0",
    "redis": "^4.6.0"
  },
  "environmentVariables": [
    {
      "name": "REDIS_URL",
      "required": true,
      "example": "redis://localhost:6379"
    }
  ],
  "dependentModules": []
}
EOF

# 3. Create module source
mkdir src
cat > src/redis-cache.module.ts << 'EOF'
import { Module } from '@nestjs/common';

@Module({})
export class RedisCacheModule {}
EOF

# 4. Commit and push
git add .
git commit -m "feat: add redis-cache module"
git push origin main

# 5. Users can now use it
ntic add  # redis-cache appears in the list
```

---

For additional help, contact your DevOps team or check the main README.md
