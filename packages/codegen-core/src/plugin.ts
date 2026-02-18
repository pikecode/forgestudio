import type { IRProject, IRPage } from './ir'

export interface CodegenPlugin {
  name: string
  generate(ir: IRProject): GeneratedProject
  generatePage?(ir: IRPage): { tsx: string; scss: string }  // Optional: generate single page
}

export interface GeneratedProject {
  files: GeneratedFile[]
}

export interface GeneratedFile {
  path: string      // relative path, e.g. 'src/pages/index/index.tsx'
  content: string
}
