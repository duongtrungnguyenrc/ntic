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
exports.resolveDependencies = resolveDependencies;
exports.mergeDependencies = mergeDependencies;
exports.updateProjectDependencies = updateProjectDependencies;
exports.printDependencyInfo = printDependencyInfo;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
async function resolveDependencies(selectedModules, moduleMetadataMap) {
    const resolved = new Set();
    const order = [];
    const graph = new Map();
    // Recursive function to resolve all dependencies
    const resolveDeps = async (moduleName, visited = new Set()) => {
        if (resolved.has(moduleName) || visited.has(moduleName)) {
            return;
        }
        visited.add(moduleName);
        const metadata = moduleMetadataMap.get(moduleName);
        if (!metadata) {
            throw new Error(`Module metadata not found for ${moduleName}`);
        }
        // First resolve dependencies of dependent modules
        if (metadata.dependentModules && metadata.dependentModules.length > 0) {
            for (const depModule of metadata.dependentModules) {
                await resolveDeps(depModule, visited);
            }
        }
        // Then add the module itself
        if (!resolved.has(moduleName)) {
            resolved.add(moduleName);
            order.push(moduleName);
            graph.set(moduleName, metadata);
        }
    };
    // Resolve all selected modules
    for (const moduleName of selectedModules) {
        await resolveDeps(moduleName);
    }
    return {
        modules: graph,
        order,
    };
}
function mergeDependencies(basePackageJson, moduleMetadata, type = "dependencies") {
    if (!basePackageJson[type]) {
        basePackageJson[type] = {};
    }
    const sourceDeps = moduleMetadata[type];
    if (sourceDeps) {
        Object.assign(basePackageJson[type], sourceDeps);
    }
}
async function updateProjectDependencies(projectRoot, dependencyGraph) {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = await fs.readJson(packageJsonPath);
    console.log(chalk_1.default.blue("\nMerging dependencies..."));
    for (const metadata of dependencyGraph.modules.values()) {
        mergeDependencies(packageJson, metadata, "dependencies");
        mergeDependencies(packageJson, metadata, "devDependencies");
        mergeDependencies(packageJson, metadata, "peerDependencies");
    }
    // Sort dependencies alphabetically for better readability
    if (packageJson.dependencies) {
        packageJson.dependencies = Object.keys(packageJson.dependencies)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
            acc[key] = packageJson.dependencies[key];
            return acc;
        }, {});
    }
    if (packageJson.devDependencies) {
        packageJson.devDependencies = Object.keys(packageJson.devDependencies)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
            acc[key] = packageJson.devDependencies[key];
            return acc;
        }, {});
    }
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    console.log(chalk_1.default.green("✓ Dependencies updated in package.json"));
}
function printDependencyInfo(graph) {
    console.log(chalk_1.default.cyan("\nDependency Resolution Order:"));
    graph.order.forEach((moduleName, index) => {
        const metadata = graph.modules.get(moduleName);
        console.log(chalk_1.default.gray(`  ${index + 1}. ${moduleName}@${metadata.version}`));
        if (metadata.dependentModules && metadata.dependentModules.length > 0) {
            console.log(chalk_1.default.gray(`     Depends on: ${metadata.dependentModules.join(", ")}`));
        }
    });
    const allDeps = new Set();
    const allDevDeps = new Set();
    for (const metadata of graph.modules.values()) {
        if (metadata.dependencies) {
            Object.keys(metadata.dependencies).forEach((dep) => allDeps.add(dep));
        }
        if (metadata.devDependencies) {
            Object.keys(metadata.devDependencies).forEach((dep) => allDevDeps.add(dep));
        }
    }
    console.log(chalk_1.default.cyan(`\nTotal Dependencies: ${allDeps.size}`));
    console.log(chalk_1.default.cyan(`Total Dev Dependencies: ${allDevDeps.size}`));
}
//# sourceMappingURL=dependencies.js.map