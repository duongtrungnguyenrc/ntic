import { LogResult } from "simple-git";

export interface StorageClient {
   token: string;

   authenticate(token: string): Promise<string | void>;

   cloneSource(
      repositoryUrl: string,
      targetPath: string,
      version: number
   ): Promise<void>;

   updateSource(
      targetPath: string,
      version: number
   ): Promise<LogResult>;

   getProjectCloneUrl(
      repositoryId: string
   ): Promise<string>;
}
