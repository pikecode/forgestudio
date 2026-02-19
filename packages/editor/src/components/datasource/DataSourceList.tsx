import { useState } from 'react'
import type { DataSourceDef } from '@forgestudio/protocol'

interface DataSourceListProps {
  dataSources: DataSourceDef[]
  onEdit: (ds: DataSourceDef) => void
  onRemove: (id: string) => void
}

export function DataSourceList({ dataSources, onEdit, onRemove }: DataSourceListProps) {
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

  if (dataSources.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#999', fontSize: 13 }}>
        暂无页面数据源
      </div>
    )
  }

  // Group by purpose
  const queryDataSources = dataSources.filter(ds => (ds.purpose || 'query') === 'query')
  const mutationDataSources = dataSources.filter(ds => (ds.purpose || 'query') === 'mutation')

  return (
    <>
      {queryDataSources.length > 0 && (
        <div>
          <div style={{ padding: '6px 12px', background: '#f5f5f5', fontSize: 11, fontWeight: 600, color: '#666' }}>
            🔍 查询接口
          </div>
          {queryDataSources.map((ds) => {
            const isExpanded = expandedDataSources.has(ds.id)
            return (
              <div
                key={ds.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 13,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleExpand(ds.id)}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{ds.label || ds.id}</div>
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
                    {ds.dependsOn && ds.dependsOn.length > 0 && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        依赖: {ds.dependsOn.join(', ')}
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
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
                          if (confirm(`确定要删除数据源 "${ds.id}" 吗？`)) {
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
      )}

      {mutationDataSources.length > 0 && (
        <div>
          <div style={{ padding: '6px 12px', background: '#f5f5f5', fontSize: 11, fontWeight: 600, color: '#666' }}>
            ✏️ 操作接口
          </div>
          {mutationDataSources.map((ds) => {
            const isExpanded = expandedDataSources.has(ds.id)
            return (
              <div
                key={ds.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 13,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleExpand(ds.id)}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{ds.label || ds.id}</div>
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
                    {ds.dependsOn && ds.dependsOn.length > 0 && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        依赖: {ds.dependsOn.join(', ')}
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
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
                          if (confirm(`确定要删除数据源 "${ds.id}" 吗？`)) {
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
      )}
    </>
  )
}
