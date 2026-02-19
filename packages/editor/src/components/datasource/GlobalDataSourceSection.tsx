import { useState } from 'react'
import type { DataSourceDef } from '@forgestudio/protocol'

interface GlobalDataSourceSectionProps {
  globalDataSources: DataSourceDef[]
  pageGlobalRefs: string[]
  onEdit: (ds: DataSourceDef) => void
  onRemove: (id: string) => void
  onToggleRef: (id: string) => void
}

export function GlobalDataSourceSection({
  globalDataSources,
  pageGlobalRefs,
  onEdit,
  onRemove,
  onToggleRef
}: GlobalDataSourceSectionProps) {
  const [expandedDataSources, setExpandedDataSources] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedDataSources)
    if (expandedDataSources.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedDataSources(newSet)
  }

  if (globalDataSources.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#999', fontSize: 13 }}>
        暂无全局数据源
      </div>
    )
  }

  return (
    <div>
      {globalDataSources.map((ds) => {
        const isExpanded = expandedDataSources.has(ds.id)
        const isReferenced = pageGlobalRefs.includes(ds.id)
        return (
          <div
            key={ds.id}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 13,
              backgroundColor: isReferenced ? '#f0f8ff' : 'transparent',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => toggleExpand(ds.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ds.label || ds.id}
                  {isReferenced && <span style={{ fontSize: 10, color: '#1890ff', background: '#e6f7ff', padding: '2px 6px', borderRadius: 3 }}>已引用</span>}
                </div>
                {ds.label && <div style={{ fontSize: 11, color: '#999' }}>{ds.id}</div>}
              </div>
              <span style={{ fontSize: 11, color: '#999' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>
            {isExpanded && (
              <>
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  {ds.options?.method || 'GET'} {ds.options?.url || '(未设置)'}
                </div>
                {ds.responseFields && ds.responseFields.length > 0 && (
                  <div style={{ marginTop: 4, padding: 6, background: '#f9f9f9', borderRadius: 3 }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>字段列表:</div>
                    <div style={{ fontSize: 11, color: '#333' }}>
                      {ds.responseFields.map(f => `${f.name} (${f.type})`).join(', ')}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleRef(ds.id)
                    }}
                  >
                    {isReferenced ? '取消引用' : '引用到当前页'}
                  </button>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(ds)
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定要删除全局数据源 "${ds.id}" 吗？`)) {
                        onRemove(ds.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
