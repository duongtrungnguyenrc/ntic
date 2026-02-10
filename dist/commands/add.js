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
exports.addCommand = addCommand;
const path = __importStar(require("node:path"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const cache_1 = require("../utils/cache");
const nestjs_1 = require("../utils/nestjs");
const ntic_1 = require("../utils/ntic");
const version_1 = require("../utils/version");
function addCommand(program) {
    program
        .command("add [version]")
        .description("Add modules to your NestJS project")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-m, --modules <names>", "Comma-separated module names to add")
        .action(async (versionArg, options) => {
        try {
            console.log(chalk_1.default.cyan("\nAdd Modules to NestJS Project\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            // Detect NestJS project
            console.log(chalk_1.default.blue("Detecting NestJS project..."));
            const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
            console.log(chalk_1.default.green(`✓ NestJS project detected at ${config.projectRoot}`));
            // Determine NestJS version
            let nestJsVersion = versionArg || (await (0, ntic_1.getNestJsVersionFromNtic)(projectRoot));
            if (!nestJsVersion) {
                nestJsVersion = await (0, version_1.detectNestJsVersion)(projectRoot);
            }
            nestJsVersion = (0, version_1.normalizeVersion)(nestJsVersion);
            console.log(chalk_1.default.cyan(`NestJS Version: v${nestJsVersion}`));
            // Clone or update cache for this version
            console.log(chalk_1.default.blue("\nSetting up module cache..."));
            const cachedSrcPath = await (0, cache_1.cloneOrUpdateCache)(nestJsVersion);
            // Get available modules from cache
            console.log(chalk_1.default.blue("Loading available modules..."));
            const availableModules = await (0, cache_1.listCachedModules)(nestJsVersion);
            console.log(chalk_1.default.green(`✓ Found ${availableModules.length} available modules`));
            if (availableModules.length === 0) {
                console.error(chalk_1.default.red("No modules available for this version"));
                process.exit(1);
            }
            // Filter out already installed modules
            const installableModules = [];
            for (const moduleName of availableModules) {
                const installed = await (0, nestjs_1.moduleExists)(config, moduleName);
                if (!installed) {
                    installableModules.push(moduleName);
                }
            }
            if (installableModules.length === 0) {
                console.log(chalk_1.default.yellow("All available modules are already installed"));
                return;
            }
            // Load metadata for all modules
            console.log(chalk_1.default.blue("Loading module metadata..."));
            const moduleMetadataMap = new Map(); // all modules has metadata
            const visibleModuleMetadataMap = new Map(); // just visible modules
            for (const moduleName of availableModules) {
                try {
                    const metadata = await (0, cache_1.getCachedModuleMetadata)(nestJsVersion, moduleName);
                    if (metadata) {
                        moduleMetadataMap.set(moduleName, metadata);
                        if (metadata.visibility !== false) {
                            visibleModuleMetadataMap.set(moduleName, metadata);
                        }
                    }
                }
                catch {
                    console.warn(chalk_1.default.yellow(`⚠ Could not load metadata for ${moduleName}`));
                }
            }
            // Ask user which modules to add
            let selectedModules;
            if (options.modules) {
                selectedModules = options.modules
                    .split(",")
                    .map((m) => m.trim())
                    .filter((m) => installableModules.includes(m));
                if (selectedModules.length === 0) {
                    console.error(chalk_1.default.red("No valid modules specified"));
                    process.exit(1);
                }
            }
            else {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "checkbox",
                        name: "modules",
                        message: "Select modules to add:",
                        choices: installableModules.map((m) => {
                            const metadata = visibleModuleMetadataMap.get(m);
                            const description = metadata?.description || "No description";
                            return {
                                name: `${m} - ${description}`,
                                value: m,
                            };
                        }),
                        validate: (answer) => {
                            if (answer.length === 0) {
                                return "Please select at least one module";
                            }
                            return true;
                        },
                    },
                ]);
                selectedModules = answers.modules;
            }
            // Install modules
            const installedModules = await (0, ntic_1.installModules)(cachedSrcPath, projectRoot, selectedModules, moduleMetadataMap);
            console.log(chalk_1.default.green("\nModules installed successfully!\n"));
            console.log(chalk_1.default.cyan("Installation Summary:"));
            console.log(chalk_1.default.gray(`  Modules installed: ${installedModules.join(", ")}`));
            // Show installation locations
            console.log(chalk_1.default.cyan("\nModule Locations:"));
            for (const moduleName of installedModules) {
                const metadata = moduleMetadataMap.get(moduleName);
                const installDir = (0, nestjs_1.getInstallationPath)(config, metadata.installationPlace);
                console.log(chalk_1.default.gray(`  ${moduleName}: ${installDir}`));
            }
            console.log(chalk_1.default.cyan("\nNext Steps:"));
            console.log(chalk_1.default.yellow("  1. Run: npm install"));
            console.log(chalk_1.default.yellow("  2. Update .env with module-specific variables"));
            console.log(chalk_1.default.yellow("  3. Import and use modules in your code\n"));
        }
        catch (error) {
            console.error(chalk_1.default.red(`\n✗ Failed to add modules: ${error}\n`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=add.js.map