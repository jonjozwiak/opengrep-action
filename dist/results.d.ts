import { OutputFormat } from './inputs';
export interface ScanMetrics {
    findingsCount: number | 'unknown';
    criticalCount: number | 'unknown';
}
export declare function processResults(outputFile: string, outputFormat: OutputFormat): ScanMetrics;
export declare function setOutputs(outputFile: string, scanExitCode: number, metrics: ScanMetrics): void;
export declare function checkFailOnFindings(failOnFindings: boolean, metrics: ScanMetrics): void;
