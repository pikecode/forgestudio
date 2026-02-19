import React, { useState } from 'react'
import type { Action } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { findNodeById } from '@forgestudio/protocol'
import { useEditorStore } from '../../store'

export function EventsSection() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const getCurrentPage = useEditorStore((s) => s.getCurrentPage)
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const removeNode = useEditorStore((s) => s.removeNode)

  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'navigate' | 'showToast' | 'setState' | 'submitForm'>('showToast')
  const [actionParams, setActionParams] = useState<Record<string, any>>({})

  const currentPage = getCurrentPage()
  const pageFormStates = currentPage?.formStates ?? []

  const node = selectedNodeId ? findNodeById(schema.componentTree, selectedNodeId) : null
  if (!node) return null

  const meta = getComponentMeta(node.component)

  const handleSaveAction = (eventName: string, actions: Action[]) => {
    const newAction: Action = actionType === 'navigate'
      ? {
          type: 'navigate',
          url: actionParams.url === '__custom__' ? (actionParams.customUrl || '') : (actionParams.url || ''),
          params: actionParams.paramKey && actionParams.paramValue
            ? { [actionParams.paramKey]: actionParams.paramValue }
            : undefined,
        }
      : actionType === 'showToast'
      ? { type: 'showToast', title: actionParams.title || '', icon: actionParams.icon as 'success' | 'error' | 'loading' | 'none' | undefined }
      : actionType === 'setState'
      ? { type: 'setState', target: actionParams.target || '', value: actionParams.value || '' }
      : {
          type: 'submitForm',
          url: actionParams.url || '',
          method: actionParams.method || 'POST',
          fields: actionParams.fields || [],
          successMessage: actionParams.successMessage,
          errorMessage: actionParams.errorMessage,
        }
    updateNodeEvents(node.id, eventName, [...actions, newAction])
    setEditingEvent(null)
    setActionParams({})
  }

  return (
    <>
      {meta?.supportedEvents && meta.supportedEvents.length > 0 && (
        <>
          <div className="forge-editor-panel__section">事件</div>
          {meta.supportedEvents.map((eventName) => {
            const actions = node.events?.[eventName] || []
            const isEditing = editingEvent === eventName
            return (
              <div key={eventName} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{eventName}</div>
                {actions.length === 0 && !isEditing && (
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>未配置动作</div>
                )}
                {actions.map((action, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                      • {action.type === 'navigate' && `跳转: ${action.url}${action.params ? ` (参数: ${Object.keys(action.params).join(', ')})` : ''}`}
                      {action.type === 'showToast' && `提示: ${action.title}`}
                      {action.type === 'setState' && `设置状态: ${action.target} = ${action.value}`}
                      {action.type === 'submitForm' && `提交表单: ${action.method} ${action.url} (${action.fields.length}个字段)`}
                    </span>
                    <button
                      onClick={() => updateNodeEvents(node.id, eventName, actions.filter((_, i) => i !== idx))}
                      style={{ padding: '2px 6px', fontSize: 11, color: '#ff4d4f', background: 'transparent', border: '1px solid #ff4d4f', borderRadius: 3, cursor: 'pointer' }}
                    >
                      删除
                    </button>
                  </div>
                ))}
                {!isEditing && (
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => { setEditingEvent(eventName); setActionType('showToast'); setActionParams({}) }}
                    style={{ marginTop: 6 }}
                  >
                    添加动作
                  </button>
                )}
                {isEditing && (
                  <ActionEditor
                    actionType={actionType}
                    actionParams={actionParams}
                    setActionType={setActionType}
                    setActionParams={setActionParams}
                    schema={schema}
                    pageFormStates={pageFormStates}
                    onSave={() => handleSaveAction(eventName, actions)}
                    onCancel={() => { setEditingEvent(null); setActionParams({}) }}
                  />
                )}
              </div>
            )
          })}
        </>
      )}

      {node.component !== 'Page' && (
        <div style={{ marginTop: 16, padding: '0 12px' }}>
          <button className="forge-editor-btn forge-editor-btn--danger" onClick={() => removeNode(node.id)}>
            删除组件
          </button>
        </div>
      )}
    </>
  )
}

function ActionEditor({
  actionType, actionParams, setActionType, setActionParams,
  schema, pageFormStates, onSave, onCancel,
}: {
  actionType: string
  actionParams: Record<string, any>
  setActionType: (t: any) => void
  setActionParams: (p: Record<string, any>) => void
  schema: any
  pageFormStates: any[]
  onSave: () => void
  onCancel: () => void
}) {
  const inputStyle = { width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }
  const labelStyle = { fontSize: 12, color: '#555', display: 'block' as const, marginBottom: 4 }

  return (
    <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
      <div style={{ marginBottom: 6 }}>
        <label style={labelStyle}>动作类型</label>
        <select value={actionType} onChange={(e) => { setActionType(e.target.value); setActionParams({}) }} style={inputStyle}>
          <option value="showToast">显示提示</option>
          <option value="navigate">页面跳转</option>
          <option value="setState">设置状态</option>
          <option value="submitForm">提交表单</option>
        </select>
      </div>

      {actionType === 'showToast' && (
        <>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>提示内容</label>
            <input type="text" value={actionParams.title || ''} onChange={(e) => setActionParams({ ...actionParams, title: e.target.value })} placeholder="操作成功" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>图标</label>
            <select value={actionParams.icon || 'success'} onChange={(e) => setActionParams({ ...actionParams, icon: e.target.value })} style={inputStyle}>
              <option value="success">成功</option>
              <option value="error">错误</option>
              <option value="loading">加载中</option>
              <option value="none">无图标</option>
            </select>
          </div>
        </>
      )}

      {actionType === 'navigate' && (
        <>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>目标页面</label>
            {schema.pages && schema.pages.length > 0 ? (
              <select value={actionParams.url || ''} onChange={(e) => setActionParams({ ...actionParams, url: e.target.value })} style={inputStyle}>
                <option value="">-- 选择页面 --</option>
                {schema.pages.map((page: any) => (
                  <option key={page.id} value={page.path}>{page.title} ({page.path})</option>
                ))}
                <option value="__custom__">手动输入...</option>
              </select>
            ) : (
              <input type="text" value={actionParams.url || ''} onChange={(e) => setActionParams({ ...actionParams, url: e.target.value })} placeholder="/pages/detail/index" style={inputStyle} />
            )}
          </div>
          {actionParams.url === '__custom__' && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>自定义路径</label>
              <input type="text" value={actionParams.customUrl || ''} onChange={(e) => setActionParams({ ...actionParams, customUrl: e.target.value })} placeholder="/pages/detail/index" style={inputStyle} />
            </div>
          )}
          <div style={{ marginTop: 8, padding: 8, border: '1px dashed #d0d0d0', borderRadius: 4, backgroundColor: '#fafafa' }}>
            <div style={{ fontSize: 12, color: '#555', fontWeight: 500, marginBottom: 6 }}>传递参数 (可选)</div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>传递给目标页面的参数，如 id。支持表达式如 {'{{$item.id}}'}</div>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>参数名</label>
              <input type="text" value={actionParams.paramKey || ''} onChange={(e) => setActionParams({ ...actionParams, paramKey: e.target.value })} placeholder="id" style={{ ...inputStyle, fontSize: 11, padding: '3px 6px' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>参数值 (支持表达式)</label>
              <input type="text" value={actionParams.paramValue || ''} onChange={(e) => setActionParams({ ...actionParams, paramValue: e.target.value })} placeholder="{{$item.id}}" style={{ ...inputStyle, fontSize: 11, padding: '3px 6px' }} />
            </div>
          </div>
        </>
      )}

      {actionType === 'setState' && (
        <>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>状态变量</label>
            {pageFormStates.length > 0 ? (
              <select value={actionParams.target || ''} onChange={(e) => setActionParams({ ...actionParams, target: e.target.value })} style={inputStyle}>
                <option value="">-- 选择状态变量 --</option>
                {pageFormStates.map((fs: any) => (
                  <option key={fs.id} value={fs.id}>{fs.id} ({fs.type})</option>
                ))}
              </select>
            ) : (
              <input type="text" value={actionParams.target || ''} onChange={(e) => setActionParams({ ...actionParams, target: e.target.value })} placeholder="inputValue" style={inputStyle} />
            )}
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>值</label>
            <input type="text" value={actionParams.value || ''} onChange={(e) => setActionParams({ ...actionParams, value: e.target.value })} placeholder="'新值' 或 e.detail.value" style={inputStyle} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>字符串需加引号，如 '新值'</div>
          </div>
        </>
      )}

      {actionType === 'submitForm' && (
        <>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>提交地址</label>
            <input type="text" value={actionParams.url || ''} onChange={(e) => setActionParams({ ...actionParams, url: e.target.value })} placeholder="https://api.example.com/submit" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>请求方法</label>
            <select value={actionParams.method || 'POST'} onChange={(e) => setActionParams({ ...actionParams, method: e.target.value })} style={inputStyle}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>提交字段（多选）</label>
            {pageFormStates.length > 0 ? (
              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #d0d0d0', borderRadius: 4, padding: 4 }}>
                {pageFormStates.map((fs: any) => (
                  <label key={fs.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(actionParams.fields || []).includes(fs.id)}
                      onChange={(e) => {
                        const fields = actionParams.fields || []
                        setActionParams({
                          ...actionParams,
                          fields: e.target.checked ? [...fields, fs.id] : fields.filter((f: string) => f !== fs.id),
                        })
                      }}
                    />
                    {fs.id} ({fs.type})
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#999', padding: 8 }}>暂无可用的状态变量</div>
            )}
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>成功提示</label>
            <input type="text" value={actionParams.successMessage || ''} onChange={(e) => setActionParams({ ...actionParams, successMessage: e.target.value })} placeholder="提交成功" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>失败提示</label>
            <input type="text" value={actionParams.errorMessage || ''} onChange={(e) => setActionParams({ ...actionParams, errorMessage: e.target.value })} placeholder="提交失败" style={inputStyle} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="forge-editor-btn forge-editor-btn--small forge-editor-btn--primary" onClick={onSave}>保存</button>
        <button className="forge-editor-btn forge-editor-btn--small" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}