import * as path from "node:path";
import * as fs from "fs-extra";
import chalk from "chalk";

import { NestJSProjectConfig, EnvironmentVariable } from "../types/module";

export async function detectNestJSProject(projectRoot: string = process.cwd()): Promise<NestJSProjectConfig> {
   const packageJsonPath: string = path.join(projectRoot, "package.json");
   const tsconfigPath: string = path.join(projectRoot, "tsconfig.json");
   const nestCliPath: string = path.join(projectRoot, "nest-cli.json");

   if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error("Not a valid NestJS project: package.json not found");
   }

   const packageJson = await fs.readJson(packageJsonPath);

   if (!packageJson.dependencies?.["@nestjs/common"]) {
      throw new Error("Not a valid NestJS project: @nestjs/common not found in dependencies");
   }

   if (!(await fs.pathExists(tsconfigPath))) {
      throw new Error("tsconfig.json not found");
   }

   if (!(await fs.pathExists(nestCliPath))) {
      throw new Error("nest-cli.json not found");
   }

   const srcDir: string = path.join(projectRoot, "src");
   const libDir: string = path.join(projectRoot, "lib");
   const envPath: string = path.join(projectRoot, ".env");
   const envExamplePath: string = path.join(projectRoot, ".env.example");

   return {
      projectRoot,
      srcDir,
      libDir,
      tsconfigPath,
      envPath,
      envExamplePath,
   };
}

export async function ensureLibDirectory(config: NestJSProjectConfig): Promise<void> {
   try {
      await fs.ensureDir(config.libDir);
      console.log(chalk.green(`✓ Lib directory created at ${config.libDir}`));
   } catch (error) {
      throw new Error(`Failed to create lib directory: ${error}`);
   }
}

export async function setupPathAlias(config: NestJSProjectConfig, alias: string = "@lib"): Promise<void> {
   try {
      const tsconfigContent = await fs.readJson(config.tsconfigPath);

      if (!tsconfigContent.compilerOptions) {
         tsconfigContent.compilerOptions = {};
      }

      if (!tsconfigContent.compilerOptions.paths) {
         tsconfigContent.compilerOptions.paths = {};
      }

      const libRelativePath: string = path.relative(path.dirname(config.tsconfigPath), config.libDir);

      tsconfigContent.compilerOptions.paths[`${alias}/*`] = [`${libRelativePath}/*`];

      await fs.writeJson(config.tsconfigPath, tsconfigContent, { spaces: 2 });
      console.log(chalk.green(`✓ Path alias "${alias}" configured in tsconfig.json`));
   } catch (error) {
      throw new Error(`Failed to setup path alias: ${error}`);
   }
}

export async function updateEnvironmentVariables(
   config: NestJSProjectConfig,
   variables: EnvironmentVariable[],
   createExample: boolean = true,
): Promise<void> {
   try {
      // Update .env file
      let envContent = "";
      if (await fs.pathExists(config.envPath)) {
         envContent = fs.readFileSync(config.envPath, "utf-8").toString();
      }

      for (const variable of variables) {
         const varLine = `${variable.name}=`;
         if (!envContent.includes(`${variable.name}=`)) {
            envContent += `\n${varLine}${variable.defaultValue || ""}`;
         }
      }

      await fs.writeFile(config.envPath, envContent.trim() + "\n");
      console.log(chalk.green(`✓ Environment variables updated in .env`));

      // Update .env.example file
      if (createExample) {
         let exampleContent = "";

         if (await fs.pathExists(config.envExamplePath)) {
            exampleContent = fs.readFileSync(config.envExamplePath, "utf-8").toString();
         }

         for (const variable of variables) {
            if (!exampleContent.includes(`${variable.name}=`)) {
               const description = variable.description ? `# ${variable.description}\n` : "";
               const example = variable.example ? `${variable.name}=${variable.example}` : `${variable.name}=`;
               exampleContent += `${description}${example}\n`;
            }
         }

         await fs.writeFile(config.envExamplePath, exampleContent.trim() + "\n");
         console.log(chalk.green(`✓ Environment variables template updated in .env.example`));
      }
   } catch (error) {
      throw new Error(`Failed to update environment variables: ${error}`);
   }
}
