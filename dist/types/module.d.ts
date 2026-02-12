export type PlainObject = Record<string, any>;
export type StorageType = "github" | "gitlab";
export type ModuleMetadata = {
    name: string;
    version: string;
    description?: string;
    environmentVariables?: EnvironmentVariable[];
    installationPlace?: "src" | "lib" | "src-root";
    dependentModules?: string[];
    installWhenInit?: boolean;
    nestCliOverride?: PlainObject;
    visibility?: boolean;
    packageJsonOverride?: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
    };
};
export type EnvironmentVariable = {
    name: string;
    description?: string;
    required: boolean;
    defaultValue?: string;
    example?: string;
};
export type NestJSProjectConfig = {
    projectRoot: string;
    srcDir: string;
    libDir: string;
    tsconfigPath: string;
    envPath: string;
    envExamplePath: string;
};
export type RegistryConfig = {
    type: StorageType;
    username?: string;
    gitlabUrl?: string;
    accessToken?: string;
    repositoryId?: string;
};
export type NticProjectConfig = {
    version: string;
    modules: ModuleMetadata[];
    createdAt: string;
    updatedAt: string;
};
export type CacheMetadata = {
    version: string;
    latestCommit?: string;
    cachedAt?: string;
};
export type DependencyGraph = {
    modules: Map<string, ModuleMetadata>;
    order: string[];
};
export type InstallationStats = {
    version: string;
    allModules: ModuleMetadata[];
    installedModules: ModuleMetadata[];
    availableModules: ModuleMetadata[];
    invisibleModules: ModuleMetadata[];
    visibleAvailableModules: ModuleMetadata[];
};
//# sourceMappingURL=module.d.ts.map