"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = listCommand;
const path = __importStar(require("node:path"));
const chalk_1 = __importDefault(require("chalk"));
const ntic_1 = require("../utils/ntic");
function listCommand(program) {
    program
        .command("list")
        .alias("ls")
        .description("List installed and available modules")
        .option("-p, --project <path>", "Path to NestJS project (default: current directory)")
        .action(async (options) => {
        try {
            const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
            const { installedModules, visibleAvailableModules } = await (0, ntic_1.getInstallationStats)(projectRoot);
            console.log(chalk_1.default.cyan(`\nInstallation statistic:\n`));
            if (installedModules.length) {
                console.log("  Installed modules:");
                for (const metadata of installedModules) {
                    try {
                        console.log(chalk_1.default.green(`\n  ✓ ${metadata.name}@${metadata.version}`));
                        if (metadata.description) {
                            console.log(chalk_1.default.gray(`    Description: ${metadata.description}`));
                        }
                        if (metadata.dependentModules && metadata.dependentModules.length > 0) {
                            console.log(chalk_1.default.gray(`    Depends on: ${metadata.dependentModules.join(", ")}`));
                        }
                    }
                    catch {
                        console.log(chalk_1.default.yellow(`  ⊘ ${metadata.name} (metadata not found)`));
                    }
                }
            }
            if (visibleAvailableModules.length) {
                console.log("\n  Available to install modules:");
                for (const metadata of visibleAvailableModules) {
                    console.log(chalk_1.default.blue(`\n  ◇ ${metadata.name}@${metadata.version}`));
                    if (metadata.description) {
                        console.log(chalk_1.default.gray(`    Description: ${metadata.description}`));
                    }
                    if (metadata.packageJsonOverride?.dependencies) {
                        const deps = Object.entries(metadata.packageJsonOverride.dependencies)
                            .map(([name, version]) => `      ${name}@${version}`)
                            .join("\n");
                        console.log(chalk_1.default.gray(`    Dependencies:\n${deps}`));
                    }
                }
            }
            console.log(chalk_1.default.cyan(`\nSummary:\n`));
            console.log(chalk_1.default.gray(`  Installed: ${installedModules.length}`));
            console.log(chalk_1.default.gray(`  Available: ${visibleAvailableModules.length - installedModules.length}`));
            console.log(chalk_1.default.gray(`  Total: ${visibleAvailableModules.length}\n`));
        }
        catch (error) {
            console.error(chalk_1.default.red(`✗ Failed to list modules: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=list.js.map