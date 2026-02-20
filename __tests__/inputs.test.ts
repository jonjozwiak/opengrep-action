import * as core from '@actions/core'

jest.mock('@actions/core')

const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>
const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<
  typeof core.getBooleanInput
>

import { getInputs } from '../src/inputs'

function makeInputMocks(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    version: 'v1.10.2',
    config: 'auto',
    paths: '.',
    'output-format': 'json',
    'output-file': 'opengrep-results.json',
    severity: 'INFO',
    exclude: '',
    include: '',
    'max-target-bytes': '1000000',
    timeout: '1800',
    jobs: '0',
    'max-memory': '0',
    'baseline-commit': '',
    'diff-depth': '2',
    'artifact-name': 'opengrep-results',
    ...overrides
  }
  const boolDefaults: Record<string, boolean> = {
    'enable-metrics': false,
    verbose: false,
    'no-git-ignore': false,
    'verify-signature': true,
    'fail-on-findings': false,
    'upload-artifacts': true
  }
  mockGetInput.mockImplementation((name: string) => defaults[name] || '')
  mockGetBooleanInput.mockImplementation((name: string) => boolDefaults[name] ?? false)
}

describe('getInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse default inputs successfully', () => {
    makeInputMocks()
    const inputs = getInputs()
    expect(inputs.version).toBe('v1.10.2')
    expect(inputs.config).toBe('auto')
    expect(inputs.paths).toEqual(['.'])
    expect(inputs.outputFormat).toBe('json')
    expect(inputs.severity).toBe('INFO')
    expect(inputs.verifySignature).toBe(true)
    expect(inputs.failOnFindings).toBe(false)
  })

  it('should parse space-separated paths', () => {
    makeInputMocks({ paths: 'src app lib' })
    const inputs = getInputs()
    expect(inputs.paths).toEqual(['src', 'app', 'lib'])
  })

  it('should parse space-separated exclude patterns', () => {
    makeInputMocks({ exclude: 'tests node_modules vendor' })
    const inputs = getInputs()
    expect(inputs.exclude).toEqual(['tests', 'node_modules', 'vendor'])
  })

  it('should return empty array for empty exclude', () => {
    makeInputMocks({ exclude: '' })
    const inputs = getInputs()
    expect(inputs.exclude).toEqual([])
  })

  it('should reject invalid version format', () => {
    makeInputMocks({ version: 'invalid' })
    expect(() => getInputs()).toThrow('Invalid version format')
  })

  it('should reject version without v prefix', () => {
    makeInputMocks({ version: '1.10.2' })
    expect(() => getInputs()).toThrow('Invalid version format')
  })

  it('should reject invalid output format', () => {
    makeInputMocks({ 'output-format': 'xml' })
    expect(() => getInputs()).toThrow('Invalid output format')
  })

  it('should reject invalid severity', () => {
    makeInputMocks({ severity: 'CRITICAL' })
    expect(() => getInputs()).toThrow('Invalid severity')
  })

  it('should reject paths with dangerous characters', () => {
    makeInputMocks({ paths: 'src;rm -rf /' })
    expect(() => getInputs()).toThrow('dangerous characters')
  })

  it('should reject paths with dollar sign', () => {
    makeInputMocks({ paths: '$HOME/src' })
    expect(() => getInputs()).toThrow('dangerous characters')
  })

  it('should reject negative numbers', () => {
    makeInputMocks({ timeout: '-1' })
    expect(() => getInputs()).toThrow('Invalid timeout')
  })

  it('should reject non-numeric values', () => {
    makeInputMocks({ 'max-target-bytes': 'abc' })
    expect(() => getInputs()).toThrow('Invalid max-target-bytes')
  })

  it('should accept all valid output formats', () => {
    const formats = [
      'json',
      'sarif',
      'text',
      'gitlab-sast',
      'gitlab-secrets',
      'junit-xml',
      'semgrep-json'
    ]
    for (const format of formats) {
      makeInputMocks({ 'output-format': format })
      expect(() => getInputs()).not.toThrow()
    }
  })
})
