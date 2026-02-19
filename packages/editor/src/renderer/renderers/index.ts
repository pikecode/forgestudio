// Register all component renderers
// Import order matters - renderers register themselves on import

import './View'
import './Text'

// Export registry for external use
export { rendererRegistry } from '../registry'
