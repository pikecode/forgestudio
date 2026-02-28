import type { FSPSchema } from '@forgestudio/protocol'
import type { GeneratedProject } from '@forgestudio/codegen-core'
import { transformFSPtoIR } from '@forgestudio/codegen-core'
import { TaroCodegenPlugin } from '@forgestudio/codegen-taro'
import { transformWorkflowToHandler } from '@forgestudio/codegen-workflow'
import type { WFPSchema } from '@forgestudio/workflow-protocol'

const taroPlugin = new TaroCodegenPlugin()

/** Generate workflow handler functions from FSP schema's workflows */
export function generateWorkflowHandlers(schema: FSPSchema): string {
  const workflows = schema.workflows ?? []
  if (workflows.length === 0) return ''

  const lines: string[] = [
    '// ============================================================',
    '// 工作流处理函数（自动生成，请勿手动修改）',
    '// ============================================================',
    '',
  ]

  for (const ref of workflows) {
    if (!ref.inline) continue
    try {
      const handler = transformWorkflowToHandler(ref.inline as WFPSchema)
      lines.push(`// 流程: ${ref.name}`)
      let paramsStr = handler.params.join(', ')
      if (handler.stateSetterNames && handler.stateSetterNames.length > 0) {
        const typeEntries = handler.stateSetterNames.map(n => `${n}: (v: any) => void`).join('; ')
        const setterParam = `stateSetters: { ${typeEntries} }`
        paramsStr = paramsStr ? `${setterParam}, ${paramsStr}` : setterParam
      }
      lines.push(`export async function ${handler.name}(${paramsStr}) {`)
      if (handler.body) {
        handler.body.split('\n').forEach(line => lines.push('  ' + line))
      }
      lines.push('}')
      lines.push('')
    } catch (error) {
      lines.push(`// ⚠ 生成流程 "${ref.id}" 代码失败: ${error}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function generateTaroProject(schema: FSPSchema): GeneratedProject {
  const irProject = transformFSPtoIR(schema)
  const result = taroPlugin.generate(irProject)

  const workflowCode = generateWorkflowHandlers(schema)
  if (workflowCode) {
    result.files.push({
      path: 'src/workflow-handlers.ts',
      content: workflowCode,
    })
  }

  return result
}
