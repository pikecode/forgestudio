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
  const [testBody, setTestBody] = useState('')

  const handleTestApi = async () => {
    if (!url) {
      alert('请先填写 URL')
      return
    }

    // For mutation methods, check if we need test body
    if (method !== 'GET' && !testBody && body) {
      alert('请填写测试请求体数据')
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

      // Prepare request body
      let requestBody: string | undefined
      if (method !== 'GET') {
        if (testBody) {
          requestBody = testBody
        } else if (body && !body.includes('{{')) {
          // Use body template if it doesn't contain placeholders
          requestBody = body
        }
      }

      const res = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: requestBody
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

      {/* Test body input for mutation methods */}
      {method !== 'GET' && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
            测试请求体（JSON）
          </label>
          <textarea
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder='{"title": "测试标题", "body": "测试内容", "userId": 1}'
            rows={4}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'Monaco, monospace',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
            💡 填写用于测试的 JSON 数据，测试成功后会提取响应字段
          </div>
        </div>
      )}

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
