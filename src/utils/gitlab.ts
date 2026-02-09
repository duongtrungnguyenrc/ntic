import axios, { AxiosInstance } from "axios";
import * as fs from "fs-extra";
import * as path from "node:path";
import chalk from "chalk";
import { getConfigValue, setConfigValue } from "./config";
import { ModuleMetadata } from "../types/module";

export class GitLabClient {
   private readonly client: AxiosInstance;
   private readonly baseUrl: string;
   public token: string = "";

   constructor(baseUrl: string = "https://gitlab.com") {
      this.baseUrl = baseUrl;

      this.client = axios.create({
         baseURL: baseUrl,
         headers: {
            "Content-Type": "application/json",
         },
      });
   }

   async authenticate(token: string): Promise<void> {
      try {
         this.token = token;
         this.client.defaults.headers["PRIVATE-TOKEN"] = token;

         // Test the token by getting current user
         const response = await this.client.get("/api/v4/user");
         console.log(chalk.green(`✓ Authenticated as ${response.data.username}`));

         await setConfigValue("gitlabToken", token);
         await setConfigValue("gitlabUrl", this.baseUrl);
      } catch {
         throw new Error("Invalid GitLab token or URL. Please check your credentials.");
      }
   }

   async getProjectFile(projectId: string, filePath: string, ref: string = "main"): Promise<string> {
      try {
         const encodedPath = encodeURIComponent(filePath);
         const response = await this.client.get(
            `/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}/raw`,
            {
               params: { ref },
               responseType: "text",
               transformResponse: [(data) => data],
            },
         );

         return response.data;
      } catch (error) {
         throw new Error(`Failed to fetch file ${filePath}: ${error}`);
      }
   }

   async cloneRepository(repositoryUrl: string, targetPath: string, depth: number = 1): Promise<void> {
      const { simpleGit } = await import("simple-git");
      const git = simpleGit();

      try {
         console.log(chalk.blue(`Cloning from ${repositoryUrl}...`));
         await git.clone(repositoryUrl, targetPath, ["--depth", depth.toString()]);
         console.log(chalk.green("✓ Repository cloned successfully"));
      } catch (error) {
         throw new Error(`Failed to clone repository: ${error}`);
      }
   }

   async getModuleMetadata(projectId: string, moduleName: string): Promise<ModuleMetadata> {
      try {
         const metadataJson = await this.getProjectFile(projectId, `lib/${moduleName}/module.json`);
         return JSON.parse(metadataJson);
      } catch {
         throw new Error(`Failed to fetch module metadata for ${moduleName}`);
      }
   }

   async listModules(projectId: string): Promise<string[]> {
      try {
         const response = await this.client.get(
            `/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree?path=lib`,
         );
         return response.data.filter((item: any) => item.type === "tree").map((item: any) => item.name);
      } catch (error) {
         throw new Error(`Failed to list modules: ${error}`);
      }
   }

   async getProjectCloneUrl(projectId: string): Promise<string> {
      const res = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}`);

      return res.data.http_url_to_repo;
   }

   async downloadModuleSource(projectId: string, moduleName: string, targetPath: string): Promise<void> {
      try {
         const { simpleGit } = await import("simple-git");
         const git = simpleGit();

         const tempDir = path.join(targetPath, ".temp");
         await fs.ensureDir(tempDir);

         const repoUrl = await this.getProjectCloneUrl(projectId);

         console.log(chalk.blue(`Downloading module ${moduleName}...`));

         await git.clone(repoUrl, tempDir, ["--depth", "1", "--filter=blob:none", "--sparse"]);

         const gitClient = simpleGit(tempDir);
         await gitClient.raw(["sparse-checkout", "set", `lib/${moduleName}`]);

         const sourceDir = path.join(tempDir, "lib", moduleName);
         const destDir = path.join(targetPath, moduleName);

         if (!(await fs.pathExists(sourceDir))) {
            throw new Error(`Module directory not found at lib/${moduleName}`);
         }

         await fs.copy(sourceDir, destDir);
         await fs.remove(tempDir);

         console.log(chalk.green(`✓ Module ${moduleName} downloaded successfully`));
      } catch (error: any) {
         throw new Error(`Failed to download module: ${error.message || error}`);
      }
   }
}

export async function createGitLabClient(): Promise<GitLabClient> {
   const gitlabUrl = (await getConfigValue("gitlabUrl")) || "https://gitlab.com";
   const token = await getConfigValue("gitlabToken");

   const client = new GitLabClient(gitlabUrl);

   if (token) {
      client.token = token;
      client["client"].defaults.headers["PRIVATE-TOKEN"] = token;
   }

   return client;
}
