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
exports.installModules = installModules;
exports.installAutoInstallableModules = installAutoInstallableModules;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const nestjs_1 = require("./nestjs");
const dependencies_1 = require("./dependencies");
const cache_1 = require("./cache");
const NTIC_FILE = "ntic.json";
async function getNticPath(projectRoot) {
    return path.join(projectRoot, NTIC_FILE);
}
async function loadNticConfig(projectRoot) {
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
            // Minimize module metadata
            delete module.dependencies;
            delete module.devDependencies;
            delete module.peerDependencies;
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
async function copyModuleFromCache(cachedModulePath, destPath) {
    if (!(await fs.pathExists(cachedModulePath))) {
        console.warn(chalk_1.default.yellow(`⚠ Module source not found in cache for ${path.basename(destPath)}`));
        return;
    }
    await fs.copy(cachedModulePath, destPath, {
        filter: (src) => {
            const fileName = path.basename(src);
            return fileName !== "module.json";
        }
    });
}
async function postInstallModule(projectRoot, config, metadata, dependencyGraph) {
    if (!metadata.environmentVariables?.length)
        return;
    await (0, nestjs_1.updateEnvironmentVariables)(config, metadata.environmentVariables, true);
    await (0, dependencies_1.updateProjectDependencies)(projectRoot, dependencyGraph);
}
async function installSingleModule(projectRoot, moduleName, srcPath, config, moduleMetadataMap, dependencyGraph) {
    if (await (0, nestjs_1.moduleExists)(config, moduleName)) {
        console.log(chalk_1.default.yellow(`⊘ Module ${moduleName} already installed, skipping`));
        return;
    }
    try {
        const metadata = moduleMetadataMap.get(moduleName);
        const installDir = (0, nestjs_1.getInstallationPath)(config, metadata.installationPlace);
        const cachedModulePath = path.join(srcPath, "src", moduleName);
        const destPath = path.join(installDir, moduleName);
        await copyModuleFromCache(cachedModulePath, destPath);
        await postInstallModule(projectRoot, config, metadata, dependencyGraph);
        console.log(chalk_1.default.green(`✓ Module ${moduleName} installed to ${installDir}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`✗ Failed to install module ${moduleName}: ${error}`));
        throw error;
    }
}
async function installModules(srcPath, projectRoot, modules, moduleMetadataMap) {
    const config = await (0, nestjs_1.detectNestJSProject)(projectRoot);
    // Resolve dependencies
    const dependencyGraph = await (0, dependencies_1.resolveDependencies)(modules, moduleMetadataMap);
    // Download and install modules
    console.log(chalk_1.default.blue("\nInstalling modules..."));
    for (const moduleName of dependencyGraph.order) {
        await installSingleModule(projectRoot, moduleName, srcPath, config, moduleMetadataMap, dependencyGraph);
    }
    // Add modules to ntic.json
    const modulesToAdd = dependencyGraph.order.map(name => moduleMetadataMap.get(name));
    await addModulesToNtic(projectRoot, modulesToAdd);
    // Update project dependencies
    await (0, dependencies_1.updateProjectDependencies)(projectRoot, dependencyGraph);
    return dependencyGraph.order;
}
async function installAutoInstallableModules(projectRoot, nestJsVersion) {
    const autoInstallModules = [];
    try {
        // Check for GitLab configuration and cache
        console.log(chalk_1.default.blue("\nSetting up module cache..."));
        // Clone or update cache for this version
        const cachedSrcPath = await (0, cache_1.cloneOrUpdateCache)(nestJsVersion);
        // List available modules from cache
        const availableModules = await (0, cache_1.listCachedModules)(nestJsVersion);
        console.log(chalk_1.default.green(`✓ Found ${availableModules.length} available modules`));
        // Load metadata and find modules with installWhenInit flag
        console.log(chalk_1.default.blue("Loading module metadata..."));
        const moduleMetadataMap = new Map();
        for (const moduleName of availableModules) {
            try {
                const metadata = await (0, cache_1.getCachedModuleMetadata)(nestJsVersion, moduleName);
                if (!metadata)
                    continue;
                moduleMetadataMap.set(moduleName, metadata);
                if (metadata.installWhenInit) {
                    autoInstallModules.push(moduleName);
                }
            }
            catch {
                console.warn(chalk_1.default.yellow(`⚠ Could not load metadata for ${moduleName}`));
            }
        }
        if (!autoInstallModules.length) {
            console.log(chalk_1.default.gray("No modules marked for auto-install"));
            return [];
        }
        console.log(chalk_1.default.cyan(`\nAuto-installing modules: ${autoInstallModules.join(", ")}`));
        await installModules(cachedSrcPath, projectRoot, autoInstallModules, moduleMetadataMap);
        console.log(chalk_1.default.green(`✓ Auto-install modules completed`));
    }
    catch (error) {
        console.warn(chalk_1.default.yellow(`⚠ Could not auto-install modules: ${error}`));
    }
    return autoInstallModules;
}
//# sourceMappingURL=ntic.js.map