// Style conversion utilities

// Whitelist of supported CSS properties for M1.2
const SUPPORTED_STYLE_PROPS = new Set([
  'width',
  'height',
  'minHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'color',
  'textAlign',
  'lineHeight',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
])

// Numeric properties that need px suffix
const NUMERIC_PX_PROPS = new Set([
  'width',
  'height',
  'minHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontSize',
  'lineHeight',
  'borderRadius',
  'borderWidth',
  'gap',
])

export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

export function formatStyleValue(prop: string, value: unknown): string | null {
  if (!SUPPORTED_STYLE_PROPS.has(prop)) return null
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number' && NUMERIC_PX_PROPS.has(prop)) {
    return `${value}px`
  }

  return String(value)
}
