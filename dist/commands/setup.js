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
exports.setupCommand = setupCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ntic_1 = require("../utils/ntic");
const config_1 = require("../utils/config");
const process = __importStar(require("node:process"));
function setupCommand(program) {
    program
        .command("setup [registry]")
        .description("Setup GitLab authentication and CLI configuration")
        .action(async (_registry = "default") => {
        const registry = "default"; // Now only support one registry
        try {
            console.log(chalk_1.default.cyan("\nNestJS Modules CLI Setup\n"));
            const allConfig = await (0, config_1.loadConfig)();
            // Prevent default override when forgot input registry
            if (registry === "default" && !!allConfig["default"]) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "confirm",
                        name: "overrideDefault",
                        message: "Default config already exists. Do you want to override?",
                        default: true,
                    },
                ]);
                if (!answers.overrideDefault)
                    return;
            }
            // Choose Github or Gitlab as storage
            const answers = await inquirer_1.default.prompt([
                {
                    type: "list",
                    name: "storage",
                    message: "Select git storage:",
                    default: "github",
                    choices: [
                        {
                            name: "Github",
                            value: "github",
                        },
                        {
                            name: "Gitlab",
                            value: "gitlab",
                        },
                    ],
                },
            ]);
            if (answers.storage === "gitlab") {
                const currentConfig = Object.entries(allConfig).find(([entryName, cfg]) => entryName === registry && cfg.type === "gitlab")?.[1] || allConfig["default"]?.type === "gitlab"
                    ? allConfig["default"]
                    : undefined;
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "input",
                        name: "gitlabUrl",
                        message: "GitLab server URL:",
                        default: currentConfig?.gitlabUrl || "https://gitlab.com",
                    },
                    {
                        type: "input",
                        name: "token",
                        message: "Enter your GitLab Personal Access Token:",
                        default: currentConfig?.accessToken,
                    },
                    {
                        type: "input",
                        name: "repositoryId",
                        message: "GitLab storage repository ID:",
                        default: currentConfig?.repositoryId || "company/nestjs-modules",
                    },
                ]);
                await (0, ntic_1.setupGitlabStorage)({
                    type: "gitlab",
                    gitlabUrl: answers.gitlabUrl,
                    accessToken: answers.token,
                    repositoryId: answers.repositoryId,
                }, registry);
            }
            else if (answers.storage === "github") {
                const currentConfig = Object.entries(allConfig).find(([entryName, cfg]) => entryName === registry && cfg.type === "github")?.[1] || allConfig["default"]?.type === "github"
                    ? allConfig["default"]
                    : undefined;
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "input",
                        name: "token",
                        message: "Enter your Github Personal Access Token:",
                        default: currentConfig?.accessToken,
                    },
                    {
                        type: "input",
                        name: "repositoryId",
                        message: "Github storage repository ID:",
                        default: currentConfig?.repositoryId || "company/nestjs-modules",
                    },
                ]);
                await (0, ntic_1.setupGithubStorage)({
                    type: "github",
                    accessToken: answers.token,
                    repositoryId: answers.repositoryId,
                }, registry);
            }
            console.log(chalk_1.default.green("\n✓ Setup completed successfully!\n"));
            console.log(chalk_1.default.gray("You can now use the CLI commands:"));
            console.log(chalk_1.default.yellow("  ntic init    - Initialize a NestJS project"));
            console.log(chalk_1.default.yellow("  ntic add     - Add modules to your project\n"));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Setup failed: ${error.message || error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=setup.js.map