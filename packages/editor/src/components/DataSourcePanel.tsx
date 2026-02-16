import React, { useState } from 'react'
import { useEditorStore } from '../store'
import type { DataSourceDef } from '@forgestudio/protocol'

export function DataSourcePanel() {
  const schema = useEditorStore((s) => s.schema)
  const addDataSource = useEditorStore((s) => s.addDataSource)
  const updateDataSource = useEditorStore((s) => s.updateDataSource)
  const removeDataSource = useEditorStore((s) => s.removeDataSource)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    url: '',
    method: 'GET' as 'GET' | 'POST',
    autoFetch: true,
    mockData: '{"data": []}',
  })

  const dataSources = schema.dataSources ?? []

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
      setFormData({ url: '', method: 'GET', autoFetch: true, mockData: '{"data": []}' })
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
      setEditingId(null)
      setFormData({ url: '', method: 'GET', autoFetch: true, mockData: '{"data": []}' })
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

  return (
    <div className="forge-editor-panel forge-editor-panel--right">
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
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://api.example.com/data"
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              fontSize: 13,
            }}
          />
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
              onClick={() => {
                setEditingId(null)
                setFormData({ url: '', method: 'GET', autoFetch: true, mockData: '{"data": []}' })
              }}
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
