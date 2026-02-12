import * as process from "node:process";
import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import {
   NticProjectConfig,
   ModuleMetadata,
   NestJSProjectConfig,
   InstallationStats,
   DependencyGraph,
   PlainObject,
   RegistryConfig, StorageType,
} from "../types/module";
import { resolveDependencies, updateNestCli, updateProjectDependencies } from "./common";
import { detectNestJSProject, updateEnvironmentVariables } from "./nestjs";
import { detectNestJsVersion, normalizeVersion } from "./version";
import { ensureLatestCache, listCachedModules } from "./cache";
import { createGitHubClient, GitHubClient } from "./github";
import { createGitLabClient, GitLabClient } from "./gitlab";
import { StorageClient } from "../types/interface";
import { saveConfig } from "./config";

const NTIC_FILE = "ntic.json";

export async function getStorageStrategy(type: StorageType): Promise<StorageClient> {
   switch (type) {
      case "github": return createGitHubClient();
      case "gitlab": return createGitLabClient();
   }
}

export async function setupGithubStorage(cliConfig: RegistryConfig, name: string): Promise<void> {
   const client = new GitHubClient();

   if (!cliConfig.accessToken) throw new Error("Missing Github access token");

   // Validate token
   const username: string = await client.authenticate(cliConfig.accessToken);

   await saveConfig({ ...cliConfig, username }, name);
}

export async function setupGitlabStorage(cliConfig: RegistryConfig, name: string): Promise<void> {
   const client = new GitLabClient(cliConfig.gitlabUrl);

   if (!cliConfig.accessToken) throw new Error("Missing Gitlab access token");

   // Validate token
   await client.authenticate(cliConfig.accessToken);

   await saveConfig(cliConfig, name);
}

export async function getNticPath(projectRoot: string): Promise<string> {
   return path.join(projectRoot, NTIC_FILE);
}

export async function loadNticConfig(projectRoot: string = process.cwd()): Promise<NticProjectConfig | null> {
   try {
      const nticPath: string = await getNticPath(projectRoot);

      if (await fs.pathExists(nticPath)) {
         const content = await fs.readJson(nticPath);
         return content as NticProjectConfig;
      }

      return null;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to load ntic.json: ${error}`));
      return null;
   }
}

export async function createNticConfig(projectRoot: string, nestJsVersion: string): Promise<NticProjectConfig> {
   const nticConfig: NticProjectConfig = {
      version: nestJsVersion,
      modules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
   };

   await saveNticConfig(projectRoot, nticConfig);
   return nticConfig;
}

export async function saveNticConfig(projectRoot: string, config: NticProjectConfig): Promise<void> {
   try {
      const nticPath: string = await getNticPath(projectRoot);
      config.updatedAt = new Date().toISOString();
      await fs.writeJson(nticPath, config, { spaces: 2 });
      console.log(chalk.green(`✓ ntic.json updated`));
   } catch (error) {
      throw new Error(`Failed to save ntic.json: ${error}`);
   }
}

export async function addModulesToNtic(projectRoot: string, modules: ModuleMetadata[]): Promise<void> {
   try {
      let nticConfig: NticProjectConfig | null = await loadNticConfig(projectRoot);

      if (!nticConfig) {
         throw new Error("ntic.json not found. Run init first.");
      }

      for (const module of modules) {
         const existingIndex: number = nticConfig.modules.findIndex((m: ModuleMetadata) => m.name === module.name);

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
      const nticConfig: NticProjectConfig | null = await loadNticConfig(projectRoot);

      return nticConfig?.version || null;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to get NestJS version from ntic.json: ${error}`));
      return null;
   }
}

export function getInstallationPath(config: NestJSProjectConfig, place: ModuleMetadata["installationPlace"]) {
   switch (place) {
      case "src":
         return config.srcDir;
      case "lib":
         return config.libDir;
      default:
         return config.projectRoot;
   }
}

export async function getInstalledModules(
   config: NestJSProjectConfig,
   moduleNames?: string[],
): Promise<ModuleMetadata[]> {
   const nticConfig: NticProjectConfig | null = await loadNticConfig();

   if (!nticConfig) {
      throw new Error("Ntic configuration not found. Please run `ntic init`");
   }

   const nticModules: ModuleMetadata[] = nticConfig.modules || [];

   const installed: ModuleMetadata[] = [];

   try {
      for (const module of nticModules) {
         const installDir: string = getInstallationPath(config, module.installationPlace);

         const modulePath: string = path.join(installDir, module.name);
         const includeThisModule: boolean = moduleNames?.includes(module.name) || true;

         if ((await fs.pathExists(modulePath)) && includeThisModule) {
            installed.push(module);
         }
      }

      return installed;
   } catch (error) {
      throw new Error(`Failed to get installed modules: ${error}`);
   }
}

export async function moduleExists(config: NestJSProjectConfig, moduleName: string): Promise<boolean> {
   const locations: string[] = [config.srcDir, config.libDir, config.projectRoot];

   for (const basePath of locations) {
      if (await fs.pathExists(path.join(basePath, moduleName))) {
         return true;
      }
   }

   return false;
}

async function copyModuleFromCache(cachedModulePath: string, destPath: string) {
   if (!(await fs.pathExists(cachedModulePath))) {
      console.warn(chalk.yellow(`⚠ Module source not found in cache for ${path.basename(destPath)}`));
      return;
   }

   await fs.copy(cachedModulePath, destPath, {
      filter: (src: string) => {
         const fileName: string = path.basename(src);

         return fileName !== "module.json";
      },
   });
}

async function postInstallModule(config: NestJSProjectConfig, metadata: ModuleMetadata) {
   if (!metadata.environmentVariables?.length) return;

   await updateEnvironmentVariables(config, metadata.environmentVariables, true);
}

async function installSingleModule(
   moduleName: string,
   srcPath: string,
   config: NestJSProjectConfig,
   moduleMetadataMap: Map<string, ModuleMetadata>,
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
      await postInstallModule(config, metadata);

      console.log(chalk.green(`✓ Module ${moduleName} installed to ${installDir}`));
   } catch (error) {
      console.error(chalk.red(`✗ Failed to install module ${moduleName}: ${error}`));
      throw error;
   }
}

export async function installModules(
   srcPath: string,
   projectRoot: string,
   moduleNames: string[],
   moduleMetadataMap: Map<string, ModuleMetadata>,
) {
   const config: NestJSProjectConfig = await detectNestJSProject(projectRoot);

   // Resolve dependencies
   const dependencyGraph: DependencyGraph = await resolveDependencies(moduleNames, moduleMetadataMap);

   // Download and install moduleNames
   console.log(chalk.blue("\nInstalling moduleNames..."));

   for (const moduleName of dependencyGraph.order) {
      await installSingleModule(moduleName, srcPath, config, moduleMetadataMap);
   }

   // Add moduleNames to ntic.json
   const modulesToAdd: ModuleMetadata[] = dependencyGraph.order.map((name: string) => moduleMetadataMap.get(name)!);

   // Update ntic metadata file
   await addModulesToNtic(projectRoot, modulesToAdd);

   // Update project dependencies
   await updateProjectDependencies(projectRoot, dependencyGraph);

   // Update nest-cli.json
   const nestCliOverrides: (PlainObject | undefined)[] = modulesToAdd.map(
      (metadata: ModuleMetadata) => metadata.nestCliOverride,
   );

   await updateNestCli(projectRoot, nestCliOverrides);

   return dependencyGraph.order;
}

export async function installAutoInstallableModules(projectRoot: string, nestJsVersion: string): Promise<string[]> {
   const autoInstallModules: string[] = [];

   try {
      // Check for GitLab configuration and cache
      console.log(chalk.blue("\nSetting up module cache..."));
      // Clone or update cache for this version
      const cachedSrcPath: string = await ensureLatestCache(nestJsVersion);

      // List available modules from cache
      const availableModules: ModuleMetadata[] = await listCachedModules(nestJsVersion);
      console.log(chalk.green(`✓ Found ${availableModules.length} available modules`));

      const autoInstallModules: ModuleMetadata[] = availableModules.filter((m: ModuleMetadata) => m.installWhenInit);
      const autoInstallModuleNames: string[] = autoInstallModules.map((m) => m.name);

      if (!autoInstallModules.length) {
         console.log(chalk.gray("No modules marked for auto-install"));
         return [];
      }

      console.log(
         chalk.cyan(`\nAuto-installing modules: ${autoInstallModules.map((m: ModuleMetadata) => m.name).join(", ")}`),
      );

      // Load metadata and find modules with installWhenInit flag
      console.log(chalk.blue("Loading module metadata..."));
      const moduleMetadataMap: Map<string, ModuleMetadata> = availableModules.reduce(
         (prev: Map<string, ModuleMetadata>, curr: ModuleMetadata) => {
            prev.set(curr.name, curr);
            return prev;
         },
         new Map<string, ModuleMetadata>(),
      );

      await installModules(cachedSrcPath, projectRoot, autoInstallModuleNames, moduleMetadataMap);

      console.log(chalk.green(`✓ Auto-install modules completed`));
   } catch (error) {
      console.warn(chalk.yellow(`⚠ Could not auto-install modules: ${error}`));
   }

   return autoInstallModules;
}

export async function getInstallationStats(projectRoot: string): Promise<InstallationStats> {
   // Installed modules
   console.log(chalk.blue("Detecting NestJS project..."));

   const config: NestJSProjectConfig = await detectNestJSProject(projectRoot);

   // Detect version
   const version: string = normalizeVersion(
      (await getNestJsVersionFromNtic(projectRoot)) || (await detectNestJsVersion(projectRoot)),
   );

   console.log(chalk.green(`✓ NestJS v${version} project detected at ${config.projectRoot}`));

   await ensureLatestCache(version);
   const allModules: ModuleMetadata[] = await listCachedModules(version);
   const installedModules: ModuleMetadata[] = await getInstalledModules(config);

   const availableModules: ModuleMetadata[] = allModules.filter(
      (m: ModuleMetadata) => !installedModules.some((i: ModuleMetadata) => i.name === m.name),
   );

   const visibleAvailableModules: ModuleMetadata[] = availableModules.filter(
      (m: ModuleMetadata) => m.visibility !== false,
   );

   const invisibleModules: ModuleMetadata[] = availableModules.filter((m: ModuleMetadata) => m.visibility === false);

   return {
      version,
      allModules,
      installedModules,
      availableModules,
      invisibleModules,
      visibleAvailableModules,
   };
}
