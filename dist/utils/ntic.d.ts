import { NticConfig, ModuleMetadata } from "../types/module";
export declare function getNticPath(projectRoot: string): Promise<string>;
export declare function loadNticConfig(projectRoot: string): Promise<NticConfig | null>;
export declare function createNticConfig(projectRoot: string, nestJsVersion: string): Promise<NticConfig>;
export declare function saveNticConfig(projectRoot: string, config: NticConfig): Promise<void>;
export declare function addModulesToNtic(projectRoot: string, modules: ModuleMetadata[]): Promise<void>;
export declare function getNestJsVersionFromNtic(projectRoot: string): Promise<string | null>;
export declare function installModules(srcPath: string, projectRoot: string, modules: string[], moduleMetadataMap: Map<string, ModuleMetadata>): Promise<string[]>;
export declare function installAutoInstallableModules(projectRoot: string, nestJsVersion: string): Promise<string[]>;
//# sourceMappingURL=ntic.d.ts.map