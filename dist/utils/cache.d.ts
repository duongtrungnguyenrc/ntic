import { ModuleMetadata, CacheMetadata } from "../types/module";
export declare function ensureCacheDir(): Promise<string>;
export declare function getCacheVersionPath(version: string): Promise<string>;
export declare function getCacheMetadata(nestJsVersion: string): Promise<CacheMetadata | null>;
export declare function saveCacheMetadata(nestJsVersion: string, metadata: CacheMetadata): Promise<void>;
export declare function getCachedSourcePath(nestJsVersion: string): Promise<string>;
export declare function isCacheValid(nestJsVersion: string): Promise<boolean>;
export declare function ensureLatestCache(nestJsVersion: string): Promise<string>;
export declare function listCachedModules(nestJsVersion: string): Promise<ModuleMetadata[]>;
export declare function clearCache(nestJsVersion?: string): Promise<void>;
//# sourceMappingURL=cache.d.ts.map