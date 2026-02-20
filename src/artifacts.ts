import * as core from '@actions/core'
import * as artifact from '@actions/artifact'
import * as fs from 'fs'
import * as path from 'path'

export async function uploadResultsArtifact(
  outputFile: string,
  artifactName: string
): Promise<void> {
  if (!fs.existsSync(outputFile)) {
    core.warning(`Output file not found for artifact upload: ${outputFile}`)
    return
  }

  await core.group('Uploading Results Artifact', async () => {
    try {
      const artifactClient = new artifact.DefaultArtifactClient()
      const rootDir = path.dirname(path.resolve(outputFile))
      const absolutePath = path.resolve(outputFile)

      const { id, size } = await artifactClient.uploadArtifact(
        artifactName,
        [absolutePath],
        rootDir,
        { retentionDays: 30 }
      )

      core.info(`✓ Artifact uploaded: ${artifactName} (ID: ${id}, Size: ${size} bytes)`)
    } catch (error) {
      core.warning(`Failed to upload artifact: ${error}`)
    }
  })
}
