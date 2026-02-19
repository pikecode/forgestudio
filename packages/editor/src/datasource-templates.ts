import type { DataSourceDef } from '@forgestudio/protocol'

export enum DataSourceTemplate {
  LIST = 'list',
  DETAIL = 'detail',
  SUBMIT = 'submit',
  CUSTOM = 'custom'
}

export interface DataSourceTemplateConfig {
  template: DataSourceTemplate
  title: string
  description: string
  icon: string
  urlTemplate: string
  method: 'GET' | 'POST'
  dataType: 'array' | 'object'
  sampleDataGenerator: () => any
  requiresParams?: string[]
  recommended?: boolean
}

export const DATASOURCE_TEMPLATES: Record<DataSourceTemplate, DataSourceTemplateConfig> = {
  [DataSourceTemplate.LIST]: {
    template: DataSourceTemplate.LIST,
    title: '列表接口',
    description: '获取多条数据，用于列表展示',
    icon: '🗂️',
    urlTemplate: '/api/products',
    method: 'GET',
    dataType: 'array',
    sampleDataGenerator: () => [
      { id: 1, title: '商品1', description: '这是商品1的描述', price: 99 },
      { id: 2, title: '商品2', description: '这是商品2的描述', price: 199 },
      { id: 3, title: '商品3', description: '这是商品3的描述', price: 299 }
    ]
  },
  [DataSourceTemplate.DETAIL]: {
    template: DataSourceTemplate.DETAIL,
    title: '详情接口',
    description: '获取单条数据，需要传入ID参数',
    icon: '📄',
    urlTemplate: '/api/products/{{$param.id}}',
    method: 'GET',
    dataType: 'object',
    requiresParams: ['id'],
    recommended: true,
    sampleDataGenerator: () => ({
      id: 1,
      title: '商品详情',
      description: '这是详细的商品描述，包含更多信息',
      price: 99,
      stock: 100,
      images: ['https://via.placeholder.com/300']
    })
  },
  [DataSourceTemplate.SUBMIT]: {
    template: DataSourceTemplate.SUBMIT,
    title: '提交接口',
    description: 'POST提交表单数据',
    icon: '✉️',
    urlTemplate: '/api/submit',
    method: 'POST',
    dataType: 'array',
    sampleDataGenerator: () => [{ success: true, message: '提交成功' }]
  },
  [DataSourceTemplate.CUSTOM]: {
    template: DataSourceTemplate.CUSTOM,
    title: '自定义',
    description: '完全自定义配置',
    icon: '⚙️',
    urlTemplate: '',
    method: 'GET',
    dataType: 'array',
    sampleDataGenerator: () => []
  }
}

/**
 * Detect URL parameters from template string
 * e.g. "/api/product/{{$param.id}}" -> ["id"]
 */
export function detectUrlParams(url: string): string[] {
  const regex = /\{\{\$param\.(\w+)\}\}/g
  const matches = [...url.matchAll(regex)]
  return matches.map(m => m[1])
}

/**
 * Create a DataSourceDef from template config
 */
export function createDataSourceFromTemplate(
  config: DataSourceTemplateConfig,
  customUrl?: string
): Omit<DataSourceDef, 'id'> {
  return {
    type: 'api',
    purpose: 'query',
    dataType: config.dataType,
    options: {
      url: customUrl || config.urlTemplate,
      method: config.method,
    },
    autoFetch: true,
    sampleData: config.sampleDataGenerator(),
  }
}
