import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { getConfigValue, setConfigValue } from "./config";
import { getNestJsVersionFromNtic } from "./ntic";

export async function detectNestJsVersion(projectRoot: string = process.cwd(), defaultVer?: string): Promise<string> {
   return normalizeVersion(
      await (async () => {
         try {
            // First check ntic.json
            const nticVersion: string | undefined = (await getNestJsVersionFromNtic(projectRoot)) || defaultVer;

            if (nticVersion) return nticVersion;

            // Then check package.json
            const packageJsonPath: string = path.join(projectRoot, "package.json");
            if (await fs.pathExists(packageJsonPath)) {
               const packageJson = await fs.readJson(packageJsonPath);
               const nestJsVersion = packageJson.dependencies?.["@nestjs/core"];

               if (nestJsVersion) {
                  // Extract major version (e.g., "^10.0.0" -> "10")
                  const match = nestJsVersion.match(/\d+/);
                  if (match) {
                     return match[0];
                  }
               }
            }

            console.log(chalk.yellow("Could not detect NestJS version, using latest"));
            return "latest";
         } catch {
            console.log(chalk.yellow("Could not detect NestJS version, using latest"));
            return "latest";
         }
      })(),
   );
}

export async function setDefaultVersion(version: string): Promise<void> {
   await setConfigValue("defaultNestJsVersion", version);
   console.log(chalk.green(`✓ Default NestJS version set to ${version}`));
}

export async function getDefaultVersion(): Promise<string | undefined> {
   return await getConfigValue("defaultNestJsVersion");
}

export function normalizeVersion(version: string): string {
   if (version.startsWith("v")) {
      return version.substring(1);
   }

   return version;
}
