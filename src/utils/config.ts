import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { CLIConfig } from "../types/module";

const CONFIG_DIR: string = path.join(process.env.HOME || process.env.USERPROFILE || "", ".ntic");
const CONFIG_FILE: string = path.join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<Record<string, CLIConfig>> {
   try {
      if (await fs.pathExists(CONFIG_FILE)) {
         return await fs.readJson(CONFIG_FILE);
      }
   } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config file, cause: ${error}`));
   }
   return {};
}

export async function saveConfig(config: CLIConfig, storage: string = "default"): Promise<void> {
   try {
      await fs.ensureDir(CONFIG_DIR);

      const fullConfig: Record<string, CLIConfig> = await loadConfig();

      fullConfig[storage] = config;

      await fs.writeJson(CONFIG_FILE, fullConfig, { spaces: 2 });

      console.log(chalk.green(`✓ Config saved successfully to ${CONFIG_FILE} (${storage})`));
   } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
   }
}

export async function getConfigValue(key: keyof CLIConfig, storage: string = "default"): Promise<string | undefined> {
   const fullConfig: Record<string, CLIConfig> = await loadConfig();
   const config: CLIConfig = fullConfig[storage];

   return config?.[key];
}

export async function setConfigValue(key: keyof CLIConfig, value: string, storage: string = "default"): Promise<void> {
   const fullConfig: Record<string, CLIConfig> = await loadConfig();

   const config: CLIConfig = fullConfig[storage] || {};

   config[key] = value;

   fullConfig[storage] = config;

   await saveConfig(config, storage);
}
