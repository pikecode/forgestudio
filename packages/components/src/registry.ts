import type { ComponentMeta } from '@forgestudio/protocol'
import {
  PageMeta,
  ViewMeta,
  TextMeta,
  ImageMeta,
  ButtonMeta,
  InputMeta,
} from './meta'

const registry = new Map<string, ComponentMeta>()

function register(meta: ComponentMeta) {
  registry.set(meta.name, meta)
}

// Register built-in components
register(PageMeta)
register(ViewMeta)
register(TextMeta)
register(ImageMeta)
register(ButtonMeta)
register(InputMeta)

export function getComponentMeta(name: string): ComponentMeta | undefined {
  return registry.get(name)
}

export function getAllComponentMetas(): ComponentMeta[] {
  return Array.from(registry.values())
}

/** Components available in the component panel (excludes Page) */
export function getDraggableComponents(): ComponentMeta[] {
  return getAllComponentMetas().filter((m) => m.name !== 'Page')
}
