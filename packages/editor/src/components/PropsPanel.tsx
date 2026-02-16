import React from 'react'
import type { PropDefinition } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { findNodeById } from '@forgestudio/protocol'
import { useEditorStore } from '../store'
import {
  StringSetter,
  NumberSetter,
  BooleanSetter,
  EnumSetter,
  ColorSetter,
} from '../setters'

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
  const updateNodeLoop = useEditorStore((s) => s.updateNodeLoop)
  const removeNode = useEditorStore((s) => s.removeNode)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)

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
        </div>
        <div className="forge-editor-panel__empty">选择一个组件以编辑属性</div>
      </div>
    )
  }

  const node = findNodeById(schema.componentTree, selectedNodeId)
  if (!node) return null

  const meta = getComponentMeta(node.component)
  const propsSchema = meta?.propsSchema ?? []

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
      <div className="forge-editor-panel__title">
        {meta?.title ?? node.component}
      </div>
      <div className="forge-editor-panel__section">属性</div>
      {propsSchema.map((def) => (
        <SetterFor
          key={def.name}
          def={def}
          value={node.props[def.name] ?? def.default}
          onChange={(v) => handlePropChange(node.id, node.component, def.name, v)}
        />
      ))}
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
