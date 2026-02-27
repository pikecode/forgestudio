# Phase 1 工作流编排实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 ForgeStudio 添加可视化页面交互流程编排能力，替代线性 Action[] 动作列表

**Architecture:** 新增 `workflow-protocol`（类型定义）、`workflow-editor`（LogicFlow 可视化编辑器）、`codegen-workflow`（代码生成）三个包，修改现有 `protocol` 包和 `editor` 包以集成。流程定义序列化为 WFP JSON 嵌入 `FSPSchema.workflows` 字段。

**Tech Stack:** TypeScript, React 18, LogicFlow (`@logicflow/core` `@logicflow/extension`), Zustand, pnpm workspaces, Turborepo

---

### Task 1: 创建 workflow-protocol 包 — 核心类型定义

**Files:**
- Create: `packages/workflow-protocol/package.json`
- Create: `packages/workflow-protocol/tsconfig.json`
- Create: `packages/workflow-protocol/src/types.ts`
- Create: `packages/workflow-protocol/src/index.ts`

**Step 1: 创建 package.json**

```json
// packages/workflow-protocol/package.json
{
  "name": "@forgestudio/workflow-protocol",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
// packages/workflow-protocol/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: 创建 src/types.ts**

```typescript
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
  /** 将动作结果存入的流程变量名 */
  outputVar?: string
}

export interface WFPConditionNode extends WFPNodeBase {
  type: 'condition'
  /** 布尔表达式，如 "{{result.code}} === 0" */
  expression: string
}

export interface WFPParallelNode extends WFPNodeBase {
  type: 'parallel'
  mode: 'fork' | 'join'
}

export interface WFPWaitNode extends WFPNodeBase {
  type: 'wait'
  /** 等待毫秒数 */
  duration?: number
  /** 等待的外部事件名 */
  event?: string
}

export interface WFPSubprocessNode extends WFPNodeBase {
  type: 'subprocess'
  workflowId: string
  inputMapping?: Record<string, string>
}

export interface WFPLoopNode extends WFPNodeBase {
  type: 'loop'
  /** 集合表达式，如 "{{items}}" */
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
  /** 连线标签，条件分支时为 "true" / "false" */
  label?: string
  /** 条件表达式（仅条件节点出边使用） */
  condition?: string
}
```

**Step 4: 创建 src/index.ts**

```typescript
// packages/workflow-protocol/src/index.ts
export * from './types'
```

**Step 5: 安装依赖并验证构建**

Run: `cd /Users/peakom/worko/forgestudio && pnpm install`
Expected: 安装成功，无错误

Run: `pnpm -F @forgestudio/workflow-protocol build`
Expected: 无 TypeScript 错误，`dist/` 目录生成

**Step 6: Commit**

```bash
git add packages/workflow-protocol/
git commit -m "feat(workflow-protocol): add WFP core type definitions"
```

---

### Task 2: 为 workflow-protocol 添加工具函数

**Files:**
- Create: `packages/workflow-protocol/src/utils.ts`
- Create: `packages/workflow-protocol/src/utils.test.ts`
- Modify: `packages/workflow-protocol/src/index.ts`
- Modify: `packages/workflow-protocol/package.json` (add vitest)

**Step 1: 在 package.json 添加 vitest**

```json
// packages/workflow-protocol/package.json (修改 devDependencies)
{
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  }
}
```

**Step 2: 先写测试（RED）**

```typescript
// packages/workflow-protocol/src/utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  createWorkflow,
  createNode,
  createEdge,
  validateWorkflow,
  getNodeById,
  getEdgesByNode,
} from './utils'

describe('createWorkflow', () => {
  it('creates a workflow with required fields', () => {
    const wf = createWorkflow('测试流程', 'interaction')
    expect(wf.id).toBeTruthy()
    expect(wf.name).toBe('测试流程')
    expect(wf.type).toBe('interaction')
    expect(wf.version).toBe('1.0.0')
    expect(wf.nodes).toHaveLength(2) // start + end
    expect(wf.edges).toHaveLength(0)
    expect(wf.variables).toHaveLength(0)
  })
})

describe('createNode', () => {
  it('creates an action node with position', () => {
    const node = createNode('action', 'API 调用', { x: 100, y: 200 })
    expect(node.id).toBeTruthy()
    expect(node.type).toBe('action')
    expect(node.label).toBe('API 调用')
    expect(node.position).toEqual({ x: 100, y: 200 })
  })
})

describe('createEdge', () => {
  it('creates an edge between two nodes', () => {
    const edge = createEdge('node-1', 'node-2')
    expect(edge.id).toBeTruthy()
    expect(edge.source).toBe('node-1')
    expect(edge.target).toBe('node-2')
  })
})

describe('validateWorkflow', () => {
  it('passes for a valid workflow', () => {
    const wf = createWorkflow('valid', 'interaction')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when no start node', () => {
    const wf = createWorkflow('no-start', 'interaction')
    wf.nodes = wf.nodes.filter(n => n.type !== 'start')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('start'))).toBe(true)
  })

  it('fails when no end node', () => {
    const wf = createWorkflow('no-end', 'interaction')
    wf.nodes = wf.nodes.filter(n => n.type !== 'end')
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
  })
})

describe('getNodeById', () => {
  it('returns node when found', () => {
    const wf = createWorkflow('test', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    expect(getNodeById(wf, startNode.id)).toBe(startNode)
  })

  it('returns undefined when not found', () => {
    const wf = createWorkflow('test', 'interaction')
    expect(getNodeById(wf, 'nonexistent')).toBeUndefined()
  })
})

describe('getEdgesByNode', () => {
  it('returns outgoing edges for a node', () => {
    const wf = createWorkflow('test', 'interaction')
    const startId = wf.nodes.find(n => n.type === 'start')!.id
    const endId = wf.nodes.find(n => n.type === 'end')!.id
    wf.edges.push(createEdge(startId, endId))
    const edges = getEdgesByNode(wf, startId, 'outgoing')
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe(startId)
  })
})
```

**Step 3: 运行测试确认失败**

Run: `pnpm -F @forgestudio/workflow-protocol test`
Expected: FAIL — "Cannot find module './utils'"

**Step 4: 实现 utils.ts**

```typescript
// packages/workflow-protocol/src/utils.ts
import type { WFPSchema, WFPNode, WFPEdge, WFPNodeType } from './types'

let _counter = 0
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_counter}`
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function createWorkflow(
  name: string,
  type: WFPSchema['type']
): WFPSchema {
  const startId = genId('start')
  const endId = genId('end')
  return {
    id: genId('wf'),
    name,
    type,
    version: '1.0.0',
    variables: [],
    nodes: [
      { id: startId, type: 'start', label: '开始', position: { x: 100, y: 100 } },
      { id: endId, type: 'end', label: '结束', position: { x: 100, y: 400 } },
    ],
    edges: [],
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  }
}

export function createNode(
  type: WFPNodeType,
  label: string,
  position: { x: number; y: number }
): WFPNode {
  const base = { id: genId(type), type, label, position }
  if (type === 'start') return { ...base, type: 'start' }
  if (type === 'end') return { ...base, type: 'end' }
  if (type === 'action') return { ...base, type: 'action', actionType: 'showToast', config: {} }
  if (type === 'condition') return { ...base, type: 'condition', expression: '' }
  if (type === 'parallel') return { ...base, type: 'parallel', mode: 'fork' }
  if (type === 'wait') return { ...base, type: 'wait' }
  if (type === 'subprocess') return { ...base, type: 'subprocess', workflowId: '' }
  return { ...base, type: 'loop', collection: '', itemVar: 'item' }
}

export function createEdge(source: string, target: string, label?: string): WFPEdge {
  return { id: genId('edge'), source, target, label }
}

export function validateWorkflow(schema: WFPSchema): ValidationResult {
  const errors: string[] = []
  const hasStart = schema.nodes.some(n => n.type === 'start')
  const hasEnd = schema.nodes.some(n => n.type === 'end')
  if (!hasStart) errors.push('流程必须包含一个 start 节点')
  if (!hasEnd) errors.push('流程必须包含至少一个 end 节点')
  const nodeIds = new Set(schema.nodes.map(n => n.id))
  for (const edge of schema.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`连线 ${edge.id} 的源节点 ${edge.source} 不存在`)
    if (!nodeIds.has(edge.target)) errors.push(`连线 ${edge.id} 的目标节点 ${edge.target} 不存在`)
  }
  return { valid: errors.length === 0, errors }
}

export function getNodeById(schema: WFPSchema, id: string): WFPNode | undefined {
  return schema.nodes.find(n => n.id === id)
}

export function getEdgesByNode(
  schema: WFPSchema,
  nodeId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'both'
): WFPEdge[] {
  return schema.edges.filter(e => {
    if (direction === 'outgoing') return e.source === nodeId
    if (direction === 'incoming') return e.target === nodeId
    return e.source === nodeId || e.target === nodeId
  })
}
```

**Step 5: 更新 index.ts 导出工具函数**

```typescript
// packages/workflow-protocol/src/index.ts
export * from './types'
export * from './utils'
```

**Step 6: 运行测试确认通过**

Run: `pnpm -F @forgestudio/workflow-protocol test`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add packages/workflow-protocol/
git commit -m "feat(workflow-protocol): add WFP utility functions with tests"
```

---

### Task 3: 扩展 FSP Protocol — 添加 workflows 和 ExecuteWorkflowAction

**Files:**
- Modify: `packages/protocol/src/types.ts`
- Modify: `packages/protocol/src/index.ts` (检查是否需要导出新类型)

**Step 1: 读取当前 types.ts 末尾确认扩展位置**

Run: `tail -30 packages/protocol/src/types.ts`

**Step 2: 在 types.ts 中添加新类型（在 Action 联合类型后）**

在 `packages/protocol/src/types.ts` 文件中，找到:
```typescript
export interface SubmitFormAction {
  // ...
  onSuccess?: Action[]
}
```

在其后追加:

```typescript
/** 触发流程执行 (Phase 1 新增) */
export interface ExecuteWorkflowAction {
  type: 'executeWorkflow'
  /** 关联的流程 ID */
  workflowId: string
  /** 传入流程的初始变量映射：变量名 → 表达式 */
  inputMapping?: Record<string, string>
}
```

然后修改 Action 联合类型:
```typescript
// 原:
export type Action =
  | NavigateAction
  | ShowToastAction
  | SetStateAction
  | SubmitFormAction

// 改为:
export type Action =
  | NavigateAction
  | ShowToastAction
  | SetStateAction
  | SubmitFormAction
  | ExecuteWorkflowAction
```

**Step 3: 在 FSPSchema 中添加 workflows 字段**

在 `packages/protocol/src/types.ts` 中的 `FSPSchema` interface 末尾添加:

```typescript
export interface FSPSchema {
  version: string
  meta: FSPMeta
  componentTree: ComponentNode
  dataSources?: DataSourceDef[]
  formStates?: FormStateDef[]
  pages?: PageDef[]
  globalDataSources?: DataSourceDef[]
  /** 内联流程定义列表 (Phase 1 新增) */
  workflows?: WorkflowRef[]
}

/** 流程引用（完整定义内联在 inline 字段）*/
export interface WorkflowRef {
  id: string
  name: string
  type: 'interaction' | 'data-orchestration' | 'approval'
  /** 内联流程定义（使用 WFPSchema 但此处用 unknown 避免循环依赖） */
  inline?: unknown
}
```

> **注意:** `WorkflowRef.inline` 使用 `unknown` 而非 `WFPSchema` 以避免 `protocol` 包依赖 `workflow-protocol` 包（循环依赖）。运行时通过类型断言处理。

**Step 4: 验证构建**

Run: `pnpm -F @forgestudio/protocol build`
Expected: 无 TypeScript 错误

**Step 5: 验证 editor 包仍可构建**

Run: `pnpm -F @forgestudio/editor build`
Expected: 无错误（新字段可选，向后兼容）

**Step 6: Commit**

```bash
git add packages/protocol/src/types.ts
git commit -m "feat(protocol): add ExecuteWorkflowAction and FSPSchema.workflows field"
```

---

### Task 4: 创建 workflow-editor 包 — 基础 LogicFlow 画布

**Files:**
- Create: `packages/workflow-editor/package.json`
- Create: `packages/workflow-editor/tsconfig.json`
- Create: `packages/workflow-editor/src/WorkflowEditor.tsx`
- Create: `packages/workflow-editor/src/styles.css`
- Create: `packages/workflow-editor/src/index.ts`

**Step 1: 创建 package.json**

```json
// packages/workflow-editor/package.json
{
  "name": "@forgestudio/workflow-editor",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./styles.css": "./src/styles.css"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "@logicflow/core": "^1.3.0",
    "@logicflow/extension": "^1.3.0",
    "@forgestudio/workflow-protocol": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
// packages/workflow-editor/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**Step 3: 创建 src/WorkflowEditor.tsx**

```tsx
// packages/workflow-editor/src/WorkflowEditor.tsx
import React, { useEffect, useRef, useCallback } from 'react'
import LogicFlow from '@logicflow/core'
import { Control, MiniMap, Snapshot } from '@logicflow/extension'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import { wfpToLogicFlow, logicFlowToWfp } from './converter'
import '@logicflow/core/dist/index.css'
import '@logicflow/extension/lib/style/index.css'
import './styles.css'

export interface WorkflowEditorProps {
  value: WFPSchema
  onChange?: (schema: WFPSchema) => void
  readOnly?: boolean
  height?: number
}

export function WorkflowEditor({ value, onChange, readOnly = false, height = 500 }: WorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lfRef = useRef<LogicFlow | null>(null)

  // Initialize LogicFlow once
  useEffect(() => {
    if (!containerRef.current) return

    const lf = new LogicFlow({
      container: containerRef.current,
      grid: true,
      plugins: [Control, MiniMap],
      edgeType: 'polyline',
      keyboard: { enabled: true },
    })

    lf.render()
    lfRef.current = lf

    // Load initial data
    const lfData = wfpToLogicFlow(value)
    lf.render(lfData)

    // Listen for graph changes
    if (!readOnly && onChange) {
      lf.on('graph:rendered', () => {
        const graphData = lf.getGraphData()
        const updated = logicFlowToWfp(graphData, value)
        onChange(updated)
      })
      lf.on('node:dnd-add', () => {
        const graphData = lf.getGraphData()
        const updated = logicFlowToWfp(graphData, value)
        onChange(updated)
      })
      lf.on('edge:add', () => {
        const graphData = lf.getGraphData()
        const updated = logicFlowToWfp(graphData, value)
        onChange(updated)
      })
    }

    return () => {
      lf.destroy()
      lfRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes to LogicFlow
  useEffect(() => {
    if (!lfRef.current) return
    const lfData = wfpToLogicFlow(value)
    lfRef.current.render(lfData)
  }, [value])

  const handleFitView = useCallback(() => {
    lfRef.current?.fitView()
  }, [])

  return (
    <div className="wf-editor" style={{ height }}>
      <div className="wf-editor__toolbar">
        <button onClick={handleFitView} className="wf-editor__btn">适应画布</button>
      </div>
      <div ref={containerRef} className="wf-editor__canvas" style={{ height: height - 36 }} />
    </div>
  )
}
```

**Step 4: 创建 src/styles.css**

```css
/* packages/workflow-editor/src/styles.css */
.wf-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.wf-editor__toolbar {
  height: 36px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.wf-editor__btn {
  padding: 4px 10px;
  font-size: 12px;
  color: #555;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  cursor: pointer;
}

.wf-editor__btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.wf-editor__canvas {
  flex: 1;
}
```

**Step 5: 创建 src/index.ts**

```typescript
// packages/workflow-editor/src/index.ts
export { WorkflowEditor } from './WorkflowEditor'
export type { WorkflowEditorProps } from './WorkflowEditor'
```

**Step 6: 安装依赖**

Run: `pnpm install`
Expected: `@logicflow/core` 和 `@logicflow/extension` 安装成功

**Step 7: Commit**

```bash
git add packages/workflow-editor/
git commit -m "feat(workflow-editor): add base LogicFlow canvas component"
```

---

### Task 5: 实现 WFP ↔ LogicFlow 数据转换器

**Files:**
- Create: `packages/workflow-editor/src/converter.ts`
- Create: `packages/workflow-editor/src/converter.test.ts`

**Step 1: 先写测试（RED）**

```typescript
// packages/workflow-editor/src/converter.test.ts
import { describe, it, expect } from 'vitest'
import { wfpToLogicFlow, logicFlowToWfp } from './converter'
import { createWorkflow, createNode, createEdge } from '@forgestudio/workflow-protocol'

describe('wfpToLogicFlow', () => {
  it('converts WFP nodes to LogicFlow nodes', () => {
    const wf = createWorkflow('test', 'interaction')
    const result = wfpToLogicFlow(wf)
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[0].type).toBe('start')
    expect(result.nodes[0].x).toBe(wf.nodes[0].position.x)
    expect(result.nodes[0].y).toBe(wf.nodes[0].position.y)
  })

  it('converts WFP edges to LogicFlow edges', () => {
    const wf = createWorkflow('test', 'interaction')
    const startId = wf.nodes[0].id
    const endId = wf.nodes[1].id
    wf.edges.push(createEdge(startId, endId, 'next'))
    const result = wfpToLogicFlow(wf)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].sourceNodeId).toBe(startId)
    expect(result.edges[0].targetNodeId).toBe(endId)
  })
})

describe('logicFlowToWfp', () => {
  it('round-trips WFP through LogicFlow format', () => {
    const wf = createWorkflow('test', 'interaction')
    const lfData = wfpToLogicFlow(wf)
    const result = logicFlowToWfp(lfData, wf)
    expect(result.nodes).toHaveLength(2)
    expect(result.id).toBe(wf.id)
    expect(result.name).toBe(wf.name)
  })

  it('preserves node positions from LogicFlow', () => {
    const wf = createWorkflow('test', 'interaction')
    const lfData = wfpToLogicFlow(wf)
    // Simulate user moving a node
    lfData.nodes[0].x = 250
    lfData.nodes[0].y = 300
    const result = logicFlowToWfp(lfData, wf)
    expect(result.nodes[0].position).toEqual({ x: 250, y: 300 })
  })
})
```

**Step 2: 运行测试确认失败**

Run: `pnpm -F @forgestudio/workflow-editor test`
Expected: FAIL — "Cannot find module './converter'"

**Step 3: 实现 converter.ts**

```typescript
// packages/workflow-editor/src/converter.ts
import type { WFPSchema, WFPNode, WFPEdge } from '@forgestudio/workflow-protocol'

export interface LFNode {
  id: string
  type: string
  x: number
  y: number
  text?: string
  properties?: Record<string, unknown>
}

export interface LFEdge {
  id: string
  type: string
  sourceNodeId: string
  targetNodeId: string
  text?: string
  properties?: Record<string, unknown>
}

export interface LFGraph {
  nodes: LFNode[]
  edges: LFEdge[]
}

/** 将 WFP Schema 转换为 LogicFlow 可渲染的图数据 */
export function wfpToLogicFlow(schema: WFPSchema): LFGraph {
  const nodes: LFNode[] = schema.nodes.map(node => ({
    id: node.id,
    type: node.type,
    x: node.position.x,
    y: node.position.y,
    text: node.label,
    properties: nodeToProperties(node),
  }))

  const edges: LFEdge[] = schema.edges.map(edge => ({
    id: edge.id,
    type: 'polyline',
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    text: edge.label,
    properties: { condition: edge.condition },
  }))

  return { nodes, edges }
}

/** 将 LogicFlow 图数据转换回 WFP Schema（保留原始元数据） */
export function logicFlowToWfp(graph: LFGraph, existing: WFPSchema): WFPSchema {
  const nodes: WFPNode[] = graph.nodes.map(lfNode => {
    const originalNode = existing.nodes.find(n => n.id === lfNode.id)
    const base = {
      id: lfNode.id,
      label: typeof lfNode.text === 'string' ? lfNode.text : (lfNode.text as any)?.value ?? '',
      position: { x: lfNode.x, y: lfNode.y },
    }
    if (originalNode) {
      return { ...originalNode, ...base }
    }
    // New node added via drag
    return propertiesRoNode(lfNode.type as WFPNode['type'], base, lfNode.properties ?? {})
  })

  const edges: WFPEdge[] = graph.edges.map(lfEdge => ({
    id: lfEdge.id,
    source: lfEdge.sourceNodeId,
    target: lfEdge.targetNodeId,
    label: typeof lfEdge.text === 'string' ? lfEdge.text : (lfEdge.text as any)?.value,
    condition: (lfEdge.properties?.condition as string) ?? undefined,
  }))

  return {
    ...existing,
    nodes,
    edges,
    meta: { ...existing.meta, updatedAt: new Date().toISOString() },
  }
}

function nodeToProperties(node: WFPNode): Record<string, unknown> {
  const { id, type, label, position, description, ...rest } = node as any
  return rest
}

function propertiesRoNode(type: WFPNode['type'], base: any, properties: Record<string, unknown>): WFPNode {
  if (type === 'start') return { ...base, type: 'start' }
  if (type === 'end') return { ...base, type: 'end' }
  if (type === 'action') return { ...base, type: 'action', actionType: 'showToast', config: {}, ...properties }
  if (type === 'condition') return { ...base, type: 'condition', expression: '', ...properties }
  if (type === 'parallel') return { ...base, type: 'parallel', mode: 'fork', ...properties }
  if (type === 'wait') return { ...base, type: 'wait', ...properties }
  if (type === 'subprocess') return { ...base, type: 'subprocess', workflowId: '', ...properties }
  return { ...base, type: 'loop', collection: '', itemVar: 'item', ...properties }
}
```

**Step 4: 运行测试确认通过**

Run: `pnpm -F @forgestudio/workflow-editor test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/workflow-editor/src/converter.ts packages/workflow-editor/src/converter.test.ts
git commit -m "feat(workflow-editor): add WFP<->LogicFlow converter with tests"
```

---

### Task 6: 实现自定义节点渲染

**Files:**
- Create: `packages/workflow-editor/src/nodes/index.ts`
- Modify: `packages/workflow-editor/src/WorkflowEditor.tsx`

**Step 1: 创建节点注册文件**

LogicFlow 使用类继承方式自定义节点。为保持简洁，Phase 1 使用基础形状 + 文字：

```typescript
// packages/workflow-editor/src/nodes/index.ts
import LogicFlow, { CircleNode, CircleNodeModel, RectNode, RectNodeModel, DiamondNode, DiamondNodeModel } from '@logicflow/core'

/** 开始节点：绿色圆形 */
class StartNodeModel extends CircleNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.r = 30
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#52c41a', stroke: '#389e0d', fillOpacity: 0.9 }
  }
}

/** 结束节点：红色圆形（双边框） */
class EndNodeModel extends CircleNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.r = 30
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#ff4d4f', stroke: '#cf1322', fillOpacity: 0.9 }
  }
}

/** 动作节点：蓝色矩形圆角 */
class ActionNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.width = 120
    this.height = 48
    this.radius = 8
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#1890ff', stroke: '#096dd9', fillOpacity: 0.85 }
  }
}

/** 条件节点：橙色菱形 */
class ConditionNodeModel extends DiamondNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.rx = 55
    this.ry = 35
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#fa8c16', stroke: '#d46b08', fillOpacity: 0.85 }
  }
}

/** 并行网关节点：紫色矩形 */
class ParallelNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.width = 40
    this.height = 40
    this.radius = 4
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#722ed1', stroke: '#531dab', fillOpacity: 0.85 }
  }
}

/** 等待节点：灰色矩形（虚线边框） */
class WaitNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.width = 100
    this.height = 44
    this.radius = 22
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#f5f5f5', stroke: '#bfbfbf', strokeDasharray: '4 2' }
  }
}

/** 子流程节点：深蓝矩形（双边框通过 stroke-width 模拟） */
class SubprocessNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.width = 130
    this.height = 50
    this.radius = 6
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#13c2c2', stroke: '#08979c', strokeWidth: 2 }
  }
}

/** 循环节点：品红矩形 */
class LoopNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)
    this.width = 110
    this.height = 46
    this.radius = 6
  }
  getNodeStyle() {
    return { ...super.getNodeStyle(), fill: '#eb2f96', stroke: '#c41d7f', fillOpacity: 0.85 }
  }
}

/** 注册所有自定义节点到 LogicFlow 实例 */
export function registerCustomNodes(lf: LogicFlow) {
  lf.register({ type: 'start', view: CircleNode, model: StartNodeModel })
  lf.register({ type: 'end', view: CircleNode, model: EndNodeModel })
  lf.register({ type: 'action', view: RectNode, model: ActionNodeModel })
  lf.register({ type: 'condition', view: DiamondNode, model: ConditionNodeModel })
  lf.register({ type: 'parallel', view: RectNode, model: ParallelNodeModel })
  lf.register({ type: 'wait', view: RectNode, model: WaitNodeModel })
  lf.register({ type: 'subprocess', view: RectNode, model: SubprocessNodeModel })
  lf.register({ type: 'loop', view: RectNode, model: LoopNodeModel })
}
```

**Step 2: 在 WorkflowEditor.tsx 中注册节点**

在 `lf.render()` 之前，插入节点注册调用：

```tsx
// 在 WorkflowEditor.tsx 的 useEffect 中，lf.render() 之前添加:
import { registerCustomNodes } from './nodes'

// ...
const lf = new LogicFlow({ /* ... */ })
registerCustomNodes(lf)  // <-- 添加这行
lf.render()
```

**Step 3: 验证构建**

Run: `pnpm -F @forgestudio/workflow-editor build`
Expected: 无 TypeScript 错误

**Step 4: Commit**

```bash
git add packages/workflow-editor/src/nodes/ packages/workflow-editor/src/WorkflowEditor.tsx
git commit -m "feat(workflow-editor): register 8 custom node types for LogicFlow"
```

---

### Task 7: 集成 workflow-editor 到现有编辑器

**Files:**
- Modify: `packages/editor/package.json`
- Modify: `packages/editor/src/store.ts`
- Modify: `packages/editor/src/components/props-panel/EventsSection.tsx`
- Create: `packages/editor/src/components/WorkflowEditorModal.tsx`

**Step 1: 在 editor/package.json 中添加依赖**

```json
// packages/editor/package.json — 在 dependencies 中新增:
"@forgestudio/workflow-editor": "workspace:*",
"@forgestudio/workflow-protocol": "workspace:*",
```

Run: `pnpm install`

**Step 2: 在 store.ts 中添加 workflow 状态**

在 `packages/editor/src/store.ts` 的 `EditorState` interface 中添加：

```typescript
// 在 EditorState interface 中追加（在 clipboard 字段后）：
workflows: WorkflowRef[]
activeWorkflowId: string | null

// 在 Actions 部分追加：
openWorkflowEditor: (workflowId: string | null) => void
saveWorkflow: (workflow: WFPSchema) => void
deleteWorkflow: (workflowId: string) => void
```

在 Zustand store 实现中添加对应的 action 实现（在 `immer` 方法中）：

```typescript
openWorkflowEditor: (workflowId) => {
  set(state => { state.activeWorkflowId = workflowId })
},
saveWorkflow: (workflow) => {
  set(state => {
    const idx = state.schema.workflows?.findIndex(w => w.id === workflow.id) ?? -1
    const ref: WorkflowRef = { id: workflow.id, name: workflow.name, type: workflow.type, inline: workflow }
    if (!state.schema.workflows) state.schema.workflows = []
    if (idx >= 0) {
      state.schema.workflows[idx] = ref
    } else {
      state.schema.workflows.push(ref)
    }
  })
},
deleteWorkflow: (workflowId) => {
  set(state => {
    state.schema.workflows = (state.schema.workflows ?? []).filter(w => w.id !== workflowId)
  })
},
```

初始状态中添加：
```typescript
workflows: [],
activeWorkflowId: null,
```

**Step 3: 创建 WorkflowEditorModal.tsx**

```tsx
// packages/editor/src/components/WorkflowEditorModal.tsx
import React from 'react'
import { WorkflowEditor } from '@forgestudio/workflow-editor'
import '@forgestudio/workflow-editor/styles.css'
import { useEditorStore } from '../store'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import { createWorkflow } from '@forgestudio/workflow-protocol'

export function WorkflowEditorModal() {
  const activeWorkflowId = useEditorStore(s => s.activeWorkflowId)
  const schema = useEditorStore(s => s.schema)
  const openWorkflowEditor = useEditorStore(s => s.openWorkflowEditor)
  const saveWorkflow = useEditorStore(s => s.saveWorkflow)

  if (!activeWorkflowId) return null

  const existingRef = schema.workflows?.find(w => w.id === activeWorkflowId)
  const workflow: WFPSchema = existingRef?.inline
    ? (existingRef.inline as WFPSchema)
    : createWorkflow('新流程', 'interaction')

  const handleSave = (updated: WFPSchema) => {
    saveWorkflow(updated)
    openWorkflowEditor(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 20,
        width: '80vw', maxWidth: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>流程编辑器 — {workflow.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleSave(workflow)}
              style={{ padding: '6px 16px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              保存流程
            </button>
            <button
              onClick={() => openWorkflowEditor(null)}
              style={{ padding: '6px 16px', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, cursor: 'pointer' }}
            >
              取消
            </button>
          </div>
        </div>
        <WorkflowEditor value={workflow} onChange={() => {}} height={560} />
      </div>
    </div>
  )
}
```

**Step 4: 在 EventsSection.tsx 中添加「使用工作流」入口**

在 `ActionEditor` 组件的动作类型 `<select>` 中添加新选项：

```tsx
// 在 actionType select 的 options 中追加:
<option value="executeWorkflow">使用工作流</option>
```

当 `actionType === 'executeWorkflow'` 时，显示流程选择 UI：

```tsx
{actionType === 'executeWorkflow' && (
  <ExecuteWorkflowFields
    actionParams={actionParams}
    setActionParams={setActionParams}
    schema={schema}
    onOpenEditor={(workflowId) => openWorkflowEditor(workflowId)}
  />
)}
```

在 `handleSaveAction` 中处理新类型：

```typescript
// 在 newAction 赋值的三元链末尾添加:
: actionType === 'executeWorkflow'
? { type: 'executeWorkflow', workflowId: actionParams.workflowId || '' }
: { /* fallback */ }
```

**Step 5: 在 Layout.tsx 中渲染 WorkflowEditorModal**

```tsx
// 在 packages/editor/src/components/Layout.tsx 顶部导入:
import { WorkflowEditorModal } from './WorkflowEditorModal'

// 在 return 的根元素最后追加:
<WorkflowEditorModal />
```

**Step 6: 验证构建**

Run: `pnpm -F @forgestudio/editor build`
Expected: 无 TypeScript 错误

**Step 7: 本地启动验证**

Run: `pnpm dev`

打开 `http://localhost:5173`，在组件事件面板中应该可以看到「使用工作流」选项。

**Step 8: Commit**

```bash
git add packages/editor/
git commit -m "feat(editor): integrate workflow editor modal into event action panel"
```

---

### Task 8: 创建 codegen-workflow 包 — WFP → IR 转换

**Files:**
- Create: `packages/codegen-workflow/package.json`
- Create: `packages/codegen-workflow/tsconfig.json`
- Create: `packages/codegen-workflow/src/transformer.ts`
- Create: `packages/codegen-workflow/src/transformer.test.ts`
- Create: `packages/codegen-workflow/src/index.ts`

**Step 1: 创建 package.json**

```json
// packages/codegen-workflow/package.json
{
  "name": "@forgestudio/codegen-workflow",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "@forgestudio/workflow-protocol": "workspace:*",
    "@forgestudio/codegen-core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
// packages/codegen-workflow/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: 先写测试（RED）**

```typescript
// packages/codegen-workflow/src/transformer.test.ts
import { describe, it, expect } from 'vitest'
import { transformWorkflowToHandler } from './transformer'
import { createWorkflow, createNode, createEdge } from '@forgestudio/workflow-protocol'
import type { WFPActionNode } from '@forgestudio/workflow-protocol'

describe('transformWorkflowToHandler', () => {
  it('generates async function body for simple action sequence', () => {
    const wf = createWorkflow('submitFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const toastNode = createNode('action', '显示提示', { x: 200, y: 200 }) as WFPActionNode
    ;(toastNode as any).actionType = 'showToast'
    ;(toastNode as any).config = { title: '提交成功', icon: 'success' }
    wf.nodes.push(toastNode)

    wf.edges.push(createEdge(startNode.id, toastNode.id))
    wf.edges.push(createEdge(toastNode.id, endNode.id))

    const result = transformWorkflowToHandler(wf)
    expect(result.name).toBe('submitFlow')
    expect(result.body).toContain('Taro.showToast')
    expect(result.body).toContain('提交成功')
  })

  it('generates if/else for condition node', () => {
    const wf = createWorkflow('condFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!

    const condNode = createNode('condition', '判断结果', { x: 200, y: 200 })
    ;(condNode as any).expression = 'result.code === 0'
    wf.nodes.push(condNode)

    const successNode = createNode('action', '成功提示', { x: 100, y: 350 }) as WFPActionNode
    ;(successNode as any).actionType = 'showToast'
    ;(successNode as any).config = { title: '成功', icon: 'success' }
    wf.nodes.push(successNode)

    const failNode = createNode('action', '失败提示', { x: 300, y: 350 }) as WFPActionNode
    ;(failNode as any).actionType = 'showToast'
    ;(failNode as any).config = { title: '失败', icon: 'error' }
    wf.nodes.push(failNode)

    wf.edges.push(createEdge(startNode.id, condNode.id))
    wf.edges.push({ ...createEdge(condNode.id, successNode.id), condition: 'true', label: 'true' })
    wf.edges.push({ ...createEdge(condNode.id, failNode.id), condition: 'false', label: 'false' })

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('if (result.code === 0)')
    expect(result.body).toContain('else')
  })

  it('generates navigate call for navigate action', () => {
    const wf = createWorkflow('navFlow', 'interaction')
    const startNode = wf.nodes.find(n => n.type === 'start')!
    const endNode = wf.nodes.find(n => n.type === 'end')!

    const navNode = createNode('action', '跳转', { x: 200, y: 200 }) as WFPActionNode
    ;(navNode as any).actionType = 'navigate'
    ;(navNode as any).config = { url: '/pages/detail/index' }
    wf.nodes.push(navNode)

    wf.edges.push(createEdge(startNode.id, navNode.id))
    wf.edges.push(createEdge(navNode.id, endNode.id))

    const result = transformWorkflowToHandler(wf)
    expect(result.body).toContain('Taro.navigateTo')
    expect(result.body).toContain('/pages/detail/index')
  })
})
```

**Step 4: 运行测试确认失败**

Run: `pnpm -F @forgestudio/codegen-workflow test`
Expected: FAIL — "Cannot find module './transformer'"

**Step 5: 实现 transformer.ts**

```typescript
// packages/codegen-workflow/src/transformer.ts
import type { WFPSchema, WFPNode, WFPActionNode, WFPConditionNode } from '@forgestudio/workflow-protocol'
import { getEdgesByNode } from '@forgestudio/workflow-protocol'

export interface WorkflowHandler {
  /** 函数名（驼峰命名） */
  name: string
  /** async 函数体（不含 async function 声明） */
  body: string
  /** 参数列表 */
  params: string[]
}

/** 将 WFP Schema 转换为可插入 Taro 组件的 async 函数定义 */
export function transformWorkflowToHandler(schema: WFPSchema): WorkflowHandler {
  const startNode = schema.nodes.find(n => n.type === 'start')
  if (!startNode) throw new Error(`Workflow "${schema.name}" has no start node`)

  const lines: string[] = []
  const visited = new Set<string>()

  function visit(nodeId: string, indent: number): void {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = schema.nodes.find(n => n.id === nodeId)
    if (!node || node.type === 'end') return

    const pad = '  '.repeat(indent)

    if (node.type === 'action') {
      lines.push(...generateActionLines(node as WFPActionNode, pad))
      const outEdges = getEdgesByNode(schema, nodeId, 'outgoing')
      for (const edge of outEdges) visit(edge.target, indent)
    } else if (node.type === 'condition') {
      generateConditionBlock(node as WFPConditionNode, schema, indent, lines, visited)
    }
  }

  const startOutEdges = getEdgesByNode(schema, startNode.id, 'outgoing')
  for (const edge of startOutEdges) visit(edge.target, 0)

  const fnName = toCamelCase(schema.name)
  return {
    name: fnName,
    params: [],
    body: lines.join('\n'),
  }
}

function generateActionLines(node: WFPActionNode, pad: string): string[] {
  const { actionType, config, outputVar } = node
  const varDecl = outputVar ? `const ${outputVar} = ` : ''

  if (actionType === 'showToast') {
    const title = JSON.stringify(config.title ?? '')
    const icon = JSON.stringify(config.icon ?? 'none')
    return [`${pad}await Taro.showToast({ title: ${title}, icon: ${icon} })`]
  }

  if (actionType === 'navigate') {
    const url = JSON.stringify(config.url ?? '')
    return [`${pad}await Taro.navigateTo({ url: ${url} })`]
  }

  if (actionType === 'setState') {
    const target = config.target as string
    const value = config.value as string
    return [`${pad}set${capitalize(target)}(${value})`]
  }

  if (actionType === 'callApi') {
    const dsId = config.dataSourceId as string
    return [
      `${pad}try {`,
      `${pad}  ${varDecl}await fetch_${dsId}()`,
      `${pad}} catch (error) {`,
      `${pad}  console.error('API call failed:', error)`,
      `${pad}}`,
    ]
  }

  if (actionType === 'validateForm') {
    return [
      `${pad}const isValid = validateForm()`,
      `${pad}if (!isValid) return`,
    ]
  }

  return [`${pad}// TODO: unknown action type "${actionType}"`]
}

function generateConditionBlock(
  node: WFPConditionNode,
  schema: WFPSchema,
  indent: number,
  lines: string[],
  visited: Set<string>
): void {
  const pad = '  '.repeat(indent)
  const outEdges = getEdgesByNode(schema, node.id, 'outgoing')
  const trueEdge = outEdges.find(e => e.condition === 'true' || e.label === 'true')
  const falseEdge = outEdges.find(e => e.condition === 'false' || e.label === 'false')

  lines.push(`${pad}if (${node.expression}) {`)
  if (trueEdge) {
    visited.add(node.id)
    const trueNode = schema.nodes.find(n => n.id === trueEdge.target)
    if (trueNode && trueNode.type === 'action') {
      lines.push(...generateActionLines(trueNode as WFPActionNode, pad + '  '))
    }
  }
  lines.push(`${pad}} else {`)
  if (falseEdge) {
    const falseNode = schema.nodes.find(n => n.id === falseEdge.target)
    if (falseNode && falseNode.type === 'action') {
      lines.push(...generateActionLines(falseNode as WFPActionNode, pad + '  '))
    }
  }
  lines.push(`${pad}}`)
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    .replace(/_+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase()) || 'workflow'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

**Step 6: 创建 src/index.ts**

```typescript
// packages/codegen-workflow/src/index.ts
export { transformWorkflowToHandler } from './transformer'
export type { WorkflowHandler } from './transformer'
```

**Step 7: 运行测试确认通过**

Run: `pnpm -F @forgestudio/codegen-workflow test`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add packages/codegen-workflow/
git commit -m "feat(codegen-workflow): add WFP->Taro code transformer with tests"
```

---

### Task 9: 将 workflow 代码生成集成到 editor 的 generateCode 流程

**Files:**
- Modify: `packages/editor/src/codegen.ts` (或查找实际调用 codegen 的文件)
- Modify: `packages/editor/package.json`

**Step 1: 找到 codegen 调用位置**

Run: `grep -n "generateTaroProject\|generateCode" packages/editor/src/codegen.ts`
Expected: 看到函数定义位置

**Step 2: 在 editor/package.json 中添加 codegen-workflow 依赖**

```json
// packages/editor/package.json — 在 dependencies 中新增:
"@forgestudio/codegen-workflow": "workspace:*",
```

Run: `pnpm install`

**Step 3: 在 codegen.ts 中生成 workflow handlers**

找到 `generateTaroProject` 的调用处，在其返回结果后追加 workflow 函数：

```typescript
// packages/editor/src/codegen.ts
import { transformWorkflowToHandler } from '@forgestudio/codegen-workflow'
import type { WFPSchema } from '@forgestudio/workflow-protocol'

// 在生成代码的函数中追加：
export function generateWorkflowHandlers(schema: FSPSchema): string {
  const workflows = schema.workflows ?? []
  if (workflows.length === 0) return ''

  const lines: string[] = ['// === 工作流处理函数（自动生成）===']
  for (const ref of workflows) {
    if (!ref.inline) continue
    try {
      const handler = transformWorkflowToHandler(ref.inline as WFPSchema)
      lines.push(`export async function ${handler.name}(${handler.params.join(', ')}) {`)
      lines.push(handler.body.split('\n').map(l => '  ' + l).join('\n'))
      lines.push('}')
      lines.push('')
    } catch (e) {
      lines.push(`// Error generating handler for workflow "${ref.id}": ${e}`)
    }
  }
  return lines.join('\n')
}
```

**Step 4: 在代码预览中展示 workflow 代码**

在代码预览面板（`CodePreviewPanel` 或类似组件）中追加 workflow handlers 到生成的代码中。

找到代码预览相关文件：

Run: `grep -rn "CodePreview\|generatedProject\|codePreview" packages/editor/src/ --include="*.tsx" -l`

在生成代码的展示处，拼接 workflow handlers：

```typescript
const workflowCode = generateWorkflowHandlers(schema)
const displayCode = [generatedCode, workflowCode].filter(Boolean).join('\n\n')
```

**Step 5: 验证构建**

Run: `pnpm build`
Expected: 全部包构建成功，无 TypeScript 错误

**Step 6: Commit**

```bash
git add packages/editor/src/codegen.ts packages/editor/package.json
git commit -m "feat(editor): integrate workflow code generation into codegen pipeline"
```

---

### Task 10: Action[] → WFP 自动迁移工具

**Files:**
- Create: `packages/workflow-protocol/src/migrate.ts`
- Create: `packages/workflow-protocol/src/migrate.test.ts`
- Modify: `packages/workflow-protocol/src/index.ts`

**Step 1: 先写测试（RED）**

```typescript
// packages/workflow-protocol/src/migrate.test.ts
import { describe, it, expect } from 'vitest'
import { migrateActionsToWorkflow } from './migrate'

describe('migrateActionsToWorkflow', () => {
  it('converts navigate action to workflow', () => {
    const actions = [{ type: 'navigate', url: '/pages/detail/index' }]
    const wf = migrateActionsToWorkflow(actions as any, 'onClick')
    expect(wf.nodes.some(n => n.type === 'action')).toBe(true)
    const actionNode = wf.nodes.find(n => n.type === 'action') as any
    expect(actionNode.actionType).toBe('navigate')
    expect(actionNode.config.url).toBe('/pages/detail/index')
  })

  it('converts multiple actions to sequential workflow', () => {
    const actions = [
      { type: 'showToast', title: '加载中', icon: 'loading' },
      { type: 'navigate', url: '/pages/list/index' },
    ]
    const wf = migrateActionsToWorkflow(actions as any, 'onClick')
    const actionNodes = wf.nodes.filter(n => n.type === 'action')
    expect(actionNodes).toHaveLength(2)
    // Nodes should be connected sequentially
    expect(wf.edges.length).toBeGreaterThanOrEqual(3) // start->n1, n1->n2, n2->end
  })

  it('converts submitForm with onSuccess to workflow with continuation', () => {
    const actions = [{
      type: 'submitForm',
      dataSourceId: 'ds1',
      onSuccess: [{ type: 'navigate', url: '/pages/success/index' }],
    }]
    const wf = migrateActionsToWorkflow(actions as any, 'onSubmit')
    expect(wf.nodes.some(n => n.type === 'action' && (n as any).actionType === 'callApi')).toBe(true)
  })
})
```

**Step 2: 运行测试确认失败**

Run: `pnpm -F @forgestudio/workflow-protocol test`
Expected: FAIL — "Cannot find module './migrate'"

**Step 3: 实现 migrate.ts**

```typescript
// packages/workflow-protocol/src/migrate.ts
import type { Action } from './migrate-types'
import type { WFPSchema, WFPActionNode } from './types'
import { createWorkflow, createNode, createEdge } from './utils'

// 避免循环依赖，用 unknown 接收 Action
export function migrateActionsToWorkflow(
  actions: Array<{ type: string; [key: string]: unknown }>,
  eventName: string
): WFPSchema {
  const wf = createWorkflow(`${eventName}流程`, 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  let prevNodeId = startNode.id

  for (const action of actions) {
    const actionNode = createNode('action', actionLabel(action.type), { x: 200, y: 200 }) as WFPActionNode
    ;(actionNode as any).actionType = mapActionType(action.type)
    ;(actionNode as any).config = extractConfig(action)
    wf.nodes.push(actionNode)
    wf.edges.push(createEdge(prevNodeId, actionNode.id))
    prevNodeId = actionNode.id

    // Handle onSuccess chaining (submitForm)
    if (action.type === 'submitForm' && Array.isArray(action.onSuccess)) {
      for (const successAction of action.onSuccess as any[]) {
        const successNode = createNode('action', actionLabel(successAction.type), { x: 200, y: 200 }) as WFPActionNode
        ;(successNode as any).actionType = mapActionType(successAction.type)
        ;(successNode as any).config = extractConfig(successAction)
        wf.nodes.push(successNode)
        wf.edges.push(createEdge(prevNodeId, successNode.id))
        prevNodeId = successNode.id
      }
    }
  }

  wf.edges.push(createEdge(prevNodeId, endNode.id))
  return wf
}

function mapActionType(type: string): string {
  if (type === 'submitForm') return 'callApi'
  if (type === 'navigate') return 'navigate'
  if (type === 'showToast') return 'showToast'
  if (type === 'setState') return 'setState'
  return 'showToast'
}

function actionLabel(type: string): string {
  const labels: Record<string, string> = {
    navigate: '页面跳转', showToast: '显示提示',
    setState: '设置状态', submitForm: 'API调用', callApi: 'API调用',
  }
  return labels[type] ?? type
}

function extractConfig(action: Record<string, unknown>): Record<string, unknown> {
  const { type, ...rest } = action
  return rest
}
```

**Step 4: 更新 index.ts 导出**

```typescript
// packages/workflow-protocol/src/index.ts — 追加:
export { migrateActionsToWorkflow } from './migrate'
```

**Step 5: 运行测试确认通过**

Run: `pnpm -F @forgestudio/workflow-protocol test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/workflow-protocol/src/migrate.ts packages/workflow-protocol/src/migrate.test.ts packages/workflow-protocol/src/index.ts
git commit -m "feat(workflow-protocol): add Action[] to WFP migration utility"
```

---

### Task 11: 注册新包到 Turborepo + 端到端验证

**Files:**
- Modify: `turbo.json` (如果需要添加新包的 build 任务)
- Verify: `pnpm-workspace.yaml` (确认 `packages/*` 已覆盖新包)

**Step 1: 检查 pnpm-workspace.yaml**

Run: `cat pnpm-workspace.yaml`
Expected: 包含 `packages/*` — 新包已自动纳入

**Step 2: 检查 turbo.json 构建管道**

Run: `cat turbo.json`

如果有 `pipeline` / `tasks` 配置且需要声明包依赖，确认 `@forgestudio/workflow-protocol` 先于 `workflow-editor` 和 `codegen-workflow` 构建。通常 pnpm workspace + Turborepo 根据 `package.json` 依赖自动推断顺序，无需手动配置。

**Step 3: 全量构建验证**

Run: `pnpm build`
Expected:
```
Tasks: 8 successful, 8 total
Cached: 0 cached, 8 total
  Time: xxs
```

**Step 4: 端到端手动验证**

Run: `pnpm dev`

在浏览器中执行以下操作：

1. 打开 `http://localhost:5173`
2. 拖入一个 **Button** 组件到画布
3. 在右侧属性面板点击 **事件** tab
4. 在 `onClick` 事件中点击 **添加动作**
5. 在动作类型下拉中选择 **使用工作流**
6. 确认流程编辑器弹窗打开，画布中有开始和结束节点
7. 关闭弹窗，切换到 **代码** tab
8. 点击 **生成代码**，确认生成的代码包含 workflow 相关函数

**Step 5: 最终 commit**

```bash
git add .
git commit -m "feat: Phase 1 workflow orchestration integration complete"
```

---

## 验收标准回顾

- [ ] `workflow-protocol` 包 TypeScript 类型完整，工具函数有单元测试
- [ ] `workflow-editor` 包可渲染 LogicFlow 画布，WFP↔LF 转换有测试
- [ ] `codegen-workflow` 包可将 WFP 转换为 Taro async 函数代码，有测试
- [ ] `protocol` 包新增 `ExecuteWorkflowAction` 和 `FSPSchema.workflows` 字段
- [ ] `editor` 包事件面板支持「使用工作流」选项并弹出流程编辑器
- [ ] 全量 `pnpm build` 无错误
- [ ] 现有 `Action[]` 可通过 `migrateActionsToWorkflow` 迁移为 WFP 流程

## 演示场景

> 打开编辑器 → 拖入 Button → 点击事件 → 选择「使用工作流」→
> 在流程编辑器中添加节点：API调用 → 条件分支 → 成功跳转/失败提示 →
> 保存流程 → 生成代码 → 代码包含完整 async 函数和 if/else 逻辑
