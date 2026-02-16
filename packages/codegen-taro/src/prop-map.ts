const FIT_TO_MODE: Record<string, string> = {
  contain: 'aspectFit',
  cover: 'aspectFill',
  fill: 'scaleToFill',
  width: 'widthFix',
}

// Internal props that should not be rendered to JSX
const INTERNAL_PROPS = new Set(['dataSourceId', 'content', 'text'])

export function mapProps(
  tag: string,
  props: Record<string, any>,
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, expr] of Object.entries(props)) {
    if (INTERNAL_PROPS.has(key)) continue

    const val = expr.value ?? expr

    // Image-specific mappings
    if (tag === 'Image' && key === 'fit') {
      result['mode'] = `"${FIT_TO_MODE[String(val)] ?? 'aspectFill'}"`
      continue
    }
    if (tag === 'Image' && key === 'src') {
      result['src'] = `"${String(val)}"`
      continue
    }

    // Input-specific mappings
    if (tag === 'Input' && key === 'placeholder') {
      result['placeholder'] = `"${String(val)}"`
      continue
    }
    if (tag === 'Input' && key === 'type') {
      result['type'] = `"${String(val)}"`
      continue
    }

    // Button-specific mappings
    if (tag === 'Button' && key === 'type') {
      result['type'] = `"${String(val)}"`
      continue
    }
    if (tag === 'Button' && key === 'size') {
      result['size'] = `"${String(val)}"`
      continue
    }

    // Generic fallback
    if (typeof val === 'string') {
      result[key] = `"${val}"`
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      result[key] = `{${val}}`
    }
  }

  return result
}
