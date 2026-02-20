import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as path from 'path'
import * as fs from 'fs'
import { PlatformInfo } from './platform'

async function installCosign(platformInfo: PlatformInfo): Promise<string> {
  const cosignBinary =
    platformInfo.arch === 'arm64' ? 'cosign-linux-arm64' : 'cosign-linux-amd64'

  // Check tool cache
  const cachedPath = tc.find('cosign', 'latest', platformInfo.arch)
  if (cachedPath) {
    core.info('✓ Using cached cosign binary')
    return path.join(cachedPath, 'cosign')
  }

  core.info('Installing cosign...')
  const downloadUrl = `https://github.com/sigstore/cosign/releases/latest/download/${cosignBinary}`
  const downloadPath = await tc.downloadTool(downloadUrl)
  await fs.promises.chmod(downloadPath, 0o755)

  const cachedDir = await tc.cacheFile(
    downloadPath,
    'cosign',
    'cosign',
    'latest',
    platformInfo.arch
  )

  const cosignPath = path.join(cachedDir, 'cosign')
  await fs.promises.chmod(cosignPath, 0o755)
  core.info('✓ Cosign installed and cached')
  return cosignPath
}

export async function verifySignature(
  binaryPath: string,
  version: string,
  platformInfo: PlatformInfo
): Promise<void> {
  await core.group('Verifying Binary Signature', async () => {
    const cosignPath = await installCosign(platformInfo)

    const baseUrl = `https://github.com/opengrep/opengrep/releases/download/${version}`

    // Download signature and certificate files in parallel
    core.info(`Downloading signature files for ${platformInfo.binaryName}...`)
    const [sigPath, certPath] = await Promise.all([
      tc.downloadTool(`${baseUrl}/${platformInfo.binaryName}.sig`),
      tc.downloadTool(`${baseUrl}/${platformInfo.binaryName}.cert`)
    ])
    core.info('✓ Signature files downloaded')

    // Verify signature
    core.info('Verifying signature for opengrep binary...')
    const exitCode = await exec.exec(cosignPath, [
      'verify-blob',
      '--certificate',
      certPath,
      '--signature',
      sigPath,
      '--certificate-identity-regexp',
      'https://github.com/opengrep/opengrep.*',
      '--certificate-oidc-issuer',
      'https://token.actions.githubusercontent.com',
      binaryPath
    ])

    if (exitCode !== 0) {
      throw new Error(
        'Binary signature verification failed! The binary may have been tampered with.'
      )
    }

    core.info('✓ Binary signature verification successful!')

    // Cleanup signature files
    await Promise.all([io.rmRF(sigPath), io.rmRF(certPath)])
    core.info('✓ Cleaned up signature files')
  })
}
