import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

import { setupGithubStorage, setupGitlabStorage } from "../utils/ntic";
import { loadConfig } from "../utils/config";
import { RegistryConfig } from "../types/module";
import * as process from "node:process";

export function setupCommand(program: Command): void {
   program
      .command("setup [registry]")
      .description("Setup GitLab authentication and CLI configuration")
      .action(async (_registry: string = "default") => {
         const registry: string = "default"; // Now only support one registry

         try {
            console.log(chalk.cyan("\nNestJS Modules CLI Setup\n"));

            const allConfig: Record<string, RegistryConfig> = await loadConfig();

            // Prevent default override when forgot input registry
            if (registry === "default" && !!allConfig["default"]) {
               const answers = await inquirer.prompt([
                  {
                     type: "confirm",
                     name: "overrideDefault",
                     message: "Default config already exists. Do you want to override?",
                     default: true,
                  },
               ]);

               if (!answers.overrideDefault) return;
            }

            // Choose Github or Gitlab as storage
            const answers = await inquirer.prompt([
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
               const currentConfig: RegistryConfig | undefined =
                  Object.entries(allConfig).find(
                     ([entryName, cfg]) => entryName === registry && cfg.type === "gitlab",
                  )?.[1] || allConfig["default"]?.type === "gitlab"
                     ? allConfig["default"]
                     : undefined;

               const answers = await inquirer.prompt([
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

               await setupGitlabStorage(
                  {
                     type: "gitlab",
                     gitlabUrl: answers.gitlabUrl,
                     accessToken: answers.token,
                     repositoryId: answers.repositoryId,
                  },
                  registry,
               );
            } else if (answers.storage === "github") {
               const currentConfig: RegistryConfig | undefined =
                  Object.entries(allConfig).find(
                     ([entryName, cfg]) => entryName === registry && cfg.type === "github",
                  )?.[1] || allConfig["default"]?.type === "github"
                     ? allConfig["default"]
                     : undefined;

               const answers = await inquirer.prompt([
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

               await setupGithubStorage(
                  {
                     type: "github",
                     accessToken: answers.token,
                     repositoryId: answers.repositoryId,
                  },
                  registry,
               );
            }

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
