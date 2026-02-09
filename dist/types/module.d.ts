export type PlainObject = Record<string, any>;
export type ModuleMetadata = {
    name: string;
    version: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    environmentVariables?: EnvironmentVariable[];
    dependentModules?: string[];
    path?: string;
    gitlabUrl?: string;
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
export type CLIConfig = {
    gitlabToken?: string;
    gitlabUrl?: string;
    sshKey?: string;
    repositoryUrl?: string;
    modulesRegistry?: string;
};
//# sourceMappingURL=module.d.ts.map