import type { IRPage } from './ir'

export interface CodegenPlugin {
  name: string
  generate(ir: IRPage): GeneratedProject
}

export interface GeneratedProject {
  files: GeneratedFile[]
}

export interface GeneratedFile {
  path: string      // relative path, e.g. 'src/pages/index/index.tsx'
  content: string
}
