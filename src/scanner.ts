import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as cp from 'child_process'
import { ActionInputs } from './inputs'

export interface ScanResult {
  exitCode: number
  outputFile: string
}

export function buildArgs(inputs: ActionInputs): string[] {
  const args: string[] = ['scan']

  // Configuration
  args.push('--config', inputs.config)

  // Output format and file
  switch (inputs.outputFormat) {
    case 'json':
      args.push('--json')
      break
    case 'sarif':
      args.push('--sarif')
      break
    case 'text':
      args.push('--text')
      break
    case 'gitlab-sast':
      args.push('--gitlab-sast')
      break
    case 'gitlab-secrets':
      args.push('--gitlab-secrets')
      break
    case 'junit-xml':
      args.push('--junit-xml')
      break
    case 'semgrep-json':
      args.push('--semgrep-json')
      break
  }
  args.push('--output', inputs.outputFile)

  // Severity
  if (inputs.severity !== 'INFO') {
    args.push('--severity', inputs.severity)
  }

  // Exclusions
  for (const pattern of inputs.exclude) {
    args.push('--exclude', pattern)
  }

  // Inclusions
  for (const pattern of inputs.include) {
    args.push('--include', pattern)
  }

  // Performance options
  if (inputs.jobs > 0) {
    args.push('-j', inputs.jobs.toString())
  }
  if (inputs.maxMemory > 0) {
    args.push('--max-memory', inputs.maxMemory.toString())
  }

  // Baseline commit (differential scanning)
  const baselineCommit = resolveBaselineCommit(inputs.baselineCommit)
  if (baselineCommit) {
    args.push('--baseline-commit', baselineCommit)
    core.notice(`Performing differential scan against baseline: ${baselineCommit}`)
  }

  // Advanced options
  if (inputs.enableMetrics) {
    args.push('--metrics')
  }
  if (inputs.verbose) {
    args.push('--verbose')
  }
  if (inputs.noGitIgnore) {
    args.push('--no-git-ignore')
  }

  // Resource limits
  args.push('--max-target-bytes', inputs.maxTargetBytes.toString())
  args.push('--timeout', inputs.timeout.toString())

  // Scan paths (must be last)
  args.push(...inputs.paths)

  return args
}

function isCommitAvailable(sha: string): boolean {
  try {
    cp.execSync(`git cat-file -t ${sha}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export function resolveBaselineCommit(inputBaseline: string): string {
  if (inputBaseline) {
    if (!isCommitAvailable(inputBaseline)) {
      core.warning(
        `Baseline commit ${inputBaseline} is not available in the local git history. ` +
          'Skipping differential scan. Use fetch-depth: 0 in actions/checkout to enable it.'
      )
      return ''
    }
    return inputBaseline
  }

  // Auto-detect for pull requests
  const context = github.context
  if (context.eventName === 'pull_request' && context.payload.pull_request) {
    const baseSha = context.payload.pull_request.base?.sha
    if (baseSha) {
      if (!isCommitAvailable(baseSha)) {
        core.warning(
          `Auto-detected baseline commit ${baseSha} is not available in the local git history. ` +
            'Skipping differential scan. Use fetch-depth: 0 in actions/checkout to enable it.'
        )
        return ''
      }
      core.notice(`Auto-detected baseline commit for PR: ${baseSha}`)
      return baseSha
    }
  }

  return ''
}

function createEmptyOutput(outputFile: string, outputFormat: string): void {
  switch (outputFormat) {
    case 'json':
    case 'semgrep-json':
      fs.writeFileSync(outputFile, '{"results": []}')
      break
    case 'sarif':
      fs.writeFileSync(
        outputFile,
        JSON.stringify({
          version: '2.1.0',
          $schema:
            'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
          runs: []
        })
      )
      break
    default:
      fs.writeFileSync(outputFile, '')
  }
}

export async function runScan(
  binaryPath: string,
  inputs: ActionInputs
): Promise<ScanResult> {
  const args = buildArgs(inputs)

  core.info('Running OpenGrep with the following command:')
  core.info(`  ${binaryPath} ${args.join(' ')}`)

  let scanExitCode = 0

  await core.group('Running OpenGrep Scan', async () => {
    scanExitCode = await exec.exec(binaryPath, args, {
      ignoreReturnCode: true
    })
  })

  // Handle exit codes:
  // 0 = no findings, 1 = findings detected, 2 = config error, 3 = timeout
  switch (scanExitCode) {
    case 0:
      core.notice('Scan completed successfully with no findings')
      break
    case 1:
      core.notice('Scan completed with findings detected')
      break
    case 2:
      throw new Error(
        `OpenGrep scan failed due to invalid configuration. Check config: ${inputs.config}, paths: ${inputs.paths.join(' ')}`
      )
    case 3:
      throw new Error(
        `OpenGrep scan timed out after ${inputs.timeout} seconds. Consider increasing the timeout or reducing scan scope.`
      )
    default:
      throw new Error(`OpenGrep scan failed with unexpected exit code: ${scanExitCode}`)
  }

  // Ensure output file exists
  if (!fs.existsSync(inputs.outputFile)) {
    core.warning(`Expected output file not found: ${inputs.outputFile}. Creating empty output.`)
    createEmptyOutput(inputs.outputFile, inputs.outputFormat)
  }

  return { exitCode: scanExitCode, outputFile: inputs.outputFile }
}
