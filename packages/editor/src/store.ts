import { create, type StoreApi, type UseBoundStore, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { current } from 'immer'
import type { FSPSchema, ComponentNode, DataSourceDef, Action, FormStateDef, PageDef } from '@forgestudio/protocol'
import type { GeneratedProject } from '@forgestudio/codegen-core'
import {
  createEmptySchema,
  createNode,
  findNodeById,
  findParentNode,
  removeNode as removeNodeFromTree,
  moveNode as moveNodeInTree,
  createEmptyPage,
  findPageById,
  addPage as addPageToSchema,
  removePage as removePageFromSchema,
  updatePage as updatePageInSchema,
  addDataSourceToPage,
  removeDataSourceFromPage,
  updateDataSourceInPage,
  addFormStateToPage,
  removeFormStateFromPage,
  updateFormStateInPage,
  addGlobalDataSource,
  removeGlobalDataSource,
  updateGlobalDataSource,
  getEffectiveDataSources,
  togglePageGlobalDataSourceRef,
} from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { generateTaroProject } from './codegen'

export interface HistoryEntry {
  schema: FSPSchema
  currentPageId: string | null
}

export interface EditorState {
  schema: FSPSchema
  selectedNodeId: string | null
  generatedProject: GeneratedProject | null
  rightPanelTab: 'props' | 'datasource' | 'code'

  // Multi-page management (M3)
  currentPageId: string | null

  // History management (M3)
  history: HistoryEntry[]
  historyIndex: number

  // Clipboard (M3)
  clipboard: ComponentNode | null

  // Actions
  selectNode: (id: string | null) => void
  addNode: (parentId: string, componentName: string, index?: number) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetParentId: string, index: number) => void
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
  updateNodeStyles: (nodeId: string, styles: Record<string, unknown>) => void
  updateNodeLoop: (nodeId: string, loop: ComponentNode['loop']) => void
  updateNodeCondition: (nodeId: string, condition: ComponentNode['condition']) => void
  exportSchema: () => FSPSchema
  importSchema: (schema: FSPSchema) => void
  setRightPanelTab: (tab: 'props' | 'datasource' | 'code') => void
  generateCode: () => void
  addDataSource: (ds: Omit<DataSourceDef, 'id'>) => void
  updateDataSource: (id: string, updates: Partial<DataSourceDef>) => void
  removeDataSource: (id: string) => void
  addFormState: (id: string, fs: Omit<FormStateDef, 'id'>) => void
  updateFormState: (id: string, updates: Partial<FormStateDef>) => void
  removeFormState: (id: string) => void
  updateNodeEvents: (nodeId: string, eventName: string, actions: Action[]) => void
  removeNodeEvent: (nodeId: string, eventName: string) => void

  // Global data source actions (Area 2)
  addGlobalDataSource: (ds: Omit<DataSourceDef, 'id'>) => void
  updateGlobalDataSource: (id: string, updates: Partial<DataSourceDef>) => void
  removeGlobalDataSource: (id: string) => void
  togglePageGlobalDataSourceRef: (dataSourceId: string) => void

  // History actions (M3)
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Copy/Paste actions (M3)
  copyNode: (nodeId: string) => void
  pasteNode: () => void
  canPaste: () => boolean

  // Multi-page actions (M3)
  getCurrentPage: () => PageDef | null
  setCurrentPage: (pageId: string) => void
  addPage: (name: string, title: string) => void
  removePage: (pageId: string) => void
  updatePageMeta: (pageId: string, updates: Partial<Pick<PageDef, 'name' | 'title' | 'path'>>) => void
}

// History management constants
const MAX_HISTORY_SIZE = 50

// Helper function to generate unique IDs
function generateUniqueId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Helper function to clone node with new IDs
function cloneNodeWithNewIds(node: ComponentNode): ComponentNode {
  const cloned: ComponentNode = {
    ...structuredClone(node),
    id: generateUniqueId(),
  }

  if (cloned.children && cloned.children.length > 0) {
    cloned.children = cloned.children.map(child => cloneNodeWithNewIds(child))
  }

  return cloned
}

// Helper function to save current state to history (mutates draft directly)
function pushHistory(state: EditorState): void {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push({
    schema: current(state).schema,
    currentPageId: state.currentPageId,
  })

  // Limit history size
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift()
  }

  state.history = newHistory
  state.historyIndex = newHistory.length - 1
}

// Helper function to sync componentTree changes back to pages array
function syncCurrentPageTree(state: EditorState): void {
  if (state.currentPageId && state.schema.pages) {
    const currentPage = state.schema.pages.find(p => p.id === state.currentPageId)
    if (currentPage) {
      currentPage.componentTree = state.schema.componentTree
    }
  }
}

const storeCreator: StateCreator<EditorState, [['zustand/immer', never]], []> = (set, get) => {
  const initialSchema = createEmptySchema()
  const initialPageId = initialSchema.pages?.[0]?.id ?? null

  return {
    schema: initialSchema,
    selectedNodeId: null,
    generatedProject: null,
    rightPanelTab: 'props',
    currentPageId: initialPageId,
    history: [{ schema: structuredClone(initialSchema), currentPageId: initialPageId }],
    historyIndex: 0,
    clipboard: null,

    selectNode: (id) => set({ selectedNodeId: id }),

    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

    generateCode: () => {
      const schema = get().schema
      const project = generateTaroProject(schema)
      set({ generatedProject: project, rightPanelTab: 'code' })
    },

    addNode: (parentId, componentName, index) => {
      set((state) => {
        const parent = findNodeById(state.schema.componentTree, parentId)
        if (!parent) return
        if (!parent.children) parent.children = []

        const meta = getComponentMeta(componentName)
        const node = createNode(
          componentName,
          meta ? { ...meta.defaultProps } : {},
          meta ? { ...meta.defaultStyles } : {},
        )

        // Add default children for List and Card
        if (componentName === 'List') {
          // List gets a Card with Text children showing expression binding
          const cardMeta = getComponentMeta('Card')
          const textMeta = getComponentMeta('Text')
          const card = createNode(
            'Card',
            cardMeta ? { ...cardMeta.defaultProps } : {},
            cardMeta ? { ...cardMeta.defaultStyles } : {},
          )
          const titleText = createNode(
            'Text',
            { content: '{{$item.title}}', ...(textMeta?.defaultProps || {}) },
            { fontSize: 16, fontWeight: 'bold', marginBottom: 4, ...(textMeta?.defaultStyles || {}) },
          )
          const descText = createNode(
            'Text',
            { content: '{{$item.description}}', ...(textMeta?.defaultProps || {}) },
            { fontSize: 14, color: '#666', ...(textMeta?.defaultStyles || {}) },
          )
          card.children = [titleText, descText]
          node.children = [card]
        } else if (componentName === 'Card') {
          // Card gets a Text child
          const textMeta = getComponentMeta('Text')
          const text = createNode(
            'Text',
            { content: '卡片内容', ...(textMeta?.defaultProps || {}) },
            textMeta ? { ...textMeta.defaultStyles } : {},
          )
          node.children = [text]
        }

        const i = index ?? parent.children.length
        parent.children.splice(i, 0, node)
        syncCurrentPageTree(state)
        state.selectedNodeId = node.id
        pushHistory(state)
      })
    },

    removeNode: (nodeId) => {
      set((state) => {
        removeNodeFromTree(state.schema.componentTree, nodeId)
        syncCurrentPageTree(state)
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null
        }
        pushHistory(state)
      })
    },

    moveNode: (nodeId, targetParentId, index) => {
      set((state) => {
        moveNodeInTree(state.schema.componentTree, nodeId, targetParentId, index)
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    updateNodeProps: (nodeId, props) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node) return
        Object.assign(node.props, props)
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    updateNodeStyles: (nodeId, styles) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node) return
        Object.assign(node.styles, styles)
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    updateNodeLoop: (nodeId, loop) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node) return
        node.loop = loop
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    updateNodeCondition: (nodeId, condition) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node) return
        node.condition = condition
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    addDataSource: (ds) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        // Use label as ID (convert to camelCase, preserve Chinese)
        const baseName = ds.label || 'dataSource'
        const camelCaseId = baseName
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')  // Keep Chinese characters

        // Fallback to timestamp if ID is empty (e.g., all special chars)
        const finalId = camelCaseId || `ds_${Date.now()}`

        // Ensure uniqueness by adding suffix if needed
        const existingIds = new Set(currentPage.dataSources?.map(d => d.id) ?? [])
        let id = finalId
        let suffix = 1
        while (existingIds.has(id)) {
          id = `${finalId}${suffix}`
          suffix++
        }

        addDataSourceToPage(currentPage, { ...ds, id } as DataSourceDef)
        pushHistory(state)
      })
    },

    updateDataSource: (id, updates) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        const success = updateDataSourceInPage(currentPage, id, updates)
        if (!success) return
        pushHistory(state)
      })
    },

    removeDataSource: (id) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        const success = removeDataSourceFromPage(currentPage, id)
        if (!success) return
        pushHistory(state)
      })
    },

    addFormState: (id, fs) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        addFormStateToPage(currentPage, { ...fs, id } as FormStateDef)
        pushHistory(state)
      })
    },

    updateFormState: (id, updates) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        const success = updateFormStateInPage(currentPage, id, updates)
        if (!success) return
        pushHistory(state)
      })
    },

    removeFormState: (id) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        const success = removeFormStateFromPage(currentPage, id)
        if (!success) return
        pushHistory(state)
      })
    },

    // Global DataSource actions (Area 2)
    addGlobalDataSource: (ds) => {
      set((state) => {
        const baseName = ds.label || 'dataSource'
        const camelCaseId = baseName
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')

        const finalId = camelCaseId || `ds_${Date.now()}`

        const existingIds = new Set(state.schema.globalDataSources?.map(d => d.id) ?? [])
        let id = finalId
        let suffix = 1
        while (existingIds.has(id)) {
          id = `${finalId}${suffix}`
          suffix++
        }

        addGlobalDataSource(state.schema, { ...ds, id } as DataSourceDef)
        pushHistory(state)
      })
    },

    updateGlobalDataSource: (id, updates) => {
      set((state) => {
        const success = updateGlobalDataSource(state.schema, id, updates)
        if (!success) return
        pushHistory(state)
      })
    },

    removeGlobalDataSource: (id) => {
      set((state) => {
        const success = removeGlobalDataSource(state.schema, id)
        if (!success) return
        // Also remove references from all pages
        if (state.schema.pages) {
          for (const page of state.schema.pages) {
            if (page.globalDataSourceRefs) {
              page.globalDataSourceRefs = page.globalDataSourceRefs.filter(refId => refId !== id)
            }
          }
        }
        pushHistory(state)
      })
    },

    togglePageGlobalDataSourceRef: (dsId: string) => {
      set((state) => {
        if (!state.currentPageId) return
        const currentPage = findPageById(state.schema, state.currentPageId)
        if (!currentPage) return

        togglePageGlobalDataSourceRef(currentPage, dsId)
        pushHistory(state)
      })
    },

    updateNodeEvents: (nodeId, eventName, actions) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node) return
        if (!node.events) node.events = {}
        node.events[eventName] = actions
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    removeNodeEvent: (nodeId, eventName) => {
      set((state) => {
        const node = findNodeById(state.schema.componentTree, nodeId)
        if (!node || !node.events) return
        delete node.events[eventName]
        syncCurrentPageTree(state)
        pushHistory(state)
      })
    },

    exportSchema: () => get().schema,

    importSchema: (schema) => {
      const pageId = schema.pages?.[0]?.id ?? null
      const importedSchema = structuredClone(schema)

      // Migrate legacy global dataSources/formStates to first page (M4)
      if (importedSchema.pages && importedSchema.pages.length > 0) {
        if (importedSchema.dataSources && importedSchema.dataSources.length > 0) {
          importedSchema.pages[0].dataSources = importedSchema.dataSources
          delete importedSchema.dataSources
        }
        if (importedSchema.formStates && importedSchema.formStates.length > 0) {
          importedSchema.pages[0].formStates = importedSchema.formStates
          delete importedSchema.formStates
        }
      }

      // Migrate mockData → sampleData (M5 backward compatibility)
      if (importedSchema.pages) {
        for (const page of importedSchema.pages) {
          if (page.dataSources) {
            for (const ds of page.dataSources) {
              if (ds.mockData && !ds.sampleData) {
                // Backward compatibility: convert mockData to sampleData
                ds.sampleData = Array.isArray(ds.mockData) ? ds.mockData : [ds.mockData]
                delete ds.mockData
              }
              // Set default purpose if missing
              if (!ds.purpose) {
                ds.purpose = 'query'
              }
            }
          }
        }
      }

      // Load first page's componentTree into schema.componentTree
      if (pageId && schema.pages?.[0]) {
        importedSchema.componentTree = structuredClone(schema.pages[0].componentTree)
      }

      set({
        schema: importedSchema,
        selectedNodeId: null,
        currentPageId: pageId,
        history: [{ schema: structuredClone(importedSchema), currentPageId: pageId }],
        historyIndex: 0,
      })
    },

    // History actions (M3)
    undo: () => {
      set((state) => {
        if (state.historyIndex <= 0) return state
        const newIndex = state.historyIndex - 1
        const entry = state.history[newIndex]
        // Immer will handle immutability, no need for structuredClone
        return {
          schema: entry.schema,
          currentPageId: entry.currentPageId,
          historyIndex: newIndex,
          selectedNodeId: null,
        }
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state
        const newIndex = state.historyIndex + 1
        const entry = state.history[newIndex]
        // Immer will handle immutability, no need for structuredClone
        return {
          schema: entry.schema,
          currentPageId: entry.currentPageId,
          historyIndex: newIndex,
          selectedNodeId: null,
        }
      })
    },

    canUndo: () => {
      const state = get()
      return state.historyIndex > 0
    },

    canRedo: () => {
      const state = get()
      return state.historyIndex < state.history.length - 1
    },

    // Copy/Paste actions (M3)
    copyNode: (nodeId) => {
      const state = get()
      const node = findNodeById(state.schema.componentTree, nodeId)
      if (!node || node.component === 'Page') {
        // Cannot copy Page node
        return
      }
      set({ clipboard: structuredClone(node) })
    },

    pasteNode: () => {
      set((state) => {
        if (!state.clipboard) return
        if (!state.selectedNodeId) return

        const selectedNode = findNodeById(state.schema.componentTree, state.selectedNodeId)
        if (!selectedNode) return

        // Find parent of selected node
        const parent = findParentNode(state.schema.componentTree, state.selectedNodeId)
        if (!parent || !parent.children) return

        // Clone the clipboard node with new IDs
        const clonedNode = cloneNodeWithNewIds(state.clipboard)

        // Insert after the selected node
        const selectedIndex = parent.children.findIndex(c => c.id === state.selectedNodeId)
        parent.children.splice(selectedIndex + 1, 0, clonedNode)

        syncCurrentPageTree(state)
        state.selectedNodeId = clonedNode.id
        pushHistory(state)
      })
    },

    canPaste: () => {
      const state = get()
      return state.clipboard !== null && state.selectedNodeId !== null
    },

    // Multi-page actions (M3)
    getCurrentPage: () => {
      const state = get()
      if (!state.currentPageId) return null
      return findPageById(state.schema, state.currentPageId)
    },

    setCurrentPage: (pageId) => {
      set((state) => {
        const page = findPageById(state.schema, pageId)
        if (!page) return

        // Save current page's componentTree back to pages array before switching
        if (state.currentPageId) {
          const currentPage = findPageById(state.schema, state.currentPageId)
          if (currentPage) {
            currentPage.componentTree = state.schema.componentTree
          }
        }

        // Load the new page's componentTree
        const targetPage = findPageById(state.schema, pageId)
        if (targetPage) {
          state.schema.componentTree = targetPage.componentTree
        }

        state.currentPageId = pageId
        state.selectedNodeId = null
      })
    },

    addPage: (name, title) => {
      set((state) => {
        // Save current page's componentTree before switching
        syncCurrentPageTree(state)

        const newPage = createEmptyPage(name, title)
        addPageToSchema(state.schema, newPage)

        // Switch componentTree to the new page
        state.schema.componentTree = newPage.componentTree

        state.currentPageId = newPage.id
        state.selectedNodeId = null
        pushHistory(state)
      })
    },

    removePage: (pageId) => {
      set((state) => {
        // Don't allow removing the last page
        if (!state.schema.pages || state.schema.pages.length <= 1) {
          return
        }

        const removed = removePageFromSchema(state.schema, pageId)
        if (!removed) return

        // If we removed the current page, switch to the first page
        if (state.currentPageId === pageId) {
          state.currentPageId = state.schema.pages[0]?.id ?? null
          if (state.currentPageId) {
            state.schema.componentTree = state.schema.pages[0].componentTree
          }
        }

        state.selectedNodeId = null
        pushHistory(state)
      })
    },

    updatePageMeta: (pageId, updates) => {
      set((state) => {
        const updated = updatePageInSchema(state.schema, pageId, updates)
        if (!updated) return

        pushHistory(state)
      })
    },
  }
}

export const useEditorStore: UseBoundStore<StoreApi<EditorState>> = create<EditorState>()(
  persist(
    immer(storeCreator),
    {
      name: 'forgestudio-editor',
      partialize: (state) => ({
        schema: state.schema,
        currentPageId: state.currentPageId,
      } as unknown as EditorState),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<EditorState> | undefined
        if (!persisted?.schema) return currentState
        return {
          ...currentState,
          schema: persisted.schema,
          currentPageId: persisted.currentPageId ?? null,
          // Reset history from restored schema
          history: [{ schema: structuredClone(persisted.schema), currentPageId: persisted.currentPageId ?? null }],
          historyIndex: 0,
        }
      },
    }
  )
)
