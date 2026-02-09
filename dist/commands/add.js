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
const nestjs_1 = require("../utils/nestjs");
const dependencies_1 = require("../utils/dependencies");
const gitlab_1 = require("../utils/gitlab");
const config_1 = require("../utils/config");
function addCommand(program) {
    program
        .command("add")
        .description("Add modules to your NestJS project")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-m, --modules <names>", "Comma-separated module names to add")
        .action(async (options) => {
        try {
            console.log(chalk_1.default.cyan("\nAdd Modules to NestJS Project\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            // Detect NestJS project
            console.log(chalk_1.default.blue("Detecting NestJS project..."));
            const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
            console.log(chalk_1.default.green(`✓ NestJS project detected at ${config.projectRoot}`));
            // Check GitLab configuration
            const gitlabUrl = await (0, config_1.getConfigValue)("gitlabUrl");
            const modulesRegistry = await (0, config_1.getConfigValue)("modulesRegistry");
            if (!gitlabUrl || !modulesRegistry) {
                console.error(chalk_1.default.red("✗ GitLab not configured. Please run: ntic setup"));
                process.exit(1);
            }
            // Create GitLab client
            const client = await (0, gitlab_1.createGitLabClient)();
            // Get installed modules
            console.log(chalk_1.default.blue("\nLoading available modules..."));
            let availableModules = [];
            let installedModules = [];
            try {
                availableModules = await client.listModules(modulesRegistry);
                installedModules = await (0, nestjs_1.getInstalledModules)(config);
            }
            catch (error) {
                console.error(chalk_1.default.red(`✗ Failed to load modules: ${error}`));
                process.exit(1);
            }
            console.log(chalk_1.default.green(`✓ Found ${availableModules.length} available modules`));
            // Filter out already installed modules
            const modulesToChoose = availableModules.filter((m) => !installedModules.includes(m));
            if (modulesToChoose.length === 0) {
                console.log(chalk_1.default.yellow("All available modules are already installed."));
                return;
            }
            // Load metadata for all available modules
            console.log(chalk_1.default.blue("\nLoading module metadata..."));
            const moduleMetadataMap = new Map();
            for (const moduleName of availableModules) {
                try {
                    const metadata = await client.getModuleMetadata(modulesRegistry, moduleName);
                    if (metadata) {
                        moduleMetadataMap.set(moduleName, metadata);
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
                    .filter((m) => modulesToChoose.includes(m));
                if (selectedModules.length === 0) {
                    console.error(chalk_1.default.red("✗ No valid modules specified"));
                    process.exit(1);
                }
            }
            else {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "checkbox",
                        name: "modules",
                        message: "Select modules to add:",
                        choices: modulesToChoose.map((m) => {
                            const metadata = moduleMetadataMap.get(m);
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
            // Resolve dependencies
            console.log(chalk_1.default.blue("\nResolving module dependencies..."));
            const dependencyGraph = await (0, dependencies_1.resolveDependencies)(selectedModules, moduleMetadataMap);
            (0, dependencies_1.printDependencyInfo)(dependencyGraph);
            // Confirm before proceeding
            const confirmAnswer = await inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "proceed",
                    message: "Proceed with installation?",
                    default: true,
                },
            ]);
            if (!confirmAnswer.proceed) {
                console.log(chalk_1.default.yellow("Installation cancelled"));
                return;
            }
            // Download and install modules
            console.log(chalk_1.default.blue("\nInstalling modules..."));
            for (const moduleName of dependencyGraph.order) {
                if (await (0, nestjs_1.moduleExists)(config, moduleName)) {
                    console.log(chalk_1.default.yellow(`⊘ Module ${moduleName} already installed, skipping`));
                    continue;
                }
                try {
                    await client.downloadModuleSource(modulesRegistry, moduleName, config.libDir);
                    // Update environment variables
                    const metadata = moduleMetadataMap.get(moduleName);
                    if (metadata?.environmentVariables && metadata.environmentVariables.length > 0) {
                        await (0, nestjs_1.updateEnvironmentVariables)(config, metadata.environmentVariables, true);
                    }
                }
                catch (error) {
                    console.error(chalk_1.default.red(`✗ Failed to install module ${moduleName}: ${error}`));
                    throw error;
                }
            }
            // Update project dependencies
            await (0, dependencies_1.updateProjectDependencies)(projectRoot, dependencyGraph);
            console.log(chalk_1.default.green("\nModules installed successfully!\n"));
            console.log(chalk_1.default.cyan("Installation Summary:"));
            console.log(chalk_1.default.gray(`  Modules installed: ${dependencyGraph.order.join(", ")}`));
            console.log(chalk_1.default.gray(`  Location: ${config.libDir}`));
            console.log(chalk_1.default.cyan("\nNext Steps:"));
            console.log(chalk_1.default.yellow("  1. Install npm dependencies: npm install"));
            console.log(chalk_1.default.yellow("  2. Update .env file with required variables"));
            console.log(chalk_1.default.yellow("  3. Import modules using the @lib alias in your code\n"));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Failed to add modules: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=add.js.map