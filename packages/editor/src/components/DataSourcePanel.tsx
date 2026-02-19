import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store'
import type { DataSourceDef } from '@forgestudio/protocol'
import { analyzeRequiredParams } from '../utils/param-analyzer'
import { extractListFromResponse, extractFieldsFromData } from '../utils/field-extractor'
import { DATASOURCE_TEMPLATES, DataSourceTemplate } from '../datasource-templates'

export function DataSourcePanel() {
  const schema = useEditorStore((s) => s.schema)
  const currentPageId = useEditorStore((s) => s.currentPageId)
  const getCurrentPage = useEditorStore((s) => s.getCurrentPage)
  const addDataSource = useEditorStore((s) => s.addDataSource)
  const updateDataSource = useEditorStore((s) => s.updateDataSource)
  const removeDataSource = useEditorStore((s) => s.removeDataSource)
  const addGlobalDataSource = useEditorStore((s) => s.addGlobalDataSource)
  const updateGlobalDataSource = useEditorStore((s) => s.updateGlobalDataSource)
  const removeGlobalDataSource = useEditorStore((s) => s.removeGlobalDataSource)
  const togglePageGlobalDataSourceRef = useEditorStore((s) => s.togglePageGlobalDataSourceRef)
  const rightPanelTab = useEditorStore((s) => s.rightPanelTab)
  const setRightPanelTab = useEditorStore((s) => s.setRightPanelTab)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [expandedDataSources, setExpandedDataSources] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<DataSourceTemplate | null>(null)
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [isGlobalDataSource, setIsGlobalDataSource] = useState(false)  // Track if adding/editing global DS
  const [formData, setFormData] = useState({
    purpose: 'query' as 'query' | 'mutation',
    label: '',
    url: '',
    method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE',
    dataType: 'array' as 'array' | 'object',
    headers: {} as Record<string, string>,
    body: '',
    autoFetch: true,
    dependsOn: [] as string[],
    responseFields: [] as any[],
    sampleData: [] as any[],
  })

  // M4: Use page-level dataSources instead of global
  const currentPage = getCurrentPage()
  const dataSources = currentPage?.dataSources ?? []
  const globalDataSources = schema.globalDataSources ?? []
  const pageGlobalRefs = currentPage?.globalDataSourceRefs ?? []

  // M5: Analyze required params from component tree
  const requiredParams = useMemo(() => {
    if (!currentPage?.componentTree) return new Set<string>()
    return analyzeRequiredParams(currentPage.componentTree)
  }, [currentPage?.componentTree])

  const resetForm = useCallback(() => {
    setFormData({
      purpose: 'query',
      label: '',
      url: '',
      method: 'GET',
      dataType: 'array',
      autoFetch: true,
      dependsOn: [],
      body: '',
      headers: {},
      responseFields: [],
      sampleData: []
    })
    setEditingId(null)
    setSelectedTemplate(null)
  }, [])

  // Reset form when page changes
  useEffect(() => {
    resetForm()
  }, [currentPageId, resetForm])

  // Handle template selection
  const handleSelectTemplate = (template: DataSourceTemplate) => {
    setSelectedTemplate(template)
    const config = DATASOURCE_TEMPLATES[template]
    setFormData(prev => ({
      ...prev,
      url: config.urlTemplate,
      method: config.method,
      dataType: config.dataType,
      autoFetch: true,
      sampleData: config.sampleDataGenerator(),
    }))
  }

  const handleAdd = () => {
    if (!formData.label.trim()) {
      alert('请填写数据源名称')
      return
    }
    if (!formData.url.trim()) {
      alert('请填写 URL')
      return
    }
    if (!formData.responseFields || formData.responseFields.length === 0) {
      const confirmed = confirm('尚未测试接口，无法获取字段信息。是否继续添加？')
      if (!confirmed) return
    }

    if (isGlobalDataSource) {
      addGlobalDataSource({
        type: 'api',
        purpose: formData.purpose,
        dataType: formData.dataType,
        label: formData.label || undefined,
        options: {
          url: formData.url,
          method: formData.method,
          headers: undefined,
          body: formData.body || undefined,
        },
        autoFetch: formData.autoFetch,
        responseFields: formData.responseFields,
        sampleData: formData.sampleData,
        dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      })
    } else {
      addDataSource({
        type: 'api',
        purpose: formData.purpose,
        dataType: formData.dataType,
        label: formData.label || undefined,
        options: {
          url: formData.url,
          method: formData.method,
          headers: undefined,
          body: formData.body || undefined,
        },
        autoFetch: formData.autoFetch,
        responseFields: formData.responseFields,
        sampleData: formData.sampleData,
        dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      })
    }
    resetForm()
  }

  const handleUpdate = (id: string) => {
    if (!formData.label.trim()) {
      alert('请填写数据源名称')
      return
    }
    if (!formData.url.trim()) {
      alert('请填写 URL')
      return
    }

    if (isGlobalDataSource) {
      updateGlobalDataSource(id, {
        purpose: formData.purpose,
        dataType: formData.dataType,
        label: formData.label || undefined,
        options: {
          url: formData.url,
          method: formData.method,
          headers: undefined,
          body: formData.body || undefined,
        },
        autoFetch: formData.autoFetch,
        responseFields: formData.responseFields,
        sampleData: formData.sampleData,
        dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      })
    } else {
      updateDataSource(id, {
        purpose: formData.purpose,
        dataType: formData.dataType,
        label: formData.label || undefined,
        options: {
          url: formData.url,
          method: formData.method,
          headers: undefined,
          body: formData.body || undefined,
        },
        autoFetch: formData.autoFetch,
        responseFields: formData.responseFields,
        sampleData: formData.sampleData,
        dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      })
    }
    resetForm()
  }

  const handleEdit = (ds: DataSourceDef, isGlobal: boolean) => {
    setEditingId(ds.id)
    setIsGlobalDataSource(isGlobal)
    setFormData({
      purpose: ds.purpose || 'query',
      label: ds.label || '',
      url: ds.options?.url || '',
      method: ds.options?.method || 'GET',
      dataType: ds.dataType || 'array',  // Backward compatibility
      autoFetch: ds.autoFetch,
      dependsOn: ds.dependsOn || [],
      body: ds.options?.body || '',
      headers: {},
      responseFields: ds.responseFields || [],
      sampleData: ds.sampleData || []
    })
  }

  const handleExport = () => {
    if (dataSources.length === 0) {
      alert('暂无数据源可导出')
      return
    }
    const data = JSON.stringify(dataSources, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `datasources-${currentPage?.id || 'page'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          if (!Array.isArray(imported)) {
            alert('导入失败：文件格式错误（必须是数组）')
            return
          }
          // Validate each data source
          for (const ds of imported) {
            if (!ds.id || !ds.type) {
              alert('导入失败：数据源格式错误')
              return
            }
          }
          // Check for duplicate IDs
          const existingIds = new Set(dataSources.map(d => d.id))
          const duplicates = imported.filter(ds => existingIds.has(ds.id))
          if (duplicates.length > 0) {
            const names = duplicates.map(ds => ds.id).join(', ')
            if (!confirm(`以下数据源 ID 已存在：${names}\n继续导入将跳过这些重复项，确定吗？`)) {
              return
            }
          }
          // Import non-duplicate ones
          const toImport = imported.filter(ds => !existingIds.has(ds.id))
          toImport.forEach(ds => {
            // Backward compatibility: mockData -> sampleData
            const sampleData = (ds as any).mockData || ds.sampleData
            addDataSource({
              type: ds.type,
              purpose: ds.purpose || 'query',
              dataType: ds.dataType || 'array',  // Backward compatibility
              label: ds.label,
              options: ds.options,
              autoFetch: ds.autoFetch,
              responseFields: ds.responseFields,
              sampleData,
              dependsOn: ds.dependsOn,
            })
          })
          alert(`成功导入 ${toImport.length} 个数据源${duplicates.length > 0 ? `，跳过 ${duplicates.length} 个重复项` : ''}`)
        } catch (e) {
          alert('导入失败：' + (e as Error).message)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleTestApi = async () => {
    if (!formData.url) {
      alert('请先填写 URL')
      return
    }
    setTesting(true)
    try {
      // 替换 URL 中的参数占位符 {{$param.xxx}}
      let requestUrl = formData.url
      const paramPattern = /\{\{\$param\.(\w+)\}\}/g
      requestUrl = requestUrl.replace(paramPattern, (match, paramName) => {
        const paramValue = testParams[paramName]
        if (!paramValue) {
          throw new Error(`参数 "${paramName}" 未设置测试值`)
        }
        return paramValue
      })

      // 将常用域名转换为代理路径
      const proxyMappings = [
        { domain: 'reqres.in', proxy: '/api-proxy/reqres' },
        { domain: 'dummyjson.com', proxy: '/api-proxy/dummyjson' },
        { domain: 'jsonplaceholder.typicode.com', proxy: '/api-proxy/jsonplaceholder' },
      ]

      for (const mapping of proxyMappings) {
        if (requestUrl.includes(mapping.domain)) {
          requestUrl = requestUrl.replace(`https://${mapping.domain}`, mapping.proxy)
          break
        }
      }

      const res = await fetch(requestUrl, {
        method: formData.method,
        headers: { 'Content-Type': 'application/json' },
        body: formData.method !== 'GET' && formData.body ? formData.body : undefined
      })

      if (!res.ok) {
        alert(`接口返回错误：${res.status} ${res.statusText}`)
        return
      }
      const data = await res.json()

      // 使用新的字段提取器（支持单对象和数组）
      const fields = extractFieldsFromData(data)

      if (fields.length === 0) {
        alert('接口返回数据为空或格式不正确')
        return
      }

      // 缓存示例数据用于预览
      // 如果是数组，取前3条；如果是对象，包装成单元素数组
      let sampleData: any[]
      if (Array.isArray(data)) {
        sampleData = data.slice(0, 3)
      } else if (data && typeof data === 'object') {
        // 单对象 - 检查是否有包装字段
        const listData = extractListFromResponse(data)
        if (listData.length > 0) {
          sampleData = listData.slice(0, 3)
        } else {
          // 纯单对象详情接口
          sampleData = [data]
        }
      } else {
        sampleData = []
      }

      setFormData(prev => ({
        ...prev,
        responseFields: fields,
        sampleData
      }))

      const dataType = Array.isArray(data) ? '数组' : '单对象'
      alert(`✅ 成功获取${dataType}数据\n检测到 ${fields.length} 个字段：${fields.map(f => f.name).join(', ')}`)
    } catch (e) {
      alert('接口请求失败: ' + (e as Error).message)
    } finally {
      setTesting(false)
    }
  }

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
      <div className="forge-editor-panel__title">数据源管理</div>

      {/* Current page indicator (M4) */}
      {currentPage && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          fontSize: 12,
          color: '#666'
        }}>
          当前页面: <strong style={{ color: '#333' }}>{currentPage.title}</strong>
        </div>
      )}

      {/* Required params indicator (M5) */}
      {requiredParams.size > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          fontSize: 12,
          color: '#856404'
        }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>📋 检测到页面参数</div>
          <div style={{ fontSize: 11 }}>
            此页面需要接收参数: <strong>{Array.from(requiredParams).join(', ')}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
            在跳转配置中传递这些参数，例如: {`{{$item.id}}`}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!editingId && (
        <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={handleImport}
              style={{ flex: 1, fontSize: 12 }}
            >
              📥 导入
            </button>
            <button
              className="forge-editor-btn forge-editor-btn--small"
              onClick={handleExport}
              disabled={dataSources.length === 0}
              style={{ flex: 1, fontSize: 12 }}
            >
              📤 导出
            </button>
          </div>
        </div>
      )}

      {/* Global Data Sources Section */}
      <div className="forge-editor-panel__section" style={{ background: '#e6f7ff', borderBottom: '2px solid #1890ff' }}>
        🌐 全局数据源
      </div>
      {globalDataSources.length === 0 && (
        <div style={{ padding: '12px', color: '#999', fontSize: 13 }}>
          暂无全局数据源
        </div>
      )}

      {globalDataSources.length > 0 && (
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
                  onClick={() => {
                    const newSet = new Set(expandedDataSources)
                    if (isExpanded) {
                      newSet.delete(ds.id)
                    } else {
                      newSet.add(ds.id)
                    }
                    setExpandedDataSources(newSet)
                  }}
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
                          togglePageGlobalDataSourceRef(ds.id)
                        }}
                      >
                        {isReferenced ? '取消引用' : '引用到当前页'}
                      </button>
                      <button
                        className="forge-editor-btn forge-editor-btn--small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(ds, true)
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="forge-editor-btn forge-editor-btn--small"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定要删除全局数据源 "${ds.id}" 吗？`)) {
                            removeGlobalDataSource(ds.id)
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

      {/* Page-level Data Sources Section */}
      <div className="forge-editor-panel__section">📄 页面数据源</div>
      {dataSources.length === 0 && (
        <div style={{ padding: '12px', color: '#999', fontSize: 13 }}>
          暂无页面数据源
        </div>
      )}

      {/* Group by purpose */}
      {['query', 'mutation'].map(purpose => {
        const filtered = dataSources.filter(ds => (ds.purpose || 'query') === purpose)
        if (filtered.length === 0) return null

        return (
          <div key={purpose}>
            <div style={{ padding: '6px 12px', background: '#f5f5f5', fontSize: 11, fontWeight: 600, color: '#666' }}>
              {purpose === 'query' ? '🔍 查询接口' : '✏️ 操作接口'}
            </div>
            {filtered.map((ds) => {
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
                    onClick={() => {
                      const newSet = new Set(expandedDataSources)
                      if (isExpanded) {
                        newSet.delete(ds.id)
                      } else {
                        newSet.add(ds.id)
                      }
                      setExpandedDataSources(newSet)
                    }}
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
                            handleEdit(ds, false)
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="forge-editor-btn forge-editor-btn--small"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`确定要删除数据源 "${ds.id}" 吗？`)) {
                              removeDataSource(ds.id)
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
      })}

      {/* Form for adding/editing data source */}
      <>
        <div className="forge-editor-panel__section">
          {editingId ? (isGlobalDataSource ? '编辑全局数据源' : '编辑页面数据源') : '添加数据源'}
        </div>

        <div style={{ padding: '0 12px' }}>
          {/* Global/Page toggle (only show when adding) */}
          {!editingId && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isGlobalDataSource}
                  onChange={(e) => setIsGlobalDataSource(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                设为全局数据源（可在所有页面引用）
              </label>
            </div>
          )}

          {/* Template selector (only show when adding) */}
          {!editingId && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
                快速模板
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.values(DATASOURCE_TEMPLATES).filter(t => t.template !== DataSourceTemplate.CUSTOM).map(tmpl => (
                  <button
                    key={tmpl.template}
                    className="forge-editor-btn forge-editor-btn--small"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        label: tmpl.title,
                        url: tmpl.urlTemplate,
                        method: tmpl.method,
                        sampleData: tmpl.sampleDataGenerator(),
                        purpose: 'query'
                      })
                    }}
                    style={{
                      fontSize: 11,
                      padding: '8px',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <div style={{ fontSize: 14 }}>{tmpl.icon}</div>
                    <div style={{ fontWeight: 500 }}>{tmpl.title}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>{tmpl.description}</div>
                    {tmpl.requiresParams && (
                      <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}>
                        需要参数: {tmpl.requiresParams.join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                💡 选择模板后，会自动填充 URL 和示例数据
              </div>
            </div>
          )}

          {/* Purpose selector */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              用途
            </label>
            <select
              value={formData.purpose}
              onChange={(e) => {
                const purpose = e.target.value as 'query' | 'mutation'
                setFormData({
                  ...formData,
                  purpose,
                  method: purpose === 'query' ? 'GET' : 'POST',
                  autoFetch: purpose === 'query'
                })
              }}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <option value="query">查询数据 (Query)</option>
              <option value="mutation">数据操作 (Mutation)</option>
            </select>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {formData.purpose === 'query' ? '自动获取数据，用于列表、详情展示' : '手动触发，用于新增、编辑、删除操作'}
            </div>
          </div>

          {/* Label */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              名称 <span style={{ color: '#f56' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="例如：商品列表"
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>将作为数据源的唯一标识</div>
          </div>

          {/* URL */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              接口地址
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://api.example.com/products"
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #d0d0d0',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              />
              <button
                className="forge-editor-btn forge-editor-btn--small"
                onClick={handleTestApi}
                disabled={testing || !formData.url}
                style={{ whiteSpace: 'nowrap' }}
              >
                {testing ? '测试中...' : '测试接口'}
              </button>
            </div>
          </div>

          {/* Test params input (if URL contains {{$param.xxx}}) */}
          {(() => {
            const paramMatches = formData.url.matchAll(/\{\{\$param\.(\w+)\}\}/g)
            const detectedParams = Array.from(paramMatches).map(m => m[1])
            if (detectedParams.length > 0) {
              return (
                <div style={{ marginBottom: 8, padding: 8, background: '#f9f9f9', borderRadius: 4, border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    💡 检测到参数化 URL，请填写测试参数：
                  </div>
                  {detectedParams.map(param => (
                    <div key={param} style={{ marginBottom: 4 }}>
                      <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 2 }}>
                        {param}
                      </label>
                      <input
                        type="text"
                        value={testParams[param] || ''}
                        onChange={(e) => setTestParams({ ...testParams, [param]: e.target.value })}
                        placeholder={`例如：${param === 'id' ? '1' : 'value'}`}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: '1px solid #d0d0d0',
                          borderRadius: 3,
                          fontSize: 12,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )
            }
            return null
          })()}

          {/* Method */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              请求方法
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Request body for mutation */}
          {formData.purpose === 'mutation' && formData.method !== 'GET' && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
                请求体模板（JSON）
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder='{"name": "{{$state.name}}", "price": {{$state.price}}}'
                rows={4}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d0d0d0',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'Monaco, monospace',
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                支持使用 {'{{'} 表达式 {'}}'}，如 {'{{'} $state.fieldName {'}}'}
              </div>
            </div>
          )}

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={formData.autoFetch}
                  onChange={(e) => setFormData({ ...formData, autoFetch: e.target.checked })}
                />
                自动获取
              </label>
            </div>

            {/* Dependencies selector (M2) */}
            {dataSources.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
                  依赖数据源
                </label>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  选择必须先加载的数据源（可多选）
                </div>
                {dataSources
                  .filter(ds => ds.id !== editingId)
                  .map(ds => (
                    <label
                      key={ds.id}
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
                        checked={formData.dependsOn.includes(ds.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, dependsOn: [...formData.dependsOn, ds.id] })
                          } else {
                            setFormData({ ...formData, dependsOn: formData.dependsOn.filter(id => id !== ds.id) })
                          }
                        }}
                      />
                      {ds.id}
                    </label>
                  ))}
              </div>
            )}

          {/* Response fields display */}
          {formData.responseFields && formData.responseFields.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
                检测到的字段
              </label>
              <div style={{ padding: 8, background: '#f9f9f9', borderRadius: 4, border: '1px solid #e0e0e0' }}>
                {formData.responseFields.map(f => (
                  <div key={f.name} style={{ fontSize: 12, marginBottom: 2 }}>
                    <span style={{ fontWeight: 500 }}>{f.name}</span>
                    <span style={{ color: '#999', marginLeft: 6 }}>({f.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingId ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                className="forge-editor-btn forge-editor-btn--primary"
                onClick={() => handleUpdate(editingId)}
              >
                保存
              </button>
              <button
                className="forge-editor-btn"
                onClick={resetForm}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              className="forge-editor-btn forge-editor-btn--primary"
              onClick={handleAdd}
              style={{ width: '100%', marginBottom: 12 }}
            >
              添加数据源
            </button>
          )}
        </div>
      </>
    </div>
  )
}
