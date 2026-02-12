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
exports.getNticPath = getNticPath;
exports.loadNticConfig = loadNticConfig;
exports.createNticConfig = createNticConfig;
exports.saveNticConfig = saveNticConfig;
exports.addModulesToNtic = addModulesToNtic;
exports.getNestJsVersionFromNtic = getNestJsVersionFromNtic;
exports.getInstallationPath = getInstallationPath;
exports.getInstalledModules = getInstalledModules;
exports.moduleExists = moduleExists;
exports.installModules = installModules;
exports.installAutoInstallableModules = installAutoInstallableModules;
exports.getInstallationStats = getInstallationStats;
const process = __importStar(require("node:process"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const common_1 = require("./common");
const nestjs_1 = require("./nestjs");
const version_1 = require("./version");
const cache_1 = require("./cache");
const NTIC_FILE = "ntic.json";
async function getNticPath(projectRoot) {
    return path.join(projectRoot, NTIC_FILE);
}
async function loadNticConfig(projectRoot = process.cwd()) {
    try {
        const nticPath = await getNticPath(projectRoot);
        if (await fs.pathExists(nticPath)) {
            const content = await fs.readJson(nticPath);
            return content;
        }
        return null;
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to load ntic.json: ${error}`));
        return null;
    }
}
async function createNticConfig(projectRoot, nestJsVersion) {
    const nticConfig = {
        version: nestJsVersion,
        modules: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await saveNticConfig(projectRoot, nticConfig);
    return nticConfig;
}
async function saveNticConfig(projectRoot, config) {
    try {
        const nticPath = await getNticPath(projectRoot);
        config.updatedAt = new Date().toISOString();
        await fs.writeJson(nticPath, config, { spaces: 2 });
        console.log(chalk_1.default.green(`✓ ntic.json updated`));
    }
    catch (error) {
        throw new Error(`Failed to save ntic.json: ${error}`);
    }
}
async function addModulesToNtic(projectRoot, modules) {
    try {
        let nticConfig = await loadNticConfig(projectRoot);
        if (!nticConfig) {
            throw new Error("ntic.json not found. Run init first.");
        }
        for (const module of modules) {
            const existingIndex = nticConfig.modules.findIndex((m) => m.name === module.name);
            if (existingIndex >= 0) {
                nticConfig.modules[existingIndex] = module;
            }
            else {
                nticConfig.modules.push(module);
            }
        }
        await saveNticConfig(projectRoot, nticConfig);
    }
    catch (error) {
        throw new Error(`Failed to add modules to ntic.json: ${error}`);
    }
}
async function getNestJsVersionFromNtic(projectRoot) {
    try {
        const nticConfig = await loadNticConfig(projectRoot);
        return nticConfig?.version || null;
    }
    catch (error) {
        console.error(chalk_1.default.yellow(`Warning: Failed to get NestJS version from ntic.json: ${error}`));
        return null;
    }
}
function getInstallationPath(config, place) {
    switch (place) {
        case "src":
            return config.srcDir;
        case "lib":
            return config.libDir;
        default:
            return config.projectRoot;
    }
}
async function getInstalledModules(config, moduleNames) {
    const nticConfig = await loadNticConfig();
    if (!nticConfig) {
        throw new Error("Ntic configuration not found. Please run `ntic init`");
    }
    const nticModules = nticConfig.modules || [];
    const installed = [];
    try {
        for (const module of nticModules) {
            const installDir = getInstallationPath(config, module.installationPlace);
            const modulePath = path.join(installDir, module.name);
            const includeThisModule = moduleNames?.includes(module.name) || true;
            if ((await fs.pathExists(modulePath)) && includeThisModule) {
                installed.push(module);
            }
        }
        return installed;
    }
    catch (error) {
        throw new Error(`Failed to get installed modules: ${error}`);
    }
}
async function moduleExists(config, moduleName) {
    const locations = [config.srcDir, config.libDir, config.projectRoot];
    for (const basePath of locations) {
        if (await fs.pathExists(path.join(basePath, moduleName))) {
            return true;
        }
    }
    return false;
}
async function copyModuleFromCache(cachedModulePath, destPath) {
    if (!(await fs.pathExists(cachedModulePath))) {
        console.warn(chalk_1.default.yellow(`⚠ Module source not found in cache for ${path.basename(destPath)}`));
        return;
    }
    await fs.copy(cachedModulePath, destPath, {
        filter: (src) => {
            const fileName = path.basename(src);
            return fileName !== "module.json";
        },
    });
}
async function postInstallModule(config, metadata) {
    if (!metadata.environmentVariables?.length)
        return;
    await (0, nestjs_1.updateEnvironmentVariables)(config, metadata.environmentVariables, true);
}
async function installSingleModule(moduleName, srcPath, config, moduleMetadataMap) {
    if (await moduleExists(config, moduleName)) {
        console.log(chalk_1.default.yellow(`⊘ Module ${moduleName} already installed, skipping`));
        return;
    }
    try {
        const metadata = moduleMetadataMap.get(moduleName);
        const installDir = getInstallationPath(config, metadata.installationPlace);
        const cachedModulePath = path.join(srcPath, "src", moduleName);
        const destPath = path.join(installDir, moduleName);
        await copyModuleFromCache(cachedModulePath, destPath);
        await postInstallModule(config, metadata);
        console.log(chalk_1.default.green(`✓ Module ${moduleName} installed to ${installDir}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Failed to install module ${moduleName}: ${error}`));
        throw error;
    }
}
async function installModules(srcPath, projectRoot, moduleNames, moduleMetadataMap) {
    const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
    // Resolve dependencies
    const dependencyGraph = await (0, common_1.resolveDependencies)(moduleNames, moduleMetadataMap);
    // Download and install moduleNames
    console.log(chalk_1.default.blue("\nInstalling moduleNames..."));
    for (const moduleName of dependencyGraph.order) {
        await installSingleModule(moduleName, srcPath, config, moduleMetadataMap);
    }
    // Add moduleNames to ntic.json
    const modulesToAdd = dependencyGraph.order.map((name) => moduleMetadataMap.get(name));
    await addModulesToNtic(projectRoot, modulesToAdd);
    // Update project dependencies
    await (0, common_1.updateProjectDependencies)(projectRoot, dependencyGraph);
    // Update nest-cli.json
    const nestCliOverrides = modulesToAdd.map((metadata) => metadata.nestCliOverride);
    await (0, common_1.updateNestCli)(projectRoot, nestCliOverrides);
    return dependencyGraph.order;
}
async function installAutoInstallableModules(projectRoot, nestJsVersion) {
    const autoInstallModules = [];
    try {
        // Check for GitLab configuration and cache
        console.log(chalk_1.default.blue("\nSetting up module cache..."));
        // Clone or update cache for this version
        const cachedSrcPath = await (0, cache_1.ensureLatestCache)(nestJsVersion);
        // List available modules from cache
        const availableModules = await (0, cache_1.listCachedModules)(nestJsVersion);
        console.log(chalk_1.default.green(`✓ Found ${availableModules.length} available modules`));
        const autoInstallModules = availableModules.filter((m) => m.installWhenInit);
        const autoInstallModuleNames = autoInstallModules.map((m) => m.name);
        if (!autoInstallModules.length) {
            console.log(chalk_1.default.gray("No modules marked for auto-install"));
            return [];
        }
        console.log(chalk_1.default.cyan(`\nAuto-installing modules: ${autoInstallModules.map((m) => m.name).join(", ")}`));
        // Load metadata and find modules with installWhenInit flag
        console.log(chalk_1.default.blue("Loading module metadata..."));
        const moduleMetadataMap = availableModules.reduce((prev, curr) => {
            prev.set(curr.name, curr);
            return prev;
        }, new Map());
        await installModules(cachedSrcPath, projectRoot, autoInstallModuleNames, moduleMetadataMap);
        console.log(chalk_1.default.green(`✓ Auto-install modules completed`));
    }
    catch (error) {
        console.warn(chalk_1.default.yellow(`⚠ Could not auto-install modules: ${error}`));
    }
    return autoInstallModules;
}
async function getInstallationStats(projectRoot) {
    // Installed modules
    console.log(chalk_1.default.blue("Detecting NestJS project..."));
    const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
    // Detect version
    const version = (0, version_1.normalizeVersion)((await getNestJsVersionFromNtic(projectRoot)) || (await (0, version_1.detectNestJsVersion)(projectRoot)));
    console.log(chalk_1.default.green(`✓ NestJS v${version} project detected at ${config.projectRoot}`));
    await (0, cache_1.ensureLatestCache)(version);
    const allModules = await (0, cache_1.listCachedModules)(version);
    const installedModules = await getInstalledModules(config);
    const availableModules = allModules.filter((m) => !installedModules.some((i) => i.name === m.name));
    const visibleAvailableModules = availableModules.filter((m) => m.visibility !== false);
    const invisibleModules = availableModules.filter((m) => m.visibility === false);
    return {
        version,
        allModules,
        installedModules,
        availableModules,
        invisibleModules,
        visibleAvailableModules,
    };
}
//# sourceMappingURL=ntic.js.map