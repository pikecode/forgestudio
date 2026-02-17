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

    // Handle identifier type (for event handlers)
    if (expr.type === 'identifier') {
      result[key] = `{${expr.name}}`
      continue
    }

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

    // Switch-specific mappings
    if (tag === 'Switch' && key === 'checked') {
      result['checked'] = `{${val}}`
      continue
    }

    // Textarea-specific mappings
    if (tag === 'Textarea' && key === 'placeholder') {
      result['placeholder'] = `"${String(val)}"`
      continue
    }
    if (tag === 'Textarea' && key === 'maxlength') {
      result['maxlength'] = `{${val}}`
      continue
    }

    // ScrollView-specific mappings
    if (tag === 'ScrollView' && (key === 'scrollY' || key === 'scrollX')) {
      result[key] = `{${val}}`
      continue
    }
    if (tag === 'ScrollView' && key === 'height') {
      // Height is handled via style, skip here
      continue
    }

    // Swiper-specific mappings
    if (tag === 'Swiper' && key === 'autoplay') {
      result['autoplay'] = `{${val}}`
      continue
    }
    if (tag === 'Swiper' && key === 'interval') {
      result['interval'] = `{${val}}`
      continue
    }
    if (tag === 'Swiper' && key === 'circular') {
      result['circular'] = `{${val}}`
      continue
    }
    if (tag === 'Swiper' && key === 'height') {
      // Height is handled via style, skip here
      continue
    }

    // Modal-specific mappings
    if (tag === 'Modal' && key === 'visible') {
      result['visible'] = `{${val}}`
      continue
    }
    if (tag === 'Modal' && key === 'title') {
      result['title'] = `"${String(val)}"`
      continue
    }

    // Generic fallback
    if (typeof val === 'string') {
      // Handle {{expression}} - convert FSP variables to JSX
      if (val.startsWith('{{') && val.endsWith('}}')) {
        const expr = val.slice(2, -2).trim()
          .replace(/\$state\.(\w+)/g, '$1')
          .replace(/\$item\.(\w+)/g, 'item.$1')
          .replace(/\$ds\.(\w+)\.data/g, '$1Data')
          .replace(/^\$/, '')
        result[key] = `{${expr}}`
      } else {
        result[key] = `"${val}"`
      }
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      result[key] = `{${val}}`
    }
  }

  return result
}
