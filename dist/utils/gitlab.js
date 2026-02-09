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
exports.GitLabClient = void 0;
exports.createGitLabClient = createGitLabClient;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("node:path"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
class GitLabClient {
    client;
    baseUrl;
    token = "";
    constructor(baseUrl = "https://gitlab.com") {
        this.baseUrl = baseUrl;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    async authenticate(token) {
        try {
            this.token = token;
            this.client.defaults.headers["PRIVATE-TOKEN"] = token;
            // Test the token by getting current user
            const response = await this.client.get("/api/v4/user");
            console.log(chalk_1.default.green(`✓ Authenticated as ${response.data.username}`));
            await (0, config_1.setConfigValue)("gitlabToken", token);
            await (0, config_1.setConfigValue)("gitlabUrl", this.baseUrl);
        }
        catch {
            throw new Error("Invalid GitLab token or URL. Please check your credentials.");
        }
    }
    async getProjectFile(projectId, filePath, ref = "main") {
        try {
            const encodedPath = encodeURIComponent(filePath);
            const response = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}/raw`, {
                params: { ref },
                responseType: "text",
                transformResponse: [(data) => data],
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch file ${filePath}: ${error}`);
        }
    }
    async cloneRepository(repositoryUrl, targetPath, depth = 1) {
        const { simpleGit } = await Promise.resolve().then(() => __importStar(require("simple-git")));
        const git = simpleGit();
        try {
            console.log(chalk_1.default.blue(`Cloning from ${repositoryUrl}...`));
            await git.clone(repositoryUrl, targetPath, ["--depth", depth.toString()]);
            console.log(chalk_1.default.green("✓ Repository cloned successfully"));
        }
        catch (error) {
            throw new Error(`Failed to clone repository: ${error}`);
        }
    }
    async getModuleMetadata(projectId, moduleName) {
        try {
            const metadataJson = await this.getProjectFile(projectId, `lib/${moduleName}/module.json`);
            return JSON.parse(metadataJson);
        }
        catch {
            throw new Error(`Failed to fetch module metadata for ${moduleName}`);
        }
    }
    async listModules(projectId) {
        try {
            const response = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree?path=lib`);
            return response.data.filter((item) => item.type === "tree").map((item) => item.name);
        }
        catch (error) {
            throw new Error(`Failed to list modules: ${error}`);
        }
    }
    async getProjectCloneUrl(projectId) {
        const res = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}`);
        return res.data.http_url_to_repo;
    }
    async downloadModuleSource(projectId, moduleName, targetPath) {
        try {
            const { simpleGit } = await Promise.resolve().then(() => __importStar(require("simple-git")));
            const git = simpleGit();
            const tempDir = path.join(targetPath, ".temp");
            await fs.ensureDir(tempDir);
            const repoUrl = await this.getProjectCloneUrl(projectId);
            console.log(chalk_1.default.blue(`Downloading module ${moduleName}...`));
            await git.clone(repoUrl, tempDir, ["--depth", "1", "--filter=blob:none", "--sparse"]);
            const gitClient = simpleGit(tempDir);
            await gitClient.raw(["sparse-checkout", "set", `lib/${moduleName}`]);
            const sourceDir = path.join(tempDir, "lib", moduleName);
            const destDir = path.join(targetPath, moduleName);
            if (!(await fs.pathExists(sourceDir))) {
                throw new Error(`Module directory not found at lib/${moduleName}`);
            }
            await fs.copy(sourceDir, destDir);
            await fs.remove(tempDir);
            console.log(chalk_1.default.green(`✓ Module ${moduleName} downloaded successfully`));
        }
        catch (error) {
            throw new Error(`Failed to download module: ${error.message || error}`);
        }
    }
}
exports.GitLabClient = GitLabClient;
async function createGitLabClient() {
    const gitlabUrl = (await (0, config_1.getConfigValue)("gitlabUrl")) || "https://gitlab.com";
    const token = await (0, config_1.getConfigValue)("gitlabToken");
    const client = new GitLabClient(gitlabUrl);
    if (token) {
        client.token = token;
        client["client"].defaults.headers["PRIVATE-TOKEN"] = token;
    }
    return client;
}
//# sourceMappingURL=gitlab.js.map