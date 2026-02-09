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
exports.detectNestJSProject = detectNestJSProject;
exports.ensureLibDirectory = ensureLibDirectory;
exports.setupPathAlias = setupPathAlias;
exports.updateEnvironmentVariables = updateEnvironmentVariables;
exports.getInstalledModules = getInstalledModules;
exports.moduleExists = moduleExists;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
async function detectNestJSProject(projectRoot = process.cwd()) {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const tsconfigPath = path.join(projectRoot, "tsconfig.json");
    if (!(await fs.pathExists(packageJsonPath))) {
        throw new Error("Not a valid NestJS project: package.json not found");
    }
    const packageJson = await fs.readJson(packageJsonPath);
    if (!packageJson.dependencies?.["@nestjs/common"]) {
        throw new Error("Not a valid NestJS project: @nestjs/common not found in dependencies");
    }
    if (!(await fs.pathExists(tsconfigPath))) {
        throw new Error("tsconfig.json not found");
    }
    const srcDir = path.join(projectRoot, "src");
    const libDir = path.join(srcDir, "lib");
    const envPath = path.join(projectRoot, ".env");
    const envExamplePath = path.join(projectRoot, ".env.example");
    return {
        projectRoot,
        srcDir,
        libDir,
        tsconfigPath,
        envPath,
        envExamplePath,
    };
}
async function ensureLibDirectory(config) {
    try {
        await fs.ensureDir(config.libDir);
        console.log(chalk_1.default.green(`✓ Lib directory created at ${config.libDir}`));
    }
    catch (error) {
        throw new Error(`Failed to create lib directory: ${error}`);
    }
}
async function setupPathAlias(config, alias = "@lib") {
    try {
        const tsconfigContent = await fs.readJson(config.tsconfigPath);
        if (!tsconfigContent.compilerOptions) {
            tsconfigContent.compilerOptions = {};
        }
        if (!tsconfigContent.compilerOptions.paths) {
            tsconfigContent.compilerOptions.paths = {};
        }
        const libRelativePath = path.relative(path.dirname(config.tsconfigPath), config.libDir);
        tsconfigContent.compilerOptions.paths[`${alias}/*`] = [`${libRelativePath}/*`];
        await fs.writeJson(config.tsconfigPath, tsconfigContent, { spaces: 2 });
        console.log(chalk_1.default.green(`✓ Path alias "${alias}" configured in tsconfig.json`));
    }
    catch (error) {
        throw new Error(`Failed to setup path alias: ${error}`);
    }
}
async function updateEnvironmentVariables(config, variables, createExample = true) {
    try {
        // Update .env file
        let envContent = "";
        if (await fs.pathExists(config.envPath)) {
            envContent = fs.readFileSync(config.envPath, "utf-8").toString();
        }
        for (const variable of variables) {
            const varLine = `${variable.name}=`;
            if (!envContent.includes(`${variable.name}=`)) {
                envContent += `\n${varLine}${variable.defaultValue || ""}`;
            }
        }
        await fs.writeFile(config.envPath, envContent.trim() + "\n");
        console.log(chalk_1.default.green(`✓ Environment variables updated in .env`));
        // Update .env.example file
        if (createExample) {
            let exampleContent = "";
            if (await fs.pathExists(config.envExamplePath)) {
                exampleContent = fs.readFileSync(config.envExamplePath, "utf-8").toString();
            }
            for (const variable of variables) {
                if (!exampleContent.includes(`${variable.name}=`)) {
                    const description = variable.description ? `# ${variable.description}\n` : "";
                    const example = variable.example ? `${variable.name}=${variable.example}` : `${variable.name}=`;
                    exampleContent += `${description}${example}\n`;
                }
            }
            await fs.writeFile(config.envExamplePath, exampleContent.trim() + "\n");
            console.log(chalk_1.default.green(`✓ Environment variables template updated in .env.example`));
        }
    }
    catch (error) {
        throw new Error(`Failed to update environment variables: ${error}`);
    }
}
async function getInstalledModules(config) {
    try {
        if (!(await fs.pathExists(config.libDir))) {
            return [];
        }
        const entries = await fs.readdir(config.libDir);
        const modules = [];
        for (const entry of entries) {
            const fullPath = path.join(config.libDir, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const metadataPath = path.join(fullPath, "module.json");
                if (await fs.pathExists(metadataPath)) {
                    modules.push(entry);
                }
            }
        }
        return modules;
    }
    catch (error) {
        throw new Error(`Failed to get installed modules: ${error}`);
    }
}
async function moduleExists(config, moduleName) {
    const modulePath = path.join(config.libDir, moduleName);
    return fs.pathExists(modulePath);
}
//# sourceMappingURL=nestjs.js.map