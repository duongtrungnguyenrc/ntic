import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { RegistryConfig } from "../types/module";

const CONFIG_DIR: string = path.join(process.env.HOME || process.env.USERPROFILE || "", ".ntic");
const CONFIG_FILE: string = path.join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<Record<string, RegistryConfig>> {
   try {
      if (await fs.pathExists(CONFIG_FILE)) {
         return await fs.readJson(CONFIG_FILE);
      }
   } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config file, cause: ${error}`));
   }
   return {};
}

export async function saveConfig(config: RegistryConfig, registry: string = "default"): Promise<void> {
   try {
      await fs.ensureDir(CONFIG_DIR);

      const fullConfig: Record<string, RegistryConfig> = await loadConfig();

      fullConfig[registry] = config;

      await fs.writeJson(CONFIG_FILE, fullConfig, { spaces: 2 });

      console.log(chalk.green(`✓ Config saved successfully to ${CONFIG_FILE} (${registry})`));
   } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
   }
}

export async function getRegistryConfig(registry: string = "default"): Promise<RegistryConfig> {
   const fullConfig: Record<string, RegistryConfig> = await loadConfig();
   return fullConfig[registry] || {};
}

export async function getConfigValue(
   key: keyof RegistryConfig,
   registry: string = "default",
): Promise<string | undefined> {
   const fullConfig: Record<string, RegistryConfig> = await loadConfig();
   const config: RegistryConfig = fullConfig[registry];

   return config?.[key];
}

export async function setConfigValue(
   config: Partial<RegistryConfig>,
   registry: string = "default",
): Promise<void> {
   const fullConfig: Record<string, RegistryConfig> = await loadConfig();
   const currentConfig: RegistryConfig = fullConfig[registry] || {};

   const newConfig: RegistryConfig = {
      ...currentConfig,
      ...config,
   };

   await saveConfig(newConfig, registry);
}
