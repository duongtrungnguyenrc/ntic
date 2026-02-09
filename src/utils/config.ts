import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { CLIConfig } from "../types/module";

const CONFIG_DIR: string = path.join(process.env.HOME || process.env.USERPROFILE || "", ".ntic");
const CONFIG_FILE: string = path.join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<CLIConfig> {
   try {
      if (await fs.pathExists(CONFIG_FILE)) {
         return await fs.readJson(CONFIG_FILE);
      }
   } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config file, cause: ${error}`));
   }
   return {};
}

export async function saveConfig(config: CLIConfig): Promise<void> {
   try {
      await fs.ensureDir(CONFIG_DIR);
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      console.log(chalk.green(`✓ Config saved successfully to ${CONFIG_FILE}`));
   } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
   }
}

export async function getConfigValue(key: keyof CLIConfig): Promise<string | undefined> {
   const config: CLIConfig = await loadConfig();

   return config[key];
}

export async function setConfigValue(key: keyof CLIConfig, value: string): Promise<void> {
   const config: CLIConfig = await loadConfig();
   config[key] = value;
   await saveConfig(config);
}
