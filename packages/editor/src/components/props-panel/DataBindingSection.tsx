import React, { useState } from 'react'
import type { Action } from '@forgestudio/protocol'
import { findNodeById } from '@forgestudio/protocol'
import { useEditorStore } from '../../store'
import { StatePanel } from '../StatePanel'

export function DataBindingSection() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const getCurrentPage = useEditorStore((s) => s.getCurrentPage)
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeEvents = useEditorStore((s) => s.updateNodeEvents)
  const addFormState = useEditorStore((s) => s.addFormState)
  const updateFormState = useEditorStore((s) => s.updateFormState)
  const removeFormState = useEditorStore((s) => s.removeFormState)

  const [showStateManager, setShowStateManager] = useState(false)

  const currentPage = getCurrentPage()
  const pageFormStates = currentPage?.formStates ?? []

  const node = selectedNodeId ? findNodeById(schema.componentTree, selectedNodeId) : null
  if (!node) return null

  const isBindable = node.component === 'Input' || node.component === 'Textarea' || node.component === 'Switch'

  return (
    <>
      {/* Data Binding for Input/Textarea/Switch */}
      {isBindable && (
        <>
          <div className="forge-editor-panel__section">数据绑定</div>
          <div style={{ padding: '8px 12px' }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              绑定到状态变量
            </label>
            <input
              type="text"
              placeholder={node.component === 'Switch' ? '例如: isChecked' : '例如: inputValue'}
              value={
                node.events?.onChange?.[0]?.type === 'setState'
                  ? node.events.onChange[0].target
                  : ''
              }
              onChange={(e) => {
                const varName = e.target.value.trim()
                if (varName) {
                  const action: Action = { type: 'setState', target: varName, value: 'e.detail.value' }
                  updateNodeEvents(node.id, 'onChange', [action])
                  const isSwitch = node.component === 'Switch'
                  const stateType = isSwitch ? 'boolean' : 'string'
                  const defaultValue = isSwitch ? false : ''
                  const bindProp = isSwitch ? 'checked' : 'value'
                  const existingState = pageFormStates.find(fs => fs.id === varName)
                  if (!existingState) {
                    addFormState(varName, { type: stateType, defaultValue })
                  }
                  updateNodeProps(node.id, { [bindProp]: `{{${varName}}}` })
                } else {
                  updateNodeEvents(node.id, 'onChange', [])
                  const bindProp = node.component === 'Switch' ? 'checked' : 'value'
                  updateNodeProps(node.id, { [bindProp]: node.component === 'Switch' ? false : '' })
                }
              }}
              style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>输入变量名后自动创建双向绑定</div>
          </div>
        </>
      )}

      {/* State Variables */}
      <div className="forge-editor-panel__section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>可用状态变量</span>
        <button
          className="forge-editor-btn forge-editor-btn--small"
          onClick={() => setShowStateManager(!showStateManager)}
          style={{ fontSize: 11 }}
        >
          {showStateManager ? '收起管理' : '管理'}
        </button>
      </div>
      {!showStateManager && (
        <div style={{ padding: '8px 12px' }}>
          {pageFormStates.length > 0 ? (
            pageFormStates.map((fs) => (
              <div key={fs.id} style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                • {fs.id} ({fs.type})
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: '#999' }}>暂无状态变量</div>
          )}
        </div>
      )}
      {showStateManager && (
        <div style={{ padding: '8px 12px' }}>
          <StatePanel
            formStates={pageFormStates}
            addFormState={addFormState}
            updateFormState={updateFormState}
            removeFormState={removeFormState}
          />
        </div>
      )}
    </>
  )
}
