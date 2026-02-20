import * as core from '@actions/core'
import * as os from 'os'

export interface PlatformInfo {
  binaryName: string
  arch: string
  platform: string
}

export function detectPlatform(): PlatformInfo {
  const platform = os.platform()
  const arch = os.arch()

  if (platform !== 'linux') {
    throw new Error(
      `Unsupported platform: ${platform}. OpenGrep Action only supports Linux runners.`
    )
  }

  let binaryName: string
  let archLabel: string

  switch (arch) {
    case 'x64':
      binaryName = 'opengrep_manylinux_x86'
      archLabel = 'amd64'
      core.info('✓ Detected platform: Linux x86_64')
      break
    case 'arm64':
      binaryName = 'opengrep_manylinux_aarch64'
      archLabel = 'arm64'
      core.info('✓ Detected platform: Linux ARM64')
      break
    default:
      throw new Error(`Unsupported architecture: ${arch}. Supported: x64, arm64`)
  }

  return { binaryName, arch: archLabel, platform }
}
