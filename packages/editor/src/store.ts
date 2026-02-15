import { create } from 'zustand'
import type { FSPSchema, ComponentNode } from '@forgestudio/protocol'
import {
  createEmptySchema,
  createNode,
  findNodeById,
  findParentNode,
  removeNode as removeNodeFromTree,
  moveNode as moveNodeInTree,
} from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'

export interface EditorState {
  schema: FSPSchema
  selectedNodeId: string | null

  // Actions
  selectNode: (id: string | null) => void
  addNode: (parentId: string, componentName: string, index?: number) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, targetParentId: string, index: number) => void
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void
  updateNodeStyles: (nodeId: string, styles: Record<string, unknown>) => void
  exportSchema: () => FSPSchema
  importSchema: (schema: FSPSchema) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  schema: createEmptySchema(),
  selectedNodeId: null,

  selectNode: (id) => set({ selectedNodeId: id }),

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

  exportSchema: () => get().schema,

  importSchema: (schema) => set({ schema, selectedNodeId: null }),
}))
