import { useState } from 'react'
import type { RequestParamDef } from '@forgestudio/protocol'

interface RequestParamsEditorProps {
  params: RequestParamDef[]
  onChange: (params: RequestParamDef[]) => void
}

export function RequestParamsEditor({ params, onChange }: RequestParamsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingParam, setEditingParam] = useState<Partial<RequestParamDef>>({})

  const handleAdd = () => {
    setEditingIndex(params.length)
    setEditingParam({
      name: '',
      type: 'string',
      required: false,
      location: 'body',
    })
  }

  const handleSave = () => {
    if (!editingParam.name) {
      alert('参数名称不能为空')
      return
    }

    const newParam: RequestParamDef = {
      name: editingParam.name,
      type: editingParam.type || 'string',
      required: editingParam.required || false,
      location: editingParam.location || 'body',
      description: editingParam.description,
      defaultValue: editingParam.defaultValue,
    }

    if (editingIndex !== null) {
      const newParams = [...params]
      if (editingIndex < params.length) {
        newParams[editingIndex] = newParam
      } else {
        newParams.push(newParam)
      }
      onChange(newParams)
    }

    setEditingIndex(null)
    setEditingParam({})
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditingParam({})
  }

  const handleDelete = (index: number) => {
    const newParams = params.filter((_, i) => i !== index)
    onChange(newParams)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditingParam({ ...params[index] })
  }

  const inputStyle = {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    fontSize: 13,
  }

  const labelStyle = {
    fontSize: 13,
    color: '#555',
    display: 'block',
    marginBottom: 4,
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <details style={{ border: '1px solid #e0e0e0', borderRadius: 4, padding: 8 }}>
        <summary style={{ fontSize: 13, color: '#555', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
          请求参数定义 {params.length > 0 && `(${params.length})`}
        </summary>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
            定义 API 接口的请求参数，包括参数名称、类型、是否必填等
          </div>

          {/* Parameters list */}
          {params.map((param, index) => (
            <div key={index} style={{ marginBottom: 6, padding: 8, backgroundColor: '#fafafa', borderRadius: 4, border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#333', marginBottom: 2 }}>
                    {param.name}
                    {param.required && <span style={{ color: '#f56', marginLeft: 4 }}>*</span>}
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#999' }}>
                      {param.type} · {param.location}
                    </span>
                  </div>
                  {param.description && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{param.description}</div>
                  )}
                  {param.defaultValue !== undefined && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      默认值: {JSON.stringify(param.defaultValue)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleEdit(index)}
                    style={{ padding: '2px 6px', fontSize: 11, color: '#1890ff', background: 'transparent', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer' }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    style={{ padding: '2px 6px', fontSize: 11, color: '#ff4d4f', background: 'transparent', border: '1px solid #ff4d4f', borderRadius: 3, cursor: 'pointer' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add/Edit form */}
          {editingIndex !== null ? (
            <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#1890ff' }}>
                {editingIndex < params.length ? '编辑参数' : '添加参数'}
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>
                  参数名称 <span style={{ color: '#f56' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editingParam.name || ''}
                  onChange={(e) => setEditingParam({ ...editingParam, name: e.target.value })}
                  placeholder="例如: title, body, userId"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>参数类型</label>
                <select
                  value={editingParam.type || 'string'}
                  onChange={(e) => setEditingParam({ ...editingParam, type: e.target.value as any })}
                  style={inputStyle}
                >
                  <option value="string">字符串 (string)</option>
                  <option value="number">数字 (number)</option>
                  <option value="boolean">布尔值 (boolean)</option>
                  <option value="object">对象 (object)</option>
                  <option value="array">数组 (array)</option>
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>参数位置</label>
                <select
                  value={editingParam.location || 'body'}
                  onChange={(e) => setEditingParam({ ...editingParam, location: e.target.value as any })}
                  style={inputStyle}
                >
                  <option value="body">请求体 (body)</option>
                  <option value="query">查询参数 (query)</option>
                  <option value="path">路径参数 (path)</option>
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingParam.required || false}
                    onChange={(e) => setEditingParam({ ...editingParam, required: e.target.checked })}
                    style={{ marginRight: 6 }}
                  />
                  必填参数
                </label>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>参数说明</label>
                <input
                  type="text"
                  value={editingParam.description || ''}
                  onChange={(e) => setEditingParam({ ...editingParam, description: e.target.value })}
                  placeholder="例如: 文章标题"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>默认值（可选）</label>
                <input
                  type="text"
                  value={editingParam.defaultValue !== undefined ? String(editingParam.defaultValue) : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    let parsedValue: any = value
                    if (editingParam.type === 'number') {
                      parsedValue = value ? Number(value) : undefined
                    } else if (editingParam.type === 'boolean') {
                      parsedValue = value === 'true'
                    }
                    setEditingParam({ ...editingParam, defaultValue: parsedValue })
                  }}
                  placeholder="留空表示无默认值"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSave}
                  style={{ flex: 1, padding: '6px 12px', fontSize: 13, color: '#fff', background: '#1890ff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  style={{ flex: 1, padding: '6px 12px', fontSize: 13, color: '#666', background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, cursor: 'pointer' }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              style={{ width: '100%', padding: '6px 12px', fontSize: 13, color: '#1890ff', background: '#fff', border: '1px dashed #1890ff', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}
            >
              + 添加参数
            </button>
          )}
        </div>
      </details>
    </div>
  )
}
