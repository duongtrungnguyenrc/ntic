import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { DependencyGraph, ModuleMetadata, PlainObject } from "../types/module";


function isObject(value: any): value is Record<string, any> {
   return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge<T extends Record<string, any>>(
   target: T,
   source: Partial<T>
): T {

   if (!isObject(target) || !isObject(source)) {
      return source as T;
   }

   for (const key of Object.keys(source)) {

      const srcValue = source[key];
      const tgtValue = target[key];

      if (Array.isArray(srcValue)) {
         (target as any)[key] = [...srcValue] as any;
         continue;
      }

      if (isObject(srcValue) && isObject(tgtValue)) {
         (target as any)[key] = deepMerge(tgtValue, srcValue);
         continue;
      }

      (target as any)[key] = srcValue as any;
   }

   return target;
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

      const metadata: ModuleMetadata | undefined = moduleMetadataMap.get(moduleName);

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

export async function updateProjectDependencies(projectRoot: string, dependencyGraph: DependencyGraph): Promise<void> {
   const packageJsonPath: string = path.join(projectRoot, "package.json");
   const packageJson: PlainObject = await fs.readJson(packageJsonPath);

   console.log(chalk.blue("\nMerging dependencies..."));

   for (const metadata of dependencyGraph.modules.values()) {
      if (metadata.packageJsonOverride) {
         deepMerge(packageJson, metadata.packageJsonOverride);
         deepMerge(packageJson, metadata.packageJsonOverride);
         deepMerge(packageJson, metadata.packageJsonOverride);
      }
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

export async function updateNestCli(
   projectRoot: string,
   newConfigs: any[]
): Promise<void> {

   if (!newConfigs.length) return;

   const filePath: string = path.join(projectRoot, "nest-cli.json");

   const nestCliConfig: any = await fs.readJson(filePath);

   for (const cfg of newConfigs) {
      deepMerge(nestCliConfig, cfg);
   }

   await fs.writeJson(filePath, nestCliConfig, { spaces: 2 });
}
