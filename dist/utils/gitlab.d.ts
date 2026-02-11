import { LogResult } from "simple-git";
import { ModuleMetadata } from "../types/module";
export declare class GitLabClient {
    private readonly client;
    private readonly baseUrl;
    token: string;
    constructor(baseUrl?: string);
    authenticate(token: string): Promise<void>;
    getProjectFile(projectId: string, filePath: string, ref?: string): Promise<string>;
    cloneSource(repositoryUrl: string, targetPath: string, version: number): Promise<void>;
    updateSource(targetPath: string, version: number): Promise<LogResult>;
    getModuleMetadata(projectId: string, moduleName: string): Promise<ModuleMetadata>;
    listModules(projectId: string): Promise<string[]>;
    getProjectCloneUrl(projectId: string): Promise<string>;
}
export declare function createGitLabClient(): Promise<GitLabClient>;
//# sourceMappingURL=gitlab.d.ts.map