import React, { useState } from 'react'
import { useEditorStore } from '../store'
import type { DataSourceDef } from '@forgestudio/protocol'

export function DataSourcePanel() {
  const schema = useEditorStore((s) => s.schema)
  const addDataSource = useEditorStore((s) => s.addDataSource)
  const updateDataSource = useEditorStore((s) => s.updateDataSource)
  const removeDataSource = useEditorStore((s) => s.removeDataSource)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    method: 'GET' as 'GET' | 'POST',
    autoFetch: true,
    mockData: `{
  "data": [
    {"id": 1, "title": "商品1", "description": "这是商品1的描述", "price": 99, "image": "https://via.placeholder.com/150"},
    {"id": 2, "title": "商品2", "description": "这是商品2的描述", "price": 199, "image": "https://via.placeholder.com/150"},
    {"id": 3, "title": "商品3", "description": "这是商品3的描述", "price": 299, "image": "https://via.placeholder.com/150"}
  ]
}`,
  })

  const dataSources = schema.dataSources ?? []

  const defaultMockData = `{
  "data": [
    {"id": 1, "title": "商品1", "description": "这是商品1的描述", "price": 99, "image": "https://via.placeholder.com/150"},
    {"id": 2, "title": "商品2", "description": "这是商品2的描述", "price": 199, "image": "https://via.placeholder.com/150"},
    {"id": 3, "title": "商品3", "description": "这是商品3的描述", "price": 299, "image": "https://via.placeholder.com/150"}
  ]
}`

  const resetForm = () => {
    setFormData({ url: '', method: 'GET', autoFetch: true, mockData: defaultMockData })
    setEditingId(null)
  }

  const handleAdd = () => {
    try {
      const mockData = JSON.parse(formData.mockData)
      addDataSource({
        type: 'api',
        options: {
          url: formData.url,
          method: formData.method,
        },
        autoFetch: formData.autoFetch,
        mockData,
      })
      resetForm()
    } catch (e) {
      alert('Mock 数据格式错误，请输入有效的 JSON')
    }
  }

  const handleUpdate = (id: string) => {
    try {
      const mockData = JSON.parse(formData.mockData)
      updateDataSource(id, {
        options: {
          url: formData.url,
          method: formData.method,
        },
        autoFetch: formData.autoFetch,
        mockData,
      })
      resetForm()
    } catch (e) {
      alert('Mock 数据格式错误，请输入有效的 JSON')
    }
  }

  const handleEdit = (ds: DataSourceDef) => {
    setEditingId(ds.id)
    setFormData({
      url: ds.options.url,
      method: ds.options.method,
      autoFetch: ds.autoFetch,
      mockData: JSON.stringify(ds.mockData, null, 2),
    })
  }

  const handleTestApi = async () => {
    if (!formData.url) {
      alert('请先填写 URL')
      return
    }
    setTesting(true)
    try {
      // 将常用域名转换为代理路径
      let requestUrl = formData.url
      const proxyMappings = [
        { domain: 'reqres.in', proxy: '/api-proxy/reqres' },
        { domain: 'dummyjson.com', proxy: '/api-proxy/dummyjson' },
        { domain: 'jsonplaceholder.typicode.com', proxy: '/api-proxy/jsonplaceholder' },
      ]

      for (const mapping of proxyMappings) {
        if (formData.url.includes(mapping.domain)) {
          requestUrl = formData.url.replace(`https://${mapping.domain}`, mapping.proxy)
          break
        }
      }

      const res = await fetch(requestUrl, { method: formData.method })
      const data = await res.json()

      // 使用与生成代码相同的 extractList 逻辑
      let list: any[] = []
      if (Array.isArray(data)) {
        list = data
      } else if (data && typeof data === 'object') {
        for (const val of Object.values(data)) {
          if (Array.isArray(val)) {
            list = val
            break
          }
        }
      }

      if (list.length === 0) {
        alert('接口返回数据中未找到数组，请检查接口')
        return
      }

      // 只取前 3 条作为 mock 数据
      const mockData = { data: list.slice(0, 3) }
      setFormData({ ...formData, mockData: JSON.stringify(mockData, null, 2) })
      alert(`成功获取 ${list.length} 条数据，已填充前 3 条到 Mock 数据`)
    } catch (e) {
      alert('接口请求失败: ' + (e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="forge-editor-panel forge-editor-panel--right">
      <div className="forge-editor-tabs">
        <button
          className={`forge-editor-tab ${rightPanelTab === 'props' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('props')}
        >
          属性
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'datasource' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('datasource')}
        >
          数据源
        </button>
        <button
          className={`forge-editor-tab ${rightPanelTab === 'code' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('code')}
        >
          代码
        </button>
      </div>
      <div className="forge-editor-panel__title">数据源管理</div>

      <div className="forge-editor-panel__section">现有数据源</div>
      {dataSources.length === 0 && (
        <div style={{ padding: '12px', color: '#999', fontSize: 13 }}>
          暂无数据源
        </div>
      )}
      {dataSources.map((ds) => (
        <div
          key={ds.id}
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{ds.id}</div>
          <div style={{ color: '#666', fontSize: 12 }}>
            {ds.options.method} {ds.options.url}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={() => handleEdit(ds)}
            >
              编辑
            </button>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={() => removeDataSource(ds.id)}
            >
              删除
            </button>
          </div>
        </div>
      ))}

      <div className="forge-editor-panel__section">
        {editingId ? '编辑数据源' : '添加数据源'}
      </div>

      <div style={{ padding: '0 12px' }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
            URL
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.example.com/data"
              style={{
                flex: 1,
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={handleTestApi}
              disabled={testing || !formData.url}
              style={{ whiteSpace: 'nowrap' }}
            >
              {testing ? '测试中...' : '测试接口'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
            方法
          </label>
          <select
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as 'GET' | 'POST' })}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={formData.autoFetch}
              onChange={(e) => setFormData({ ...formData, autoFetch: e.target.checked })}
            />
            自动获取
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
            Mock 数据
          </label>
          <textarea
            value={formData.mockData}
            onChange={(e) => setFormData({ ...formData, mockData: e.target.value })}
            placeholder='{"data": [{"id": 1, "name": "示例"}]}'
            rows={6}
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
        </div>

        {editingId ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="forge-editor-btn forge-editor-btn--primary"
              onClick={() => handleUpdate(editingId)}
            >
              保存
            </button>
            <button
              className="forge-editor-btn"
              onClick={resetForm}
            >
              取消
            </button>
          </div>
        ) : (
          <button
            className="forge-editor-btn forge-editor-btn--primary"
            onClick={handleAdd}
            style={{ width: '100%' }}
          >
            添加数据源
          </button>
        )}
      </div>
    </div>
  )
}
