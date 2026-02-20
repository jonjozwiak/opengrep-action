# OpenGrep Action

A modern TypeScript GitHub Action for running [OpenGrep](https://github.com/opengrep/opengrep) static analysis security testing with configurable rules, multiple output formats, and binary signature verification.

[![CI](https://github.com/jonjozwiak/opengrep-action/actions/workflows/ci.yml/badge.svg)](https://github.com/jonjozwiak/opengrep-action/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-red)](LICENSE)

## Features

- **TypeScript Implementation** — Type-safe, well-tested, modern codebase
- **Fast Setup** — Automatic binary download with `@actions/tool-cache` caching
- **Security-First** — Cosign signature verification for binary integrity
- **Multiple Outputs** — JSON, SARIF, text, GitLab SAST/Secrets, JUnit XML
- **Git-Aware Scanning** — Differential scanning with automatic PR baseline detection
- **GitHub Advanced Security** — SARIF output compatible with `github/codeql-action/upload-sarif`
- **Highly Configurable** — 21 input parameters for complete control

## Quick Start

```yaml
- name: OpenGrep Security Scan
  uses: jonjozwiak/opengrep-action@v1
  with:
    paths: 'src'
    output-format: 'sarif'
    output-file: 'opengrep.sarif'

- name: Upload SARIF to GitHub Advanced Security
  uses: github/codeql-action/upload-sarif@v4
  if: always()
  with:
    sarif_file: opengrep.sarif
```

## Usage Examples

### Basic Security Scan

```yaml
name: Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Run OpenGrep
        uses: jonjozwiak/opengrep-action@v1
        with:
          paths: 'src app lib'
          output-format: 'sarif'
          output-file: 'opengrep.sarif'
          severity: 'WARNING'

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: opengrep.sarif
```

### PR Differential Scanning

```yaml
- name: PR Security Check
  uses: jonjozwiak/opengrep-action@v1
  with:
    paths: 'src'
    severity: 'ERROR'
    output-format: 'json'
    fail-on-findings: 'true'
    # Baseline commit is auto-detected from PR base
```

### Custom Rules

```yaml
- name: Custom Rule Scan
  uses: jonjozwiak/opengrep-action@v1
  with:
    config: '.github/security/custom-rules.yml'
    paths: 'src api'
    output-format: 'json'
```

### Advanced Configuration

```yaml
- name: Comprehensive Scan
  uses: jonjozwiak/opengrep-action@v1
  with:
    version: 'v1.16.1'
    config: 'auto'
    paths: 'src app'
    output-format: 'sarif'
    output-file: 'security-results.sarif'
    severity: 'WARNING'
    exclude: 'tests node_modules'
    timeout: '1800'
    jobs: '4'
    max-memory: '4096'
    verify-signature: 'true'
    fail-on-findings: 'true'
    upload-artifacts: 'true'
    artifact-name: 'security-scan'
```

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | string | `v1.16.1` | OpenGrep version to use |
| `config` | string | `auto` | Rule configuration: 'auto', file path, or rule content |
| `paths` | string | `.` | Space-separated paths to scan |
| `output-format` | string | `json` | Output format (see below) |
| `output-file` | string | `opengrep-results.json` | Output file path |
| `severity` | string | `INFO` | Minimum severity: INFO, WARNING, ERROR |
| `exclude` | string | | Space-separated exclusion patterns |
| `include` | string | | Space-separated inclusion patterns |
| `max-target-bytes` | string | `1000000` | Maximum file size to scan (bytes) |
| `timeout` | string | `1800` | Scan timeout in seconds |
| `jobs` | string | `0` | Parallel jobs (0 = auto-detect) |
| `max-memory` | string | `0` | Max memory in MB (0 = unlimited) |
| `baseline-commit` | string | | Git commit for differential scanning |
| `diff-depth` | string | `2` | Git diff depth |
| `enable-metrics` | boolean | `false` | Enable anonymous metrics |
| `verbose` | boolean | `false` | Enable verbose output |
| `no-git-ignore` | boolean | `false` | Ignore .gitignore files |
| `verify-signature` | boolean | `true` | Verify binary with Cosign |
| `fail-on-findings` | boolean | `false` | Fail if findings detected |
| `upload-artifacts` | boolean | `true` | Upload results as artifacts |
| `artifact-name` | string | `opengrep-results` | Artifact name |

### Output Formats

| Format | Use Case |
|--------|----------|
| `json` | General purpose, automation |
| `sarif` | GitHub Advanced Security |
| `text` | Human-readable debugging |
| `gitlab-sast` | GitLab Security Dashboard |
| `gitlab-secrets` | GitLab Secret Detection |
| `junit-xml` | CI/CD test reporting |
| `semgrep-json` | Legacy Semgrep compatibility |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `results-file` | string | Path to the results file |
| `findings-count` | string | Total findings detected |
| `critical-count` | string | Critical/high severity count |
| `scan-exit-code` | string | OpenGrep exit code (0=none, 1=findings, 2=error, 3=timeout) |

## GitHub Advanced Security Integration

To upload results to the GitHub Security tab, use the official `github/codeql-action/upload-sarif` action:

```yaml
name: Opengrep Scan
on:  
  workflow_dispatch: 		# Allow manual trigger
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '42 12 * * 0'	# Run weekly at 12:42 on Sundays
 

jobs:
  security:
    runs-on: ubuntu-latest
    permissions:
      actions: read           # workflow run telemetry
      contents: read          # Required to checkout and read repo files
      security-events: write  # Required to upload SARIF files to Security tab
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        with:
         fetch-depth: 0       # Fetch full history for baseline diff

      - name: Run OpenGrep scan
        uses: jonjozwiak/opengrep-action@v1
        with:
          version: 'v1.16.1'
          output-format: 'sarif'
          output-file: 'opengrep-results.sarif'
          timeout: '3600'              # 1 hour
          max-target-bytes: '5000000'  # Increase file size limit
          severity: 'ERROR'            # ERROR, WARNING, or INFO
          fail-on-findings: 'true'     # Fail on new vulnerabilities

      - name: Upload OpenGrep scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v4
        # if: always()   ## Add this if you want CodeQL alerts generated when blocking on failures
        with:
          sarif_file: 'opengrep-results.sarif'
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Full check (format + lint + test + build)
npm run all
```

## License

MIT License — see [LICENSE](LICENSE) for details.
