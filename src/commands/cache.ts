import { Command } from "commander";
import * as path from "node:path";
import * as fs from "fs-extra";
import * as os from "node:os";
import chalk from "chalk";

import { clearCache } from "../utils/cache";

const CACHE_DIR: string = path.join(os.homedir(), ".ntic");

export function cacheCommand(program: Command): void {
   program
      .command("cache-clear [version]")
      .description("Clear the local module cache (optionally for a specific version)")
      .action(async (version: string) => {
         try {
            if (version) {
               console.log(chalk.blue(`Clearing cache for NestJS v${version}...`));
               await clearCache(version);
               console.log(chalk.green(`✓ Cache cleared for v${version}`));
            } else {
               const answer = await require("inquirer").prompt([
                  {
                     type: "confirm",
                     name: "confirm",
                     message: "Clear all cached versions? This cannot be undone.",
                     default: false,
                  },
               ]);

               if (!answer.confirm) {
                  console.log(chalk.yellow("Cache clear cancelled"));
                  return;
               }

               console.log(chalk.blue("Clearing all caches..."));
               await clearCache(version);
               console.log(chalk.green("✓ All caches cleared"));
            }
         } catch (error) {
            console.error(chalk.red(`Failed to clear cache: ${error}`));
            process.exit(1);
         }
      });

   program
      .command("cache-info")
      .description("Show cache information and usage")
      .action(async () => {
         try {
            if (!(await fs.pathExists(CACHE_DIR))) {
               console.log(chalk.yellow("\nNo cache found at ~/.ntic\n"));
               return;
            }

            console.log(chalk.cyan("\nCache Information\n"));
            console.log(chalk.gray(`Cache Directory: ${CACHE_DIR}\n`));

            const versions = await fs.readdir(CACHE_DIR);
            const versionDirs = versions.filter((v) => v.startsWith("v"));

            if (versionDirs.length === 0) {
               console.log(chalk.yellow("No cached versions found\n"));
               return;
            }

            console.log(chalk.cyan("Cached Versions:"));
            for (const versionDir of versionDirs) {
               const versionPath: string = path.join(CACHE_DIR, versionDir);
               const metadataPath: string = path.join(versionPath, "cache-metadata.json");

               try {
                  const metadata = await fs.readJson(metadataPath);
                  const srcPath: string = path.join(versionPath, "src");
                  const exists: boolean = await fs.pathExists(srcPath);

                  if (exists) {
                     const stats: fs.Stats = await fs.stat(srcPath);
                     const sizeInMB: string = (stats.size / (1024 * 1024)).toFixed(2);
                     const cachedAt: string = metadata.cachedAt
                        ? new Date(metadata.cachedAt).toLocaleString()
                        : "Unknown";

                     console.log(chalk.gray(`  ${versionDir}`));
                     console.log(chalk.gray(`    Size: ${sizeInMB} MB`));
                     console.log(chalk.gray(`    Last Updated: ${cachedAt}`));
                     console.log(chalk.gray(`    Commit: ${metadata.latestCommit?.substring(0, 7) || "Unknown"}`));
                  }
               } catch {
                  console.log(chalk.gray(`  ${versionDir} (corrupted)`));
               }
            }

            console.log();
         } catch (error) {
            console.error(chalk.red(`Failed to get cache info: ${error}`));
            process.exit(1);
         }
      });
}
