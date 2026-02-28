# Workflow Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 补全工作流代码生成中缺失的节点类型（Loop/Wait/Subprocess）和 action 类型（executeWorkflow），并修复已知的静默失败问题。

**Architecture:** 所有改动集中在 `packages/codegen-workflow/src/transformer.ts` 的 `visit()` 函数中，为每种新节点类型添加代码生成分支；`executeWorkflow` action 在 `generateActionLines()` 中添加；同步在 `packages/codegen-core/src/transformer.ts` 的 `generateHandlerBody()` 中添加 `executeWorkflow` case。

**Tech Stack:** TypeScript, Vitest, WFP (Workflow Protocol), Taro 4.x

---

## 背景

Phase 1 已完成：
- `action` 节点（showToast/navigate/setState/callApi/validateForm）✅
- `condition` 节点（if/else + 收敛点检测）✅
- `parallel` 节点（Promise.all + 多分支收敛）✅
- 页面 onLoad 触发工作流（useLoad hook）✅

Phase 2 需要补全：
- `loop` 节点 → 生成 `for...of` 循环
- `wait` 节点 → 生成 `await delay(ms)` 或事件等待注释
- `subprocess` 节点 → 生成 `await handleWorkflowName()`
- `executeWorkflow` action（来自事件面板）→ 生成 `await handleWorkflowName()`
- 未知节点/action 的明确错误注释（防止静默失败）

---

## Task 1: Loop 节点代码生成

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`
- Test: `packages/codegen-workflow/src/transformer.test.ts`

**Step 1: 写失败测试**

在 `packages/codegen-workflow/src/transformer.test.ts` 末尾添加：

```typescript
it('generates for...of loop for loop node', () => {
  const wf = createWorkflow('loopFlow', 'data-orchestration')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const loopNode = createNode('loop', '遍历列表', { x: 200, y: 200 })
  ;(loopNode as any).collection = 'items'
  ;(loopNode as any).itemVar = 'item'

  const bodyNode = createNode('action', '处理单项', { x: 200, y: 350 }) as WFPActionNode
  ;(bodyNode as any).actionType = 'showToast'
  ;(bodyNode as any).config = { title: '处理中' }

  wf.nodes.push(loopNode, bodyNode)
  wf.edges.push(
    createEdge(startNode.id, loopNode.id),
    createEdge(loopNode.id, bodyNode.id),
    createEdge(bodyNode.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('for (const item of items)')
  expect(result.body).toContain('Taro.showToast')
  // Loop body must be indented inside for block
  const forIndex = result.body.indexOf('for (const item of items)')
  const toastIndex = result.body.indexOf('Taro.showToast')
  expect(toastIndex).toBeGreaterThan(forIndex)
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：FAIL，"generates for...of loop for loop node"

**Step 3: 实现 Loop 节点**

在 `packages/codegen-workflow/src/transformer.ts` 的 `visit()` 函数中，在 `} else if (node.type === 'parallel')` 块后面添加：

```typescript
} else if (node.type === 'loop') {
  const loopNode = node as WFPLoopNode
  const collection = loopNode.collection || 'items'
  const itemVar = loopNode.itemVar || 'item'
  const indexVar = loopNode.indexVar

  // Get the body node(s) inside the loop
  const outEdges = getEdgesByNode(schema, nodeId, 'outgoing')

  if (indexVar) {
    lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${collection}.length; ${indexVar}++) {`)
    lines.push(`${pad}  const ${itemVar} = ${collection}[${indexVar}]`)
  } else {
    lines.push(`${pad}for (const ${itemVar} of ${collection}) {`)
  }

  // Collect loop body nodes (stop when we reach a node with no incoming from loop body)
  const loopBodyVisited = new Set<string>()
  for (const edge of outEdges) {
    collectBranchCode(edge.target, indent + 1, undefined, lines, loopBodyVisited)
  }

  lines.push(`${pad}}`)

  // Continue after loop (nodes after loop body that aren't part of loop body)
  for (const edge of outEdges) {
    const afterLoop = findLoopExit(schema, edge.target, loopBodyVisited)
    if (afterLoop) visit(afterLoop, indent, stopAt)
  }
}
```

同时在文件顶部 import 中添加 `WFPLoopNode`：

```typescript
import type { WFPSchema, WFPActionNode, WFPConditionNode, WFPParallelNode, WFPLoopNode } from '@forgestudio/workflow-protocol'
```

在文件末尾添加 `findLoopExit` 辅助函数：

```typescript
/**
 * Find the first node reachable from loopBodyStart that is NOT in loopBodyVisited.
 * This identifies where execution continues after the loop.
 */
function findLoopExit(
  schema: WFPSchema,
  loopBodyStart: string,
  loopBodyVisited: Set<string>
): string | undefined {
  const queue = [loopBodyStart]
  const seen = new Set<string>()
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    if (!loopBodyVisited.has(id)) return id
    for (const e of getEdgesByNode(schema, id, 'outgoing')) queue.push(e.target)
  }
  return undefined
}
```

**Step 4: 运行验证通过**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：10/10 PASS

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): add loop node code generation (for...of)"
```

---

## Task 2: Wait 节点代码生成

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`
- Test: `packages/codegen-workflow/src/transformer.test.ts`

**Step 1: 写失败测试**

```typescript
it('generates delay for wait node with duration', () => {
  const wf = createWorkflow('waitFlow', 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const waitNode = createNode('wait', '等待2秒', { x: 200, y: 200 })
  ;(waitNode as any).duration = 2000

  const afterNode = createNode('action', '提示', { x: 200, y: 350 }) as WFPActionNode
  ;(afterNode as any).actionType = 'showToast'
  ;(afterNode as any).config = { title: '等待完成' }

  wf.nodes.push(waitNode, afterNode)
  wf.edges.push(
    createEdge(startNode.id, waitNode.id),
    createEdge(waitNode.id, afterNode.id),
    createEdge(afterNode.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('await new Promise(resolve => setTimeout(resolve, 2000))')
  expect(result.body).toContain('Taro.showToast')
})

it('generates event comment for wait node with event', () => {
  const wf = createWorkflow('waitEventFlow', 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const waitNode = createNode('wait', '等待确认', { x: 200, y: 200 })
  ;(waitNode as any).event = 'userConfirm'

  wf.nodes.push(waitNode)
  wf.edges.push(
    createEdge(startNode.id, waitNode.id),
    createEdge(waitNode.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('userConfirm')
  expect(result.body).toContain('// 等待事件')
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```

**Step 3: 实现 Wait 节点**

在 `visit()` 函数中 Loop 块后面添加：

```typescript
} else if (node.type === 'wait') {
  const waitNode = node as WFPWaitNode
  if (waitNode.duration) {
    lines.push(`${pad}await new Promise(resolve => setTimeout(resolve, ${waitNode.duration}))`)
  } else if (waitNode.event) {
    lines.push(`${pad}// 等待事件: ${waitNode.event}（需在运行时订阅事件后 resolve）`)
  } else {
    lines.push(`${pad}// 等待节点（未配置 duration 或 event）`)
  }
  for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
    visit(edge.target, indent, stopAt)
  }
}
```

在 import 中添加 `WFPWaitNode`：

```typescript
import type { WFPSchema, WFPActionNode, WFPConditionNode, WFPParallelNode, WFPLoopNode, WFPWaitNode } from '@forgestudio/workflow-protocol'
```

**Step 4: 运行验证通过**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：12/12 PASS

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): add wait node code generation (setTimeout / event comment)"
```

---

## Task 3: Subprocess 节点代码生成

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`
- Test: `packages/codegen-workflow/src/transformer.test.ts`

**Step 1: 写失败测试**

```typescript
it('generates await call for subprocess node', () => {
  const wf = createWorkflow('subFlow', 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const subNode = createNode('subprocess', '调用子流程', { x: 200, y: 200 })
  ;(subNode as any).workflowId = 'LoadUserProfile'

  wf.nodes.push(subNode)
  wf.edges.push(
    createEdge(startNode.id, subNode.id),
    createEdge(subNode.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('await handleLoadUserProfile()')
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```

**Step 3: 实现 Subprocess 节点**

在 `visit()` 函数中 Wait 块后面添加：

```typescript
} else if (node.type === 'subprocess') {
  const subNode = node as WFPSubprocessNode
  const handlerName = 'handle' + capitalize(toCamelCase(subNode.workflowId))

  if (subNode.inputMapping && Object.keys(subNode.inputMapping).length > 0) {
    const args = Object.entries(subNode.inputMapping)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    lines.push(`${pad}await ${handlerName}({ ${args} })`)
  } else {
    lines.push(`${pad}await ${handlerName}()`)
  }

  for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
    visit(edge.target, indent, stopAt)
  }
}
```

在 import 中添加 `WFPSubprocessNode`：

```typescript
import type { WFPSchema, WFPActionNode, WFPConditionNode, WFPParallelNode, WFPLoopNode, WFPWaitNode, WFPSubprocessNode } from '@forgestudio/workflow-protocol'
```

**Step 4: 运行验证通过**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：13/13 PASS

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): add subprocess node code generation (await subhandler)"
```

---

## Task 4: executeWorkflow Action（事件面板触发）

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`（`generateActionLines` 函数）
- Modify: `packages/codegen-core/src/transformer.ts`（`generateHandlerBody` 函数）
- Test: `packages/codegen-workflow/src/transformer.test.ts`

**Step 1: 写失败测试（codegen-workflow 层）**

```typescript
it('generates await call for executeWorkflow action', () => {
  const wf = createWorkflow('triggerFlow', 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const actionNode = createNode('action', '执行子流程', { x: 200, y: 200 }) as WFPActionNode
  ;(actionNode as any).actionType = 'executeWorkflow'
  ;(actionNode as any).config = { workflowId: 'SendNotification' }

  wf.nodes.push(actionNode)
  wf.edges.push(
    createEdge(startNode.id, actionNode.id),
    createEdge(actionNode.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('await handleSendNotification()')
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```

**Step 3: 实现 executeWorkflow action**

在 `generateActionLines()` 函数中，在 `validateForm` 块后、`return` 之前添加：

```typescript
if (actionType === 'executeWorkflow') {
  const workflowId = String(config.workflowId ?? '')
  if (!workflowId) {
    return [`${pad}// ⚠ executeWorkflow: workflowId 未配置`]
  }
  const handlerName = 'handle' + capitalize(toCamelCase(workflowId))
  if (config.inputMapping && typeof config.inputMapping === 'object') {
    const args = Object.entries(config.inputMapping as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return [`${pad}await ${handlerName}({ ${args} })`]
  }
  return [`${pad}await ${handlerName}()`]
}
```

同时修改 `packages/codegen-core/src/transformer.ts` 的 `generateHandlerBody()` switch 语句，在 `default: return ''` 前添加：

```typescript
case 'executeWorkflow': {
  const handlerName = 'handle' + action.workflowId.charAt(0).toUpperCase() + action.workflowId.slice(1)
  return `await ${handlerName}()`
}
```

**Step 4: 运行验证通过**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
npx tsc --noEmit -p packages/codegen-core/tsconfig.json
```
预期：14/14 PASS，TypeScript 无错

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-core/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): add executeWorkflow action code generation"
```

---

## Task 5: 未知节点/Action 的明确错误注释

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`

**Goal:** 把现在的静默忽略（visit 中 unhandled node type 什么都不做）改为明确的注释，让生成的代码里有可见的提示。

**Step 1: 修改 visit() 末尾 fallthrough**

在 `visit()` 函数内部，现有的 `} else if (node.type === 'subprocess') { ... }` 块后面添加：

```typescript
} else {
  lines.push(`${pad}// ⚠ 节点类型 "${node.type}" 暂不支持代码生成`)
  for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
    visit(edge.target, indent, stopAt)
  }
}
```

**Step 2: 写测试验证注释出现**

```typescript
it('generates warning comment for unknown node type', () => {
  const wf = createWorkflow('unknownFlow', 'interaction')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  // Manually inject an unknown node type
  const unknownNode = { id: 'u1', type: 'custom' as any, label: '自定义', position: { x: 0, y: 0 } }
  wf.nodes.push(unknownNode)
  wf.edges.push(
    createEdge(startNode.id, 'u1'),
    createEdge('u1', endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('// ⚠ 节点类型 "custom" 暂不支持代码生成')
})
```

**Step 3: 运行验证**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：15/15 PASS

**Step 4: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): add explicit warning comments for unsupported node types"
```

---

## Task 6: collectBranchCode 支持嵌套节点

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`

**Goal:** `collectBranchCode()` 目前跳过 `condition`/`parallel`/`loop` 节点（Phase 1 限制），补全使其在分支内部也能递归处理。

**Step 1: 写失败测试**

```typescript
it('handles nested condition inside parallel branch', () => {
  const wf = createWorkflow('nestedFlow', 'data-orchestration')
  const startNode = wf.nodes.find(n => n.type === 'start')!
  const endNode = wf.nodes.find(n => n.type === 'end')!

  const parallelNode = createNode('parallel', '并行', { x: 200, y: 100 })

  // Branch A: condition node
  const condNode = createNode('condition', '判断', { x: 100, y: 250 })
  ;(condNode as any).expression = 'flag'

  const trueAction = createNode('action', '真分支', { x: 50, y: 400 }) as WFPActionNode
  ;(trueAction as any).actionType = 'showToast'
  ;(trueAction as any).config = { title: '真' }

  const falseAction = createNode('action', '假分支', { x: 150, y: 400 }) as WFPActionNode
  ;(falseAction as any).actionType = 'showToast'
  ;(falseAction as any).config = { title: '假' }

  // Branch B: simple action
  const branchBAction = createNode('action', 'B分支', { x: 300, y: 250 }) as WFPActionNode
  ;(branchBAction as any).actionType = 'showToast'
  ;(branchBAction as any).config = { title: 'B' }

  // Convergence after parallel
  const finalAction = createNode('action', '最终', { x: 200, y: 500 }) as WFPActionNode
  ;(finalAction as any).actionType = 'showToast'
  ;(finalAction as any).config = { title: '完成' }

  wf.nodes.push(parallelNode, condNode, trueAction, falseAction, branchBAction, finalAction)
  wf.edges.push(
    createEdge(startNode.id, parallelNode.id),
    // Parallel → two branches
    createEdge(parallelNode.id, condNode.id),
    createEdge(parallelNode.id, branchBAction.id),
    // Condition branches
    { ...createEdge(condNode.id, trueAction.id), condition: 'true', label: 'true' },
    { ...createEdge(condNode.id, falseAction.id), condition: 'false', label: 'false' },
    // Both condition branches → final
    createEdge(trueAction.id, finalAction.id),
    createEdge(falseAction.id, finalAction.id),
    // Branch B → final
    createEdge(branchBAction.id, finalAction.id),
    createEdge(finalAction.id, endNode.id),
  )

  const result = transformWorkflowToHandler(wf)
  expect(result.body).toContain('Promise.all')
  expect(result.body).toContain('if (flag)')
  expect(result.body).toContain('\'真\'')
  expect(result.body).toContain('\'假\'')
  expect(result.body).toContain('\'B\'')
})
```

**Step 2: 运行验证失败**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```

**Step 3: 重构 collectBranchCode 支持递归**

将现有的 `collectBranchCode` 函数替换为：

```typescript
function collectBranchCode(
  nodeId: string,
  indent: number,
  stopAt: string | undefined,
  branchLines: string[],
  branchVisited: Set<string>
): void {
  if (branchVisited.has(nodeId)) return
  if (stopAt && nodeId === stopAt) return
  branchVisited.add(nodeId)

  const node = schema.nodes.find(n => n.id === nodeId)
  if (!node || node.type === 'end') return

  const pad = '  '.repeat(indent)

  if (node.type === 'action') {
    branchLines.push(...generateActionLines(node as WFPActionNode, pad))
    for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
      collectBranchCode(edge.target, indent, stopAt, branchLines, branchVisited)
    }
  } else if (node.type === 'condition') {
    const condNode = node as WFPConditionNode
    const outEdges = getEdgesByNode(schema, nodeId, 'outgoing')
    const trueEdge = outEdges.find(e => e.condition === 'true' || e.label === 'true')
    const falseEdge = outEdges.find(e => e.condition === 'false' || e.label === 'false')
    const convergence =
      trueEdge && falseEdge
        ? findConvergence(schema, trueEdge.target, falseEdge.target)
        : undefined

    branchLines.push(`${pad}if (${condNode.expression}) {`)
    if (trueEdge) collectBranchCode(trueEdge.target, indent + 1, convergence, branchLines, new Set(branchVisited))
    branchLines.push(`${pad}} else {`)
    if (falseEdge) collectBranchCode(falseEdge.target, indent + 1, convergence, branchLines, new Set(branchVisited))
    branchLines.push(`${pad}}`)
    if (convergence) collectBranchCode(convergence, indent, stopAt, branchLines, branchVisited)
  } else if (node.type === 'loop') {
    const loopNode = node as WFPLoopNode
    const collection = loopNode.collection || 'items'
    const itemVar = loopNode.itemVar || 'item'
    branchLines.push(`${pad}for (const ${itemVar} of ${collection}) {`)
    const loopBodyVisited = new Set<string>()
    for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
      collectBranchCode(edge.target, indent + 1, stopAt, branchLines, loopBodyVisited)
    }
    branchLines.push(`${pad}}`)
  } else {
    branchLines.push(`${pad}// ⚠ 节点类型 "${node.type}" 暂不支持代码生成`)
    for (const edge of getEdgesByNode(schema, nodeId, 'outgoing')) {
      collectBranchCode(edge.target, indent, stopAt, branchLines, branchVisited)
    }
  }
}
```

**Step 4: 运行所有测试**

```bash
npx vitest run packages/codegen-workflow/src/transformer.test.ts
```
预期：16/16 PASS

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): support nested condition/loop inside parallel branches"
```

---

## Task 7: 运行完整测试并验收

**Step 1: 运行所有包测试**

```bash
npx vitest run
```
预期：所有测试通过

**Step 2: TypeScript 类型检查**

```bash
npx tsc --noEmit -p packages/codegen-workflow/tsconfig.json
npx tsc --noEmit -p packages/codegen-core/tsconfig.json
npx tsc --noEmit -p packages/codegen-taro/tsconfig.json
```
预期：无错误

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "chore(workflow): phase 2 complete - all node types codegen implemented"
```

---

## 验收标准

- [ ] `loop` 节点生成 `for (const item of items) { ... }`
- [ ] `wait` 节点（duration）生成 `await new Promise(resolve => setTimeout(resolve, ms))`
- [ ] `wait` 节点（event）生成事件等待注释
- [ ] `subprocess` 节点生成 `await handleWorkflowName()`
- [ ] `executeWorkflow` action 生成 `await handleWorkflowName()`
- [ ] 未知节点类型生成 `// ⚠ 节点类型 "xxx" 暂不支持代码生成`
- [ ] `collectBranchCode` 支持嵌套 `condition`/`loop`
- [ ] 所有测试通过（≥16 个）
- [ ] TypeScript 无错误
