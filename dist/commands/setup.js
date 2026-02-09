"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommand = setupCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../utils/config");
const gitlab_1 = require("../utils/gitlab");
function setupCommand(program) {
    program
        .command("setup")
        .description("Setup GitLab authentication and CLI configuration")
        .action(async () => {
        try {
            console.log(chalk_1.default.cyan("\nNestJS Modules CLI Setup\n"));
            const currentConfig = await (0, config_1.loadConfig)();
            const answers = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "gitlabUrl",
                    message: "GitLab server URL:",
                    default: currentConfig.gitlabUrl || "https://gitlab.com",
                },
                {
                    type: "input",
                    name: "token",
                    message: "Enter your GitLab Personal Access Token:",
                    default: currentConfig.gitlabToken,
                },
                {
                    type: "input",
                    name: "modulesRegistry",
                    message: "GitLab project ID or path (e.g., company/nestjs-modules):",
                    default: currentConfig.modulesRegistry || "company/nestjs-modules",
                },
            ]);
            const client = new gitlab_1.GitLabClient(answers.gitlabUrl);
            // Validate token
            await client.authenticate(answers.token);
            await (0, config_1.setConfigValue)("gitlabUrl", answers.gitlabUrl);
            await (0, config_1.setConfigValue)("gitlabToken", answers.token);
            await (0, config_1.setConfigValue)("modulesRegistry", answers.modulesRegistry);
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