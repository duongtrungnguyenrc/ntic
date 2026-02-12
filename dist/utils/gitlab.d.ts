import { LogResult } from "simple-git";
export declare class GitLabClient {
    private readonly client;
    private readonly baseUrl;
    token: string;
    constructor(baseUrl?: string);
    authenticate(token: string): Promise<void>;
    cloneSource(repositoryUrl: string, targetPath: string, version: number): Promise<void>;
    updateSource(targetPath: string, version: number): Promise<LogResult>;
    getProjectCloneUrl(projectId: string): Promise<string>;
}
export declare function createGitLabClient(): Promise<GitLabClient>;
//# sourceMappingURL=gitlab.d.ts.map