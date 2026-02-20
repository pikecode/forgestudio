export function generatePageConfig(title: string): string {
  return `export default {
  navigationBarTitleText: '${title}',
}
`
}
