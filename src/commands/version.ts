import { Command } from "commander";
import chalk from "chalk";

import { setDefaultVersion, getDefaultVersion } from "../utils/version";

export function versionCommand(program: Command): void {
   program
      .command("set-default-version <version>")
      .description("Set the default NestJS version for CLI commands")
      .action(async (version) => {
         try {
            console.log(chalk.blue(`Setting default NestJS version to v${version}...`));
            await setDefaultVersion(version);
            console.log(chalk.green(`✓ Default version set. Future commands will use v${version} by default`));
            console.log(chalk.gray(`  Override by using: ntic init@<version> or ntic add@<version>\n`));
         } catch (error) {
            console.error(chalk.red(`Failed to set default version: ${error}`));
            process.exit(1);
         }
      });

   program
      .command("get-default-version")
      .description("Get the current default NestJS version")
      .action(async () => {
         try {
            const version = await getDefaultVersion();
            if (version) {
               console.log(chalk.cyan(`\nDefault NestJS version: ${chalk.green(`v${version}`)}\n`));
            } else {
               console.log(chalk.yellow("\nNo default NestJS version set"));
               console.log(chalk.gray('Use "ntic set-default-version <version>" to set one\n'));
            }
         } catch (error) {
            console.error(chalk.red(`Failed to get default version: ${error}`));
            process.exit(1);
         }
      });
}
