"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getConfigValue = getConfigValue;
exports.setConfigValue = setConfigValue;
const path = __importStar(require("node:path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || "", ".ntic");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
async function loadConfig() {
    try {
        if (await fs.pathExists(CONFIG_FILE)) {
            return await fs.readJson(CONFIG_FILE);
        }
    }
    catch (error) {
        console.warn(chalk_1.default.yellow(`Warning: Could not load config file, cause: ${error}`));
    }
    return {};
}
async function saveConfig(config) {
    try {
        await fs.ensureDir(CONFIG_DIR);
        await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
        console.log(chalk_1.default.green(`✓ Config saved successfully to ${CONFIG_FILE}`));
    }
    catch (error) {
        throw new Error(`Failed to save config: ${error}`);
    }
}
async function getConfigValue(key) {
    const config = await loadConfig();
    return config[key];
}
async function setConfigValue(key, value) {
    const config = await loadConfig();
    config[key] = value;
    await saveConfig(config);
}
//# sourceMappingURL=config.js.map