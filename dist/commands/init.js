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
const gitlab_1 = require("../utils/gitlab");
const config_1 = require("../utils/config");
const format_1 = require("../utils/format");
function initCommand(program) {
    program
        .command("init")
        .description("Initialize NestJS project for module integration")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-a, --alias <alias>", "Path alias for lib directory (default: @lib)", "@lib")
        .action(async (options) => {
        try {
            console.log(chalk_1.default.cyan("\nNestJS Template Project Initialization\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            // Detect NestJS project
            console.log(chalk_1.default.blue("Detecting NestJS project..."));
            const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
            console.log(chalk_1.default.green(`✓ NestJS project detected at ${config.projectRoot}`));
            // Ask for confirmation and options
            const answers = await inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "proceed",
                    message: `Initialize at ${projectRoot}?`,
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
                    message: "Create .env.example file with module variables?",
                    default: true,
                    when: (answers) => answers.proceed,
                },
            ]);
            if (!answers.proceed) {
                console.log(chalk_1.default.yellow("Initialization cancelled"));
                return;
            }
            // Create lib directory
            console.log(chalk_1.default.blue("\nSetting up project structure..."));
            await (0, nestjs_1.ensureLibDirectory)(config);
            const gitlabClient = await (0, gitlab_1.createGitLabClient)();
            const modulesRegistry = await (0, config_1.getConfigValue)("modulesRegistry");
            await gitlabClient.downloadModuleSource(modulesRegistry, "common", config.libDir);
            // Setup path alias
            await (0, nestjs_1.setupPathAlias)(config, answers.libAlias);
            // Setup prettier
            await (0, format_1.setupPrettier)();
            // Initialize environment files
            await (0, nestjs_1.updateEnvironmentVariables)(config, [
                {
                    name: "NODE_ENV",
                    description: "Node environment",
                    required: true,
                    defaultValue: "development",
                    example: "development",
                },
            ], answers.createEnvExample);
            // Create a summary file
            const initSummary = {
                initializedAt: new Date().toISOString(),
                projectRoot: config.projectRoot,
                libDirectory: config.libDir,
                pathAlias: answers.libAlias,
                tsconfigPath: config.tsconfigPath,
                envFiles: [config.envPath, config.envExamplePath],
            };
            console.log(chalk_1.default.green("\nInitialization completed successfully!\n"));
            console.log(chalk_1.default.cyan("Project Configuration:"));
            console.log(chalk_1.default.gray(`  Project Root: ${initSummary.projectRoot}`));
            console.log(chalk_1.default.gray(`  Lib Directory: ${initSummary.libDirectory}`));
            console.log(chalk_1.default.gray(`  Path Alias: ${initSummary.pathAlias}`));
            console.log(chalk_1.default.gray(`  TypeScript Config: ${initSummary.tsconfigPath}`));
            console.log(chalk_1.default.cyan("\nNext Steps:"));
            console.log(chalk_1.default.yellow("  1. Run: ntic add"));
            console.log(chalk_1.default.yellow("  2. Select modules you want to integrate"));
            console.log(chalk_1.default.yellow("  3. Install dependencies: npm install\n"));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Initialization failed: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=init.js.map