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
exports.ensureCacheDir = ensureCacheDir;
exports.getCacheVersionPath = getCacheVersionPath;
exports.getCacheMetadata = getCacheMetadata;
exports.saveCacheMetadata = saveCacheMetadata;
exports.getCachedSourcePath = getCachedSourcePath;
exports.isCacheValid = isCacheValid;
exports.ensureLatestCache = ensureLatestCache;
exports.listCachedModules = listCachedModules;
exports.clearCache = clearCache;
const simple_git_1 = require("simple-git");
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const node_os_1 = __importDefault(require("node:os"));
const config_1 = require("./config");
const ntic_1 = require("./ntic");
const NTIC_CACHE_DIR = path.join(node_os_1.default.homedir(), ".ntic");
const CACHE_METADATA_FILE = "cache-metadata.json";
async function ensureCacheDir() {
    await fs.ensureDir(NTIC_CACHE_DIR);
    return NTIC_CACHE_DIR;
}
async function getCacheVersionPath(nestJsVersion) {
    const cacheDir = await ensureCacheDir();
    return path.join(cacheDir, `v${nestJsVersion}`);
}
async function getCacheMetadata(nestJsVersion) {
    try {
        const versionPath = await getCacheVersionPath(nestJsVersion);
        const metadataPath = path.join(versionPath, CACHE_METADATA_FILE);
        if (await fs.pathExists(metadataPath)) {
            return await fs.readJson(metadataPath);
        }
        return null;
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to read cache metadata: ${error}`));
        return null;
    }
}
async function saveCacheMetadata(nestJsVersion, metadata) {
    try {
        const versionPath = await getCacheVersionPath(nestJsVersion);
        await fs.ensureDir(versionPath);
        const metadataPath = path.join(versionPath, CACHE_METADATA_FILE);
        metadata.cachedAt = new Date().toISOString();
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to save cache metadata: ${error}`));
    }
}
async function getCachedSourcePath(nestJsVersion) {
    const versionPath = await getCacheVersionPath(nestJsVersion);
    return path.join(versionPath);
}
async function isCacheValid(nestJsVersion) {
    try {
        const metadata = await getCacheMetadata(nestJsVersion);
        if (!metadata) {
            return false;
        }
        if (!metadata.cachedAt) {
            return false;
        }
        // Check if remote has updates
        try {
            const srcPath = await getCachedSourcePath(nestJsVersion);
            if (!(await fs.pathExists(srcPath))) {
                return false;
            }
            const git = (0, simple_git_1.simpleGit)(srcPath);
            const remoteHeadCommit = await getRemoteLatestCommit(nestJsVersion, git);
            if (remoteHeadCommit && metadata.latestCommit !== remoteHeadCommit) {
                console.log(chalk_1.default.yellow(`Updates available for v${nestJsVersion} (remote: ${remoteHeadCommit.substring(0, 7)})`));
                return false;
            }
            return true;
        }
        catch (error) {
            console.log(chalk_1.default.yellow(`Unable to check for updates: ${error}`));
            return true; // Use cache if we can't check updates
        }
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to validate cache: ${error}`));
        return false;
    }
}
async function getRemoteLatestCommit(nestJsVersion, git) {
    await git.fetch();
    const log = await git.log([`origin/v${nestJsVersion}`]);
    return log.latest?.hash;
}
async function ensureLatestCache(nestJsVersion) {
    try {
        const registryConfig = await (0, config_1.getRegistryConfig)();
        const versionPath = await getCacheVersionPath(nestJsVersion);
        const srcPath = await getCachedSourcePath(nestJsVersion);
        const storageClient = await (0, ntic_1.getStorageStrategy)(registryConfig.type);
        // Check if cache exists and is valid
        if (await fs.pathExists(srcPath)) {
            const isValid = await isCacheValid(nestJsVersion);
            if (isValid) {
                console.log(chalk_1.default.green(`✓ Using cached version from ${srcPath}`));
                return srcPath;
            }
            // Update existing cache
            console.log(chalk_1.default.blue(`Updating cached version for v${nestJsVersion}...`));
            const log = await storageClient.updateSource(srcPath, +nestJsVersion);
            if (log.latest) {
                const metadata = {
                    version: nestJsVersion,
                    latestCommit: log.latest.hash,
                };
                await saveCacheMetadata(nestJsVersion, metadata);
                console.log(chalk_1.default.green(`✓ Cache updated successfully`));
            }
            return srcPath;
        }
        // Clone new cache
        console.log(chalk_1.default.blue(`Cloning modules repository for v${nestJsVersion}...`));
        await fs.ensureDir(versionPath);
        const repositoryId = (await (0, config_1.getConfigValue)("repositoryId"));
        const repoUrl = await storageClient.getProjectCloneUrl(repositoryId);
        await storageClient.cloneSource(repoUrl, srcPath, +nestJsVersion);
        const gitClient = (0, simple_git_1.simpleGit)(srcPath);
        const log = await gitClient.log([`-1`]);
        if (log.latest) {
            const metadata = {
                version: nestJsVersion,
                latestCommit: log.latest.hash,
            };
            await saveCacheMetadata(nestJsVersion, metadata);
        }
        console.log(chalk_1.default.green(`✓ Cached cloned successfully to ${srcPath}`));
        return srcPath;
    }
    catch (error) {
        throw new Error(`Failed to clone or update cache: ${error}`);
    }
}
async function listCachedModules(nestJsVersion) {
    try {
        const cachedSourcePath = await getCachedSourcePath(nestJsVersion);
        const modulesPath = path.join(cachedSourcePath, "src");
        if (!(await fs.pathExists(modulesPath))) {
            return [];
        }
        const entries = await fs.readdir(modulesPath);
        const modules = [];
        for (const entry of entries) {
            const fullPath = path.join(modulesPath, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const metadataPath = path.join(fullPath, "module.json");
                if (await fs.pathExists(metadataPath)) {
                    const metadata = await fs.readJson(metadataPath);
                    modules.push(metadata);
                }
            }
        }
        return modules;
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to list cached modules: ${error}`));
        return [];
    }
}
async function clearCache(nestJsVersion) {
    try {
        if (nestJsVersion) {
            const versionPath = await getCacheVersionPath(nestJsVersion);
            await fs.remove(versionPath);
            console.log(chalk_1.default.green(`✓ Cache for v${nestJsVersion} cleared`));
        }
        else {
            if (!(await fs.pathExists(NTIC_CACHE_DIR)))
                return;
            const entries = await fs.readdir(NTIC_CACHE_DIR);
            for (const entry of entries) {
                if (entry === "config.json")
                    continue;
                await fs.remove(path.join(NTIC_CACHE_DIR, entry));
            }
            console.log(chalk_1.default.green(`✓ All caches cleared`));
        }
    }
    catch (error) {
        throw new Error(`Failed to clear cache: ${error}`);
    }
}
//# sourceMappingURL=cache.js.map