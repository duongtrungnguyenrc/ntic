import { NticConfig, ModuleMetadata, NestJSProjectConfig, InstallationStats } from "../types/module";
export declare function getNticPath(projectRoot: string): Promise<string>;
export declare function loadNticConfig(projectRoot?: string): Promise<NticConfig | null>;
export declare function createNticConfig(projectRoot: string, nestJsVersion: string): Promise<NticConfig>;
export declare function saveNticConfig(projectRoot: string, config: NticConfig): Promise<void>;
export declare function addModulesToNtic(projectRoot: string, modules: ModuleMetadata[]): Promise<void>;
export declare function getNestJsVersionFromNtic(projectRoot: string): Promise<string | null>;
export declare function getInstallationPath(config: NestJSProjectConfig, place: ModuleMetadata["installationPlace"]): string;
export declare function getInstalledModules(config: NestJSProjectConfig, moduleNames?: string[]): Promise<ModuleMetadata[]>;
export declare function moduleExists(config: NestJSProjectConfig, moduleName: string): Promise<boolean>;
export declare function installModules(srcPath: string, projectRoot: string, moduleNames: string[], moduleMetadataMap: Map<string, ModuleMetadata>): Promise<string[]>;
export declare function installAutoInstallableModules(projectRoot: string, nestJsVersion: string): Promise<string[]>;
export declare function getInstallationStats(projectRoot: string): Promise<InstallationStats>;
//# sourceMappingURL=ntic.d.ts.map