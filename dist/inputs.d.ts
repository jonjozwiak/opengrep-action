export declare const VALID_OUTPUT_FORMATS: readonly ["json", "sarif", "text", "gitlab-sast", "gitlab-secrets", "junit-xml", "semgrep-json"];
export type OutputFormat = (typeof VALID_OUTPUT_FORMATS)[number];
export declare const VALID_SEVERITIES: readonly ["INFO", "WARNING", "ERROR"];
export type Severity = (typeof VALID_SEVERITIES)[number];
export interface ActionInputs {
    version: string;
    config: string;
    paths: string[];
    outputFormat: OutputFormat;
    outputFile: string;
    severity: Severity;
    exclude: string[];
    include: string[];
    maxTargetBytes: number;
    timeout: number;
    jobs: number;
    maxMemory: number;
    baselineCommit: string;
    diffDepth: number;
    enableMetrics: boolean;
    verbose: boolean;
    noGitIgnore: boolean;
    verifySignature: boolean;
    failOnFindings: boolean;
    uploadArtifacts: boolean;
    artifactName: string;
}
export declare function getInputs(): ActionInputs;
