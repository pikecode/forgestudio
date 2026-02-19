import React, { useState } from 'react'
import type { FSPSchema, FormStateDef } from '@forgestudio/protocol'

interface StatePanelProps {
  schema: FSPSchema
  addFormState: (id: string, fs: Omit<FormStateDef, 'id'>) => void
  updateFormState: (id: string, updates: Partial<FormStateDef>) => void
  removeFormState: (id: string) => void
}

export function StatePanel({ schema, addFormState, updateFormState, removeFormState }: StatePanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{ id: string; type: string; defaultValue: any }>({
    id: '',
    type: 'string',
    defaultValue: '',
  })

  const handleAdd = () => {
    if (!formData.id.trim()) {
      alert('请输入变量名')
      return
    }
    if (schema.formStates?.some(fs => fs.id === formData.id)) {
      alert('变量名已存在')
      return
    }

    const defaultValue = formData.type === 'boolean'
      ? (formData.defaultValue === 'true' || formData.defaultValue === true)
      : formData.type === 'number'
      ? Number(formData.defaultValue) || 0
      : String(formData.defaultValue || '')

    addFormState(formData.id, {
      type: formData.type as 'string' | 'number' | 'boolean',
      defaultValue,
    })
    setIsAdding(false)
    setFormData({ id: '', type: 'string', defaultValue: '' })
  }

  const handleEdit = (fs: FormStateDef) => {
    setEditingId(fs.id)
    setFormData({
      id: fs.id,
      type: fs.type,
      defaultValue: fs.defaultValue,
    })
  }

  const handleUpdate = () => {
    if (!editingId) return

    const defaultValue = formData.type === 'boolean'
      ? (formData.defaultValue === 'true' || formData.defaultValue === true)
      : formData.type === 'number'
      ? Number(formData.defaultValue) || 0
      : String(formData.defaultValue || '')

    updateFormState(editingId, {
      type: formData.type as 'string' | 'number' | 'boolean',
      defaultValue,
    })
    setEditingId(null)
    setFormData({ id: '', type: 'string', defaultValue: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm(`确认删除状态变量 "${id}"？`)) {
      removeFormState(id)
    }
  }

  return (
    <div className="forge-editor-panel">
      <div className="forge-editor-panel__section">
        状态变量管理
        {!isAdding && !editingId && (
          <button
            className="forge-editor-btn forge-editor-btn--small"
            onClick={() => setIsAdding(true)}
            style={{ marginLeft: 'auto' }}
          >
            添加
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f9f9f9', borderBottom: '1px solid #e8e8e8' }}>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
              变量名
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="例如: userName"
              style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
              类型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
              默认值
            </label>
            {formData.type === 'boolean' ? (
              <select
                value={String(formData.defaultValue)}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value === 'true' })}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            ) : (
              <input
                type={formData.type === 'number' ? 'number' : 'text'}
                value={formData.defaultValue}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                placeholder={formData.type === 'number' ? '0' : ''}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="forge-editor-btn forge-editor-btn--small forge-editor-btn--primary"
              onClick={handleAdd}
            >
              确定
            </button>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={() => {
                setIsAdding(false)
                setFormData({ id: '', type: 'string', defaultValue: '' })
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* State List */}
      <div style={{ padding: '8px 12px' }}>
        {(!schema.formStates || schema.formStates.length === 0) && !isAdding && (
          <div style={{ fontSize: 12, color: '#999', padding: '16px 0', textAlign: 'center' }}>
            暂无状态变量
          </div>
        )}
        {schema.formStates?.map((fs) => (
          <div key={fs.id} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
            {editingId === fs.id ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                    变量名
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4, backgroundColor: '#f0f0f0' }}
                  />
                </div>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                    类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                    默认值
                  </label>
                  {formData.type === 'boolean' ? (
                    <select
                      value={String(formData.defaultValue)}
                      onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value === 'true' })}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    >
                      <option value="false">false</option>
                      <option value="true">true</option>
                    </select>
                  ) : (
                    <input
                      type={formData.type === 'number' ? 'number' : 'text'}
                      value={formData.defaultValue}
                      onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="forge-editor-btn forge-editor-btn--small forge-editor-btn--primary"
                    onClick={handleUpdate}
                  >
                    保存
                  </button>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => {
                      setEditingId(null)
                      setFormData({ id: '', type: 'string', defaultValue: '' })
                    }}
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {fs.id}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                  类型: {fs.type} | 默认值: {String(fs.defaultValue)}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => handleEdit(fs)}
                  >
                    编辑
                  </button>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => handleDelete(fs.id)}
                    style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
