import { CLIConfig } from "../types/module";
export declare function loadConfig(): Promise<CLIConfig>;
export declare function saveConfig(config: CLIConfig): Promise<void>;
export declare function getConfigValue(key: keyof CLIConfig): Promise<string | undefined>;
export declare function setConfigValue(key: keyof CLIConfig, value: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map