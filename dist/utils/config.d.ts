import { RegistryConfig } from "../types/module";
export declare function loadConfig(): Promise<Record<string, RegistryConfig>>;
export declare function saveConfig(config: RegistryConfig, registry?: string): Promise<void>;
export declare function getRegistryConfig(registry?: string): Promise<RegistryConfig>;
export declare function getConfigValue(key: keyof RegistryConfig, registry?: string): Promise<string | undefined>;
export declare function setConfigValue(config: Partial<RegistryConfig>, registry?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map