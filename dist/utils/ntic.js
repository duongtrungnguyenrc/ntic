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
exports.normalizeAppStructure = normalizeAppStructure;
exports.rebuildMainWithImportsAndAppConfig = rebuildMainWithImportsAndAppConfig;
exports.getStorageStrategy = getStorageStrategy;
exports.setupGithubStorage = setupGithubStorage;
exports.setupGitlabStorage = setupGitlabStorage;
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
const ts_morph_1 = require("ts-morph");
const process = __importStar(require("node:process"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const common_1 = require("./common");
const nestjs_1 = require("./nestjs");
const version_1 = require("./version");
const cache_1 = require("./cache");
const github_1 = require("./github");
const gitlab_1 = require("./gitlab");
const constants_1 = require("../constants");
const config_1 = require("./config");
async function normalizeAppStructure(projectRoot) {
    const srcDir = path.join(projectRoot, "src");
    const appDir = path.join(srcDir, "app");
    await fs.ensureDir(appDir);
    const files = await fs.readdir(srcDir);
    const movedFiles = [];
    for (const file of files) {
        if (/^app\..*\.ts$/.test(file)) {
            const oldPath = path.join(srcDir, file);
            const newPath = path.join(appDir, file);
            if (!(await fs.pathExists(newPath))) {
                await fs.move(oldPath, newPath);
                console.log(`✓ Moved ${file} → src/app/`);
            }
            movedFiles.push(file);
        }
    }
    await createAppBarrelFile(appDir, movedFiles);
}
async function createAppBarrelFile(appDir, movedFiles) {
    const barrelPath = path.join(appDir, "index.ts");
    const existingExports = (await fs.pathExists(barrelPath))
        ? fs.readFileSync(barrelPath, "utf8")
        : "";
    const exportLines = [];
    for (const file of movedFiles) {
        const fileNameWithoutExt = file.replace(".ts", "");
        const exportStatement = `export * from "./${fileNameWithoutExt}";`;
        if (!existingExports.includes(exportStatement)) {
            exportLines.push(exportStatement);
        }
    }
    if (exportLines.length > 0) {
        const finalContent = existingExports.trim() + "\n" + exportLines.join("\n") + "\n";
        await fs.writeFile(barrelPath, finalContent.trimStart());
        console.log("✓ Barrel file updated at src/app/index.ts");
    }
}
function mergeImports(current, boiler) {
    for (const oldImport of current.getImportDeclarations()) {
        const moduleSpecifier = oldImport.getModuleSpecifierValue();
        const existing = boiler
            .getImportDeclarations()
            .find(i => i.getModuleSpecifierValue() === moduleSpecifier);
        if (existing) {
            mergeNamedImports(existing, oldImport);
        }
        else {
            boiler.addImportDeclaration({
                moduleSpecifier,
                namedImports: oldImport.getNamedImports().map(n => n.getName()),
                defaultImport: oldImport.getDefaultImport()?.getText(),
                namespaceImport: oldImport.getNamespaceImport()?.getText(),
            });
        }
    }
}
function mergeNamedImports(target, source) {
    const existingNames = new Set(target.getNamedImports().map(n => n.getName()));
    for (const named of source.getNamedImports()) {
        if (!existingNames.has(named.getName())) {
            target.addNamedImport(named.getName());
        }
    }
}
function extractAppOverrideStatements(source) {
    const bootstrap = source.getFunction("bootstrap");
    const body = bootstrap?.getBody()?.asKindOrThrow(ts_morph_1.SyntaxKind.Block);
    if (!body)
        return [];
    const results = [];
    for (const stmt of body.getStatements()) {
        const call = stmt.getFirstDescendantByKind(ts_morph_1.SyntaxKind.CallExpression);
        if (!call)
            continue;
        const expression = call.getExpression();
        if (ts_morph_1.Node.isPropertyAccessExpression(expression)) {
            const objectName = expression.getExpression().getText();
            const method = expression.getName();
            if (objectName === "app" && method !== "listen") {
                results.push(stmt.getText());
            }
        }
    }
    return results;
}
function findOverrideMarkerIndex(body) {
    const statementsWithComments = body.getStatementsWithComments();
    for (let i = 0; i < statementsWithComments.length; i++) {
        if (statementsWithComments[i].getText().includes("<ntic:override>")) {
            return i;
        }
    }
    throw new Error("Cannot find '// <ntic:override>' comment in boilerplate");
}
function injectOverrideStatements(boiler, overrideStatements) {
    const bootstrap = boiler.getFunction("bootstrap");
    const body = bootstrap?.getBody()?.asKindOrThrow(ts_morph_1.SyntaxKind.Block);
    if (!body) {
        throw new Error("Boilerplate bootstrap() not found");
    }
    const markerIndex = findOverrideMarkerIndex(body);
    for (const stmtText of overrideStatements) {
        const exists = body
            .getStatements()
            .some((s) => s.getText() === stmtText);
        if (!exists) {
            body.insertStatements(markerIndex + 1, stmtText);
        }
    }
}
async function rebuildMainWithImportsAndAppConfig(projectRoot, version) {
    const cacheDir = await (0, cache_1.getCacheVersionPath)(version);
    const project = new ts_morph_1.Project({
        tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
    });
    const currentMain = project.getSourceFileOrThrow("src/main.ts");
    const boilerMain = project.addSourceFileAtPath(path.join(cacheDir, "src/main.ts"));
    mergeImports(currentMain, boilerMain);
    const overrideStatements = extractAppOverrideStatements(currentMain);
    injectOverrideStatements(boilerMain, overrideStatements);
    currentMain.replaceWithText(boilerMain.getFullText());
    const updated = project.getSourceFileOrThrow("src/main.ts");
    updated.organizeImports();
    await project.save();
    console.log(chalk_1.default.cyan("✓ main.ts rebuilt and overrides inserted correctly"));
}
async function getStorageStrategy(type) {
    switch (type) {
        case "github": return (0, github_1.createGitHubClient)();
        case "gitlab": return (0, gitlab_1.createGitLabClient)();
    }
}
async function setupGithubStorage(cliConfig, name) {
    const client = new github_1.GitHubClient();
    if (!cliConfig.accessToken)
        throw new Error("Missing Github access token");
    // Validate token
    const username = await client.authenticate(cliConfig.accessToken);
    await (0, config_1.saveConfig)({ ...cliConfig, username }, name);
}
async function setupGitlabStorage(cliConfig, name) {
    const client = new gitlab_1.GitLabClient(cliConfig.gitlabUrl);
    if (!cliConfig.accessToken)
        throw new Error("Missing Gitlab access token");
    // Validate token
    await client.authenticate(cliConfig.accessToken);
    await (0, config_1.saveConfig)(cliConfig, name);
}
async function getNticPath(projectRoot) {
    return path.join(projectRoot, constants_1.NTIC_METADATA_FILE);
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
    // Update ntic metadata file
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