import React, { useState, useEffect } from 'react'
import type { DataSourceTemplateConfig } from '../datasource-templates'

interface DataSourceWizardProps {
  template: DataSourceTemplateConfig
  onSubmit: (data: {
    url: string
    method: 'GET' | 'POST'
    dataType: 'array' | 'object'
    autoFetch: boolean
    sampleData: string
    dependsOn?: string[]
  }) => void
  onCancel: () => void
  existingDataSources: Array<{ id: string }>
}

export function DataSourceWizard({ template, onSubmit, onCancel, existingDataSources }: DataSourceWizardProps) {
  const [resourceName, setResourceName] = useState('products')
  const [url, setUrl] = useState('')
  const [autoFetch, setAutoFetch] = useState(true)
  const [sampleData, setSampleData] = useState('')
  const [dependsOn, setDependsOn] = useState<string[]>([])

  // 生成 URL 和示例数据
  useEffect(() => {
    const generatedUrl = template.urlTemplate.replace('{resource}', resourceName)
    setUrl(generatedUrl)

    const generated = template.sampleDataGenerator()
    setSampleData(JSON.stringify(generated, null, 2))
  }, [resourceName, template])

  // 检测 URL 中的参数
  const detectedParams = url.match(/\{\{\$param\.(\w+)\}\}/g)?.map(match => {
    return match.replace(/\{\{\$param\.|}\}/g, '')
  }) || []

  const handleSubmit = () => {
    try {
      // 验证 JSON
      JSON.parse(sampleData)

      onSubmit({
        url,
        method: template.method,
        dataType: template.dataType,
        autoFetch,
        sampleData,
        dependsOn: dependsOn.length > 0 ? dependsOn : undefined
      })
    } catch (e) {
      alert('示例数据格式错误，请输入有效的 JSON')
    }
  }

  return (
    <div style={{ padding: '0 12px 12px' }}>
      <div style={{
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        marginBottom: 12,
        fontSize: 13
      }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          {template.icon} {template.title}
        </div>
        <div style={{ color: '#666', fontSize: 12 }}>
          {template.description}
        </div>
      </div>

      {/* 资源名称 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
          资源名称
        </label>
        <input
          type="text"
          value={resourceName}
          onChange={(e) => setResourceName(e.target.value)}
          placeholder="如: products, users"
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            fontSize: 13
          }}
        />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          用于生成接口 URL
        </div>
      </div>

      {/* 生成的 URL */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
          接口 URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'Monaco, monospace'
          }}
        />
      </div>

      {/* 参数提示 */}
      {detectedParams.length > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 4,
          marginBottom: 12,
          fontSize: 12
        }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            ⚠️ 此接口需要参数
          </div>
          <div style={{ color: '#666' }}>
            参数: <code style={{
              backgroundColor: '#fff',
              padding: '2px 4px',
              borderRadius: 2,
              fontFamily: 'Monaco, monospace'
            }}>
              {detectedParams.join(', ')}
            </code>
          </div>
          <div style={{ color: '#666', marginTop: 4 }}>
            来源: 页面 URL 参数（通过页面跳转传入）
          </div>
        </div>
      )}

      {/* 自动获取 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={autoFetch}
            onChange={(e) => setAutoFetch(e.target.checked)}
          />
          页面加载时自动获取数据
        </label>
      </div>

      {/* 依赖数据源 */}
      {existingDataSources.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
            依赖数据源（可选）
          </label>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>
            选择必须先加载的数据源
          </div>
          {existingDataSources.map(ds => (
            <label
              key={ds.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                marginBottom: 4,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={dependsOn.includes(ds.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDependsOn([...dependsOn, ds.id])
                  } else {
                    setDependsOn(dependsOn.filter(id => id !== ds.id))
                  }
                }}
              />
              {ds.id}
            </label>
          ))}
        </div>
      )}

      {/* 示例数据 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
          示例数据
        </label>
        <textarea
          value={sampleData}
          onChange={(e) => setSampleData(e.target.value)}
          rows={8}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'Monaco, monospace',
            resize: 'vertical'
          }}
        />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          格式: [...]（数组）或 {`{"data": [...]}`}（对象包裹）
        </div>
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="forge-editor-btn forge-editor-btn--primary"
          onClick={handleSubmit}
          style={{ flex: 1 }}
        >
          创建数据源
        </button>
        <button
          className="forge-editor-btn"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}
