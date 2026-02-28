import { describe, it, expect } from 'vitest'
import { generateTSX } from './generate-tsx'
import type { IRPage } from '@forgestudio/codegen-core'

describe('generateTSX', () => {
  it('should generate useLoad hook when onLoadWorkflow is present', () => {
    const ir: IRPage = {
      name: 'TestPage',
      path: '/pages/test/index',
      stateVars: [],
      effects: [],
      handlers: [],
      renderTree: {
        tag: 'View',
        props: {},
        children: [],
      },
      onLoadWorkflow: {
        workflowHandlerName: 'handleTestWorkflow',
        outputVars: ['result'],
      },
    }

    const code = generateTSX(ir)

    // Should import useLoad from react
    expect(code).toContain('useLoad')
    expect(code).toContain("import { useLoad } from 'react'")

    // Should import workflow handler
    expect(code).toContain("import { handleTestWorkflow } from '../workflow-handlers'")

    // Should generate useLoad hook body
    expect(code).toContain('useLoad(async () => {')
    expect(code).toContain('await handleTestWorkflow()')
  })

  it('should not generate useLoad hook when onLoadWorkflow is absent', () => {
    const ir: IRPage = {
      name: 'TestPage',
      path: '/pages/test/index',
      stateVars: [],
      effects: [],
      handlers: [],
      renderTree: {
        tag: 'View',
        props: {},
        children: [],
      },
    }

    const code = generateTSX(ir)

    // Should not import useLoad
    expect(code).not.toContain('useLoad')

    // Should not import workflow handlers
    expect(code).not.toContain("from '../workflow-handlers'")
  })

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

  it('calls workflow handler without args when stateSetters is absent', () => {
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
    expect(code).not.toContain('{ setProducts')
  })
})
