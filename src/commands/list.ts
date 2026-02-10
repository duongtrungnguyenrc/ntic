import { Command } from "commander";
import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { detectNestJSProject, getInstalledModules } from "../utils/nestjs";
import { createGitLabClient, GitLabClient } from "../utils/gitlab";
import { getConfigValue } from "../utils/config";
import { ModuleMetadata } from "../types/module";

export function listCommand(program: Command): void {
   program
      .command("list")
      .alias("ls")
      .description("List installed and available modules")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .option("-a, --available", "Show only available modules")
      .option("-i, --installed", "Show only installed modules")
      .action(async (options) => {
         try {
            console.log(chalk.cyan("\nModule Registry\n"));

            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();

            // Detect NestJS project
            let config;
            let installedModules: string[] = [];

            try {
               config = await detectNestJSProject(projectRoot);
               installedModules = await getInstalledModules(config);
            } catch (error) {
               console.warn(chalk.yellow(`⚠ Not a valid NestJS project: ${error}`));
            }

            // Check GitLab configuration
            const gitlabUrl = await getConfigValue("gitlabUrl");
            const modulesRegistry = await getConfigValue("modulesRegistry");

            if (!gitlabUrl || !modulesRegistry) {
               console.error(chalk.red("✗ GitLab not configured. Please run: ntic setup"));
               process.exit(1);
            }

            // Create GitLab client
            const client: GitLabClient = await createGitLabClient();

            let availableModules: string[] = [];

            if (!options.installed) {
               console.log(chalk.blue("Loading available modules..."));
               try {
                  availableModules = await client.listModules(modulesRegistry);
               } catch (error) {
                  console.error(chalk.red(`✗ Failed to load modules: ${error}`));
                  process.exit(1);
               }
            }

            // Load metadata for display
            console.log(chalk.blue("Loading module metadata...\n"));

            if (!options.available && (installedModules.length > 0 || !options.installed)) {
               console.log(chalk.cyan("Installed Modules:"));
               if (installedModules.length === 0) {
                  console.log(chalk.gray("  No modules installed"));
               } else {
                  for (const moduleName of installedModules) {
                     const metadataPath = path.join(config!.libDir, moduleName, "module.json");
                     try {
                        const metadata: ModuleMetadata = await fs.readJson(metadataPath);
                        console.log(chalk.green(`  ✓ ${moduleName}@${metadata.version}`));
                        if (metadata.description) {
                           console.log(chalk.gray(`    ${metadata.description}`));
                        }
                        if (metadata.dependentModules && metadata.dependentModules.length > 0) {
                           console.log(chalk.gray(`    Depends on: ${metadata.dependentModules.join(", ")}`));
                        }
                     } catch {
                        console.log(chalk.yellow(`  ⊘ ${moduleName} (metadata not found)`));
                     }
                  }
               }
               console.log();
            }

            if (!options.installed && (availableModules.length > 0 || !options.available)) {
               console.log(chalk.cyan("Available Modules:"));
               const notInstalled = availableModules.filter((m) => !installedModules.includes(m));

               if (notInstalled.length === 0) {
                  console.log(chalk.gray("  All modules installed"));
               } else {
                  for (const moduleName of notInstalled) {
                     try {
                        const metadata = await client.getModuleMetadata(modulesRegistry, moduleName);
                        console.log(chalk.blue(`  ◇ ${moduleName}@${metadata.version}`));
                        if (metadata.description) {
                           console.log(chalk.gray(`    ${metadata.description}`));
                        }
                        if (metadata.dependencies) {
                           const deps = Object.entries(metadata.dependencies)
                              .map(([name, version]) => `${name}@${version}`)
                              .join(", ");
                           console.log(chalk.gray(`    Dependencies: ${deps}`));
                        }
                     } catch {
                        console.log(chalk.yellow(`  ◇ ${moduleName} (metadata not found)`));
                     }
                  }
               }
               console.log();
            }

            console.log(chalk.cyan(`Summary:`));
            console.log(chalk.gray(`  Installed: ${installedModules.length}`));
            console.log(chalk.gray(`  Available: ${availableModules.length - installedModules.length}`));
            console.log(chalk.gray(`  Total: ${availableModules.length}\n`));
         } catch (error) {
            console.error(chalk.red(`✗ Failed to list modules: ${error}`));
            process.exit(1);
         }
      });
}
