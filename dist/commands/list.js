"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = listCommand;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const nestjs_1 = require("../utils/nestjs");
const gitlab_1 = require("../utils/gitlab");
const config_1 = require("../utils/config");
function listCommand(program) {
    program
        .command("list")
        .alias("ls")
        .description("List installed and available modules")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-a, --available", "Show only available modules")
        .option("-i, --installed", "Show only installed modules")
        .action(async (options) => {
        try {
            console.log(chalk_1.default.cyan("\nModule Registry\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            // Detect NestJS project
            let config;
            let installedModules = [];
            try {
                config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
                installedModules = await (0, nestjs_1.getInstalledModules)(config);
            }
            catch (error) {
                console.warn(chalk_1.default.yellow(`⚠ Not a valid NestJS project: ${error}`));
            }
            // Check GitLab configuration
            const gitlabUrl = await (0, config_1.getConfigValue)("gitlabUrl");
            const modulesRegistry = await (0, config_1.getConfigValue)("modulesRegistry");
            if (!gitlabUrl || !modulesRegistry) {
                console.error(chalk_1.default.red("✗ GitLab not configured. Please run: ntic setup"));
                process.exit(1);
            }
            // Create GitLab client
            const client = await (0, gitlab_1.createGitLabClient)();
            let availableModules = [];
            if (!options.installed) {
                console.log(chalk_1.default.blue("Loading available modules..."));
                try {
                    availableModules = await client.listModules(modulesRegistry);
                }
                catch (error) {
                    console.error(chalk_1.default.red(`✗ Failed to load modules: ${error}`));
                    process.exit(1);
                }
            }
            // Load metadata for display
            console.log(chalk_1.default.blue("Loading module metadata...\n"));
            if (!options.available && (installedModules.length > 0 || !options.installed)) {
                console.log(chalk_1.default.cyan("Installed Modules:"));
                if (installedModules.length === 0) {
                    console.log(chalk_1.default.gray("  No modules installed"));
                }
                else {
                    for (const moduleName of installedModules) {
                        const metadataPath = path.join(config.libDir, moduleName, "module.json");
                        try {
                            const metadata = await fs.readJson(metadataPath);
                            console.log(chalk_1.default.green(`  ✓ ${moduleName}@${metadata.version}`));
                            if (metadata.description) {
                                console.log(chalk_1.default.gray(`    ${metadata.description}`));
                            }
                            if (metadata.dependentModules && metadata.dependentModules.length > 0) {
                                console.log(chalk_1.default.gray(`    Depends on: ${metadata.dependentModules.join(", ")}`));
                            }
                        }
                        catch {
                            console.log(chalk_1.default.yellow(`  ⊘ ${moduleName} (metadata not found)`));
                        }
                    }
                }
                console.log();
            }
            if (!options.installed && (availableModules.length > 0 || !options.available)) {
                console.log(chalk_1.default.cyan("Available Modules:"));
                const notInstalled = availableModules.filter((m) => !installedModules.includes(m));
                if (notInstalled.length === 0) {
                    console.log(chalk_1.default.gray("  All modules installed"));
                }
                else {
                    for (const moduleName of notInstalled) {
                        try {
                            const metadata = await client.getModuleMetadata(modulesRegistry, moduleName);
                            console.log(chalk_1.default.blue(`  ◇ ${moduleName}@${metadata.version}`));
                            if (metadata.description) {
                                console.log(chalk_1.default.gray(`    ${metadata.description}`));
                            }
                            if (metadata.dependencies) {
                                const deps = Object.entries(metadata.dependencies)
                                    .map(([name, version]) => `${name}@${version}`)
                                    .join(", ");
                                console.log(chalk_1.default.gray(`    Dependencies: ${deps}`));
                            }
                        }
                        catch {
                            console.log(chalk_1.default.yellow(`  ◇ ${moduleName} (metadata not found)`));
                        }
                    }
                }
                console.log();
            }
            console.log(chalk_1.default.cyan(`Summary:`));
            console.log(chalk_1.default.gray(`  Installed: ${installedModules.length}`));
            console.log(chalk_1.default.gray(`  Available: ${availableModules.length - installedModules.length}`));
            console.log(chalk_1.default.gray(`  Total: ${availableModules.length}\n`));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Failed to list modules: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=list.js.map