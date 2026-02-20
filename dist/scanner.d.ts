import { ActionInputs } from './inputs';
export interface ScanResult {
    exitCode: number;
    outputFile: string;
}
export declare function buildArgs(inputs: ActionInputs): string[];
export declare function resolveBaselineCommit(inputBaseline: string): string;
export declare function runScan(binaryPath: string, inputs: ActionInputs): Promise<ScanResult>;
