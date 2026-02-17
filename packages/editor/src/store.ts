import { create } from 'zustand'
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
} from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { generateTaroProject } from './codegen'

export interface EditorState {
  schema: FSPSchema
  selectedNodeId: string | null
  generatedProject: GeneratedProject | null
  rightPanelTab: 'props' | 'datasource' | 'code' | 'preview'

  // Multi-page management (M3)
  currentPageId: string | null

  // History management (M3)
  history: FSPSchema[]
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
  setRightPanelTab: (tab: 'props' | 'datasource' | 'code' | 'preview') => void
  generateCode: () => void
  addDataSource: (ds: Omit<DataSourceDef, 'id'>) => void
  updateDataSource: (id: string, updates: Partial<DataSourceDef>) => void
  removeDataSource: (id: string) => void
  addFormState: (id: string, fs: Omit<FormStateDef, 'id'>) => void
  updateFormState: (id: string, updates: Partial<FormStateDef>) => void
  removeFormState: (id: string) => void
  updateNodeEvents: (nodeId: string, eventName: string, actions: Action[]) => void
  removeNodeEvent: (nodeId: string, eventName: string) => void

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
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

// Helper function to save current state to history
function saveToHistory(state: EditorState): Partial<EditorState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(structuredClone(state.schema))

  // Limit history size
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift()
  }

  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  }
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

export const useEditorStore = create<EditorState>((set, get) => {
  const initialSchema = createEmptySchema()
  const initialPageId = initialSchema.pages?.[0]?.id ?? null

  return {
    schema: initialSchema,
    selectedNodeId: null,
    generatedProject: null,
    rightPanelTab: 'props',
    currentPageId: initialPageId,
    history: [structuredClone(initialSchema)],
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
        const schema = structuredClone(state.schema)
        const parent = findNodeById(schema.componentTree, parentId)
        if (!parent) return state
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
        syncCurrentPageTree({ ...state, schema })
        return { schema, selectedNodeId: node.id, ...saveToHistory({ ...state, schema }) }
      })
    },

    removeNode: (nodeId) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        removeNodeFromTree(schema.componentTree, nodeId)
        syncCurrentPageTree({ ...state, schema })
        return {
          schema,
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          ...saveToHistory({ ...state, schema }),
        }
      })
    },

    moveNode: (nodeId, targetParentId, index) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        moveNodeInTree(schema.componentTree, nodeId, targetParentId, index)
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateNodeProps: (nodeId, props) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node) return state
        Object.assign(node.props, props)
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateNodeStyles: (nodeId, styles) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node) return state
        Object.assign(node.styles, styles)
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateNodeLoop: (nodeId, loop) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node) return state
        node.loop = loop
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateNodeCondition: (nodeId, condition) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node) return state
        node.condition = condition
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    addDataSource: (ds) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        if (!schema.dataSources) schema.dataSources = []
        // Find next available ID to avoid collisions after deletions
        let count = schema.dataSources.length + 1
        const existingIds = new Set(schema.dataSources.map(d => d.id))
        while (existingIds.has(`ds${count}`)) count++
        const id = `ds${count}`
        schema.dataSources.push({ ...ds, id } as DataSourceDef)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateDataSource: (id, updates) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const ds = schema.dataSources?.find((d) => d.id === id)
        if (!ds) return state
        Object.assign(ds, updates)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    removeDataSource: (id) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        if (!schema.dataSources) return state
        schema.dataSources = schema.dataSources.filter((d) => d.id !== id)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    addFormState: (id, fs) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        if (!schema.formStates) schema.formStates = []
        schema.formStates.push({ ...fs, id } as FormStateDef)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateFormState: (id, updates) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const fs = schema.formStates?.find((f) => f.id === id)
        if (!fs) return state
        Object.assign(fs, updates)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    removeFormState: (id) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        if (!schema.formStates) return state
        schema.formStates = schema.formStates.filter((f) => f.id !== id)
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    updateNodeEvents: (nodeId, eventName, actions) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node) return state
        if (!node.events) node.events = {}
        node.events[eventName] = actions
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    removeNodeEvent: (nodeId, eventName) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const node = findNodeById(schema.componentTree, nodeId)
        if (!node || !node.events) return state
        delete node.events[eventName]
        syncCurrentPageTree({ ...state, schema })
        return { schema, ...saveToHistory({ ...state, schema }) }
      })
    },

    exportSchema: () => get().schema,

    importSchema: (schema) => set({ schema, selectedNodeId: null, history: [structuredClone(schema)], historyIndex: 0 }),

    // History actions (M3)
    undo: () => {
      set((state) => {
        if (state.historyIndex <= 0) return state
        const newIndex = state.historyIndex - 1
        return {
          schema: structuredClone(state.history[newIndex]),
          historyIndex: newIndex,
          selectedNodeId: null,
        }
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state
        const newIndex = state.historyIndex + 1
        return {
          schema: structuredClone(state.history[newIndex]),
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
        if (!state.clipboard) return state
        if (!state.selectedNodeId) return state

        const schema = structuredClone(state.schema)
        const selectedNode = findNodeById(schema.componentTree, state.selectedNodeId)
        if (!selectedNode) return state

        // Find parent of selected node
        const parent = findParentNode(schema.componentTree, state.selectedNodeId)
        if (!parent || !parent.children) return state

        // Clone the clipboard node with new IDs
        const clonedNode = cloneNodeWithNewIds(state.clipboard)

        // Insert after the selected node
        const selectedIndex = parent.children.findIndex(c => c.id === state.selectedNodeId)
        parent.children.splice(selectedIndex + 1, 0, clonedNode)

        syncCurrentPageTree({ ...state, schema })
        return {
          schema,
          selectedNodeId: clonedNode.id,
          ...saveToHistory({ ...state, schema })
        }
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
        if (!page) return state

        const schema = structuredClone(state.schema)

        // Save current page's componentTree back to pages array before switching
        if (state.currentPageId) {
          const currentPage = findPageById(schema, state.currentPageId)
          if (currentPage) {
            currentPage.componentTree = schema.componentTree
          }
        }

        // Load the new page's componentTree
        const targetPage = findPageById(schema, pageId)
        if (targetPage) {
          schema.componentTree = targetPage.componentTree
        }

        return {
          schema,
          currentPageId: pageId,
          selectedNodeId: null,
        }
      })
    },

    addPage: (name, title) => {
      set((state) => {
        const schema = structuredClone(state.schema)

        // Save current page's componentTree before switching
        syncCurrentPageTree({ ...state, schema })

        const newPage = createEmptyPage(name, title)
        addPageToSchema(schema, newPage)

        // Switch componentTree to the new page
        schema.componentTree = newPage.componentTree

        return {
          schema,
          currentPageId: newPage.id,
          selectedNodeId: null,
          ...saveToHistory({ ...state, schema })
        }
      })
    },

    removePage: (pageId) => {
      set((state) => {
        const schema = structuredClone(state.schema)

        // Don't allow removing the last page
        if (!schema.pages || schema.pages.length <= 1) {
          return state
        }

        const removed = removePageFromSchema(schema, pageId)
        if (!removed) return state

        // If we removed the current page, switch to the first page
        let newCurrentPageId = state.currentPageId
        if (state.currentPageId === pageId) {
          newCurrentPageId = schema.pages[0]?.id ?? null
          if (newCurrentPageId) {
            schema.componentTree = schema.pages[0].componentTree
          }
        }

        return {
          schema,
          currentPageId: newCurrentPageId,
          selectedNodeId: null,
          ...saveToHistory({ ...state, schema })
        }
      })
    },

    updatePageMeta: (pageId, updates) => {
      set((state) => {
        const schema = structuredClone(state.schema)
        const updated = updatePageInSchema(schema, pageId, updates)
        if (!updated) return state

        return {
          schema,
          ...saveToHistory({ ...state, schema })
        }
            })
    },
  }
})
