/**
 * Register all 8 custom WFP node types with LogicFlow v2.
 *
 * LogicFlow v2 supports two registration methods:
 *   1. lf.register({ type, view, model })  — class-based
 *   2. lf.register(type, ({ RectNode, RectNodeModel, ... }) => ({ view, model }))  — factory function
 *
 * We use method 2 (factory function) because LF v2 injects the built-in base classes
 * as parameters, so we do not need to import them directly (avoiding potential
 * type resolution issues with the bundler-resolution tsconfig).
 */

/** Visual configuration for each WFP node type */
export interface NodeStyleConfig {
  fill: string
  stroke: string
  strokeWidth: number
  /** For circle nodes: radius override on the model */
  r?: number
  /** For rect/rounded-rect nodes: border-radius */
  radius?: number
  /** Default width (rect-based nodes) */
  width?: number
  /** Default height (rect-based nodes) */
  height?: number
}

export const NODE_STYLES: Readonly<Record<string, NodeStyleConfig>> = {
  start:      { fill: '#52c41a', stroke: '#389e0d', strokeWidth: 2, r: 24, width: 48, height: 48 },
  end:        { fill: '#ff4d4f', stroke: '#cf1322', strokeWidth: 2, r: 24, width: 48, height: 48 },
  action:     { fill: '#1890ff', stroke: '#096dd9', strokeWidth: 2, radius: 8,  width: 120, height: 48 },
  condition:  { fill: '#fa8c16', stroke: '#d46b08', strokeWidth: 2,              width: 110, height: 70 },
  parallel:   { fill: '#722ed1', stroke: '#531dab', strokeWidth: 2, radius: 4,  width: 44,  height: 44 },
  wait:       { fill: '#f5f5f5', stroke: '#bfbfbf', strokeWidth: 2, radius: 22, width: 100, height: 44 },
  subprocess: { fill: '#13c2c2', stroke: '#08979c', strokeWidth: 2, radius: 6,  width: 130, height: 50 },
  loop:       { fill: '#eb2f96', stroke: '#c41d7f', strokeWidth: 2, radius: 6,  width: 110, height: 46 },
} as const

/** Node types that should render as circles */
const CIRCLE_TYPES = new Set<string>(['start', 'end'])

/** Node types that should render as diamonds (condition / decision) */
const DIAMOND_TYPES = new Set<string>(['condition'])

/**
 * Register all 8 custom node types into a LogicFlow v2 instance.
 * Uses the factory-function overload so LF injects its own base classes.
 *
 * @param lf — LogicFlow instance (typed as `any` because the LF v2 class
 *             is a CommonJS default export whose ESM interop can vary)
 */
export function registerCustomNodes(lf: any): void {
  Object.entries(NODE_STYLES).forEach(([nodeType, style]) => {
    try {
      lf.register(
        nodeType,
        (params: Record<string, any>) => {
          if (CIRCLE_TYPES.has(nodeType)) {
            return buildCircleElement(params, style)
          }
          if (DIAMOND_TYPES.has(nodeType)) {
            return buildDiamondElement(params, style)
          }
          return buildRectElement(params, style)
        },
      )
    } catch {
      // Registration may fail if the node type was already registered in a
      // prior render cycle (e.g. HMR).  We silently skip duplicates.
    }
  })
}

// ---------------------------------------------------------------------------
// Private factory helpers
// ---------------------------------------------------------------------------

function buildCircleElement(
  params: Record<string, any>,
  style: NodeStyleConfig,
): { view: any; model: any } {
  const { CircleNode, CircleNodeModel } = params

  class View extends CircleNode {}

  class Model extends CircleNodeModel {
    setAttributes() {
      this.r = style.r ?? 24
    }
    getNodeStyle() {
      const base = super.getNodeStyle()
      return {
        ...base,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
      }
    }
  }

  return { view: View, model: Model }
}

function buildDiamondElement(
  params: Record<string, any>,
  style: NodeStyleConfig,
): { view: any; model: any } {
  const { DiamondNode, DiamondNodeModel } = params

  class View extends DiamondNode {}

  class Model extends DiamondNodeModel {
    setAttributes() {
      this.rx = (style.width ?? 110) / 2
      this.ry = (style.height ?? 70) / 2
    }
    getNodeStyle() {
      const base = super.getNodeStyle()
      return {
        ...base,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
      }
    }
  }

  return { view: View, model: Model }
}

function buildRectElement(
  params: Record<string, any>,
  style: NodeStyleConfig,
): { view: any; model: any } {
  const { RectNode, RectNodeModel } = params

  class View extends RectNode {}

  class Model extends RectNodeModel {
    setAttributes() {
      this.width  = style.width  ?? 120
      this.height = style.height ?? 48
      this.radius = style.radius ?? 4
    }
    getNodeStyle() {
      const base = super.getNodeStyle()
      return {
        ...base,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
      }
    }
  }

  return { view: View, model: Model }
}
