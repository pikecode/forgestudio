import type {
  CodegenPlugin,
  GeneratedProject,
  IRPage,
} from '@forgestudio/codegen-core'
import { generateTSX } from './generate-tsx'
import { generateSCSS } from './generate-scss'
import { generatePackageJson } from './templates/package.json'
import { generateTsconfig } from './templates/tsconfig.json'
import { generateTaroConfig } from './templates/config-index.ts'
import { generateAppTs } from './templates/app.ts'
import { generateAppConfig } from './templates/app.config.ts'
import { generateAppScss } from './templates/app.scss'
import { generatePageConfig } from './templates/page.config.ts'
import { generateProjectConfig } from './templates/project.config.json'

export class TaroCodegenPlugin implements CodegenPlugin {
  name = 'taro'

  generate(ir: IRPage): GeneratedProject {
    const tsx = generateTSX(ir)
    const scss = generateSCSS(ir.styles)

    return {
      files: [
        { path: 'package.json', content: generatePackageJson(ir.name) },
        { path: 'tsconfig.json', content: generateTsconfig() },
        { path: 'config/index.ts', content: generateTaroConfig() },
        { path: 'src/app.ts', content: generateAppTs() },
        { path: 'src/app.config.ts', content: generateAppConfig() },
        { path: 'src/app.scss', content: generateAppScss() },
        { path: 'src/pages/index/index.tsx', content: tsx },
        { path: 'src/pages/index/index.scss', content: scss },
        {
          path: 'src/pages/index/index.config.ts',
          content: generatePageConfig(ir.name),
        },
        { path: 'project.config.json', content: generateProjectConfig() },
      ],
    }
  }
}
