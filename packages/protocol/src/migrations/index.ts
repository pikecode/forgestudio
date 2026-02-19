// Schema migration framework
import type { FSPSchema } from '../types'
import { migrate_1_0_to_1_1 } from './1.0.0_1.1.0'

export type MigrationFunction = (schema: FSPSchema) => FSPSchema

/**
 * Migration registry
 * Key format: "fromVersion_toVersion" (e.g., "1.0.0_1.1.0")
 */
export const migrations: Record<string, MigrationFunction> = {
  '1.0.0_1.1.0': migrate_1_0_to_1_1,
}

/**
 * Parse semver version string to comparable number
 * "1.2.3" -> 1002003
 */
function parseVersion(version: string): number {
  const parts = version.split('.').map(Number)
  return parts[0] * 1000000 + (parts[1] || 0) * 1000 + (parts[2] || 0)
}

/**
 * Get all migration paths from source version to target version
 */
function getMigrationPath(fromVersion: string, toVersion: string): string[] {
  const from = parseVersion(fromVersion)
  const to = parseVersion(toVersion)

  if (from >= to) return []

  const path: string[] = []
  const availableVersions = new Set<string>()

  // Collect all available versions from migration keys
  for (const key of Object.keys(migrations)) {
    const [fromVer, toVer] = key.split('_')
    availableVersions.add(fromVer)
    availableVersions.add(toVer)
  }

  // Sort versions
  const sortedVersions = Array.from(availableVersions)
    .map(v => ({ version: v, num: parseVersion(v) }))
    .filter(v => v.num > from && v.num <= to)
    .sort((a, b) => a.num - b.num)

  // Build migration path
  let currentVersion = fromVersion
  for (const { version } of sortedVersions) {
    const migrationKey = `${currentVersion}_${version}`
    if (migrations[migrationKey]) {
      path.push(migrationKey)
      currentVersion = version
    }
  }

  return path
}

/**
 * Migrate schema from one version to another
 * @param schema - The schema to migrate
 * @param targetVersion - Target version (default: latest)
 * @returns Migrated schema
 */
export function migrateSchema(
  schema: FSPSchema,
  targetVersion: string = '1.0.0'
): FSPSchema {
  const currentVersion = schema.version || '1.0.0'

  if (currentVersion === targetVersion) {
    return schema
  }

  const migrationPath = getMigrationPath(currentVersion, targetVersion)

  if (migrationPath.length === 0) {
    console.warn(`No migration path found from ${currentVersion} to ${targetVersion}`)
    return schema
  }

  let migratedSchema = { ...schema }

  for (const migrationKey of migrationPath) {
    const migrationFn = migrations[migrationKey]
    if (migrationFn) {
      console.log(`Applying migration: ${migrationKey}`)
      migratedSchema = migrationFn(migratedSchema)
      // Update version after each migration
      const [, toVersion] = migrationKey.split('_')
      migratedSchema.version = toVersion
    }
  }

  return migratedSchema
}

/**
 * Check if schema needs migration
 */
export function needsMigration(schema: FSPSchema, targetVersion: string = '1.0.0'): boolean {
  const currentVersion = schema.version || '1.0.0'
  return parseVersion(currentVersion) < parseVersion(targetVersion)
}
