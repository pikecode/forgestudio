# stateMapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow `callApi` workflow action nodes to map API response fields back to page React state setters, so data fetched in a workflow handler is reflected in the UI.

**Architecture:** Add `stateMapping?: Record<string, string>` to callApi config (setter name → response path). The transformer collects all setter names, generates a `stateSetters` parameter on the handler, and the TSX generator passes the page's state setters when invoking the handler in `useLoad`.

**Tech Stack:** TypeScript, Vitest, `packages/codegen-workflow`, `packages/codegen-core`, `packages/codegen-taro`, `packages/editor/src/codegen`

---

## Background

Current `callApi` node:
```typescript
config: { dataSourceId: 'products', outputVar: 'result' }
// generates:
let result
try { result = await fetch_products() } catch (error) { throw new Error('API 调用失败') }
// result is a local variable — never reaches page state
```

Desired with stateMapping:
```typescript
config: {
  dataSourceId: 'products',
  outputVar: 'result',
  stateMapping: { setProducts: 'data.list', setTotal: 'data.total' }
}
// generates:
let result
try { result = await fetch_products() } catch (error) { throw new Error('API 调用失败') }
stateSetters.setProducts(result?.data?.list)
stateSetters.setTotal(result?.data?.total)
```

Handler signature becomes:
```typescript
export async function handleLoadPage(stateSetters: { setProducts: (v: any) => void; setTotal: (v: any) => void }) {
```

And in the page's `useLoad`:
```typescript
useLoad(async () => {
  await handleLoadPage({ setProducts, setTotal })
})
```

---

### Task 1: Extend `WorkflowHandler` and generate stateMapping setter calls

**Files:**
- Modify: `packages/codegen-workflow/src/transformer.ts`
- Test: `packages/codegen-workflow/src/transformer.test.ts`

**Step 1: Write the failing test**

Add to `packages/codegen-workflow/src/transformer.test.ts`:

```typescript
describe('stateMapping', () => {
  it('generates stateSetters calls for callApi with stateMapping', () => {
    const schema: WFPSchema = {
      id: 'wf1', name: 'loadPage', type: 'data-orchestration', version: '1',
      variables: [], edges: [
        { id: 'e1', source: 'start', target: 'n1' },
        { id: 'e2', source: 'n1', target: 'end' },
      ],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'n1', type: 'action', label: 'Load Products',
          position: { x: 0, y: 100 },
          actionType: 'callApi',
          outputVar: 'result',
          config: {
            dataSourceId: 'products',
            stateMapping: { setProducts: 'data.list', setTotal: 'data.total' },
          },
        },
        { id: 'end', type: 'end', label: 'End', position: { x: 0, y: 200 } },
      ],
    }
    const handler = transformWorkflowToHandler(schema)
    // stateSetterNames should be collected
    expect(handler.stateSetterNames).toEqual(expect.arrayContaining(['setProducts', 'setTotal']))
    // body should call stateSetters
    expect(handler.body).toContain('stateSetters.setProducts(result?.data?.list)')
    expect(handler.body).toContain('stateSetters.setTotal(result?.data?.total)')
  })

  it('stateSetterNames is undefined when no stateMapping used', () => {
    const schema: WFPSchema = {
      id: 'wf2', name: 'simple', type: 'data-orchestration', version: '1',
      variables: [], edges: [
        { id: 'e1', source: 'start', target: 'n1' },
        { id: 'e2', source: 'n1', target: 'end' },
      ],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'n1', type: 'action', label: 'Toast',
          position: { x: 0, y: 100 },
          actionType: 'showToast',
          config: { title: 'Hello' },
        },
        { id: 'end', type: 'end', label: 'End', position: { x: 0, y: 200 } },
      ],
    }
    const handler = transformWorkflowToHandler(schema)
    expect(handler.stateSetterNames).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/peakom/worko/forgestudio
pnpm --filter @forgestudio/codegen-workflow test
```
Expected: FAIL — `handler.stateSetterNames` is undefined, body has no setter calls.

**Step 3: Implement — extend `WorkflowHandler` interface and transformer**

In `packages/codegen-workflow/src/transformer.ts`:

a) Add `stateSetterNames?: string[]` to `WorkflowHandler`:
```typescript
export interface WorkflowHandler {
  name: string
  body: string
  params: string[]
  stateSetterNames?: string[]
}
```

b) Add helper function `collectSetterNames()` before `transformWorkflowToHandler`:
```typescript
function collectSetterNames(schema: WFPSchema): string[] {
  const setters = new Set<string>()
  for (const node of schema.nodes) {
    if (node.type === 'action') {
      const actionNode = node as WFPActionNode
      if (actionNode.actionType === 'callApi' && actionNode.config.stateMapping) {
        const mapping = actionNode.config.stateMapping as Record<string, string>
        for (const setterName of Object.keys(mapping)) {
          setters.add(setterName)
        }
      }
    }
  }
  return Array.from(setters)
}
```

c) In `transformWorkflowToHandler()`, before the `return` statement:
```typescript
const stateSetterNames = collectSetterNames(schema)

return {
  name: toCamelCase(schema.name),
  params: [],
  body: lines.join('\n'),
  stateSetterNames: stateSetterNames.length > 0 ? stateSetterNames : undefined,
}
```

d) In `generateActionLines()`, for callApi, after the existing try/catch block, add setter calls when `config.stateMapping` is present:
```typescript
if (actionType === 'callApi') {
  const dsId = String(config.dataSourceId ?? 'api')
  const stateMapping = config.stateMapping as Record<string, string> | undefined
  const resultVar = outputVar || '_result'
  const lines: string[] = []

  if (outputVar) {
    lines.push(`${pad}let ${outputVar}`)
    lines.push(`${pad}try {`)
    lines.push(`${pad}  ${outputVar} = await fetch_${dsId}()`)
    lines.push(`${pad}} catch (error) {`)
    lines.push(`${pad}  throw new Error('API 调用失败')`)
    lines.push(`${pad}}`)
  } else if (stateMapping && Object.keys(stateMapping).length > 0) {
    // Need a result var even if no outputVar declared
    lines.push(`${pad}let ${resultVar}`)
    lines.push(`${pad}try {`)
    lines.push(`${pad}  ${resultVar} = await fetch_${dsId}()`)
    lines.push(`${pad}} catch (error) {`)
    lines.push(`${pad}  throw new Error('API 调用失败')`)
    lines.push(`${pad}}`)
  } else {
    lines.push(`${pad}try {`)
    lines.push(`${pad}  await fetch_${dsId}()`)
    lines.push(`${pad}} catch (error) {`)
    lines.push(`${pad}  throw new Error('API 调用失败')`)
    lines.push(`${pad}}`)
  }

  if (stateMapping && Object.keys(stateMapping).length > 0) {
    for (const [setter, path] of Object.entries(stateMapping)) {
      const accessPath = path.split('.').join('?.')
      lines.push(`${pad}stateSetters.${setter}(${resultVar}?.${accessPath})`)
    }
  }

  return lines
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @forgestudio/codegen-workflow test
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/codegen-workflow/src/transformer.ts packages/codegen-workflow/src/transformer.test.ts
git commit -m "feat(workflow): collect stateSetterNames and generate setter calls in callApi"
```

---

### Task 2: Update `generateWorkflowHandlers()` to emit stateSetters parameter

**Files:**
- Modify: `packages/editor/src/codegen/index.ts`
- Test: `packages/editor/src/codegen/workflow-statemap.test.ts` (new)

**Step 1: Write the failing test**

Create `packages/editor/src/codegen/workflow-statemap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateWorkflowHandlers } from './index'
import type { FSPSchema } from '@forgestudio/protocol'

const schemaWithStateMapping: FSPSchema = {
  meta: { name: 'TestApp', version: '1.0' },
  componentTree: { id: 'root', component: 'Page', props: {}, styles: {}, children: [] },
  workflows: [
    {
      id: 'wf1',
      name: 'loadProducts',
      inline: {
        id: 'wf1', name: 'loadProducts', type: 'data-orchestration', version: '1',
        variables: [], edges: [
          { id: 'e1', source: 'start', target: 'n1' },
          { id: 'e2', source: 'n1', target: 'end' },
        ],
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
          {
            id: 'n1', type: 'action', label: 'Fetch',
            position: { x: 0, y: 100 },
            actionType: 'callApi',
            outputVar: 'result',
            config: {
              dataSourceId: 'products',
              stateMapping: { setProducts: 'data.list' },
            },
          },
          { id: 'end', type: 'end', label: 'End', position: { x: 0, y: 200 } },
        ],
      },
    },
  ],
} as any

describe('generateWorkflowHandlers with stateMapping', () => {
  it('generates stateSetters parameter in handler signature', () => {
    const code = generateWorkflowHandlers(schemaWithStateMapping)
    expect(code).toContain('stateSetters: { setProducts: (v: any) => void }')
    expect(code).toContain('export async function loadProducts(')
  })

  it('handler body contains stateSetters call', () => {
    const code = generateWorkflowHandlers(schemaWithStateMapping)
    expect(code).toContain('stateSetters.setProducts(')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @forgestudio/editor test -- --reporter=verbose 2>&1 | head -60
```
Expected: FAIL — handler signature has no `stateSetters` parameter.

**Step 3: Implement — update `generateWorkflowHandlers()`**

In `packages/editor/src/codegen/index.ts`, replace the function signature line:
```typescript
// Old:
lines.push(`export async function ${handler.name}(${handler.params.join(', ')}) {`)

// New:
let paramsStr = handler.params.join(', ')
if (handler.stateSetterNames && handler.stateSetterNames.length > 0) {
  const typeEntries = handler.stateSetterNames.map(n => `${n}: (v: any) => void`).join('; ')
  const setterParam = `stateSetters: { ${typeEntries} }`
  paramsStr = paramsStr ? `${setterParam}, ${paramsStr}` : setterParam
}
lines.push(`export async function ${handler.name}(${paramsStr}) {`)
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @forgestudio/editor test -- --reporter=verbose 2>&1 | head -60
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/editor/src/codegen/index.ts packages/editor/src/codegen/workflow-statemap.test.ts
git commit -m "feat(workflow): emit stateSetters typed parameter in generated handler signature"
```

---

### Task 3: Extend `IRPage.onLoadWorkflow` with `stateSetters` and populate it

**Files:**
- Modify: `packages/codegen-core/src/ir.ts`
- Modify: `packages/codegen-core/src/transformer.ts`
- Test: `packages/codegen-core/src/transformer.test.ts` (new or existing)

**Step 1: Write the failing test**

Create `packages/codegen-core/src/transformer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { transformFSPtoIR } from './transformer'
import type { FSPSchema } from '@forgestudio/protocol'

const schemaWithStateMapping: FSPSchema = {
  meta: { name: 'TestApp', version: '1.0' },
  pages: [
    {
      id: 'page1',
      name: 'index',
      title: 'Index',
      path: '/pages/index/index',
      componentTree: { id: 'root', component: 'Page', props: {}, styles: {}, children: [] },
      onLoadWorkflow: { workflowId: 'wf1' },
    },
  ],
  workflows: [
    {
      id: 'wf1',
      name: 'loadProducts',
      inline: {
        id: 'wf1', name: 'loadProducts', type: 'data-orchestration', version: '1',
        variables: [], edges: [
          { id: 'e1', source: 'start', target: 'n1' },
          { id: 'e2', source: 'n1', target: 'end' },
        ],
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
          {
            id: 'n1', type: 'action', label: 'Fetch',
            position: { x: 0, y: 100 },
            actionType: 'callApi',
            outputVar: 'result',
            config: {
              dataSourceId: 'products',
              stateMapping: { setProducts: 'data.list', setTotal: 'data.total' },
            },
          },
          { id: 'end', type: 'end', label: 'End', position: { x: 0, y: 200 } },
        ],
      },
    },
  ],
} as any

describe('transformFSPtoIR with stateMapping', () => {
  it('populates onLoadWorkflow.stateSetters from callApi stateMapping', () => {
    const ir = transformFSPtoIR(schemaWithStateMapping)
    const page = ir.pages[0]
    expect(page.onLoadWorkflow).toBeDefined()
    expect(page.onLoadWorkflow!.stateSetters).toEqual(
      expect.arrayContaining(['setProducts', 'setTotal'])
    )
  })

  it('stateSetters is undefined when no stateMapping in workflow', () => {
    const schemaNoMapping: FSPSchema = {
      meta: { name: 'TestApp', version: '1.0' },
      pages: [
        {
          id: 'page1',
          name: 'index',
          title: 'Index',
          path: '/pages/index/index',
          componentTree: { id: 'root', component: 'Page', props: {}, styles: {}, children: [] },
          onLoadWorkflow: { workflowId: 'wf2' },
        },
      ],
      workflows: [
        {
          id: 'wf2',
          name: 'simpleFlow',
          inline: {
            id: 'wf2', name: 'simpleFlow', type: 'data-orchestration', version: '1',
            variables: [], edges: [
              { id: 'e1', source: 'start', target: 'n1' },
              { id: 'e2', source: 'n1', target: 'end' },
            ],
            nodes: [
              { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
              {
                id: 'n1', type: 'action', label: 'Toast',
                position: { x: 0, y: 100 },
                actionType: 'showToast',
                config: { title: 'Hello' },
              },
              { id: 'end', type: 'end', label: 'End', position: { x: 0, y: 200 } },
            ],
          },
        },
      ],
    } as any
    const ir = transformFSPtoIR(schemaNoMapping)
    expect(ir.pages[0].onLoadWorkflow!.stateSetters).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @forgestudio/codegen-core test
```
Expected: FAIL — `stateSetters` is undefined.

**Step 3: Implement**

a) In `packages/codegen-core/src/ir.ts`, add `stateSetters` to `onLoadWorkflow`:
```typescript
onLoadWorkflow?: {
  workflowHandlerName: string
  outputVars: string[]
  stateSetters?: string[]  // setter function names needed for stateMapping
}
```

b) In `packages/codegen-core/src/transformer.ts`, in `transformPageToIR()` around line 763, after the existing outputVars collection loop, add:
```typescript
// Collect stateSetters from callApi stateMapping
const stateSetters: string[] = []
if (wfSchema.nodes) {
  for (const n of wfSchema.nodes) {
    if (n.type === 'action' && n.actionType === 'callApi' && n.config?.stateMapping) {
      const mapping = n.config.stateMapping as Record<string, string>
      for (const setterName of Object.keys(mapping)) {
        if (!stateSetters.includes(setterName)) {
          stateSetters.push(setterName)
        }
      }
    }
  }
}
onLoadWorkflow = {
  workflowHandlerName: handlerName,
  outputVars,
  stateSetters: stateSetters.length > 0 ? stateSetters : undefined,
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @forgestudio/codegen-core test
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/codegen-core/src/ir.ts packages/codegen-core/src/transformer.ts packages/codegen-core/src/transformer.test.ts
git commit -m "feat(ir): add stateSetters to onLoadWorkflow and populate from callApi stateMapping"
```

---

### Task 4: Pass state setters in `useLoad` call in `generate-tsx.ts`

**Files:**
- Modify: `packages/codegen-taro/src/generate-tsx.ts`
- Test: `packages/codegen-taro/src/generate-tsx.test.ts`

**Step 1: Write the failing test**

Add to `packages/codegen-taro/src/generate-tsx.test.ts`:

```typescript
it('passes stateSetters to workflow handler in useLoad when stateSetters present', () => {
  const ir: IRPage = {
    id: 'page1', name: 'index', title: 'Index', path: '/pages/index/index',
    imports: [], stateVars: [], effects: [], handlers: [],
    renderTree: { tag: 'View', props: {}, children: [] },
    styles: { rules: [] },
    onLoadWorkflow: {
      workflowHandlerName: 'loadProducts',
      outputVars: ['result'],
      stateSetters: ['setProducts', 'setTotal'],
    },
  }
  const code = generateTSX(ir)
  expect(code).toContain('await loadProducts({ setProducts, setTotal })')
})

it('calls workflow handler without args when no stateSetters', () => {
  const ir: IRPage = {
    id: 'page1', name: 'index', title: 'Index', path: '/pages/index/index',
    imports: [], stateVars: [], effects: [], handlers: [],
    renderTree: { tag: 'View', props: {}, children: [] },
    styles: { rules: [] },
    onLoadWorkflow: {
      workflowHandlerName: 'loadProducts',
      outputVars: [],
    },
  }
  const code = generateTSX(ir)
  expect(code).toContain('await loadProducts()')
  expect(code).not.toContain('stateSetters')
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @forgestudio/codegen-taro test
```
Expected: FAIL — `useLoad` always generates `await loadProducts()` without args.

**Step 3: Implement — update `generateTSX()`**

In `packages/codegen-taro/src/generate-tsx.ts`, replace the `useLoadCode` block (lines 91-93):
```typescript
// Old:
const useLoadCode = ir.onLoadWorkflow
  ? `  useLoad(async () => {\n    await ${ir.onLoadWorkflow.workflowHandlerName}()\n  })`
  : ''

// New:
let useLoadCode = ''
if (ir.onLoadWorkflow) {
  const setters = ir.onLoadWorkflow.stateSetters
  const argsStr = setters && setters.length > 0
    ? `{ ${setters.join(', ')} }`
    : ''
  useLoadCode = `  useLoad(async () => {\n    await ${ir.onLoadWorkflow.workflowHandlerName}(${argsStr})\n  })`
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm --filter @forgestudio/codegen-taro test
```
Expected: PASS

**Step 5: Commit**

```bash
git add packages/codegen-taro/src/generate-tsx.ts packages/codegen-taro/src/generate-tsx.test.ts
git commit -m "feat(codegen-taro): pass stateSetters to workflow handler in useLoad"
```

---

### Task 5: Full test suite verification

**Step 1: Run all tests**

```bash
cd /Users/peakom/worko/forgestudio
pnpm test 2>&1 | tail -30
```
Expected: All tests PASS (83+ tests).

**Step 2: Build check**

```bash
pnpm build 2>&1 | tail -20
```
Expected: Build succeeds.

**Step 3: Commit and push**

```bash
git push origin dev/20260227
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `packages/codegen-workflow/src/transformer.ts` | Add `stateSetterNames`, `collectSetterNames()`, extend callApi codegen |
| `packages/editor/src/codegen/index.ts` | Generate typed `stateSetters` param in handler signature |
| `packages/codegen-core/src/ir.ts` | Add `stateSetters?: string[]` to `onLoadWorkflow` |
| `packages/codegen-core/src/transformer.ts` | Populate `stateSetters` from workflow nodes |
| `packages/codegen-taro/src/generate-tsx.ts` | Pass state setters in `useLoad` call |

## Example: Final Generated Code

Given a page with `onLoadWorkflow` referencing a workflow with a callApi node that has `stateMapping`:

**`src/workflow-handlers.ts`:**
```typescript
export async function loadPage(stateSetters: { setProducts: (v: any) => void; setTotal: (v: any) => void }) {
  let result
  try {
    result = await fetch_products()
  } catch (error) {
    throw new Error('API 调用失败')
  }
  stateSetters.setProducts(result?.data?.list)
  stateSetters.setTotal(result?.data?.total)
}
```

**`src/pages/index/index.tsx`:**
```typescript
import { useState, useLoad } from 'react'
import Taro from '@tarojs/taro'
import { loadPage } from '../workflow-handlers'

export default function Index() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)

  useLoad(async () => {
    await loadPage({ setProducts, setTotal })
  })

  return (...)
}
```
