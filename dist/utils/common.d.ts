import { DependencyGraph, ModuleMetadata } from "../types/module";
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
export declare function resolveDependencies(selectedModules: string[], moduleMetadataMap: Map<string, ModuleMetadata>): Promise<DependencyGraph>;
export declare function updateProjectDependencies(projectRoot: string, dependencyGraph: DependencyGraph): Promise<void>;
export declare function updateNestCli(projectRoot: string, newConfigs: any[]): Promise<void>;
//# sourceMappingURL=common.d.ts.map