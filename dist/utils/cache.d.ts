import { ModuleMetadata, VersionInfo } from "../types/module";
export declare function ensureCacheDir(): Promise<string>;
export declare function getCacheVersionPath(nestJsVersion: string): Promise<string>;
export declare function getCacheMetadata(nestJsVersion: string): Promise<VersionInfo | null>;
export declare function saveCacheMetadata(nestJsVersion: string, metadata: VersionInfo): Promise<void>;
export declare function getCachedSourcePath(nestJsVersion: string): Promise<string>;
export declare function isCacheValid(nestJsVersion: string): Promise<boolean>;
export declare function ensureLatestCache(nestJsVersion: string): Promise<string>;
export declare function listCachedModules(nestJsVersion: string): Promise<ModuleMetadata[]>;
export declare function clearCache(nestJsVersion?: string): Promise<void>;
//# sourceMappingURL=cache.d.ts.map