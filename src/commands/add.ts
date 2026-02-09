import { Command } from "commander";
import * as path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

import { detectNestJSProject, moduleExists, updateEnvironmentVariables, getInstalledModules } from "../utils/nestjs";
import { resolveDependencies, updateProjectDependencies, printDependencyInfo } from "../utils/dependencies";
import { createGitLabClient } from "../utils/gitlab";
import { getConfigValue } from "../utils/config";
import { ModuleMetadata } from "../types/module";

export function addCommand(program: Command): void {
   program
      .command("add")
      .description("Add modules to your NestJS project")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-m, --modules <names>", "Comma-separated module names to add")
      .action(async (options) => {
         try {
            console.log(chalk.cyan("\nAdd Modules to NestJS Project\n"));

            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();

            // Detect NestJS project
            console.log(chalk.blue("Detecting NestJS project..."));
            const config = await detectNestJSProject(projectRoot);
            console.log(chalk.green(`✓ NestJS project detected at ${config.projectRoot}`));

            // Check GitLab configuration
            const gitlabUrl = await getConfigValue("gitlabUrl");
            const modulesRegistry = await getConfigValue("modulesRegistry");

            if (!gitlabUrl || !modulesRegistry) {
               console.error(chalk.red("✗ GitLab not configured. Please run: ntic setup"));
               process.exit(1);
            }

            // Create GitLab client
            const client = await createGitLabClient();

            // Get installed modules
            console.log(chalk.blue("\nLoading available modules..."));
            let availableModules: string[] = [];
            let installedModules: string[] = [];

            try {
               availableModules = await client.listModules(modulesRegistry);
               installedModules = await getInstalledModules(config);
            } catch (error) {
               console.error(chalk.red(`✗ Failed to load modules: ${error}`));
               process.exit(1);
            }

            console.log(chalk.green(`✓ Found ${availableModules.length} available modules`));

            // Filter out already installed modules
            const modulesToChoose = availableModules.filter((m) => !installedModules.includes(m));

            if (modulesToChoose.length === 0) {
               console.log(chalk.yellow("All available modules are already installed."));
               return;
            }

            // Load metadata for all available modules
            console.log(chalk.blue("\nLoading module metadata..."));
            const moduleMetadataMap = new Map<string, ModuleMetadata>();

            for (const moduleName of availableModules) {
               try {
                  const metadata: ModuleMetadata = await client.getModuleMetadata(modulesRegistry, moduleName);

                  if (metadata) {
                     moduleMetadataMap.set(moduleName, metadata);
                  }
               } catch {
                  console.warn(chalk.yellow(`⚠ Could not load metadata for ${moduleName}`));
               }
            }

            // Ask user which modules to add
            let selectedModules: string[];

            if (options.modules) {
               selectedModules = options.modules
                  .split(",")
                  .map((m: string) => m.trim())
                  .filter((m: string) => modulesToChoose.includes(m));

               if (selectedModules.length === 0) {
                  console.error(chalk.red("✗ No valid modules specified"));
                  process.exit(1);
               }
            } else {
               const answers = await inquirer.prompt([
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
            console.log(chalk.blue("\nResolving module dependencies..."));
            const dependencyGraph = await resolveDependencies(selectedModules, moduleMetadataMap);

            printDependencyInfo(dependencyGraph);

            // Confirm before proceeding
            const confirmAnswer = await inquirer.prompt([
               {
                  type: "confirm",
                  name: "proceed",
                  message: "Proceed with installation?",
                  default: true,
               },
            ]);

            if (!confirmAnswer.proceed) {
               console.log(chalk.yellow("Installation cancelled"));
               return;
            }

            // Download and install modules
            console.log(chalk.blue("\nInstalling modules..."));

            for (const moduleName of dependencyGraph.order) {
               if (await moduleExists(config, moduleName)) {
                  console.log(chalk.yellow(`⊘ Module ${moduleName} already installed, skipping`));
                  continue;
               }

               try {
                  await client.downloadModuleSource(modulesRegistry, moduleName, config.libDir);

                  // Update environment variables
                  const metadata = moduleMetadataMap.get(moduleName);
                  if (metadata?.environmentVariables && metadata.environmentVariables.length > 0) {
                     await updateEnvironmentVariables(config, metadata.environmentVariables, true);
                  }
               } catch (error) {
                  console.error(chalk.red(`✗ Failed to install module ${moduleName}: ${error}`));
                  throw error;
               }
            }

            // Update project dependencies
            await updateProjectDependencies(projectRoot, dependencyGraph);

            console.log(chalk.green("\nModules installed successfully!\n"));
            console.log(chalk.cyan("Installation Summary:"));
            console.log(chalk.gray(`  Modules installed: ${dependencyGraph.order.join(", ")}`));
            console.log(chalk.gray(`  Location: ${config.libDir}`));

            console.log(chalk.cyan("\nNext Steps:"));
            console.log(chalk.yellow("  1. Install npm dependencies: npm install"));
            console.log(chalk.yellow("  2. Update .env file with required variables"));
            console.log(chalk.yellow("  3. Import modules using the @lib alias in your code\n"));
         } catch (error) {
            console.error(chalk.red(`✗ Failed to add modules: ${error}`));
            process.exit(1);
         }
      });
}
