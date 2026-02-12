import { LogResult, simpleGit, SimpleGit } from "simple-git";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import chalk from "chalk";

import { getConfigValue, setConfigValue } from "./config";
import { StorageClient } from "../types/interface";

export class GitHubClient implements StorageClient {
   private readonly githubUrl: string = "https://api.github.com";
   private readonly client: AxiosInstance;
   public token: string = "";

   constructor() {
      this.client = axios.create({
         baseURL: this.githubUrl,
         headers: {
            "Content-Type": "application/json",
         },
      });
   }

   async authenticate(token: string): Promise<string> {
      try {
         this.token = token;

         this.client.defaults.headers["Authorization"] = `Bearer ${token}`;

         // Test token
         const response = await this.client.get("/user");

         console.log(chalk.green(`\n✓ Authenticated as ${response.data.login}`));
         return response.data.login;
      } catch {
         throw new Error("Invalid GitHub token or URL. Please check your credentials.");
      }
   }

   async cloneSource(repositoryUrl: string, targetPath: string, version: number): Promise<void> {
      const git: SimpleGit = simpleGit();
      const token: string | undefined = await getConfigValue("accessToken");

      if (!token) {
         throw new Error("GitHub access token not configured. Run `ntic setup`.");
      }

      // https://github.com/user/repo.git
      // => https://TOKEN@github.com/user/repo.git
      const parsedRepoUrl: string = repositoryUrl.replace(/^https:\/\//, `https://${token}@`);

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

   /**
    * owner/repo  -> https clone url
    */
   async getProjectCloneUrl(project: string): Promise<string> {
      const username: string | undefined = await getConfigValue("username");

      if (!username) throw new Error("GitHub username is required");

      const res: AxiosResponse = await this.client.get(`/repos/${username}/${encodeURIComponent(project)}`);

      return res.data.clone_url;
   }
}

export async function createGitHubClient(): Promise<GitHubClient> {
   const token: string | undefined = await getConfigValue("accessToken");
   const client = new GitHubClient();

   if (token) {
      client.token = token;
      client["client"].defaults.headers["Authorization"] = `Bearer ${token}`;
   }

   return client;
}
