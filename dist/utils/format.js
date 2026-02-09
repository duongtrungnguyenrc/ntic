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
exports.setupPrettierConfig = setupPrettierConfig;
exports.setupFormatCommand = setupFormatCommand;
exports.setupPrettier = setupPrettier;
const node_child_process_1 = require("node:child_process");
const process = __importStar(require("node:process"));
const node_util_1 = require("node:util");
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
const prettierConfig = {
    singleQuote: false,
    printWidth: 120,
    trailingComma: "all",
    tabWidth: 3,
};
async function installPrettier(projectRoot) {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const pkg = await fs.readJson(packageJsonPath);
    if (pkg.devDependencies?.prettier || pkg.dependencies?.prettier) {
        console.log(chalk_1.default.green("✓ Prettier already installed"));
        return;
    }
    console.log(chalk_1.default.blue("Installing Prettier..."));
    await execAsync("npm install -D prettier", {
        cwd: path.dirname(packageJsonPath),
    });
    console.log(chalk_1.default.green("✓ Prettier installed"));
}
async function setupPrettierConfig(projectRoot = process.cwd()) {
    try {
        const packageJsonPath = path.join(projectRoot, ".prettierrc");
        await fs.writeJson(packageJsonPath, prettierConfig, { spaces: 2 });
        console.log(chalk_1.default.green("✓ Prettier configured in .prettierrc"));
    }
    catch (error) {
        throw new Error(`Failed to setup prettier config: ${error.message}`);
    }
}
async function setupFormatCommand(projectRoot = process.cwd()) {
    try {
        const packageJsonPath = path.join(projectRoot, "package.json");
        const packageJsonContent = await fs.readJson(packageJsonPath);
        if (!packageJsonContent.scripts) {
            packageJsonContent.scripts = {};
        }
        packageJsonContent.scripts.format = 'prettier --write "src/**/*.ts"';
        packageJsonContent.scripts.lint = 'eslint "{src,apps,libs,test}/**/*.ts" --fix';
        await fs.writeJson(packageJsonPath, packageJsonContent, { spaces: 2 });
        console.log(chalk_1.default.green("✓ Format command `npm run format` configured"));
    }
    catch (error) {
        throw new Error(`Failed to setup format command: ${error.message}`);
    }
}
async function setupPrettier(projectRoot = process.cwd()) {
    await installPrettier(projectRoot);
    await setupPrettierConfig(projectRoot);
    await setupFormatCommand(projectRoot);
}
//# sourceMappingURL=format.js.map