import { Command } from "commander";
import * as path from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";

import { cloneOrUpdateCache, listCachedModules, getCachedModuleMetadata } from "../utils/cache";
import { detectNestJSProject, getInstallationPath, moduleExists } from "../utils/nestjs";
import { getNestJsVersionFromNtic, installModules } from "../utils/ntic";
import { normalizeVersion, detectNestJsVersion } from "../utils/version";
import { ModuleMetadata, NestJSProjectConfig } from "../types/module";

export function addCommand(program: Command): void {
   program
      .command("add [version]")
      .description("Add modules to your NestJS project")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-m, --modules <names>", "Comma-separated module names to add")
      .action(async (versionArg, options) => {
         try {
            console.log(chalk.cyan("\nAdd Modules to NestJS Project\n"));

            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();

            // Detect NestJS project
            console.log(chalk.blue("Detecting NestJS project..."));
            const config: NestJSProjectConfig = await detectNestJSProject(projectRoot);
            console.log(chalk.green(`✓ NestJS project detected at ${config.projectRoot}`));

            // Determine NestJS version
            let nestJsVersion = versionArg || (await getNestJsVersionFromNtic(projectRoot));

            if (!nestJsVersion) {
               nestJsVersion = await detectNestJsVersion(projectRoot);
            }

            nestJsVersion = normalizeVersion(nestJsVersion);
            console.log(chalk.cyan(`NestJS Version: v${nestJsVersion}`));

            // Clone or update cache for this version
            console.log(chalk.blue("\nSetting up module cache..."));
            const cachedSrcPath: string = await cloneOrUpdateCache(nestJsVersion);

            // Get available modules from cache
            console.log(chalk.blue("Loading available modules..."));
            const availableModules: string[] = await listCachedModules(nestJsVersion);
            console.log(chalk.green(`✓ Found ${availableModules.length} available modules`));

            if (availableModules.length === 0) {
               console.error(chalk.red("No modules available for this version"));
               process.exit(1);
            }

            // Filter out already installed modules
            const installableModules: any[] = [];
            for (const moduleName of availableModules) {
               const installed: boolean = await moduleExists(config, moduleName);

               if (!installed) {
                  installableModules.push(moduleName);
               }
            }

            if (installableModules.length === 0) {
               console.log(chalk.yellow("All available modules are already installed"));
               return;
            }

            // Load metadata for all modules
            console.log(chalk.blue("Loading module metadata..."));
            const moduleMetadataMap = new Map<string, ModuleMetadata>(); // all modules has metadata
            const visibleModuleMetadataMap = new Map<string, ModuleMetadata>(); // just visible modules

            for (const moduleName of availableModules) {
               try {
                  const metadata: ModuleMetadata | null = await getCachedModuleMetadata(nestJsVersion, moduleName);

                  if (metadata) {
                     moduleMetadataMap.set(moduleName, metadata);

                     if (metadata.visibility !== false) {
                        visibleModuleMetadataMap.set(moduleName, metadata);
                     }
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
                  .filter((m: string) => installableModules.includes(m));

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
                     choices: installableModules.map((m) => {
                        const metadata: ModuleMetadata | undefined = visibleModuleMetadataMap.get(m);
                        const description: string = metadata?.description || "No description";

                        return {
                           name: `${m} - ${description}`,
                           value: m,
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
            const installedModules: string[] = await installModules(cachedSrcPath, projectRoot, selectedModules, moduleMetadataMap);

            console.log(chalk.green("\nModules installed successfully!\n"));
            console.log(chalk.cyan("Installation Summary:"));
            console.log(chalk.gray(`  Modules installed: ${installedModules.join(", ")}`));

            // Show installation locations
            console.log(chalk.cyan("\nModule Locations:"));
            for (const moduleName of installedModules) {
               const metadata: ModuleMetadata = moduleMetadataMap.get(moduleName)!;
               const installDir: string = getInstallationPath(config, metadata.installationPlace);
               console.log(chalk.gray(`  ${moduleName}: ${installDir}`));
            }

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
