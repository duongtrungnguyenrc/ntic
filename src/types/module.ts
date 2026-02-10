export interface ModuleMetadata {
   name: string;
   version: string;
   description?: string;
   dependencies?: Record<string, string>;
   devDependencies?: Record<string, string>;
   peerDependencies?: Record<string, string>;
   environmentVariables?: EnvironmentVariable[];
   installationPlace?: "src" | "lib" | "src-root";
   dependentModules?: string[];
   installWhenInit?: boolean;
   visibility?: boolean;
}

export interface EnvironmentVariable {
   name: string;
   description?: string;
   required: boolean;
   defaultValue?: string;
   example?: string;
}

export interface NestJSProjectConfig {
   projectRoot: string;
   srcDir: string;
   libDir: string;
   tsconfigPath: string;
   envPath: string;
   envExamplePath: string;
}

export interface CLIConfig {
   gitlabToken?: string;
   gitlabUrl?: string;
   sshKey?: string;
   repositoryUrl?: string;
   modulesRegistry?: string;
   defaultNestJsVersion?: string;
}

export interface NticConfig {
   version: string;
   modules: ModuleMetadata[];
   createdAt: string;
   updatedAt: string;
}

export interface VersionInfo {
   version: string;
   nestJsVersion: string;
   latestCommit?: string;
   cachedAt?: string;
}

export type PlainObject = Record<string, any>;
