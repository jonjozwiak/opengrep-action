import * as core from '@actions/core'

export const VALID_OUTPUT_FORMATS = [
  'json',
  'sarif',
  'text',
  'gitlab-sast',
  'gitlab-secrets',
  'junit-xml',
  'semgrep-json'
] as const

export type OutputFormat = (typeof VALID_OUTPUT_FORMATS)[number]

export const VALID_SEVERITIES = ['INFO', 'WARNING', 'ERROR'] as const
export type Severity = (typeof VALID_SEVERITIES)[number]

export interface ActionInputs {
  version: string
  config: string
  paths: string[]
  outputFormat: OutputFormat
  outputFile: string
  severity: Severity
  exclude: string[]
  include: string[]
  maxTargetBytes: number
  timeout: number
  jobs: number
  maxMemory: number
  baselineCommit: string
  diffDepth: number
  enableMetrics: boolean
  verbose: boolean
  noGitIgnore: boolean
  verifySignature: boolean
  failOnFindings: boolean
  uploadArtifacts: boolean
  artifactName: string
}

function validateVersion(version: string): void {
  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version format: ${version} (expected vX.Y.Z)`)
  }
}

function validateOutputFormat(format: string): asserts format is OutputFormat {
  if (!VALID_OUTPUT_FORMATS.includes(format as OutputFormat)) {
    throw new Error(
      `Invalid output format: ${format}. Supported: ${VALID_OUTPUT_FORMATS.join(', ')}`
    )
  }
}

function validateSeverity(severity: string): asserts severity is Severity {
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    throw new Error(`Invalid severity: ${severity}. Must be INFO, WARNING, or ERROR`)
  }
}

function parsePositiveInt(name: string, value: string): number {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) {
    throw new Error(`Invalid ${name}: ${value} (must be a non-negative integer)`)
  }
  return num
}

function parseSpaceSeparated(value: string): string[] {
  return value
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function validatePaths(paths: string[]): void {
  for (const p of paths) {
    if (/[;$`]/.test(p)) {
      throw new Error(`Path contains dangerous characters: ${p}`)
    }
  }
}

export function getInputs(): ActionInputs {
  const version = core.getInput('version')
  const config = core.getInput('config')
  const pathsRaw = core.getInput('paths')
  const outputFormat = core.getInput('output-format')
  const outputFile = core.getInput('output-file')
  const severity = core.getInput('severity')
  const excludeRaw = core.getInput('exclude')
  const includeRaw = core.getInput('include')
  const maxTargetBytesRaw = core.getInput('max-target-bytes')
  const timeoutRaw = core.getInput('timeout')
  const jobsRaw = core.getInput('jobs')
  const maxMemoryRaw = core.getInput('max-memory')
  const baselineCommit = core.getInput('baseline-commit')
  const diffDepthRaw = core.getInput('diff-depth')
  const enableMetrics = core.getBooleanInput('enable-metrics')
  const verbose = core.getBooleanInput('verbose')
  const noGitIgnore = core.getBooleanInput('no-git-ignore')
  const verifySignature = core.getBooleanInput('verify-signature')
  const failOnFindings = core.getBooleanInput('fail-on-findings')
  const uploadArtifacts = core.getBooleanInput('upload-artifacts')
  const artifactName = core.getInput('artifact-name')

  validateVersion(version)
  validateOutputFormat(outputFormat)
  validateSeverity(severity)

  const paths = parseSpaceSeparated(pathsRaw)
  validatePaths(paths)

  const exclude = parseSpaceSeparated(excludeRaw)
  const include = parseSpaceSeparated(includeRaw)
  const maxTargetBytes = parsePositiveInt('max-target-bytes', maxTargetBytesRaw)
  const timeout = parsePositiveInt('timeout', timeoutRaw)
  const jobs = parsePositiveInt('jobs', jobsRaw)
  const maxMemory = parsePositiveInt('max-memory', maxMemoryRaw)
  const diffDepth = parsePositiveInt('diff-depth', diffDepthRaw)

  core.info('✓ All inputs validated successfully')

  return {
    version,
    config,
    paths,
    outputFormat: outputFormat as OutputFormat,
    outputFile,
    severity: severity as Severity,
    exclude,
    include,
    maxTargetBytes,
    timeout,
    jobs,
    maxMemory,
    baselineCommit,
    diffDepth,
    enableMetrics,
    verbose,
    noGitIgnore,
    verifySignature,
    failOnFindings,
    uploadArtifacts,
    artifactName
  }
}
