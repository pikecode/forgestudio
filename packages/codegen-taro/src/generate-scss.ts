import type { IRStyleSheet } from '@forgestudio/codegen-core'

export function generateSCSS(styles: IRStyleSheet): string {
  return styles.rules
    .map((rule) => {
      const props = Object.entries(rule.properties)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')
      return `${rule.selector} {\n${props}\n}`
    })
    .join('\n\n')
}
