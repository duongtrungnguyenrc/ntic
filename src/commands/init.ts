import { Command } from "commander";
import * as path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

import { detectNestJSProject, ensureLibDirectory, setupPathAlias, updateEnvironmentVariables } from "../utils/nestjs";
import { createGitLabClient, GitLabClient } from "../utils/gitlab";
import { getConfigValue } from "../utils/config";
import { NestJSProjectConfig } from "../types/module";
import { setupFormatCommand, setupPrettier } from "../utils/format";

export function initCommand(program: Command): void {
   program
      .command("init")
      .description("Initialize NestJS project for module integration")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-a, --alias <alias>", "Path alias for lib directory (default: @lib)", "@lib")
      .action(async (options) => {
         try {
            console.log(chalk.cyan("\nNestJS Template Project Initialization\n"));

            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();

            // Detect NestJS project
            console.log(chalk.blue("Detecting NestJS project..."));
            const config: NestJSProjectConfig = await detectNestJSProject(projectRoot);
            console.log(chalk.green(`✓ NestJS project detected at ${config.projectRoot}`));

            // Ask for confirmation and options
            const answers = await inquirer.prompt([
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
               console.log(chalk.yellow("Initialization cancelled"));
               return;
            }

            // Create lib directory
            console.log(chalk.blue("\nSetting up project structure..."));
            await ensureLibDirectory(config);

            const gitlabClient: GitLabClient = await createGitLabClient();
            const modulesRegistry: string | undefined = await getConfigValue("modulesRegistry");

            await gitlabClient.downloadModuleSource(modulesRegistry!, "common", config.libDir);

            // Setup path alias
            await setupPathAlias(config, answers.libAlias);

            // Setup prettier
            await setupPrettier();

            // Initialize environment files
            await updateEnvironmentVariables(
               config,
               [
                  {
                     name: "NODE_ENV",
                     description: "Node environment",
                     required: true,
                     defaultValue: "development",
                     example: "development",
                  },
               ],
               answers.createEnvExample,
            );

            // Create a summary file
            const initSummary = {
               initializedAt: new Date().toISOString(),
               projectRoot: config.projectRoot,
               libDirectory: config.libDir,
               pathAlias: answers.libAlias,
               tsconfigPath: config.tsconfigPath,
               envFiles: [config.envPath, config.envExamplePath],
            };

            console.log(chalk.green("\nInitialization completed successfully!\n"));
            console.log(chalk.cyan("Project Configuration:"));
            console.log(chalk.gray(`  Project Root: ${initSummary.projectRoot}`));
            console.log(chalk.gray(`  Lib Directory: ${initSummary.libDirectory}`));
            console.log(chalk.gray(`  Path Alias: ${initSummary.pathAlias}`));
            console.log(chalk.gray(`  TypeScript Config: ${initSummary.tsconfigPath}`));

            console.log(chalk.cyan("\nNext Steps:"));
            console.log(chalk.yellow("  1. Run: ntic add"));
            console.log(chalk.yellow("  2. Select modules you want to integrate"));
            console.log(chalk.yellow("  3. Install dependencies: npm install\n"));
         } catch (error) {
            console.error(chalk.red(`✗ Initialization failed: ${error}`));
            process.exit(1);
         }
      });
}
