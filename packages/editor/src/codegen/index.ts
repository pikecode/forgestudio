import type { FSPSchema } from '@forgestudio/protocol'
import type { GeneratedProject } from '@forgestudio/codegen-core'
import { transformFSPtoIR } from '@forgestudio/codegen-core'
import { TaroCodegenPlugin } from '@forgestudio/codegen-taro'

const taroPlugin = new TaroCodegenPlugin()

export function generateTaroProject(schema: FSPSchema): GeneratedProject {
  const irProject = transformFSPtoIR(schema)
  return taroPlugin.generate(irProject)
}
