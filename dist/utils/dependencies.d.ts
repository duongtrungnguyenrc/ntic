import { ModuleMetadata } from "../types/module";
export interface DependencyGraph {
    modules: Map<string, ModuleMetadata>;
    order: string[];
}
export declare function resolveDependencies(selectedModules: string[], moduleMetadataMap: Map<string, ModuleMetadata>): Promise<DependencyGraph>;
export declare function mergeDependencies(basePackageJson: any, moduleMetadata: ModuleMetadata, type?: "dependencies" | "devDependencies" | "peerDependencies"): void;
export declare function updateProjectDependencies(projectRoot: string, dependencyGraph: DependencyGraph): Promise<void>;
//# sourceMappingURL=dependencies.d.ts.map