import { useState } from 'react'
import { extractListFromResponse, extractFieldsFromData } from '../../utils/field-extractor'
import type { FieldSchema } from '@forgestudio/protocol'

interface DataSourceTesterProps {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body: string
  onTestSuccess: (fields: FieldSchema[], sampleData: unknown[]) => void
}

export function DataSourceTester({ url, method, headers, body, onTestSuccess }: DataSourceTesterProps) {
  const [testing, setTesting] = useState(false)
  const [testParams, setTestParams] = useState<Record<string, string>>({})

  const handleTestApi = async () => {
    if (!url) {
      alert('请先填写 URL')
      return
    }
    setTesting(true)
    try {
      // 替换 URL 中的参数占位符 {{$param.xxx}}
      let requestUrl = url
      const paramPattern = /\{\{\$param\.(\w+)\}\}/g
      requestUrl = requestUrl.replace(paramPattern, (match, paramName) => {
        const paramValue = testParams[paramName]
        if (!paramValue) {
          throw new Error(`参数 "${paramName}" 未设置测试值`)
        }
        return paramValue
      })

      // 将常用域名转换为代理路径
      const proxyMappings = [
        { domain: 'reqres.in', proxy: '/api-proxy/reqres' },
        { domain: 'dummyjson.com', proxy: '/api-proxy/dummyjson' },
        { domain: 'jsonplaceholder.typicode.com', proxy: '/api-proxy/jsonplaceholder' },
      ]

      for (const mapping of proxyMappings) {
        if (requestUrl.includes(mapping.domain)) {
          requestUrl = requestUrl.replace(`https://${mapping.domain}`, mapping.proxy)
          break
        }
      }

      const res = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' && body ? body : undefined
      })

      if (!res.ok) {
        alert(`接口返回错误：${res.status} ${res.statusText}`)
        return
      }
      const data = await res.json()

      // 使用新的字段提取器（支持单对象和数组）
      const fields = extractFieldsFromData(data)

      if (fields.length === 0) {
        alert('接口返回数据为空或格式不正确')
        return
      }

      // 缓存示例数据用于预览
      // 如果是数组，取前3条；如果是对象，包装成单元素数组
      let sampleData: any[]
      if (Array.isArray(data)) {
        sampleData = data.slice(0, 3)
      } else if (data && typeof data === 'object') {
        // 单对象 - 检查是否有包装字段
        const listData = extractListFromResponse(data)
        if (listData.length > 0) {
          sampleData = listData.slice(0, 3)
        } else {
          // 纯单对象详情接口
          sampleData = [data]
        }
      } else {
        sampleData = []
      }

      onTestSuccess(fields, sampleData)

      const dataType = Array.isArray(data) ? '数组' : '单对象'
      alert(`✅ 成功获取${dataType}数据\n检测到 ${fields.length} 个字段：${fields.map(f => f.name).join(', ')}`)
    } catch (e) {
      alert('接口请求失败: ' + (e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  // Detect params in URL
  const paramMatches = url.matchAll(/\{\{\$param\.(\w+)\}\}/g)
  const detectedParams = Array.from(paramMatches).map(m => m[1])

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="forge-editor-btn forge-editor-btn--small"
          onClick={handleTestApi}
          disabled={testing || !url}
          style={{ whiteSpace: 'nowrap' }}
        >
          {testing ? '测试中...' : '测试接口'}
        </button>
      </div>

      {/* Test params input (if URL contains {{$param.xxx}}) */}
      {detectedParams.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, background: '#f9f9f9', borderRadius: 4, border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
            💡 检测到参数化 URL，请填写测试参数：
          </div>
          {detectedParams.map(param => (
            <div key={param} style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>
                {param}
              </label>
              <input
                type="text"
                value={testParams[param] || ''}
                onChange={(e) => setTestParams({ ...testParams, [param]: e.target.value })}
                placeholder={`例如：${param === 'id' ? '1' : 'value'}`}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid #d0d0d0',
                  borderRadius: 3,
                  fontSize: 12,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
