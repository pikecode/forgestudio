import React, { useState } from 'react'
import type { PropDefinition, Action } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { findNodeById, findParentNode } from '@forgestudio/protocol'
import { useEditorStore } from '../store'
import {
  StringSetter,
  NumberSetter,
  BooleanSetter,
  EnumSetter,
  ColorSetter,
  ExpressionSetter,
  SpacingSetter,
  LayoutSetter,
  TypographySetter,
  BorderSetter,
} from '../setters'

/** Find the ancestor List node that has a loop binding */
function findLoopAncestor(tree: import('@forgestudio/protocol').ComponentNode, nodeId: string): import('@forgestudio/protocol').ComponentNode | null {
  let current = findParentNode(tree, nodeId)
  while (current) {
    if (current.loop) return current
    current = findParentNode(tree, current.id)
  }
  return null
}

/** Extract field names from mock data */
function getDataSourceFields(schema: import('@forgestudio/protocol').FSPSchema, dataSourceId: string): string[] {
  const ds = schema.dataSources?.find((d) => d.id === dataSourceId)
  if (!ds?.mockData) return []
  const mockDataObj = ds.mockData as { data?: any[] }
  const firstItem = mockDataObj?.data?.[0]
  if (!firstItem || typeof firstItem !== 'object') return []
  return Object.keys(firstItem)
}

function SetterFor({
  def,
  value,
  onChange,
}: {
  def: PropDefinition
  value: unknown
  onChange: (v: unknown) => void
}) {
  switch (def.type) {
    case 'string':
    case 'image':
      return <StringSetter label={def.title} value={value} onChange={onChange} />
    case 'number':
      return <NumberSetter label={def.title} value={value} onChange={onChange} />
    case 'boolean':
      return (
        <BooleanSetter label={def.title} value={value} onChange={onChange} />
      )
    case 'enum':
      return (
        <EnumSetter
          label={def.title}
          value={value}
          onChange={onChange}
          options={def.options}
        />
      )
    case 'color':
      return <ColorSetter label={def.title} value={value} onChange={onChange} />
    default:
      return null
  }
}

export function PropsPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)
  const updateNodeLoop = useEditorStore((s) => s.updateNodeLoop)
  const updateNodeCondition = useEditorStore((s) => s.updateNodeCondition)
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const addFormState = useEditorStore((s) => s.addFormState)
  const removeNode = useEditorStore((s) => s.removeNode)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)

  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'navigate' | 'showToast' | 'setState' | 'submitForm'>('showToast')
  const [actionParams, setActionParams] = useState<Record<string, any>>({})

  const handlePropChange = (nodeId: string, component: string, propName: string, value: unknown) => {
    updateNodeProps(nodeId, { [propName]: value })

    // Special handling for List component's dataSourceId
    if (component === 'List' && propName === 'dataSourceId') {
      if (value) {
        updateNodeLoop(nodeId, {
          dataSourceId: String(value),
          itemName: 'item',
        })
      } else {
        updateNodeLoop(nodeId, undefined)
      }
    }
  }

  if (!selectedNodeId) {
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
          <button
            className={`forge-editor-tab ${rightPanelTab === 'preview' ? 'forge-editor-tab--active' : ''}`}
            onClick={() => setRightPanelTab('preview')}
          >
            预览
          </button>
        </div>
        <div className="forge-editor-panel__empty">选择一个组件以编辑属性</div>
      </div>
    )
  }

  const node = findNodeById(schema.componentTree, selectedNodeId)
  if (!node) return null

  const meta = getComponentMeta(node.component)
  const propsSchema = meta?.propsSchema ?? []
  const loopAncestor = findLoopAncestor(schema.componentTree, node.id)

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
        <button
          className={`forge-editor-tab ${rightPanelTab === 'preview' ? 'forge-editor-tab--active' : ''}`}
          onClick={() => setRightPanelTab('preview')}
        >
          预览
        </button>
      </div>
      <div className="forge-editor-panel__title">
        {meta?.title ?? node.component}
      </div>
      <div className="forge-editor-panel__section">属性</div>
      {propsSchema.map((def) => {
        // For List's dataSourceId, dynamically build enum options from available data sources
        if (node.component === 'List' && def.name === 'dataSourceId') {
          const dsOptions = (schema.dataSources ?? []).map((ds) => ({
            label: ds.id,
            value: ds.id,
          }))
          if (dsOptions.length === 0) {
            return (
              <div key={def.name} style={{ padding: '8px 12px', color: '#999', fontSize: 12 }}>
                请先在"数据源"标签页添加数据源
              </div>
            )
          }
          return (
            <EnumSetter
              key={def.name}
              label={def.title}
              value={node.props[def.name] ?? ''}
              onChange={(v) => handlePropChange(node.id, node.component, def.name, v)}
              options={dsOptions}
            />
          )
        }

        // For string props inside a loop, show field picker
        if (def.type === 'string' && loopAncestor) {
          const fields = getDataSourceFields(schema, loopAncestor.loop!.dataSourceId)
          if (fields.length > 0) {
            const fieldOptions = fields.map((f) => ({
              label: `$item.${f}`,
              value: `{{$item.${f}}}`,
            }))
            const currentValue = node.props[def.name] ?? def.default
            return (
              <div key={def.name}>
                <EnumSetter
                  label={`${def.title}（绑定字段）`}
                  value={currentValue}
                  onChange={(v) => handlePropChange(node.id, node.component, def.name, v)}
                  options={fieldOptions}
                />
              </div>
            )
          }
        }

        return (
          <SetterFor
            key={def.name}
            def={def}
            value={node.props[def.name] ?? def.default}
            onChange={(v) => handlePropChange(node.id, node.component, def.name, v)}
          />
        )
      })}

      {/* Styles Section - Visual Style Editors */}
      <div className="forge-editor-panel__section">样式</div>
      <div style={{ padding: '8px 12px' }}>
        {/* Size Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>尺寸</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              宽度
            </label>
            <input
              type="text"
              value={String(node.styles.width ?? '')}
              onChange={(e) => {
                const val = e.target.value.trim()
                updateNodeStyles(node.id, { width: val || undefined })
              }}
              placeholder="auto"
              style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              高度
            </label>
            <input
              type="text"
              value={String(node.styles.height ?? '')}
              onChange={(e) => {
                const val = e.target.value.trim()
                updateNodeStyles(node.id, { height: val || undefined })
              }}
              placeholder="auto"
              style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
          </div>
        </div>

        {/* Spacing Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>间距</div>
          <SpacingSetter
            label="内边距"
            type="padding"
            value={{
              top: node.styles.paddingTop,
              right: node.styles.paddingRight,
              bottom: node.styles.paddingBottom,
              left: node.styles.paddingLeft,
            }}
            onChange={(value) => {
              updateNodeStyles(node.id, {
                paddingTop: value.top,
                paddingRight: value.right,
                paddingBottom: value.bottom,
                paddingLeft: value.left,
              })
            }}
          />
          <div style={{ height: 12 }} />
          <SpacingSetter
            label="外边距"
            type="margin"
            value={{
              top: node.styles.marginTop,
              right: node.styles.marginRight,
              bottom: node.styles.marginBottom,
              left: node.styles.marginLeft,
            }}
            onChange={(value) => {
              updateNodeStyles(node.id, {
                marginTop: value.top,
                marginRight: value.right,
                marginBottom: value.bottom,
                marginLeft: value.left,
              })
            }}
          />
        </div>

        {/* Layout Section - only for containers */}
        {(meta?.allowChildren || node.component === 'View' || node.component === 'Card') && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>布局</div>
            <LayoutSetter
              value={{
                display: node.styles.display,
                flexDirection: node.styles.flexDirection,
                justifyContent: node.styles.justifyContent,
                alignItems: node.styles.alignItems,
                gap: node.styles.gap,
              }}
              onChange={(value) => {
                updateNodeStyles(node.id, value)
              }}
            />
          </div>
        )}

        {/* Typography Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>文字</div>
          <TypographySetter
            value={{
              fontSize: node.styles.fontSize,
              fontWeight: node.styles.fontWeight,
              lineHeight: node.styles.lineHeight,
              textAlign: node.styles.textAlign,
            }}
            onChange={(value) => {
              updateNodeStyles(node.id, value)
            }}
          />
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              文字颜色
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="color"
                value={String(node.styles.color ?? '#000000')}
                onChange={(e) => updateNodeStyles(node.id, { color: e.target.value })}
                style={{ width: 40, height: 32, border: '1px solid #d0d0d0', borderRadius: 4 }}
              />
              <input
                type="text"
                value={String(node.styles.color ?? '')}
                onChange={(e) => {
                  const val = e.target.value.trim()
                  updateNodeStyles(node.id, { color: val || undefined })
                }}
                placeholder="#000000"
                style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
              />
            </div>
          </div>
        </div>

        {/* Background & Border Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>背景 & 边框</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              背景色
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="color"
                value={String(node.styles.backgroundColor ?? '#ffffff')}
                onChange={(e) => updateNodeStyles(node.id, { backgroundColor: e.target.value })}
                style={{ width: 40, height: 32, border: '1px solid #d0d0d0', borderRadius: 4 }}
              />
              <input
                type="text"
                value={String(node.styles.backgroundColor ?? '')}
                onChange={(e) => {
                  const val = e.target.value.trim()
                  updateNodeStyles(node.id, { backgroundColor: val || undefined })
                }}
                placeholder="#ffffff"
                style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
              />
            </div>
          </div>
          <BorderSetter
            value={{
              borderWidth: node.styles.borderWidth,
              borderColor: node.styles.borderColor,
              borderRadius: node.styles.borderRadius,
            }}
            onChange={(value) => {
              updateNodeStyles(node.id, value)
            }}
          />
        </div>
      </div>

      {/* Input Binding Section - simplified UI for Input onChange */}
      {node.component === 'Input' && (
        <>
          <div className="forge-editor-panel__section">数据绑定</div>
          <div style={{ padding: '8px 12px' }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              绑定到状态变量
            </label>
            <input
              type="text"
              placeholder="例如: inputValue"
              value={
                node.events?.onChange?.[0]?.type === 'setState'
                  ? node.events.onChange[0].target
                  : ''
              }
              onChange={(e) => {
                const varName = e.target.value.trim()
                if (varName) {
                  // Create setState action for onChange
                  const action: Action = {
                    type: 'setState',
                    target: varName,
                    value: 'e.detail.value'
                  }
                  updateNodeEvents(node.id, 'onChange', [action])

                  // Ensure formState exists
                  const existingState = schema.formStates?.find(fs => fs.id === varName)
                  if (!existingState) {
                    addFormState(varName, {
                      type: 'string',
                      defaultValue: ''
                    })
                  }

                  // Bind Input value to state
                  updateNodeProps(node.id, { value: `{{${varName}}}` })
                } else {
                  // Clear binding
                  updateNodeEvents(node.id, 'onChange', [])
                  updateNodeProps(node.id, { value: '' })
                }
              }}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 13,
                border: '1px solid #d0d0d0',
                borderRadius: 4
              }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              输入变量名后自动创建双向绑定
            </div>
          </div>
        </>
      )}

      {/* State Management Section - show available states for setState actions */}
      {schema.formStates && schema.formStates.length > 0 && (
        <>
          <div className="forge-editor-panel__section">可用状态变量</div>
          <div style={{ padding: '8px 12px' }}>
            {schema.formStates.map((fs) => (
              <div key={fs.id} style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                • {fs.id} ({fs.type})
              </div>
            ))}
          </div>
        </>
      )}

      {/* Conditional Rendering Section (M1.5) */}
      {node.component !== 'Page' && (
        <>
          <div className="forge-editor-panel__section">条件渲染</div>
          <div style={{ padding: '8px 12px' }}>
            <ExpressionSetter
              label="显示条件"
              value={node.condition?.expression || ''}
              onChange={(expr) => {
                const exprStr = String(expr).trim()
                if (exprStr) {
                  updateNodeCondition(node.id, {
                    type: 'expression',
                    expression: exprStr
                  })
                } else {
                  updateNodeCondition(node.id, undefined)
                }
              }}
              context={{
                stateVars: schema.formStates?.map(fs => ({ id: fs.id, type: fs.type })) || [],
                itemFields: loopAncestor ? getDataSourceFields(schema, loopAncestor.loop!.dataSourceId) : [],
                dataSourceFields: schema.dataSources?.map(ds => ({ name: ds.id, dsId: ds.id })) || []
              }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              使用可视化构建器选择变量和运算符，或切换到手动输入模式
            </div>
          </div>
        </>
      )}

      {/* Events Section */}
      {meta?.supportedEvents && meta.supportedEvents.length > 0 && (
        <>
          <div className="forge-editor-panel__section">事件</div>
          {meta.supportedEvents.map((eventName) => {
            const actions = node.events?.[eventName] || []
            const isEditing = editingEvent === eventName

            return (
              <div key={eventName} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {eventName}
                </div>
                {actions.length === 0 && !isEditing && (
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                    未配置动作
                  </div>
                )}
                {actions.map((action, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                      • {action.type === 'navigate' && `跳转: ${action.url}`}
                      {action.type === 'showToast' && `提示: ${action.title}`}
                      {action.type === 'setState' && `设置状态: ${action.target} = ${action.value}`}
                      {action.type === 'submitForm' && `提交表单: ${action.method} ${action.url} (${action.fields.length}个字段)`}
                    </span>
                    <button
                      onClick={() => {
                        const newActions = actions.filter((_, i) => i !== idx)
                        updateNodeEvents(node.id, eventName, newActions)
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        color: '#ff4d4f',
                        background: 'transparent',
                        border: '1px solid #ff4d4f',
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
                {!isEditing && (
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => {
                      setEditingEvent(eventName)
                      setActionType('showToast')
                      setActionParams({})
                    }}
                    style={{ marginTop: 6 }}
                  >
                    添加动作
                  </button>
                )}
                {isEditing && (
                  <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                        动作类型
                      </label>
                      <select
                        value={actionType}
                        onChange={(e) => {
                          setActionType(e.target.value as any)
                          setActionParams({})
                        }}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                      >
                        <option value="showToast">显示提示</option>
                        <option value="navigate">页面跳转</option>
                        <option value="setState">设置状态</option>
                        <option value="submitForm">提交表单</option>
                      </select>
                    </div>

                    {actionType === 'showToast' && (
                      <>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            提示内容
                          </label>
                          <input
                            type="text"
                            value={actionParams.title || ''}
                            onChange={(e) => setActionParams({ ...actionParams, title: e.target.value })}
                            placeholder="操作成功"
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          />
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            图标
                          </label>
                          <select
                            value={actionParams.icon || 'success'}
                            onChange={(e) => setActionParams({ ...actionParams, icon: e.target.value })}
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          >
                            <option value="success">成功</option>
                            <option value="error">错误</option>
                            <option value="loading">加载中</option>
                            <option value="none">无图标</option>
                          </select>
                        </div>
                      </>
                    )}

                    {actionType === 'navigate' && (
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                          目标页面
                        </label>
                        <input
                          type="text"
                          value={actionParams.url || ''}
                          onChange={(e) => setActionParams({ ...actionParams, url: e.target.value })}
                          placeholder="/pages/detail/index"
                          style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                        />
                      </div>
                    )}

                    {actionType === 'setState' && (
                      <>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            状态变量
                          </label>
                          {schema.formStates && schema.formStates.length > 0 ? (
                            <select
                              value={actionParams.target || ''}
                              onChange={(e) => setActionParams({ ...actionParams, target: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                            >
                              <option value="">-- 选择状态变量 --</option>
                              {schema.formStates.map((fs) => (
                                <option key={fs.id} value={fs.id}>{fs.id} ({fs.type})</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={actionParams.target || ''}
                              onChange={(e) => setActionParams({ ...actionParams, target: e.target.value })}
                              placeholder="inputValue"
                              style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                            />
                          )}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            值
                          </label>
                          <input
                            type="text"
                            value={actionParams.value || ''}
                            onChange={(e) => setActionParams({ ...actionParams, value: e.target.value })}
                            placeholder="'新值' 或 e.detail.value"
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          />
                          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                            字符串需加引号，如 '新值'
                          </div>
                        </div>
                      </>
                    )}

                    {actionType === 'submitForm' && (
                      <>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            提交地址
                          </label>
                          <input
                            type="text"
                            value={actionParams.url || ''}
                            onChange={(e) => setActionParams({ ...actionParams, url: e.target.value })}
                            placeholder="https://api.example.com/submit"
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          />
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            请求方法
                          </label>
                          <select
                            value={actionParams.method || 'POST'}
                            onChange={(e) => setActionParams({ ...actionParams, method: e.target.value })}
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            提交字段（多选）
                          </label>
                          {schema.formStates && schema.formStates.length > 0 ? (
                            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #d0d0d0', borderRadius: 4, padding: 4 }}>
                              {schema.formStates.map((fs) => (
                                <label
                                  key={fs.id}
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
                                    checked={(actionParams.fields || []).includes(fs.id)}
                                    onChange={(e) => {
                                      const fields = actionParams.fields || []
                                      if (e.target.checked) {
                                        setActionParams({ ...actionParams, fields: [...fields, fs.id] })
                                      } else {
                                        setActionParams({ ...actionParams, fields: fields.filter((f: string) => f !== fs.id) })
                                      }
                                    }}
                                  />
                                  {fs.id} ({fs.type})
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: '#999', padding: 8 }}>
                              暂无可用的状态变量
                            </div>
                          )}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            成功提示
                          </label>
                          <input
                            type="text"
                            value={actionParams.successMessage || ''}
                            onChange={(e) => setActionParams({ ...actionParams, successMessage: e.target.value })}
                            placeholder="提交成功"
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          />
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                            失败提示
                          </label>
                          <input
                            type="text"
                            value={actionParams.errorMessage || ''}
                            onChange={(e) => setActionParams({ ...actionParams, errorMessage: e.target.value })}
                            placeholder="提交失败"
                            style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                          />
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="forge-editor-btn forge-editor-btn--small forge-editor-btn--primary"
                        onClick={() => {
                          const newAction: Action = actionType === 'navigate'
                            ? { type: 'navigate', url: actionParams.url || '' }
                            : actionType === 'showToast'
                            ? { type: 'showToast', title: actionParams.title || '', icon: actionParams.icon as any }
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
                        }}
                      >
                        保存
                      </button>
                      <button
                        className="forge-editor-btn forge-editor-btn--small"
                        onClick={() => {
                          setEditingEvent(null)
                          setActionParams({})
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {node.component !== 'Page' && (
        <div style={{ marginTop: 16, padding: '0 12px' }}>
          <button
            className="forge-editor-btn forge-editor-btn--danger"
            onClick={() => removeNode(node.id)}
          >
            删除组件
          </button>
        </div>
      )}
    </div>
  )
}
