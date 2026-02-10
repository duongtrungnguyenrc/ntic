"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionCommand = versionCommand;
const chalk_1 = __importDefault(require("chalk"));
const version_1 = require("../utils/version");
function versionCommand(program) {
    program
        .command("set-default-version <version>")
        .description("Set the default NestJS version for CLI commands")
        .action(async (version) => {
        try {
            console.log(chalk_1.default.blue(`Setting default NestJS version to v${version}...`));
            await (0, version_1.setDefaultVersion)(version);
            console.log(chalk_1.default.green(`✓ Default version set. Future commands will use v${version} by default`));
            console.log(chalk_1.default.gray(`  Override by using: ntic init@<version> or ntic add@<version>\n`));
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to set default version: ${error}`));
            process.exit(1);
        }
    });
    program
        .command("get-default-version")
        .description("Get the current default NestJS version")
        .action(async () => {
        try {
            const version = await (0, version_1.getDefaultVersion)();
            if (version) {
                console.log(chalk_1.default.cyan(`\nDefault NestJS version: ${chalk_1.default.green(`v${version}`)}\n`));
            }
            else {
                console.log(chalk_1.default.yellow("\nNo default NestJS version set"));
                console.log(chalk_1.default.gray('Use "ntic set-default-version <version>" to set one\n'));
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to get default version: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=version.js.map