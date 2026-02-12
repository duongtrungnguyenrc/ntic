"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabClient = void 0;
exports.createGitLabClient = createGitLabClient;
const simple_git_1 = require("simple-git");
const axios_1 = __importDefault(require("axios"));
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
    async cloneSource(repositoryUrl, targetPath, version) {
        const git = (0, simple_git_1.simpleGit)();
        const token = await (0, config_1.getConfigValue)("gitlabToken");
        if (!token) {
            throw new Error("GitLab access token not configured. Run `ntic setup`.");
        }
        // https://gitlab.com/.../repo.git
        // => https://oauth2:TOKEN@gitlab.com/.../repo.git
        const parsedRepoUrl = repositoryUrl.replace(/^https:\/\//, `https://oauth2:${token}@`);
        try {
            console.log(chalk_1.default.blue(`Cloning from ${repositoryUrl}...`));
            await git.clone(parsedRepoUrl, targetPath, [
                "--depth",
                "1",
                "--branch",
                `v${version}`,
                "--filter",
                "blob:none",
            ]);
            console.log(chalk_1.default.green("✓ Repository cloned successfully"));
        }
        catch (error) {
            throw new Error(`Failed to clone repository: ${error}`);
        }
    }
    async updateSource(targetPath, version) {
        const git = (0, simple_git_1.simpleGit)(targetPath);
        await git.fetch();
        await git.checkout(`v${version}`);
        await git.pull();
        return git.log();
    }
    async getProjectCloneUrl(projectId) {
        const res = await this.client.get(`/api/v4/projects/${encodeURIComponent(projectId)}`);
        return res.data.http_url_to_repo;
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