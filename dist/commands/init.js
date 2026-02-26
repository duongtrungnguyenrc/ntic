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
exports.initCommand = initCommand;
const path = __importStar(require("node:path"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const nestjs_1 = require("../utils/nestjs");
const ntic_1 = require("../utils/ntic");
const version_1 = require("../utils/version");
const format_1 = require("../utils/format");
const cache_1 = require("../utils/cache");
function initCommand(program) {
    program
        .command("init [registry]")
        .description("Initialize NestJS project for module integration")
        .option("-r, --registry <registry>", "Selection modules registry (default: default registry)")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-a, --alias <alias>", "Path alias for lib directory (default: @lib)", "@lib")
        .action(async (registry, options) => {
        try {
            console.log(chalk_1.default.cyan("\nNestJS Project Initialization\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            // Detect NestJS project
            console.log(chalk_1.default.blue("Detecting NestJS project..."));
            const nestJSProjectConfig = await (0, nestjs_1.detectNestJSProject)(projectRoot);
            console.log(chalk_1.default.green(`✓ NestJS project detected at ${nestJSProjectConfig.projectRoot}\n`));
            // Determine NestJS version
            console.log(chalk_1.default.blue("Detecting NestJS version..."));
            let nestJsVersion = await (0, version_1.detectNestJsVersion)(projectRoot);
            console.log(chalk_1.default.green(`NestJS Version: v${nestJsVersion}\n`));
            // Ask for confirmation and options
            const answers = await inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "proceed",
                    message: `Initialize project with NestJS v${nestJsVersion}?`,
                    default: true,
                },
                {
                    type: "input",
                    name: "libAlias",
                    message: "Path alias for lib directory:",
                    default: options.alias,
                    when: (answers) => answers.proceed,
                },
                {
                    type: "confirm",
                    name: "createEnvExample",
                    message: "Create .env.example file?",
                    default: true,
                    when: (answers) => answers.proceed,
                },
            ]);
            if (!answers.proceed) {
                console.log(chalk_1.default.yellow("Initialization cancelled"));
                return;
            }
            // Ensure latest cache
            await (0, cache_1.ensureLatestCache)(nestJsVersion);
            // Setup project structure
            console.log(chalk_1.default.blue("\nSetting up project structure..."));
            await (0, nestjs_1.ensureLibDirectory)(nestJSProjectConfig);
            await (0, nestjs_1.setupPathAlias)(nestJSProjectConfig, answers.libAlias);
            // Setup prettier
            console.log(chalk_1.default.blue("\nSetting up prettier format..."));
            await (0, format_1.setupPrettier)();
            // Normalize app
            await (0, ntic_1.normalizeAppStructure)(projectRoot);
            // Setup main content
            await (0, ntic_1.rebuildMainWithImportsAndAppConfig)(projectRoot, nestJsVersion);
            // Initialize environment files
            await (0, nestjs_1.updateEnvironmentVariables)(nestJSProjectConfig, [
                {
                    name: "NODE_ENV",
                    description: "Node environment",
                    required: true,
                    defaultValue: "development",
                    example: "development",
                },
            ], answers.createEnvExample);
            // Create ntic.json
            console.log(chalk_1.default.blue("\nCreating ntic.json..."));
            await (0, ntic_1.createNticConfig)(projectRoot, nestJsVersion);
            // Install auto-install module
            const autoInstallModules = await (0, ntic_1.installAutoInstallableModules)(projectRoot, nestJsVersion);
            console.log(chalk_1.default.green("\nInitialization completed successfully!\n"));
            console.log(chalk_1.default.cyan("Project Configuration:"));
            console.log(chalk_1.default.gray(`  Project Root: ${nestJSProjectConfig.projectRoot}`));
            console.log(chalk_1.default.gray(`  Lib Directory: ${nestJSProjectConfig.libDir}`));
            console.log(chalk_1.default.gray(`  Path Alias: ${answers.libAlias}`));
            console.log(chalk_1.default.gray(`  TypeScript Config: ${nestJSProjectConfig.tsconfigPath}`));
            console.log(chalk_1.default.gray(`  NestJS Version: v${nestJsVersion}`));
            if (autoInstallModules.length > 0) {
                console.log(chalk_1.default.cyan("\nAuto-installed Modules:"));
                autoInstallModules.forEach((m) => console.log(chalk_1.default.gray(`  - ${m}`)));
            }
            console.log(chalk_1.default.cyan("\nNext Steps:"));
            console.log(chalk_1.default.yellow("  1. Run: ntic add"));
            console.log(chalk_1.default.yellow("  2. Select additional modules you want to integrate"));
            console.log(chalk_1.default.yellow("  3. Install dependencies: npm install\n"));
        }
        catch (error) {
            console.error(chalk_1.default.red(`\n✗ Initialization failed: ${error}\n`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=init.js.map