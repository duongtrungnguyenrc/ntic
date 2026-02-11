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
exports.cacheCommand = cacheCommand;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("node:os"));
const chalk_1 = __importDefault(require("chalk"));
const cache_1 = require("../utils/cache");
const CACHE_DIR = path.join(os.homedir(), ".ntic");
function cacheCommand(program) {
    program
        .command("cache-clear [version]")
        .description("Clear the local module cache (optionally for a specific version)")
        .action(async (version) => {
        try {
            if (version) {
                console.log(chalk_1.default.blue(`Clearing cache for NestJS v${version}...`));
                await (0, cache_1.clearCache)(version);
                console.log(chalk_1.default.green(`✓ Cache cleared for v${version}`));
            }
            else {
                const answer = await require("inquirer").prompt([
                    {
                        type: "confirm",
                        name: "confirm",
                        message: "Clear all cached versions? This cannot be undone.",
                        default: false,
                    },
                ]);
                if (!answer.confirm) {
                    console.log(chalk_1.default.yellow("Cache clear cancelled"));
                    return;
                }
                console.log(chalk_1.default.blue("Clearing all caches..."));
                await (0, cache_1.clearCache)();
                console.log(chalk_1.default.green("✓ All caches cleared"));
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to clear cache: ${error}`));
            process.exit(1);
        }
    });
    program
        .command("cache-info")
        .description("Show cache information and usage")
        .action(async () => {
        try {
            if (!(await fs.pathExists(CACHE_DIR))) {
                console.log(chalk_1.default.yellow("\nNo cache found at ~/.ntic\n"));
                return;
            }
            console.log(chalk_1.default.cyan("\nCache Information\n"));
            console.log(chalk_1.default.gray(`Cache Directory: ${CACHE_DIR}\n`));
            const versions = await fs.readdir(CACHE_DIR);
            const versionDirs = versions.filter((v) => v.startsWith("v"));
            if (versionDirs.length === 0) {
                console.log(chalk_1.default.yellow("No cached versions found\n"));
                return;
            }
            console.log(chalk_1.default.cyan("Cached Versions:"));
            for (const versionDir of versionDirs) {
                const versionPath = path.join(CACHE_DIR, versionDir);
                const metadataPath = path.join(versionPath, "cache-metadata.json");
                try {
                    const metadata = await fs.readJson(metadataPath);
                    const srcPath = path.join(versionPath, "src");
                    const exists = await fs.pathExists(srcPath);
                    if (exists) {
                        const stats = await fs.stat(srcPath);
                        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                        const cachedAt = metadata.cachedAt ? new Date(metadata.cachedAt).toLocaleString() : "Unknown";
                        console.log(chalk_1.default.gray(`  ${versionDir}`));
                        console.log(chalk_1.default.gray(`    Size: ${sizeInMB} MB`));
                        console.log(chalk_1.default.gray(`    Last Updated: ${cachedAt}`));
                        console.log(chalk_1.default.gray(`    Commit: ${metadata.latestCommit?.substring(0, 7) || "Unknown"}`));
                    }
                }
                catch {
                    console.log(chalk_1.default.gray(`  ${versionDir} (corrupted)`));
                }
            }
            console.log();
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to get cache info: ${error}`));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=cache.js.map