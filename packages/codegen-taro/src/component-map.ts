export interface TaroComponentMapping {
  taroTag: string
  importSource: string
}

const COMPONENT_MAP: Record<string, TaroComponentMapping> = {
  View: { taroTag: 'View', importSource: '@tarojs/components' },
  Text: { taroTag: 'Text', importSource: '@tarojs/components' },
  Image: { taroTag: 'Image', importSource: '@tarojs/components' },
  Button: { taroTag: 'Button', importSource: '@tarojs/components' },
  Input: { taroTag: 'Input', importSource: '@tarojs/components' },
}

export function getTaroMapping(tag: string): TaroComponentMapping {
  return (
    COMPONENT_MAP[tag] ?? { taroTag: tag, importSource: '@tarojs/components' }
  )
}
