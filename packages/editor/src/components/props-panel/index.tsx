import React, { useState } from 'react'
import { findNodeById } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { useEditorStore } from '../../store'
import { AppearanceSection } from './AppearanceSection'
import { DataBindingSection } from './DataBindingSection'
import { EventsSection } from './EventsSection'

type SubTab = 'appearance' | 'data' | 'events'

export function PropsPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)
  const [subTab, setSubTab] = useState<SubTab>('appearance')

  const node = selectedNodeId ? findNodeById(schema.componentTree, selectedNodeId) : null
  const meta = node ? getComponentMeta(node.component) : null

  const renderTabs = () => (
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
  )

  if (!node) {
    return (
      <div className="forge-editor-panel forge-editor-panel--right">
        {renderTabs()}
        <div className="forge-editor-panel__empty">选择一个组件以编辑属性</div>
      </div>
    )
  }

  return (
    <div className="forge-editor-panel forge-editor-panel--right">
      {renderTabs()}
      <div className="forge-editor-panel__title">
        {meta?.title ?? node.component}
      </div>

      {/* Sub-tabs: Appearance / Data / Events */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', padding: '0 12px' }}>
        {(['appearance', 'data', 'events'] as SubTab[]).map((tab) => {
          const labels: Record<SubTab, string> = { appearance: '外观', data: '数据', events: '事件' }
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                border: 'none',
                borderBottom: subTab === tab ? '2px solid #1677ff' : '2px solid transparent',
                background: 'none',
                color: subTab === tab ? '#1677ff' : '#666',
                cursor: 'pointer',
                fontWeight: subTab === tab ? 600 : 400,
              }}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {subTab === 'appearance' && <AppearanceSection />}
      {subTab === 'data' && <DataBindingSection />}
      {subTab === 'events' && <EventsSection />}
    </div>
  )
}