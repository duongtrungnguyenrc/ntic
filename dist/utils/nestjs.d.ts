import { NestJSProjectConfig, EnvironmentVariable } from "../types/module";
export declare function detectNestJSProject(projectRoot?: string): Promise<NestJSProjectConfig>;
export declare function ensureLibDirectory(config: NestJSProjectConfig): Promise<void>;
export declare function setupPathAlias(config: NestJSProjectConfig, alias?: string): Promise<void>;
export declare function updateEnvironmentVariables(config: NestJSProjectConfig, variables: EnvironmentVariable[], createExample?: boolean): Promise<void>;
export declare function getInstalledModules(config: NestJSProjectConfig): Promise<string[]>;
export declare function moduleExists(config: NestJSProjectConfig, moduleName: string): Promise<boolean>;
//# sourceMappingURL=nestjs.d.ts.map