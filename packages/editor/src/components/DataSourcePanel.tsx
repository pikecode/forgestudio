import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store'
import type { DataSourceDef, FieldSchema } from '@forgestudio/protocol'
import { analyzeRequiredParams } from '../utils/param-analyzer'
import { RightPanelTabs } from './RightPanelTabs'
import { DataSourceList, DataSourceForm, GlobalDataSourceSection } from './datasource'

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
  const [isGlobalDataSource, setIsGlobalDataSource] = useState(false)
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
    pagination: undefined as { type: 'page' | 'cursor'; pageSize: number; pageParam?: string; sizeParam?: string } | undefined,
    responseFields: [] as FieldSchema[],
    sampleData: [] as unknown[],
  })

  const currentPage = getCurrentPage()
  const dataSources = currentPage?.dataSources ?? []
  const globalDataSources = schema.globalDataSources ?? []
  const pageGlobalRefs = currentPage?.globalDataSourceRefs ?? []

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
      sampleData: [],
      pagination: undefined,
    })
    setEditingId(null)
  }, [])

  useEffect(() => {
    resetForm()
  }, [currentPageId, resetForm])

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

    const dataSourceData = {
      type: 'api' as const,
      purpose: formData.purpose,
      dataType: formData.dataType,
      label: formData.label || undefined,
      options: {
        url: formData.url,
        method: formData.method,
        headers: Object.keys(formData.headers).length > 0 ? formData.headers : undefined,
        body: formData.body || undefined,
      },
      autoFetch: formData.autoFetch,
      responseFields: formData.responseFields,
      sampleData: formData.sampleData,
      dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      pagination: formData.pagination,
    }

    if (isGlobalDataSource) {
      addGlobalDataSource(dataSourceData)
    } else {
      addDataSource(dataSourceData)
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

    const dataSourceData = {
      purpose: formData.purpose,
      dataType: formData.dataType,
      label: formData.label || undefined,
      options: {
        url: formData.url,
        method: formData.method,
        headers: Object.keys(formData.headers).length > 0 ? formData.headers : undefined,
        body: formData.body || undefined,
      },
      autoFetch: formData.autoFetch,
      responseFields: formData.responseFields,
      sampleData: formData.sampleData,
      dependsOn: formData.dependsOn.length > 0 ? formData.dependsOn : undefined,
      pagination: formData.pagination,
    }

    if (isGlobalDataSource) {
      updateGlobalDataSource(id, dataSourceData)
    } else {
      updateDataSource(id, dataSourceData)
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
      dataType: ds.dataType || 'array',
      autoFetch: ds.autoFetch,
      dependsOn: ds.dependsOn || [],
      body: ds.options?.body || '',
      headers: ds.options?.headers || {},
      responseFields: ds.responseFields || [],
      sampleData: ds.sampleData || [],
      pagination: ds.pagination,
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
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement)?.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string)
          if (!Array.isArray(imported)) {
            alert('导入失败：文件格式错误（必须是数组）')
            return
          }
          for (const ds of imported) {
            if (!ds.id || !ds.type) {
              alert('导入失败：数据源格式错误')
              return
            }
          }
          const existingIds = new Set(dataSources.map(d => d.id))
          const duplicates = imported.filter(ds => existingIds.has(ds.id))
          if (duplicates.length > 0) {
            const names = duplicates.map(ds => ds.id).join(', ')
            if (!confirm(`以下数据源 ID 已存在：${names}\n继续导入将跳过这些重复项，确定吗？`)) {
              return
            }
          }
          const toImport = imported.filter(ds => !existingIds.has(ds.id))
          toImport.forEach(ds => {
            const sampleData = ds.mockData || ds.sampleData
            addDataSource({
              type: ds.type,
              purpose: ds.purpose || 'query',
              dataType: ds.dataType || 'array',
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

  return (
    <div className="forge-editor-panel forge-editor-panel--right">
      <RightPanelTabs activeTab={rightPanelTab} onTabChange={setRightPanelTab} />
      <div className="forge-editor-panel__title">数据源管理</div>

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

      <div className="forge-editor-panel__section" style={{ background: '#e6f7ff', borderBottom: '2px solid #1890ff' }}>
        🌐 全局数据源
      </div>
      <GlobalDataSourceSection
        globalDataSources={globalDataSources}
        pageGlobalRefs={pageGlobalRefs}
        onEdit={(ds) => handleEdit(ds, true)}
        onRemove={removeGlobalDataSource}
        onToggleRef={togglePageGlobalDataSourceRef}
      />

      <div className="forge-editor-panel__section">📄 页面数据源</div>
      <DataSourceList
        dataSources={dataSources}
        onEdit={(ds) => handleEdit(ds, false)}
        onRemove={removeDataSource}
      />

      <DataSourceForm
        formData={formData}
        editingId={editingId}
        isGlobalDataSource={isGlobalDataSource}
        availableDataSources={dataSources}
        onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onIsGlobalChange={setIsGlobalDataSource}
        onSubmit={() => editingId ? handleUpdate(editingId) : handleAdd()}
        onCancel={resetForm}
      />
    </div>
  )
}
