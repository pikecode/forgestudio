export function generatePageConfig(title: string): string {
  return `import { definePageConfig } from '@tarojs/taro'

export default definePageConfig({
  navigationBarTitleText: '${title}',
})
`
}
