import { exec } from "node:child_process";
import * as process from "node:process";
import { promisify } from "node:util";
import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { PlainObject } from "../types/module";

const execAsync = promisify(exec);

const prettierConfig = {
   singleQuote: false,
   printWidth: 120,
   trailingComma: "all",
   tabWidth: 3,
};

async function installPrettier(projectRoot: string): Promise<void> {
   const packageJsonPath: string = path.join(projectRoot, "package.json");
   const pkg: PlainObject = await fs.readJson(packageJsonPath);

   if (pkg.devDependencies?.prettier || pkg.dependencies?.prettier) {
      console.log(chalk.green("✓ Prettier already installed"));
      return;
   }

   console.log(chalk.blue("Installing Prettier..."));
   await execAsync("npm install -D prettier", {
      cwd: path.dirname(packageJsonPath),
   });

   console.log(chalk.green("✓ Prettier installed"));
}

export async function setupPrettierConfig(projectRoot: string = process.cwd()): Promise<void> {
   try {
      const packageJsonPath: string = path.join(projectRoot, ".prettierrc");

      await fs.writeJson(packageJsonPath, prettierConfig, { spaces: 2 });

      console.log(chalk.green("✓ Prettier configured in .prettierrc"));
   } catch (error: any) {
      throw new Error(`Failed to setup prettier config: ${error.message}`);
   }
}

export async function setupFormatCommand(projectRoot: string = process.cwd()): Promise<void> {
   try {
      const packageJsonPath: string = path.join(projectRoot, "package.json");
      const packageJsonContent: PlainObject = await fs.readJson(packageJsonPath);

      if (!packageJsonContent.scripts) {
         packageJsonContent.scripts = {};
      }

      packageJsonContent.scripts.format = 'prettier --write "src/**/*.ts" "lib/**/*.ts"';
      packageJsonContent.scripts.lint = 'eslint "{src,apps,lib,test}/**/*.ts" --fix';

      await fs.writeJson(packageJsonPath, packageJsonContent, { spaces: 2 });

      console.log(chalk.green("✓ Format command `npm run format` configured"));
   } catch (error: any) {
      throw new Error(`Failed to setup format command: ${error.message}`);
   }
}

export async function setupPrettier(projectRoot: string = process.cwd()): Promise<void> {
   await installPrettier(projectRoot);
   await setupPrettierConfig(projectRoot);
   await setupFormatCommand(projectRoot);
}
