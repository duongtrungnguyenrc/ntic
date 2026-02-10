import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { ModuleMetadata, PlainObject } from "../types/module";

export interface DependencyGraph {
   modules: Map<string, ModuleMetadata>;
   order: string[];
}

export async function resolveDependencies(
   selectedModules: string[],
   moduleMetadataMap: Map<string, ModuleMetadata>,
): Promise<DependencyGraph> {
   const resolved = new Set<string>();
   const order: string[] = [];
   const graph = new Map<string, ModuleMetadata>();

   // Recursive function to resolve all dependencies
   const resolveDeps = async (moduleName: string, visited = new Set<string>()): Promise<void> => {
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

export function mergeDependencies(
   basePackageJson: any,
   moduleMetadata: ModuleMetadata,
   type: "dependencies" | "devDependencies" | "peerDependencies" = "dependencies",
): void {
   if (!basePackageJson[type]) {
      basePackageJson[type] = {};
   }

   const sourceDeps = moduleMetadata[type];
   if (sourceDeps) {
      Object.assign(basePackageJson[type], sourceDeps);
   }
}

export async function updateProjectDependencies(projectRoot: string, dependencyGraph: DependencyGraph): Promise<void> {
   const packageJsonPath: string = path.join(projectRoot, "package.json");
   const packageJson: PlainObject = await fs.readJson(packageJsonPath);

   console.log(chalk.blue("\nMerging dependencies..."));

   for (const metadata of dependencyGraph.modules.values()) {
      mergeDependencies(packageJson, metadata, "dependencies");
      mergeDependencies(packageJson, metadata, "devDependencies");
      mergeDependencies(packageJson, metadata, "peerDependencies");
   }

   // Sort dependencies alphabetically for better readability
   if (packageJson.dependencies) {
      packageJson.dependencies = Object.keys(packageJson.dependencies)
         .sort((a: string, b: string) => a.localeCompare(b))
         .reduce((acc: PlainObject, key: string) => {
            acc[key] = packageJson.dependencies[key];
            return acc;
         }, {});
   }

   if (packageJson.devDependencies) {
      packageJson.devDependencies = Object.keys(packageJson.devDependencies)
         .sort((a: string, b: string) => a.localeCompare(b))
         .reduce((acc: PlainObject, key: string) => {
            acc[key] = packageJson.devDependencies[key];
            return acc;
         }, {});
   }

   await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
   console.log(chalk.green("✓ Dependencies updated in package.json"));
}