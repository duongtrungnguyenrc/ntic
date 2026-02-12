import { LogResult } from "simple-git";
import { StorageClient } from "../types/interface";
export declare class GitLabClient implements StorageClient {
    private readonly client;
    private readonly baseUrl;
    token: string;
    constructor(baseUrl?: string);
    authenticate(token: string): Promise<void>;
    cloneSource(repositoryUrl: string, targetPath: string, version: number): Promise<void>;
    updateSource(targetPath: string, version: number): Promise<LogResult>;
    getProjectCloneUrl(repositoryId: string): Promise<string>;
}
export declare function createGitLabClient(): Promise<GitLabClient>;
//# sourceMappingURL=gitlab.d.ts.map