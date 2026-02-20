export interface PlatformInfo {
    binaryName: string;
    arch: string;
    platform: string;
}
export declare function detectPlatform(): PlatformInfo;
