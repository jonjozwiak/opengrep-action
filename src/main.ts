import * as core from '@actions/core'
import { getInputs } from './inputs'
import { detectPlatform } from './platform'
import { installOpengrep } from './installer'
import { verifySignature } from './verify'
import { runScan } from './scanner'
import { processResults, setOutputs, checkFailOnFindings } from './results'
import { uploadResultsArtifact } from './artifacts'

async function run(): Promise<void> {
  try {
    // Step 1: Validate inputs
    const inputs = await core.group('Validating Inputs', async () => {
      return getInputs()
    })

    // Step 2: Detect platform
    const platformInfo = await core.group('Detecting Platform', async () => {
      return detectPlatform()
    })

    // Step 3: Install OpenGrep binary
    const binaryPath = await installOpengrep(inputs.version, platformInfo)

    // Step 4: Verify signature (optional)
    if (inputs.verifySignature) {
      await verifySignature(binaryPath, inputs.version, platformInfo)
    } else {
      core.info('Signature verification skipped')
    }

    // Step 5: Run scan
    const scanResult = await runScan(binaryPath, inputs)

    // Step 6: Process results
    const metrics = await core.group('Processing Results', async () => {
      return processResults(scanResult.outputFile, inputs.outputFormat)
    })

    // Step 7: Set outputs
    setOutputs(scanResult.outputFile, scanResult.exitCode, metrics)

    // Step 8: Upload artifacts (if enabled)
    if (inputs.uploadArtifacts) {
      await uploadResultsArtifact(scanResult.outputFile, inputs.artifactName)
    }

    // Step 9: Check fail-on-findings
    checkFailOnFindings(inputs.failOnFindings, metrics)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
