// Component Renderer Registry
import React from 'react'
import type { ComponentNode } from '@forgestudio/protocol'
import type { ExpressionContext } from '@forgestudio/data-binding'

export interface RendererProps {
  node: ComponentNode
  context?: ExpressionContext
  evaluatedProps: Record<string, any>
  style: React.CSSProperties
  renderChildren: () => React.ReactNode
}

export type ComponentRenderer = (props: RendererProps) => React.ReactNode

/**
 * Component Renderer Registry
 * Maps component names to their renderer functions
 */
class ComponentRendererRegistry {
  private renderers = new Map<string, ComponentRenderer>()

  /**
   * Register a renderer for a component
   */
  register(componentName: string, renderer: ComponentRenderer): void {
    this.renderers.set(componentName, renderer)
  }

  /**
   * Get renderer for a component
   */
  get(componentName: string): ComponentRenderer | undefined {
    return this.renderers.get(componentName)
  }

  /**
   * Check if a renderer is registered
   */
  has(componentName: string): boolean {
    return this.renderers.has(componentName)
  }

  /**
   * Get all registered component names
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.renderers.keys())
  }
}

// Export singleton instance
export const rendererRegistry = new ComponentRendererRegistry()

// Helper to create a simple container renderer
export function createContainerRenderer(
  tagName: 'div' | 'span' = 'div'
): ComponentRenderer {
  return ({ style, renderChildren }) => {
    const Tag = tagName
    return <Tag style={style}>{renderChildren()}</Tag>
  }
}
