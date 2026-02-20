import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as fs from 'fs'
import { PlatformInfo } from './platform'

const MAX_RETRIES = 3

async function downloadWithRetry(url: string, retries: number = MAX_RETRIES): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      core.info(`Downloading from: ${url} (attempt ${attempt}/${retries})`)
      const downloadPath = await tc.downloadTool(url)
      core.info('✓ Download successful')
      return downloadPath
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Failed to download after ${retries} attempts: ${error}`)
      }
      const waitTime = Math.pow(2, attempt)
      core.warning(`Download failed, retrying in ${waitTime}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }
  }
  throw new Error('Unreachable')
}

export async function installOpengrep(
  version: string,
  platformInfo: PlatformInfo
): Promise<string> {
  // Check tool cache first
  const cachedPath = tc.find('opengrep', version, platformInfo.arch)
  if (cachedPath) {
    const binaryPath = path.join(cachedPath, 'opengrep')
    core.info(`✓ Using cached OpenGrep ${version} from ${cachedPath}`)
    return binaryPath
  }

  return await core.group('Downloading OpenGrep', async () => {
    const downloadUrl = `https://github.com/opengrep/opengrep/releases/download/${version}/${platformInfo.binaryName}`
    const downloadPath = await downloadWithRetry(downloadUrl)

    // Make executable
    await fs.promises.chmod(downloadPath, 0o755)

    // Verify basic functionality
    core.info('Verifying binary functionality...')
    let versionOutput = ''
    await exec.exec(downloadPath, ['--version'], {
      listeners: {
        stdout: (data: Buffer) => {
          versionOutput += data.toString()
        }
      },
      silent: true
    })
    core.info(`✓ Binary is functional: ${versionOutput.trim().split('\n')[0]}`)

    // Cache the tool
    const cachedDir = await tc.cacheFile(
      downloadPath,
      'opengrep',
      'opengrep',
      version,
      platformInfo.arch
    )

    const binaryPath = path.join(cachedDir, 'opengrep')
    await fs.promises.chmod(binaryPath, 0o755)

    core.info(`✓ Cached OpenGrep ${version} at ${cachedDir}`)
    return binaryPath
  })
}
