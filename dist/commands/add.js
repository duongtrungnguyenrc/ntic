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
const ntic_1 = require("../utils/ntic");
const cache_1 = require("../utils/cache");
function addCommand(program) {
    program
        .command("add")
        .description("Add modules to your NestJS project")
        .option("-r, --registry <registry>", "Selection modules registry (default: default registry)")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .option("-m, --modules <names>", "Comma-separated module names to add")
        .action(async (_, options) => {
        try {
            console.log(chalk_1.default.cyan("\nAdd Modules to NestJS Project\n"));
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            const { version, visibleAvailableModules, allModules } = await (0, ntic_1.getInstallationStats)(projectRoot);
            if (visibleAvailableModules.length === 0) {
                console.error(chalk_1.default.red("All available modules are already installed"));
                process.exit(1);
            }
            // Ask user which modules to add
            let selectedModules;
            if (options.modules) {
                selectedModules = options.modules
                    .split(",")
                    .map((m) => m.trim())
                    .filter((m) => visibleAvailableModules.some((installable) => installable.name === m));
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
                        choices: visibleAvailableModules.map((metadata) => {
                            const description = metadata?.description || "No description";
                            return {
                                name: ` ${metadata.name} - ${description}`,
                                value: metadata.name,
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
            const moduleMetadataMap = allModules.reduce((prev, curr) => {
                prev.set(curr.name, curr);
                return prev;
            }, new Map());
            const cachedSrcPath = await (0, cache_1.getCachedSourcePath)(version);
            const installedModules = await (0, ntic_1.installModules)(cachedSrcPath, projectRoot, selectedModules, moduleMetadataMap);
            console.log(chalk_1.default.green("\nModules installed successfully!\n"));
            console.log(chalk_1.default.cyan("Installation Summary:"));
            console.log(chalk_1.default.gray(`  Modules installed: ${installedModules.join(", ") || "No"}`));
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