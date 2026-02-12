import { LogResult, simpleGit, SimpleGit } from "simple-git";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import chalk from "chalk";

import { getConfigValue, setConfigValue } from "./config";

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

   async cloneSource(repositoryUrl: string, targetPath: string, version: number): Promise<void> {
      const git: SimpleGit = simpleGit();
      const token: string | undefined = await getConfigValue("gitlabToken");

      if (!token) {
         throw new Error("GitLab access token not configured. Run `ntic setup`.");
      }

      // https://gitlab.com/.../repo.git
      // => https://oauth2:TOKEN@gitlab.com/.../repo.git
      const parsedRepoUrl: string = repositoryUrl.replace(/^https:\/\//, `https://oauth2:${token}@`);

      try {
         console.log(chalk.blue(`Cloning from ${repositoryUrl}...`));

         await git.clone(parsedRepoUrl, targetPath, [
            "--depth",
            "1",
            "--branch",
            `v${version}`,
            "--filter",
            "blob:none",
         ]);

         console.log(chalk.green("✓ Repository cloned successfully"));
      } catch (error) {
         throw new Error(`Failed to clone repository: ${error}`);
      }
   }

   async updateSource(targetPath: string, version: number): Promise<LogResult> {
      const git: SimpleGit = simpleGit(targetPath);
      await git.fetch();
      await git.checkout(`v${version}`);
      await git.pull();

      return git.log();
   }

   async getProjectCloneUrl(projectId: string): Promise<string> {
      const res: AxiosResponse = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}`);

      return res.data.http_url_to_repo;
   }
}

export async function createGitLabClient(): Promise<GitLabClient> {
   const gitlabUrl: string = (await getConfigValue("gitlabUrl")) || "https://gitlab.com";
   const token: string | undefined = await getConfigValue("gitlabToken");

   const client = new GitLabClient(gitlabUrl);

   if (token) {
      client.token = token;
      client["client"].defaults.headers["PRIVATE-TOKEN"] = token;
   }

   return client;
}
