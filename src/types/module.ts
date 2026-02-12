export type PlainObject = Record<string, any>;

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
   }
}

export type EnvironmentVariable = {
   name: string;
   description?: string;
   required: boolean;
   defaultValue?: string;
   example?: string;
}

export type NestJSProjectConfig = {
   projectRoot: string;
   srcDir: string;
   libDir: string;
   tsconfigPath: string;
   envPath: string;
   envExamplePath: string;
}

export type CLIConfig = {
   gitlabToken?: string;
   gitlabUrl?: string;
   sshKey?: string;
   repositoryUrl?: string;
   modulesRegistry?: string;
   defaultNestJsVersion?: string;
}

export type NticConfig = {
   version: string;
   modules: ModuleMetadata[];
   createdAt: string;
   updatedAt: string;
}

export type VersionInfo = {
   version: string;
   nestJsVersion: string;
   latestCommit?: string;
   cachedAt?: string;
}

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

// Command Options

export type AddCommandOptions = {
   storage: string;
   project: string;
   modules: string;
}