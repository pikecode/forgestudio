// Migration from 1.0.0 to 1.1.0
// Changes:
// - Ensure pages[].componentTree is the source of truth
// - Remove deprecated global dataSources and formStates if they've been migrated

import type { FSPSchema } from '../types'

export function migrate_1_0_to_1_1(schema: FSPSchema): FSPSchema {
  const migrated = { ...schema }

  // Ensure version is set
  migrated.version = '1.1.0'

  // If pages exist, ensure each page has its own componentTree
  if (migrated.pages && migrated.pages.length > 0) {
    migrated.pages = migrated.pages.map(page => ({
      ...page,
      // Ensure componentTree exists
      componentTree: page.componentTree || { id: 'root', component: 'Page', props: {}, styles: {}, children: [] },
    }))

    // Clear deprecated global componentTree if all pages have their own trees
    if (migrated.pages.every(p => p.componentTree)) {
      // Keep it for backward compatibility but mark it as deprecated
      // Don't delete it to avoid breaking older editor versions
    }
  }

  // Migrate global dataSources to first page if they haven't been migrated yet
  if (migrated.dataSources && migrated.dataSources.length > 0 && migrated.pages && migrated.pages.length > 0) {
    const firstPage = migrated.pages[0]
    if (!firstPage.dataSources || firstPage.dataSources.length === 0) {
      firstPage.dataSources = migrated.dataSources
      // Clear global dataSources after migration
      migrated.dataSources = []
    }
  }

  // Migrate global formStates to first page if they haven't been migrated yet
  if (migrated.formStates && migrated.formStates.length > 0 && migrated.pages && migrated.pages.length > 0) {
    const firstPage = migrated.pages[0]
    if (!firstPage.formStates || firstPage.formStates.length === 0) {
      firstPage.formStates = migrated.formStates
      // Clear global formStates after migration
      migrated.formStates = []
    }
  }

  return migrated
}
