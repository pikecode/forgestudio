export function generateAppConfig(pages: Array<{ name: string; path: string; title: string }>): string {
  const pagePaths = pages.map(p => `'${p.path}'`).join(',\n    ')

  return `export default defineAppConfig({
  pages: [
    ${pagePaths}
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'ForgeStudio',
    navigationBarTextStyle: 'black',
  },
})
`
}
