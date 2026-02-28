import { describe, it, expect } from 'vitest'
import { generateWorkflowHandlers } from './index'
import type { FSPSchema } from '@forgestudio/protocol'

const schemaWithStateMapping = {
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
} as unknown as FSPSchema

const schemaWithoutStateMapping = {
  meta: { name: 'TestApp', version: '1.0' },
  componentTree: { id: 'root', component: 'Page', props: {}, styles: {}, children: [] },
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

describe('generateWorkflowHandlers with stateMapping', () => {
  it('generates stateSetters typed parameter in handler signature', () => {
    const code = generateWorkflowHandlers(schemaWithStateMapping)
    expect(code).toContain('stateSetters: { setProducts: (v: any) => void }')
    expect(code).toContain('export async function loadProducts(')
  })

  it('handler body contains stateSetters call', () => {
    const code = generateWorkflowHandlers(schemaWithStateMapping)
    expect(code).toContain('stateSetters.setProducts(')
  })

  it('does not add stateSetters when no stateMapping', () => {
    const code = generateWorkflowHandlers(schemaWithoutStateMapping)
    expect(code).not.toContain('stateSetters')
    expect(code).toContain('export async function simpleFlow()')
  })
})
