export function generatePageConfig(title: string): string {
  return `export default definePageConfig({
  navigationBarTitleText: '${title}',
})
`
}
