// packages/workflow-protocol/src/types.ts

/** WFP 流程协议顶层结构 */
export interface WFPSchema {
  id: string
  name: string
  description?: string
  type: 'interaction' | 'data-orchestration' | 'approval'
  version: string
  variables: WFPVariable[]
  nodes: WFPNode[]
  edges: WFPEdge[]
  meta?: {
    viewport?: { x: number; y: number; zoom: number }
    createdAt?: string
    updatedAt?: string
  }
}

export interface WFPVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  source?: 'input' | 'internal' | 'output'
  description?: string
}

export type WFPNodeType =
  | 'start'
  | 'end'
  | 'action'
  | 'condition'
  | 'parallel'
  | 'wait'
  | 'subprocess'
  | 'loop'

export interface WFPNodeBase {
  id: string
  type: WFPNodeType
  label: string
  position: { x: number; y: number }
  description?: string
}

export interface WFPStartNode extends WFPNodeBase {
  type: 'start'
  inputs?: Record<string, string>
}

export interface WFPEndNode extends WFPNodeBase {
  type: 'end'
  status?: 'success' | 'failure' | 'cancelled'
  outputs?: Record<string, string>
}

export type WFPActionType =
  | 'navigate'
  | 'showToast'
  | 'setState'
  | 'callApi'
  | 'validateForm'

export interface WFPActionNode extends WFPNodeBase {
  type: 'action'
  actionType: WFPActionType
  config: Record<string, unknown>
  outputVar?: string
}

export interface WFPConditionNode extends WFPNodeBase {
  type: 'condition'
  expression: string
}

export interface WFPParallelNode extends WFPNodeBase {
  type: 'parallel'
  mode: 'fork' | 'join'
  /** Output variable to store Promise.all results (fork mode only) */
  outputVar?: string
}

export interface WFPWaitNode extends WFPNodeBase {
  type: 'wait'
  duration?: number
  event?: string
}

export interface WFPSubprocessNode extends WFPNodeBase {
  type: 'subprocess'
  workflowId: string
  inputMapping?: Record<string, string>
}

export interface WFPLoopNode extends WFPNodeBase {
  type: 'loop'
  collection: string
  itemVar: string
  indexVar?: string
}

export type WFPNode =
  | WFPStartNode
  | WFPEndNode
  | WFPActionNode
  | WFPConditionNode
  | WFPParallelNode
  | WFPWaitNode
  | WFPSubprocessNode
  | WFPLoopNode

export interface WFPEdge {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
}
