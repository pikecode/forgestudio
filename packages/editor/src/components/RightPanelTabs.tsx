import React from 'react'

interface RightPanelTabsProps {
  activeTab: 'props' | 'datasource' | 'code'
  onTabChange: (tab: 'props' | 'datasource' | 'code') => void
}

export function RightPanelTabs({ activeTab, onTabChange }: RightPanelTabsProps) {
  return (
    <div className="forge-editor-tabs">
      <button
        className={`forge-editor-tab ${activeTab === 'props' ? 'forge-editor-tab--active' : ''}`}
        onClick={() => onTabChange('props')}
      >
        属性
      </button>
      <button
        className={`forge-editor-tab ${activeTab === 'datasource' ? 'forge-editor-tab--active' : ''}`}
        onClick={() => onTabChange('datasource')}
      >
        数据源
      </button>
      <button
        className={`forge-editor-tab ${activeTab === 'code' ? 'forge-editor-tab--active' : ''}`}
        onClick={() => onTabChange('code')}
      >
        代码
      </button>
    </div>
  )
}
