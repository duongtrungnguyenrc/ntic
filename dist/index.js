#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const setup_1 = require("./commands/setup");
const init_1 = require("./commands/init");
const add_1 = require("./commands/add");
const list_1 = require("./commands/list");
const version_1 = require("./commands/version");
const cache_1 = require("./commands/cache");
const program = new commander_1.Command();
program
    .name("ntic")
    .description("NestJS Template Injection Cli (NTIC) tool to integrate pre-written NestJS modules")
    .version("1.0.0")
    .helpOption("-h, --help", "Show help");
// Register commands
(0, setup_1.setupCommand)(program);
(0, init_1.initCommand)(program);
(0, add_1.addCommand)(program);
(0, list_1.listCommand)(program);
(0, cache_1.cacheCommand)(program);
(0, version_1.versionCommand)(program);
// Custom help
program.on('--help', () => {
    console.log();
    console.log(chalk_1.default.cyan('Examples:'));
    console.log(chalk_1.default.gray('  $ ntic setup'));
    console.log(chalk_1.default.gray('    Configure GitLab authentication\n'));
    console.log(chalk_1.default.gray('  $ ntic init'));
    console.log(chalk_1.default.gray('    Initialize a NestJS project (detects version from package.json)\n'));
    console.log(chalk_1.default.gray('  $ ntic init@11'));
    console.log(chalk_1.default.gray('    Initialize with specific NestJS version (v11)\n'));
    console.log(chalk_1.default.gray('  $ ntic add'));
    console.log(chalk_1.default.gray('    Add modules to your project (uses version from ntic.json)\n'));
    console.log(chalk_1.default.gray('  $ ntic add@10'));
    console.log(chalk_1.default.gray('    Add modules from specific NestJS version (v10)\n'));
    console.log(chalk_1.default.gray('  $ ntic list'));
    console.log(chalk_1.default.gray('    List all available and installed modules\n'));
});
// Error handling
program.command("*", { noHelp: true }).action(() => {
    console.error(chalk_1.default.red("Unknown command"));
    program.outputHelp();
    process.exit(1);
});
// Parse arguments
program.parse(process.argv);
// Show help if no arguments provided
if (process.argv.length < 3) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map