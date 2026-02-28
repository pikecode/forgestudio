import { describe, it, expect } from 'vitest'
import { transformFSPtoIR } from './transformer'
import type { FSPSchema } from '@forgestudio/protocol'

const schemaWithStateMapping = {
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
} as unknown as FSPSchema

const schemaWithoutStateMapping = {
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
} as unknown as FSPSchema

describe('transformFSPtoIR with onLoadWorkflow stateMapping', () => {
  it('populates stateSetters from callApi stateMapping in workflow nodes', () => {
    const ir = transformFSPtoIR(schemaWithStateMapping)
    const page = ir.pages[0]
    expect(page.onLoadWorkflow).toBeDefined()
    expect(page.onLoadWorkflow!.stateSetters).toEqual(
      expect.arrayContaining(['setProducts', 'setTotal'])
    )
    expect(page.onLoadWorkflow!.stateSetters).toHaveLength(2)
  })

  it('stateSetters is undefined when no stateMapping in workflow', () => {
    const ir = transformFSPtoIR(schemaWithoutStateMapping)
    const page = ir.pages[0]
    expect(page.onLoadWorkflow).toBeDefined()
    expect(page.onLoadWorkflow!.stateSetters).toBeUndefined()
  })
})
