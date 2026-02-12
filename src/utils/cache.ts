import { LogResult, simpleGit, SimpleGit } from "simple-git";
import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";
import os from "node:os";

import { createGitLabClient, GitLabClient } from "./gitlab";
import { ModuleMetadata, VersionInfo } from "../types/module";
import { getConfigValue } from "./config";
import { Stats } from "fs-extra";
import * as console from "node:console";

const NTIC_CACHE_DIR: string = path.join(os.homedir(), ".ntic");
const CACHE_METADATA_FILE = "cache-metadata.json";

export async function ensureCacheDir(): Promise<string> {
   await fs.ensureDir(NTIC_CACHE_DIR);
   return NTIC_CACHE_DIR;
}

export async function getCacheVersionPath(nestJsVersion: string): Promise<string> {
   const cacheDir: string = await ensureCacheDir();
   return path.join(cacheDir, `v${nestJsVersion}`);
}

export async function getCacheMetadata(nestJsVersion: string): Promise<VersionInfo | null> {
   try {
      const versionPath: string = await getCacheVersionPath(nestJsVersion);
      const metadataPath: string = path.join(versionPath, CACHE_METADATA_FILE);

      if (await fs.pathExists(metadataPath)) {
         return await fs.readJson(metadataPath);
      }
      return null;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to read cache metadata: ${error}`));
      return null;
   }
}

export async function saveCacheMetadata(nestJsVersion: string, metadata: VersionInfo): Promise<void> {
   try {
      const versionPath: string = await getCacheVersionPath(nestJsVersion);
      await fs.ensureDir(versionPath);

      const metadataPath: string = path.join(versionPath, CACHE_METADATA_FILE);
      metadata.cachedAt = new Date().toISOString();
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to save cache metadata: ${error}`));
   }
}

export async function getCachedSourcePath(nestJsVersion: string): Promise<string> {
   const versionPath: string = await getCacheVersionPath(nestJsVersion);
   return path.join(versionPath);
}

export async function isCacheValid(nestJsVersion: string): Promise<boolean> {
   try {
      const metadata: VersionInfo | null = await getCacheMetadata(nestJsVersion);

      if (!metadata) {
         return false;
      }

      if (!metadata.cachedAt) {
         return false;
      }

      // Check if remote has updates
      try {
         const srcPath: string = await getCachedSourcePath(nestJsVersion);

         if (!(await fs.pathExists(srcPath))) {
            return false;
         }

         const git: SimpleGit = simpleGit(srcPath);
         const remoteHeadCommit: string | undefined = await getRemoteLatestCommit(nestJsVersion, git);

         if (remoteHeadCommit && metadata.latestCommit !== remoteHeadCommit) {
            console.log(
               chalk.yellow(`Updates available for v${nestJsVersion} (remote: ${remoteHeadCommit.substring(0, 7)})`),
            );
            return false;
         }

         return true;
      } catch (error) {
         console.log(chalk.yellow(`Unable to check for updates: ${error}`));
         return true; // Use cache if we can't check updates
      }
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to validate cache: ${error}`));
      return false;
   }
}

async function getRemoteLatestCommit(nestJsVersion: string, git: SimpleGit): Promise<string | undefined> {
   await git.fetch();
   const log: LogResult = await git.log([`origin/v${nestJsVersion}`]);

   return log.latest?.hash;
}

export async function ensureLatestCache(nestJsVersion: string): Promise<string> {
   try {
      const gitlabClient: GitLabClient = await createGitLabClient();

      const versionPath: string = await getCacheVersionPath(nestJsVersion);
      const srcPath: string = await getCachedSourcePath(nestJsVersion);

      // Check if cache exists and is valid
      if (await fs.pathExists(srcPath)) {
         const isValid: boolean = await isCacheValid(nestJsVersion);

         if (isValid) {
            console.log(chalk.green(`✓ Using cached version from ${srcPath}`));
            return srcPath;
         }

         // Update existing cache
         console.log(chalk.blue(`Updating cached version for v${nestJsVersion}...`));
         const log: LogResult = await gitlabClient.updateSource(srcPath, +nestJsVersion);

         if (log.latest) {
            const metadata: VersionInfo = {
               version: nestJsVersion,
               nestJsVersion,
               latestCommit: log.latest.hash,
            };

            await saveCacheMetadata(nestJsVersion, metadata);
            console.log(chalk.green(`✓ Cache updated successfully`));
         }

         return srcPath;
      }

      // Clone new cache
      console.log(chalk.blue(`Cloning modules repository for v${nestJsVersion}...`));
      await fs.ensureDir(versionPath);

      const modulesRegistry: string = (await getConfigValue("modulesRegistry"))!;
      const repoUrl: string = await gitlabClient.getProjectCloneUrl(modulesRegistry);

      await gitlabClient.cloneSource(repoUrl, srcPath, +nestJsVersion);

      const gitClient: SimpleGit = simpleGit(srcPath);
      const log: LogResult = await gitClient.log([`-1`]);

      if (log.latest) {
         const metadata: VersionInfo = {
            version: nestJsVersion,
            nestJsVersion,
            latestCommit: log.latest.hash,
         };
         await saveCacheMetadata(nestJsVersion, metadata);
      }

      console.log(chalk.green(`✓ Cached cloned successfully to ${srcPath}`));
      return srcPath;
   } catch (error) {
      throw new Error(`Failed to clone or update cache: ${error}`);
   }
}

export async function listCachedModules(nestJsVersion: string): Promise<ModuleMetadata[]> {
   try {
      const cachedSourcePath: string = await getCachedSourcePath(nestJsVersion);
      const modulesPath: string = path.join(cachedSourcePath, "src");

      if (!(await fs.pathExists(modulesPath))) {
         return [];
      }

      const entries: string[] = await fs.readdir(modulesPath);
      const modules: any[] = [];

      for (const entry of entries) {
         const fullPath: string = path.join(modulesPath, entry);
         const stat: Stats = await fs.stat(fullPath);

         if (stat.isDirectory()) {
            const metadataPath: string = path.join(fullPath, "module.json");

            if (await fs.pathExists(metadataPath)) {
               const metadata: ModuleMetadata = await fs.readJson(metadataPath);

               modules.push(metadata);
            }
         }
      }

      return modules;
   } catch (error) {
      console.error(chalk.yellow(`Warning: Failed to list cached modules: ${error}`));
      return [];
   }
}

export async function clearCache(nestJsVersion?: string): Promise<void> {
   try {
      if (nestJsVersion) {
         const versionPath: string = await getCacheVersionPath(nestJsVersion);
         await fs.remove(versionPath);
         console.log(chalk.green(`✓ Cache for v${nestJsVersion} cleared`));
      } else {
         if (!(await fs.pathExists(NTIC_CACHE_DIR))) return;

         const entries: string[] = await fs.readdir(NTIC_CACHE_DIR);

         for (const entry of entries) {
            if (entry === "config.json") continue;

            await fs.remove(path.join(NTIC_CACHE_DIR, entry));
         }

         console.log(chalk.green(`✓ All caches cleared`));
      }
   } catch (error) {
      throw new Error(`Failed to clear cache: ${error}`);
   }
}
