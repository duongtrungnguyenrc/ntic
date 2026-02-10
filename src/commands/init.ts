import { Command } from "commander";
import * as path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

import {
   detectNestJSProject,
   ensureLibDirectory,
   setupPathAlias,
   updateEnvironmentVariables,
} from "../utils/nestjs";
import { createNticConfig, installAutoInstallableModules } from "../utils/ntic";
import { detectNestJsVersion } from "../utils/version";
import { NestJSProjectConfig } from "../types/module";
import { setupPrettier } from "../utils/format";

export function initCommand(program: Command): void {
   program
      .command("init [version]")
      .description("Initialize NestJS project for module integration")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-a, --alias <alias>", "Path alias for lib directory (default: @lib)", "@lib")
      .action(async (versionArg, options) => {
         try {
            console.log(chalk.cyan("\nNestJS Project Initialization\n"));

            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();

            // Detect NestJS project
            console.log(chalk.blue("Detecting NestJS project..."));
            const nestJSProjectConfig: NestJSProjectConfig = await detectNestJSProject(projectRoot);
            console.log(chalk.green(`✓ NestJS project detected at ${nestJSProjectConfig.projectRoot}\n`));

            // Determine NestJS version
            console.log(chalk.blue("Detecting NestJS version..."));
            let nestJsVersion: string = await detectNestJsVersion(projectRoot, versionArg);
            console.log(chalk.green(`NestJS Version: v${nestJsVersion}\n`));

            // Ask for confirmation and options
            const answers = await inquirer.prompt([
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
               console.log(chalk.yellow("Initialization cancelled"));
               return;
            }

            // Setup project structure
            console.log(chalk.blue("\nSetting up project structure..."));
            await ensureLibDirectory(nestJSProjectConfig);
            await setupPathAlias(nestJSProjectConfig, answers.libAlias);

            // Setup prettier
            console.log(chalk.blue("\nSetting up prettier format..."));
            await setupPrettier();

            // Initialize environment files
            await updateEnvironmentVariables(
               nestJSProjectConfig,
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

            // Create ntic.json
            console.log(chalk.blue("\nCreating ntic.json..."));
            await createNticConfig(projectRoot, nestJsVersion);

            // Install auto-install module
            const autoInstallModules: string[] = await installAutoInstallableModules(projectRoot, nestJsVersion);

            console.log(chalk.green("\nInitialization completed successfully!\n"));
            console.log(chalk.cyan("Project Configuration:"));
            console.log(chalk.gray(`  Project Root: ${nestJSProjectConfig.projectRoot}`));
            console.log(chalk.gray(`  Lib Directory: ${nestJSProjectConfig.libDir}`));
            console.log(chalk.gray(`  Path Alias: ${answers.libAlias}`));
            console.log(chalk.gray(`  TypeScript Config: ${nestJSProjectConfig.tsconfigPath}`));
            console.log(chalk.gray(`  NestJS Version: v${nestJsVersion}`));

            if (autoInstallModules.length > 0) {
               console.log(chalk.cyan("\nAuto-installed Modules:"));
               autoInstallModules.forEach((m: string) => console.log(chalk.gray(`  - ${m}`)));
            }

            console.log(chalk.cyan("\nNext Steps:"));
            console.log(chalk.yellow("  1. Run: ntic add"));
            console.log(chalk.yellow("  2. Select additional modules you want to integrate"));
            console.log(chalk.yellow("  3. Install dependencies: npm install\n"));
         } catch (error) {
            console.error(chalk.red(`\n✗ Initialization failed: ${error}\n`));
            process.exit(1);
         }
      });
}
