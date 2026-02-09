import { ModuleMetadata } from "../types/module";
export declare class GitLabClient {
    private readonly client;
    private readonly baseUrl;
    token: string;
    constructor(baseUrl?: string);
    authenticate(token: string): Promise<void>;
    getProjectFile(projectId: string, filePath: string, ref?: string): Promise<string>;
    cloneRepository(repositoryUrl: string, targetPath: string, depth?: number): Promise<void>;
    getModuleMetadata(projectId: string, moduleName: string): Promise<ModuleMetadata>;
    listModules(projectId: string): Promise<string[]>;
    getProjectCloneUrl(projectId: string): Promise<string>;
    downloadModuleSource(projectId: string, moduleName: string, targetPath: string): Promise<void>;
}
export declare function createGitLabClient(): Promise<GitLabClient>;
//# sourceMappingURL=gitlab.d.ts.map