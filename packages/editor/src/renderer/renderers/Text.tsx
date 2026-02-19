// Text component renderer
import React from 'react'
import { rendererRegistry, type ComponentRenderer } from '../registry'

const TextRenderer: ComponentRenderer = ({ style, evaluatedProps }) => {
  return (
    <span style={style}>
      {String(evaluatedProps.content ?? '')}
    </span>
  )
}

rendererRegistry.register('Text', TextRenderer)
