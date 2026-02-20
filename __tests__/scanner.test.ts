jest.mock('@actions/core')
jest.mock('@actions/exec')
jest.mock('@actions/github', () => ({
  context: {
    eventName: 'push',
    payload: {}
  }
}))

import { buildArgs } from '../src/scanner'
import { ActionInputs } from '../src/inputs'

function makeInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    version: 'v1.10.2',
    config: 'auto',
    paths: ['.'],
    outputFormat: 'json',
    outputFile: 'opengrep-results.json',
    severity: 'INFO',
    exclude: [],
    include: [],
    maxTargetBytes: 1000000,
    timeout: 1800,
    jobs: 0,
    maxMemory: 0,
    baselineCommit: '',
    diffDepth: 2,
    enableMetrics: false,
    verbose: false,
    noGitIgnore: false,
    verifySignature: true,
    failOnFindings: false,
    uploadArtifacts: true,
    artifactName: 'opengrep-results',
    ...overrides
  }
}

describe('buildArgs', () => {
  it('should build basic scan command', () => {
    const args = buildArgs(makeInputs())
    expect(args[0]).toBe('scan')
    expect(args).toContain('--config')
    expect(args).toContain('auto')
    expect(args).toContain('--json')
    expect(args).toContain('--output')
    expect(args).toContain('opengrep-results.json')
    expect(args).toContain('--max-target-bytes')
    expect(args).toContain('1000000')
    expect(args).toContain('--timeout')
    expect(args).toContain('1800')
  })

  it('should use sarif format flag', () => {
    const args = buildArgs(makeInputs({ outputFormat: 'sarif' }))
    expect(args).toContain('--sarif')
    expect(args).not.toContain('--json')
  })

  it('should use text format flag', () => {
    const args = buildArgs(makeInputs({ outputFormat: 'text' }))
    expect(args).toContain('--text')
  })

  it('should use gitlab-sast format flag', () => {
    const args = buildArgs(makeInputs({ outputFormat: 'gitlab-sast' }))
    expect(args).toContain('--gitlab-sast')
  })

  it('should add severity filter when not INFO', () => {
    const args = buildArgs(makeInputs({ severity: 'ERROR' }))
    expect(args).toContain('--severity')
    expect(args).toContain('ERROR')
  })

  it('should not add severity filter for INFO', () => {
    const args = buildArgs(makeInputs({ severity: 'INFO' }))
    expect(args).not.toContain('--severity')
  })

  it('should add exclude patterns', () => {
    const args = buildArgs(makeInputs({ exclude: ['tests', 'node_modules'] }))
    const excludeIndices = args.reduce<number[]>((acc, val, idx) => {
      if (val === '--exclude') acc.push(idx)
      return acc
    }, [])
    expect(excludeIndices).toHaveLength(2)
    expect(args[excludeIndices[0] + 1]).toBe('tests')
    expect(args[excludeIndices[1] + 1]).toBe('node_modules')
  })

  it('should add include patterns', () => {
    const args = buildArgs(makeInputs({ include: ['*.js', '*.ts'] }))
    const includeIndices = args.reduce<number[]>((acc, val, idx) => {
      if (val === '--include') acc.push(idx)
      return acc
    }, [])
    expect(includeIndices).toHaveLength(2)
  })

  it('should add parallel jobs when > 0', () => {
    const args = buildArgs(makeInputs({ jobs: 4 }))
    expect(args).toContain('-j')
    expect(args).toContain('4')
  })

  it('should not add parallel jobs when 0', () => {
    const args = buildArgs(makeInputs({ jobs: 0 }))
    expect(args).not.toContain('-j')
  })

  it('should add max-memory when > 0', () => {
    const args = buildArgs(makeInputs({ maxMemory: 4096 }))
    expect(args).toContain('--max-memory')
    expect(args).toContain('4096')
  })

  it('should not add max-memory when 0', () => {
    const args = buildArgs(makeInputs({ maxMemory: 0 }))
    expect(args).not.toContain('--max-memory')
  })

  it('should add verbose flag', () => {
    const args = buildArgs(makeInputs({ verbose: true }))
    expect(args).toContain('--verbose')
  })

  it('should add metrics flag', () => {
    const args = buildArgs(makeInputs({ enableMetrics: true }))
    expect(args).toContain('--metrics')
  })

  it('should add no-git-ignore flag', () => {
    const args = buildArgs(makeInputs({ noGitIgnore: true }))
    expect(args).toContain('--no-git-ignore')
  })

  it('should add baseline commit', () => {
    const args = buildArgs(makeInputs({ baselineCommit: 'abc123' }))
    expect(args).toContain('--baseline-commit')
    expect(args).toContain('abc123')
  })

  it('should put paths at the end', () => {
    const args = buildArgs(makeInputs({ paths: ['src', 'app'] }))
    const lastTwo = args.slice(-2)
    expect(lastTwo).toEqual(['src', 'app'])
  })

  it('should handle multiple paths', () => {
    const args = buildArgs(makeInputs({ paths: ['src', 'lib', 'app'] }))
    const lastThree = args.slice(-3)
    expect(lastThree).toEqual(['src', 'lib', 'app'])
  })
})
