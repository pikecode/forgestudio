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
  List: { taroTag: 'View', importSource: '@tarojs/components' },
  Card: { taroTag: 'View', importSource: '@tarojs/components' },
  Switch: { taroTag: 'Switch', importSource: '@tarojs/components' },
  Textarea: { taroTag: 'Textarea', importSource: '@tarojs/components' },
  ScrollView: { taroTag: 'ScrollView', importSource: '@tarojs/components' },
  Form: { taroTag: 'Form', importSource: '@tarojs/components' },
  Swiper: { taroTag: 'Swiper', importSource: '@tarojs/components' },
  SwiperItem: { taroTag: 'SwiperItem', importSource: '@tarojs/components' },
  Modal: { taroTag: 'View', importSource: '@tarojs/components' }, // Modal uses View for now
}

export function getTaroMapping(tag: string): TaroComponentMapping {
  return (
    COMPONENT_MAP[tag] ?? { taroTag: tag, importSource: '@tarojs/components' }
  )
}
