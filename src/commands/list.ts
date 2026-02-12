import { Command } from "commander";
import * as path from "node:path";
import chalk from "chalk";

import { getInstallationStats } from "../utils/ntic";

export function listCommand(program: Command): void {
   program
      .command("list")
      .alias("ls")
      .description("List installed and available modules")
      .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
      .action(async (options) => {
         try {
            const projectRoot: string = options.project ? path.resolve(options.project) : process.cwd();

            const { installedModules, visibleAvailableModules } = await getInstallationStats(projectRoot);

            console.log(chalk.cyan(`\nInstallation statistic:\n`));

            if (installedModules.length) {
               console.log("  Installed modules:");

               for (const metadata of installedModules) {
                  try {
                     console.log(chalk.green(`\n  ✓ ${metadata.name}@${metadata.version}`));
                     if (metadata.description) {
                        console.log(chalk.gray(`    Description: ${metadata.description}`));
                     }
                     if (metadata.dependentModules && metadata.dependentModules.length > 0) {
                        console.log(chalk.gray(`    Depends on: ${metadata.dependentModules.join(", ")}`));
                     }
                  } catch {
                     console.log(chalk.yellow(`  ⊘ ${metadata.name} (metadata not found)`));
                  }
               }
            }

            if (visibleAvailableModules.length) {
               console.log("\n  Available to install modules:");

               for (const metadata of visibleAvailableModules) {
                  console.log(chalk.blue(`\n  ◇ ${metadata.name}@${metadata.version}`));

                  if (metadata.description) {
                     console.log(chalk.gray(`    Description: ${metadata.description}`));
                  }
                  if (metadata.packageJsonOverride?.dependencies) {
                     const deps: string = Object.entries(metadata.packageJsonOverride.dependencies)
                        .map(([name, version]) => `      ${name}@${version}`)
                        .join("\n");

                     console.log(chalk.gray(`    Dependencies:\n${deps}`));
                  }
               }
            }

            console.log(chalk.cyan(`\nSummary:\n`));
            console.log(chalk.gray(`  Installed: ${installedModules.length}`));
            console.log(chalk.gray(`  Available: ${visibleAvailableModules.length - installedModules.length}`));
            console.log(chalk.gray(`  Total: ${visibleAvailableModules.length}\n`));
         } catch (error) {
            console.error(chalk.red(`✗ Failed to list modules: ${error}`));
            process.exit(1);
         }
      });
}
