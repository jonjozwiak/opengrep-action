import * as core from '@actions/core'
import * as fs from 'fs'
import { OutputFormat } from './inputs'

export interface ScanMetrics {
  findingsCount: number | 'unknown'
  criticalCount: number | 'unknown'
}

function countJsonFindings(filePath: string): ScanMetrics {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    const results = data.results || []
    const findingsCount = results.length
    const criticalCount = results.filter((r: { extra?: { severity?: string } }) => {
      const sev = r.extra?.severity
      return sev === 'ERROR' || sev === 'CRITICAL' || sev === 'HIGH'
    }).length
    return { findingsCount, criticalCount }
  } catch (error) {
    core.warning(`Failed to parse JSON results: ${error}`)
    return { findingsCount: 0, criticalCount: 0 }
  }
}

function countSarifFindings(filePath: string): ScanMetrics {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    const runs = data.runs || []
    const allResults: Array<{ level?: string }> = []
    for (const run of runs) {
      allResults.push(...(run.results || []))
    }
    const findingsCount = allResults.length
    const criticalCount = allResults.filter(
      r => r.level === 'error' || r.level === 'warning'
    ).length
    return { findingsCount, criticalCount }
  } catch (error) {
    core.warning(`Failed to parse SARIF results: ${error}`)
    return { findingsCount: 0, criticalCount: 0 }
  }
}

export function processResults(outputFile: string, outputFormat: OutputFormat): ScanMetrics {
  if (!fs.existsSync(outputFile)) {
    core.warning(`Output file not found: ${outputFile}`)
    return { findingsCount: 0, criticalCount: 0 }
  }

  let metrics: ScanMetrics

  switch (outputFormat) {
    case 'json':
    case 'semgrep-json':
      metrics = countJsonFindings(outputFile)
      break
    case 'sarif':
      metrics = countSarifFindings(outputFile)
      break
    default:
      core.info(`Finding counts not available for ${outputFormat} format`)
      metrics = { findingsCount: 'unknown', criticalCount: 'unknown' }
  }

  core.notice(
    `Scan Results: ${metrics.findingsCount} total findings, ${metrics.criticalCount} critical/high severity`
  )

  return metrics
}

export function setOutputs(outputFile: string, scanExitCode: number, metrics: ScanMetrics): void {
  core.setOutput('results-file', outputFile)
  core.setOutput('findings-count', metrics.findingsCount.toString())
  core.setOutput('critical-count', metrics.criticalCount.toString())
  core.setOutput('scan-exit-code', scanExitCode.toString())
}

export function checkFailOnFindings(failOnFindings: boolean, metrics: ScanMetrics): void {
  if (!failOnFindings) return
  if (
    metrics.findingsCount !== 'unknown' &&
    metrics.findingsCount !== 0 &&
    metrics.findingsCount > 0
  ) {
    core.setFailed(
      `Security findings detected: ${metrics.findingsCount} findings (${metrics.criticalCount} critical/high)`
    )
  }
}
