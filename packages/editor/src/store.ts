import { create } from 'zustand'
import type { FSPSchema, ComponentNode, DataSourceDef } from '@forgestudio/protocol'
import type { GeneratedProject } from '@forgestudio/codegen-core'
import {
  createEmptySchema,
  createNode,
  findNodeById,
  findParentNode,
  removeNode as removeNodeFromTree,
  moveNode as moveNodeInTree,
} from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { generateTaroProject } from './codegen'

export interface EditorState {
  schema: FSPSchema
  selectedNodeId: string | null
  generatedProject: GeneratedProject | null
  rightPanelTab: 'props' | 'datasource' | 'code'

  // Actions
  selectNode: (id: string | null) => void
  addNode: (parentId: string, componentName: string, index?: number) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetParentId: string, index: number) => void
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
  updateNodeStyles: (nodeId: string, styles: Record<string, unknown>) => void
  updateNodeLoop: (nodeId: string, loop: ComponentNode['loop']) => void
  exportSchema: () => FSPSchema
  importSchema: (schema: FSPSchema) => void
  setRightPanelTab: (tab: 'props' | 'datasource' | 'code') => void
  generateCode: () => void
  addDataSource: (ds: Omit<DataSourceDef, 'id'>) => void
  updateDataSource: (id: string, updates: Partial<DataSourceDef>) => void
  removeDataSource: (id: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  schema: createEmptySchema(),
  selectedNodeId: null,
  generatedProject: null,
  rightPanelTab: 'props',

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
      return { schema, selectedNodeId: node.id }
    })
  },

  removeNode: (nodeId) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      removeNodeFromTree(schema.componentTree, nodeId)
      return {
        schema,
        selectedNodeId:
          state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      }
    })
  },

  moveNode: (nodeId, targetParentId, index) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      moveNodeInTree(schema.componentTree, nodeId, targetParentId, index)
      return { schema }
    })
  },

  updateNodeProps: (nodeId, props) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      const node = findNodeById(schema.componentTree, nodeId)
      if (!node) return state
      Object.assign(node.props, props)
      return { schema }
    })
  },

  updateNodeStyles: (nodeId, styles) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      const node = findNodeById(schema.componentTree, nodeId)
      if (!node) return state
      Object.assign(node.styles, styles)
      return { schema }
    })
  },

  updateNodeLoop: (nodeId, loop) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      const node = findNodeById(schema.componentTree, nodeId)
      if (!node) return state
      node.loop = loop
      return { schema }
    })
  },

  addDataSource: (ds) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      if (!schema.dataSources) schema.dataSources = []
      const count = schema.dataSources.length + 1
      const id = `ds${count}`
      schema.dataSources.push({ ...ds, id } as DataSourceDef)
      return { schema }
    })
  },

  updateDataSource: (id, updates) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      const ds = schema.dataSources?.find((d) => d.id === id)
      if (!ds) return state
      Object.assign(ds, updates)
      return { schema }
    })
  },

  removeDataSource: (id) => {
    set((state) => {
      const schema = structuredClone(state.schema)
      if (!schema.dataSources) return state
      schema.dataSources = schema.dataSources.filter((d) => d.id !== id)
      return { schema }
    })
  },

  exportSchema: () => get().schema,

  importSchema: (schema) => set({ schema, selectedNodeId: null }),
}))
