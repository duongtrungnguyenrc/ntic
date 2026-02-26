import path from "node:path";
import os from "node:os";

export const NTIC_CACHE_DIR: string = path.join(os.homedir(), ".ntic");
export const CACHE_METADATA_FILE = "cache-metadata.json";
export const MODULE_METADATA_FILE = "module.json";
export const NTIC_METADATA_FILE = "ntic.json";
