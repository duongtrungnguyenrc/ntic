import { Command } from "commander";
import * as path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

import { installModules, getInstallationStats } from "../utils/ntic";
import { getCachedSourcePath } from "../utils/cache";
import { AddCommandOptions } from "../types/command";
import { ModuleMetadata } from "../types/module";

export function addCommand(program: Command): void {
   program
      .command("add")
      .description("Add modules to your NestJS project")
      .option("-r, --registry <registry>", "Selection modules registry (default: default registry)")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-m, --modules <names>", "Comma-separated module names to add")
      .action(async (_, options: AddCommandOptions) => {
         try {
            console.log(chalk.cyan("\nAdd Modules to NestJS Project\n"));

            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();
            const { version, visibleAvailableModules, allModules } = await getInstallationStats(projectRoot);

            if (visibleAvailableModules.length === 0) {
               console.error(chalk.red("All available modules are already installed"));
               process.exit(1);
            }

            // Ask user which modules to add
            let selectedModules: string[];

            if (options.modules) {
               selectedModules = options.modules
                  .split(",")
                  .map((m: string) => m.trim())
                  .filter((m: string) =>
                     visibleAvailableModules.some((installable: ModuleMetadata) => installable.name === m),
                  );

               if (selectedModules.length === 0) {
                  console.error(chalk.red("No valid modules specified"));
                  process.exit(1);
               }
            } else {
               const answers = await inquirer.prompt([
                  {
                     type: "checkbox",
                     name: "modules",
                     message: "Select modules to add:",
                     choices: visibleAvailableModules.map((metadata) => {
                        const description: string = metadata?.description || "No description";

                        return {
                           name: ` ${metadata.name} - ${description}`,
                           value: metadata.name,
                        };
                     }),
                     validate: (answer: string) => {
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
            const moduleMetadataMap: Map<string, ModuleMetadata> = allModules.reduce(
               (prev: Map<string, ModuleMetadata>, curr: ModuleMetadata) => {
                  prev.set(curr.name, curr);
                  return prev;
               },
               new Map<string, ModuleMetadata>(),
            );

            const cachedSrcPath: string = await getCachedSourcePath(version);
            const installedModules: string[] = await installModules(
               cachedSrcPath,
               projectRoot,
               selectedModules,
               moduleMetadataMap,
            );

            console.log(chalk.green("\nModules installed successfully!\n"));
            console.log(chalk.cyan("Installation Summary:"));
            console.log(chalk.gray(`  Modules installed: ${installedModules.join(", ") || "No"}`));

            console.log(chalk.cyan("\nNext Steps:"));
            console.log(chalk.yellow("  1. Run: npm install"));
            console.log(chalk.yellow("  2. Update .env with module-specific variables"));
            console.log(chalk.yellow("  3. Import and use modules in your code\n"));
         } catch (error) {
            console.error(chalk.red(`\n✗ Failed to add modules: ${error}\n`));
            process.exit(1);
         }
      });
}
