jest.mock('@actions/core')

// Only mock specific fs functions, not the whole module
const actualFs = jest.requireActual('fs')
jest.mock('fs', () => ({
  ...actualFs,
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}))

import * as fs from 'fs'

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>

import { processResults, checkFailOnFindings } from '../src/results'
import * as core from '@actions/core'

describe('processResults', () => {
  it('should count JSON findings correctly', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        results: [
          { extra: { severity: 'ERROR' } },
          { extra: { severity: 'WARNING' } },
          { extra: { severity: 'ERROR' } }
        ]
      })
    )
    const metrics = processResults('results.json', 'json')
    expect(metrics.findingsCount).toBe(3)
    expect(metrics.criticalCount).toBe(2)
  })

  it('should count HIGH severity as critical', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        results: [{ extra: { severity: 'HIGH' } }, { extra: { severity: 'INFO' } }]
      })
    )
    const metrics = processResults('results.json', 'json')
    expect(metrics.findingsCount).toBe(2)
    expect(metrics.criticalCount).toBe(1)
  })

  it('should count SARIF findings correctly', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        runs: [
          {
            results: [{ level: 'error' }, { level: 'warning' }, { level: 'note' }]
          }
        ]
      })
    )
    const metrics = processResults('results.sarif', 'sarif')
    expect(metrics.findingsCount).toBe(3)
    expect(metrics.criticalCount).toBe(2)
  })

  it('should handle multiple SARIF runs', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        runs: [
          { results: [{ level: 'error' }] },
          { results: [{ level: 'warning' }, { level: 'note' }] }
        ]
      })
    )
    const metrics = processResults('results.sarif', 'sarif')
    expect(metrics.findingsCount).toBe(3)
    expect(metrics.criticalCount).toBe(2)
  })

  it('should return unknown for text format', () => {
    mockExistsSync.mockReturnValue(true)
    const metrics = processResults('results.txt', 'text')
    expect(metrics.findingsCount).toBe('unknown')
    expect(metrics.criticalCount).toBe('unknown')
  })

  it('should return unknown for gitlab-sast format', () => {
    mockExistsSync.mockReturnValue(true)
    const metrics = processResults('results.json', 'gitlab-sast')
    expect(metrics.findingsCount).toBe('unknown')
  })

  it('should return 0 when file not found', () => {
    mockExistsSync.mockReturnValue(false)
    const metrics = processResults('missing.json', 'json')
    expect(metrics.findingsCount).toBe(0)
    expect(metrics.criticalCount).toBe(0)
  })

  it('should handle malformed JSON gracefully', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not valid json')
    const metrics = processResults('bad.json', 'json')
    expect(metrics.findingsCount).toBe(0)
    expect(metrics.criticalCount).toBe(0)
  })

  it('should handle empty results array', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify({ results: [] }))
    const metrics = processResults('empty.json', 'json')
    expect(metrics.findingsCount).toBe(0)
    expect(metrics.criticalCount).toBe(0)
  })

  it('should work with semgrep-json format (same as json)', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ results: [{ extra: { severity: 'ERROR' } }] })
    )
    const metrics = processResults('results.json', 'semgrep-json')
    expect(metrics.findingsCount).toBe(1)
    expect(metrics.criticalCount).toBe(1)
  })
})

describe('checkFailOnFindings', () => {
  it('should not fail when disabled', () => {
    checkFailOnFindings(false, { findingsCount: 5, criticalCount: 2 })
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail when enabled and findings exist', () => {
    checkFailOnFindings(true, { findingsCount: 5, criticalCount: 2 })
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('5 findings'))
  })

  it('should include critical count in failure message', () => {
    checkFailOnFindings(true, { findingsCount: 3, criticalCount: 1 })
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('1 critical/high'))
  })

  it('should not fail when enabled but no findings', () => {
    checkFailOnFindings(true, { findingsCount: 0, criticalCount: 0 })
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should not fail when count is unknown', () => {
    checkFailOnFindings(true, { findingsCount: 'unknown', criticalCount: 'unknown' })
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
