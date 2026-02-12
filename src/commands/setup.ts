import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

import { loadConfig, saveConfig } from "../utils/config";
import { GitLabClient } from "../utils/gitlab";
import { CLIConfig } from "../types/module";

export function setupCommand(program: Command): void {
   program
      .command("setup [storage]")
      .description("Setup GitLab authentication and CLI configuration")
      .action(async (storage?: string) => {
         try {
            console.log(chalk.cyan("\nNestJS Modules CLI Setup\n"));

            const currentConfig: Record<string, CLIConfig> = await loadConfig();

            const answers = await inquirer.prompt([
               {
                  type: "input",
                  name: "gitlabUrl",
                  message: "GitLab server URL:",
                  default: currentConfig?.default?.gitlabUrl || "https://gitlab.com",
               },
               {
                  type: "input",
                  name: "token",
                  message: "Enter your GitLab Personal Access Token:",
                  default: currentConfig?.default?.gitlabToken,
               },
               {
                  type: "input",
                  name: "modulesRegistry",
                  message: "GitLab project ID or path (e.g., company/nestjs-modules):",
                  default: currentConfig?.default?.modulesRegistry || "company/nestjs-modules",
               },
            ]);

            const client = new GitLabClient(answers.gitlabUrl);

            // Validate token
            await client.authenticate(answers.token);

            await saveConfig(
               {
                  gitlabUrl: answers.gitlabUrl,
                  gitlabToken: answers.token,
                  modulesRegistry: answers.modulesRegistry,
               },
               storage,
            );

            console.log(chalk.green("\n✓ Setup completed successfully!\n"));
            console.log(chalk.gray("You can now use the CLI commands:"));
            console.log(chalk.yellow("  ntic init    - Initialize a NestJS project"));
            console.log(chalk.yellow("  ntic add     - Add modules to your project\n"));
         } catch (error: any) {
            console.error(chalk.red(`✗ Setup failed: ${error.message || error}`));
            process.exit(1);
         }
      });
}
