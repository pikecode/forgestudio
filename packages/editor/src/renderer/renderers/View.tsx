// View component renderer
import React from 'react'
import { rendererRegistry, createContainerRenderer } from '../registry'

// Register View renderer
rendererRegistry.register('View', createContainerRenderer('div'))
