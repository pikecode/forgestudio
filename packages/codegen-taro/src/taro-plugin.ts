import type {
  CodegenPlugin,
  GeneratedProject,
  IRProject,
  IRPage,
} from '@forgestudio/codegen-core'
import { generateTSX } from './generate-tsx'
import { generateSCSS } from './generate-scss'
import { generatePackageJson } from './templates/package.json'
import { generateTsconfig } from './templates/tsconfig.json'
import { generateTaroConfig } from './templates/config-index.ts'
import { generateTaroDevConfig } from './templates/config-dev.ts'
import { generateTaroProdConfig } from './templates/config-prod.ts'
import { generateBabelConfig } from './templates/babel.config'
import { generateAppTs } from './templates/app.ts'
import { generateAppConfig } from './templates/app.config.ts'
import { generateAppScss } from './templates/app.scss'
import { generatePageConfig } from './templates/page.config.ts'
import { generateProjectConfig } from './templates/project.config.json'
import { generateIndexHtml } from './templates/index.html'
import { generateGlobalDts } from './templates/global.d.ts'

export class TaroCodegenPlugin implements CodegenPlugin {
  name = 'taro'

  generate(ir: IRProject): GeneratedProject {
    const files = []

    // Generate scaffold files
    files.push(
      { path: 'package.json', content: generatePackageJson(ir.appName) },
      { path: 'babel.config.js', content: generateBabelConfig() },
      { path: 'tsconfig.json', content: generateTsconfig() },
      { path: 'project.config.json', content: generateProjectConfig() },
      { path: 'config/index.ts', content: generateTaroConfig() },
      { path: 'config/dev.ts', content: generateTaroDevConfig() },
      { path: 'config/prod.ts', content: generateTaroProdConfig() },
      { path: 'src/app.tsx', content: generateAppTs() },
      { path: 'src/app.scss', content: generateAppScss() },
      { path: 'src/index.html', content: generateIndexHtml(ir.appName) },
      { path: 'types/global.d.ts', content: generateGlobalDts() },
    )

    // Generate app.config.ts with all page routes
    const pageRoutes = ir.pages.map(p => ({
      name: p.name,
      path: p.path.replace(/^\//, ''), // Remove leading slash
      title: p.title,
    }))
    files.push({
      path: 'src/app.config.ts',
      content: generateAppConfig(pageRoutes),
    })

    // Generate each page
    for (const page of ir.pages) {
      const tsx = generateTSX(page)
      const scss = generateSCSS(page.styles)
      const pagePath = page.path.replace(/^\//, '') // Remove leading slash

      files.push(
        { path: `src/${pagePath}.tsx`, content: tsx },
        { path: `src/${pagePath}.scss`, content: scss },
        { path: `src/${pagePath}.config.ts`, content: generatePageConfig(page.title) },
      )
    }

    return { files }
  }
}
