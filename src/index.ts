#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";

import { setupCommand } from "./commands/setup";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";

const program = new Command();

program
   .name("ntic")
   .description("NestJS Template Injection Cli (NTIC) tool to integrate pre-written NestJS modules")
   .version("1.0.0")
   .helpOption("-h, --help", "Show help");

// Register commands
setupCommand(program);
initCommand(program);
addCommand(program);
listCommand(program);

// Custom help
program.on("--help", () => {
   console.log();
   console.log(chalk.cyan("Examples:"));
   console.log(chalk.gray("  $ ntic setup"));
   console.log(chalk.gray("    Configure GitLab authentication\n"));
   console.log(chalk.gray("  $ ntic init"));
   console.log(chalk.gray("    Initialize a NestJS project for module integration\n"));
   console.log(chalk.gray("  $ ntic add"));
   console.log(chalk.gray("    Add modules to your project\n"));
   console.log(chalk.gray("  $ ntic list"));
   console.log(chalk.gray("    List all available and installed modules\n"));
});

// Error handling
program.command("*", { noHelp: true }).action(() => {
   console.error(chalk.red("Unknown command"));
   program.outputHelp();
   process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length < 3) {
   program.outputHelp();
}
