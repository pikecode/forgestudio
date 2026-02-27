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
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null)
  const [actionType, setActionType] = useState<'navigate' | 'showToast' | 'setState' | 'submitForm' | 'executeWorkflow'>('showToast')
  const [actionParams, setActionParams] = useState<Record<string, any>>({})

  const currentPage = getCurrentPage()
  const pageFormStates = currentPage?.formStates ?? []
  const pageDataSources = currentPage?.dataSources ?? []
  const globalDataSources = schema.globalDataSources ?? []
  const allDataSources = [...pageDataSources, ...globalDataSources]

  const node = selectedNodeId ? findNodeById(schema.componentTree, selectedNodeId) : null
  if (!node) return null

  const meta = getComponentMeta(node.component)

  const handleSaveAction = (eventName: string, actions: Action[]) => {
    // Build params object from params array for navigate action
    let params: Record<string, string> | undefined
    if (actionType === 'navigate' && actionParams.params && Array.isArray(actionParams.params)) {
      const paramsArray = actionParams.params.filter((p: any) => p.key && p.value)
      if (paramsArray.length > 0) {
        params = {}
        paramsArray.forEach((p: any) => {
          params![p.key] = p.value
        })
      }
    }

    const newAction: Action = actionType === 'navigate'
      ? {
          type: 'navigate',
          url: actionParams.url === '__custom__' ? (actionParams.customUrl || '') : (actionParams.url || ''),
          params,
        }
      : actionType === 'showToast'
      ? { type: 'showToast', title: actionParams.title || '', icon: actionParams.icon as 'success' | 'error' | 'loading' | 'none' | undefined }
      : actionType === 'submitForm'
      ? { type: 'submitForm', dataSourceId: actionParams.dataSourceId || '', fieldMapping: actionParams.fieldMapping || {} }
      : actionType === 'executeWorkflow'
      ? { type: 'executeWorkflow' as const, workflowId: actionParams.workflowId || '' }
      : { type: 'setState', target: actionParams.target || '', value: actionParams.value || '' }

    // If editing, replace the action at the index; otherwise, append
    const updatedActions = editingActionIndex !== null
      ? actions.map((a, i) => i === editingActionIndex ? newAction : a)
      : [...actions, newAction]

    updateNodeEvents(node.id, eventName, updatedActions)
    setEditingEvent(null)
    setEditingActionIndex(null)
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
                      {action.type === 'submitForm' && (
                        action.dataSourceId
                          ? `提交表单: 数据源 ${action.dataSourceId} (${Object.keys(action.fieldMapping || {}).length}个映射)`
                          : `提交表单: ${action.method} ${action.url} (${(action.fields || []).length}个字段)`
                      )}
                      {action.type === 'executeWorkflow' && `执行工作流: ${action.workflowId || '(未设置)'}`}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => {
                          // Pre-fill form with existing action data
                          setEditingEvent(eventName)
                          setEditingActionIndex(idx)
                          setActionType(action.type as any)

                          // Convert action to actionParams format
                          if (action.type === 'navigate') {
                            const params = action.params
                              ? Object.entries(action.params).map(([key, value]) => ({ key, value }))
                              : []
                            setActionParams({
                              url: action.url,
                              params,
                            })
                          } else if (action.type === 'showToast') {
                            setActionParams({
                              title: action.title,
                              icon: action.icon,
                            })
                          } else if (action.type === 'setState') {
                            setActionParams({
                              target: action.target,
                              value: action.value,
                            })
                          } else if (action.type === 'submitForm') {
                            setActionParams({
                              dataSourceId: action.dataSourceId || '',
                              fieldMapping: action.fieldMapping || {},
                            })
                          } else if (action.type === 'executeWorkflow') {
                            setActionParams({
                              workflowId: action.workflowId || '',
                            })
                          }
                        }}
                        style={{ padding: '2px 6px', fontSize: 11, color: '#1890ff', background: 'transparent', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer' }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => updateNodeEvents(node.id, eventName, actions.filter((_, i) => i !== idx))}
                        style={{ padding: '2px 6px', fontSize: 11, color: '#ff4d4f', background: 'transparent', border: '1px solid #ff4d4f', borderRadius: 3, cursor: 'pointer' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {!isEditing && (
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => { setEditingEvent(eventName); setEditingActionIndex(null); setActionType('showToast'); setActionParams({}) }}
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
                    allDataSources={allDataSources}
                    componentTree={currentPage?.componentTree}
                    onSave={() => handleSaveAction(eventName, actions)}
                    onCancel={() => { setEditingEvent(null); setEditingActionIndex(null); setActionParams({}) }}
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
  schema, pageFormStates, allDataSources, componentTree, onSave, onCancel,
}: {
  actionType: string
  actionParams: Record<string, any>
  setActionType: (t: any) => void
  setActionParams: (p: Record<string, any>) => void
  schema: any
  pageFormStates: any[]
  allDataSources: any[]
  componentTree?: any
  onSave: () => void
  onCancel: () => void
}) {
  const inputStyle = { width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }
  const labelStyle = { fontSize: 12, color: '#555', display: 'block' as const, marginBottom: 4 }
  const openWorkflowEditor = useEditorStore(s => s.openWorkflowEditor)

  return (
    <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
      <div style={{ marginBottom: 6 }}>
        <label style={labelStyle}>动作类型</label>
        <select value={actionType} onChange={(e) => { setActionType(e.target.value as any); setActionParams({}) }} style={inputStyle}>
          <option value="showToast">显示提示</option>
          <option value="navigate">页面跳转</option>
          <option value="setState">设置状态</option>
          <option value="submitForm">提交数据源</option>
          <option value="executeWorkflow">使用工作流</option>
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
            {(actionParams.params || []).map((param: any, idx: number) => (
              <div key={idx} style={{ marginBottom: 6, padding: 6, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>参数 {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newParams = (actionParams.params || []).filter((_: any, i: number) => i !== idx)
                      setActionParams({ ...actionParams, params: newParams })
                    }}
                    style={{ padding: '1px 4px', fontSize: 10, color: '#ff4d4f', background: 'transparent', border: '1px solid #ff4d4f', borderRadius: 2, cursor: 'pointer' }}
                  >
                    删除
                  </button>
                </div>
                <div style={{ marginBottom: 3 }}>
                  <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>参数名</label>
                  <input
                    type="text"
                    value={param.key || ''}
                    onChange={(e) => {
                      const newParams = [...(actionParams.params || [])]
                      newParams[idx] = { ...newParams[idx], key: e.target.value }
                      setActionParams({ ...actionParams, params: newParams })
                    }}
                    placeholder="id"
                    style={{ ...inputStyle, fontSize: 11, padding: '3px 6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>参数值 (支持表达式)</label>
                  <input
                    type="text"
                    value={param.value || ''}
                    onChange={(e) => {
                      const newParams = [...(actionParams.params || [])]
                      newParams[idx] = { ...newParams[idx], value: e.target.value }
                      setActionParams({ ...actionParams, params: newParams })
                    }}
                    placeholder="{{$item.id}}"
                    style={{ ...inputStyle, fontSize: 11, padding: '3px 6px' }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newParams = [...(actionParams.params || []), { key: '', value: '' }]
                setActionParams({ ...actionParams, params: newParams })
              }}
              style={{ padding: '4px 8px', fontSize: 11, color: '#1890ff', background: '#fff', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer', width: '100%' }}
            >
              + 添加参数
            </button>
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
        <SubmitFormFields
          actionParams={actionParams}
          setActionParams={setActionParams}
          allDataSources={allDataSources}
          componentTree={componentTree}
        />
      )}

      {actionType === 'executeWorkflow' && (
        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>工作流</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={actionParams.workflowId || ''}
              onChange={(e) => setActionParams({ ...actionParams, workflowId: e.target.value })}
              placeholder="流程ID（保存后自动填充）"
              style={inputStyle}
              readOnly
            />
            <button
              onClick={() => openWorkflowEditor(actionParams.workflowId || `wf-${Date.now()}`)}
              style={{ padding: '4px 10px', fontSize: 12, color: '#fff', background: '#1890ff', border: 'none', borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              编辑流程
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="forge-editor-btn forge-editor-btn--small forge-editor-btn--primary" onClick={onSave}>保存</button>
        <button className="forge-editor-btn forge-editor-btn--small" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

/** Collect all Input/Textarea components from a component tree */
function collectInputComponents(node: any): any[] {
  let inputs: any[] = []
  if (node.component === 'Input' || node.component === 'Textarea') {
    inputs.push(node)
  }
  for (const child of node.children ?? []) {
    inputs = inputs.concat(collectInputComponents(child))
  }
  return inputs
}

function SubmitFormFields({
  actionParams, setActionParams, allDataSources, componentTree,
}: {
  actionParams: Record<string, any>
  setActionParams: (p: Record<string, any>) => void
  allDataSources: any[]
  componentTree?: any
}) {
  const inputStyle = { width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }
  const labelStyle = { fontSize: 12, color: '#555', display: 'block' as const, marginBottom: 4 }

  // Filter mutation data sources
  const mutationDataSources = allDataSources.filter(
    (ds: any) => ds.options?.method && ['POST', 'PUT', 'DELETE'].includes(ds.options.method)
  )

  const selectedDsId = actionParams.dataSourceId || ''
  const selectedDs = allDataSources.find((ds: any) => ds.id === selectedDsId)
  const fieldMapping: Record<string, string> = actionParams.fieldMapping || {}

  // Collect all Input/Textarea on the page
  const pageInputs = componentTree ? collectInputComponents(componentTree) : []

  const getInputLabel = (input: any): string => {
    const placeholder = input.props?.placeholder as string
    const name = input.props?.name as string
    if (placeholder) return `${input.component}: ${placeholder}`
    if (name) return `${input.component}: ${name}`
    return `${input.component} (${input.id.slice(0, 8)}...)`
  }

  const handleFieldMappingChange = (paramName: string, inputId: string) => {
    const newMapping = { ...fieldMapping }
    if (inputId === '') {
      delete newMapping[paramName]
    } else {
      newMapping[paramName] = inputId
    }
    setActionParams({ ...actionParams, fieldMapping: newMapping })
  }

  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <label style={labelStyle}>提交数据源</label>
        <select
          value={selectedDsId}
          onChange={(e) => setActionParams({ ...actionParams, dataSourceId: e.target.value, fieldMapping: {} })}
          style={inputStyle}
        >
          <option value="">-- 选择数据源 --</option>
          {mutationDataSources.map((ds: any) => (
            <option key={ds.id} value={ds.id}>
              {ds.label || ds.id} ({ds.options.method})
            </option>
          ))}
        </select>
      </div>

      {selectedDs && selectedDs.requestParams && selectedDs.requestParams.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, border: '1px dashed #d0d0d0', borderRadius: 4, backgroundColor: '#fafafa' }}>
          <div style={{ fontSize: 12, color: '#555', fontWeight: 500, marginBottom: 6 }}>参数映射</div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>将 API 参数映射到页面上的输入组件</div>

          {selectedDs.requestParams.map((param: any) => (
            <div
              key={param.name}
              style={{
                marginBottom: 8,
                padding: 6,
                backgroundColor: '#fff',
                borderRadius: 4,
                border: '1px solid #e0e0e0',
                borderLeft: param.required ? '3px solid #ff4d4f' : '3px solid #d0d0d0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                {param.name}
                {param.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
                {param.description && <span style={{ fontSize: 11, color: '#999', fontWeight: 400, marginLeft: 6 }}>{param.description}</span>}
              </div>
              <select
                value={fieldMapping[param.name] || ''}
                onChange={(e) => handleFieldMappingChange(param.name, e.target.value)}
                style={inputStyle}
              >
                <option value="">-- 选择输入组件 --</option>
                {pageInputs.map((input: any) => (
                  <option key={input.id} value={input.id}>
                    {getInputLabel(input)}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {pageInputs.length === 0 && (
            <div style={{ fontSize: 12, color: '#999' }}>
              页面上还没有输入组件，请先添加 Input 或 Textarea
            </div>
          )}
        </div>
      )}

      {selectedDs && (!selectedDs.requestParams || selectedDs.requestParams.length === 0) && (
        <div style={{ fontSize: 12, color: '#ff4d4f', backgroundColor: '#fff2f0', padding: 8, borderRadius: 4, marginTop: 6 }}>
          该数据源尚未配置请求参数，请先在数据源管理中添加参数
        </div>
      )}
    </>
  )
}