import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { detectNestJSProject, getInstallationPath, moduleExists, updateEnvironmentVariables } from "./nestjs";
import { DependencyGraph, resolveDependencies, updateProjectDependencies } from "./dependencies";
import { cloneOrUpdateCache, getCachedModuleMetadata, listCachedModules } from "./cache";
import { NticConfig, ModuleMetadata, NestJSProjectConfig } from "../types/module";

const NTIC_FILE = "ntic.json";

export async function getNticPath(projectRoot: string): Promise<string> {
   return path.join(projectRoot, NTIC_FILE);
}

export async function loadNticConfig(projectRoot: string): Promise<NticConfig | null> {
   try {
      const nticPath: string = await getNticPath(projectRoot);

      if (await fs.pathExists(nticPath)) {
         const content = await fs.readJson(nticPath);
         return content as NticConfig;
      }

      return null;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to load ntic.json: ${error}`));
      return null;
   }
}

export async function createNticConfig(projectRoot: string, nestJsVersion: string): Promise<NticConfig> {
   const nticConfig: NticConfig = {
      version: nestJsVersion,
      modules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
   };

   await saveNticConfig(projectRoot, nticConfig);
   return nticConfig;
}

export async function saveNticConfig(projectRoot: string, config: NticConfig): Promise<void> {
   try {
      const nticPath = await getNticPath(projectRoot);
      config.updatedAt = new Date().toISOString();
      await fs.writeJson(nticPath, config, { spaces: 2 });
      console.log(chalk.green(`✓ ntic.json updated`));
   } catch (error) {
      throw new Error(`Failed to save ntic.json: ${error}`);
   }
}

export async function addModulesToNtic(projectRoot: string, modules: ModuleMetadata[]): Promise<void> {
   try {
      let nticConfig: NticConfig | null = await loadNticConfig(projectRoot);

      if (!nticConfig) {
         throw new Error("ntic.json not found. Run init first.");
      }

      for (const module of modules) {
         const existingIndex: number = nticConfig.modules.findIndex((m: ModuleMetadata) => m.name === module.name);

         // Minimize module metadata
         delete module.dependencies;
         delete module.devDependencies;
         delete module.peerDependencies;

         if (existingIndex >= 0) {
            nticConfig.modules[existingIndex] = module;
         } else {
            nticConfig.modules.push(module);
         }
      }

      await saveNticConfig(projectRoot, nticConfig);
   } catch (error) {
      throw new Error(`Failed to add modules to ntic.json: ${error}`);
   }
}

export async function getNestJsVersionFromNtic(projectRoot: string): Promise<string | null> {
   try {
      const nticConfig = await loadNticConfig(projectRoot);
      return nticConfig?.version || null;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to get NestJS version from ntic.json: ${error}`));
      return null;
   }
}

async function copyModuleFromCache(
   cachedModulePath: string,
   destPath: string
) {
   if (!(await fs.pathExists(cachedModulePath))) {
      console.warn(
         chalk.yellow(`⚠ Module source not found in cache for ${path.basename(destPath)}`)
      );
      return;
   }

   await fs.copy(cachedModulePath, destPath, {
      filter: (src: string) => {
         const fileName: string = path.basename(src);

         return fileName !== "module.json";
      }
   });
}

async function postInstallModule(
   projectRoot: string,
   config: NestJSProjectConfig,
   metadata: ModuleMetadata,
   dependencyGraph: DependencyGraph,
) {
   if (!metadata.environmentVariables?.length) return;

   await updateEnvironmentVariables(
      config,
      metadata.environmentVariables,
      true
   );

   await updateProjectDependencies(projectRoot, dependencyGraph);
}

async function installSingleModule(
   projectRoot: string,
   moduleName: string,
   srcPath: string,
   config: NestJSProjectConfig,
   moduleMetadataMap: Map<string, ModuleMetadata>,
   dependencyGraph: DependencyGraph,
) {
   if (await moduleExists(config, moduleName)) {
      console.log(chalk.yellow(`⊘ Module ${moduleName} already installed, skipping`));
      return;
   }

   try {
      const metadata: ModuleMetadata = moduleMetadataMap.get(moduleName)!;
      const installDir: string = getInstallationPath(config, metadata.installationPlace);

      const cachedModulePath: string = path.join(srcPath, "src", moduleName);
      const destPath: string = path.join(installDir, moduleName);

      await copyModuleFromCache(cachedModulePath, destPath);
      await postInstallModule(projectRoot, config, metadata, dependencyGraph);

      console.log(chalk.green(`✓ Module ${moduleName} installed to ${installDir}`));
   } catch (error) {
      console.error(chalk.red(`✗ Failed to install module ${moduleName}: ${error}`));
      throw error;
   }
}

export async function installModules(
   srcPath: string,
   projectRoot: string,
   modules: string[],
   moduleMetadataMap: Map<string, ModuleMetadata>
) {
   const config: NestJSProjectConfig = await detectNestJSProject(projectRoot);

   // Resolve dependencies
   const dependencyGraph: DependencyGraph = await resolveDependencies(modules, moduleMetadataMap);

   // Download and install modules
   console.log(chalk.blue("\nInstalling modules..."));

   for (const moduleName of dependencyGraph.order) {
      await installSingleModule(
         projectRoot,
         moduleName,
         srcPath,
         config,
         moduleMetadataMap,
         dependencyGraph,
      );
   }

   // Add modules to ntic.json
   const modulesToAdd: ModuleMetadata[] =
      dependencyGraph.order.map(name => moduleMetadataMap.get(name)!);

   await addModulesToNtic(projectRoot, modulesToAdd);

   // Update project dependencies
   await updateProjectDependencies(projectRoot, dependencyGraph);

   return dependencyGraph.order;
}

export async function installAutoInstallableModules(
   projectRoot: string,
   nestJsVersion: string
): Promise<string[]> {
   const autoInstallModules: string[] = [];

   try {
      // Check for GitLab configuration and cache
      console.log(chalk.blue("\nSetting up module cache..."));
      // Clone or update cache for this version
      const cachedSrcPath: string = await cloneOrUpdateCache(nestJsVersion);

      // List available modules from cache
      const availableModules: string[] = await listCachedModules(nestJsVersion);
      console.log(chalk.green(`✓ Found ${availableModules.length} available modules`));

      // Load metadata and find modules with installWhenInit flag
      console.log(chalk.blue("Loading module metadata..."));
      const moduleMetadataMap = new Map<string, ModuleMetadata>();

      for (const moduleName of availableModules) {
         try {
            const metadata: ModuleMetadata | null = await getCachedModuleMetadata(nestJsVersion, moduleName);

            if (!metadata) continue;

            moduleMetadataMap.set(moduleName, metadata);

            if (metadata.installWhenInit) {
               autoInstallModules.push(moduleName);
            }
         } catch {
            console.warn(chalk.yellow(`⚠ Could not load metadata for ${moduleName}`));
         }
      }

      if (!autoInstallModules.length) {
         console.log(chalk.gray("No modules marked for auto-install"));
         return [];
      }

      console.log(
         chalk.cyan(`\nAuto-installing modules: ${autoInstallModules.join(", ")}`)
      );

      await installModules(
         cachedSrcPath,
         projectRoot,
         autoInstallModules,
         moduleMetadataMap
      );

      console.log(chalk.green(`✓ Auto-install modules completed`));
   } catch (error) {
      console.warn(chalk.yellow(`⚠ Could not auto-install modules: ${error}`));
   }

   return autoInstallModules;
}
