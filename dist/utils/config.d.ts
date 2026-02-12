import { CLIConfig } from "../types/module";
export declare function loadConfig(): Promise<Record<string, CLIConfig>>;
export declare function saveConfig(config: CLIConfig, storage?: string): Promise<void>;
export declare function getConfigValue(key: keyof CLIConfig, storage?: string): Promise<string | undefined>;
export declare function setConfigValue(key: keyof CLIConfig, value: string, storage?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map