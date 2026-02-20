import React from 'react'
import type { ComponentNode, DataSourceDef } from '@forgestudio/protocol'
import { findNodeById } from '@forgestudio/protocol'
import { useEditorStore } from '../../store'

interface FormConfigSectionProps {
  formNode: ComponentNode
}

export function FormConfigSection({ formNode }: FormConfigSectionProps) {
  const schema = useEditorStore((s) => s.schema)
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const getCurrentPage = useEditorStore((s) => s.getCurrentPage)

  const currentPage = getCurrentPage()
  const allDataSources = currentPage?.dataSources ?? []

  // Get mutation data sources (POST/PUT/DELETE)
  const mutationDataSources = allDataSources.filter(
    (ds) => ds.options.method && ['POST', 'PUT', 'DELETE'].includes(ds.options.method)
  )

  // Get selected data source
  const selectedDataSourceId = formNode.props?.dataSourceId as string || ''
  const selectedDataSource = allDataSources.find((ds) => ds.id === selectedDataSourceId)

  // Get field mapping from Form props
  const fieldMapping = (formNode.props?.fieldMapping as Record<string, string>) || {}

  // Find all Input/Textarea children in the form
  const findFormInputs = (node: ComponentNode): ComponentNode[] => {
    let inputs: ComponentNode[] = []
    if (node.component === 'Input' || node.component === 'Textarea') {
      inputs.push(node)
    }
    if (node.children) {
      for (const child of node.children) {
        inputs = inputs.concat(findFormInputs(child))
      }
    }
    return inputs
  }

  const formInputs = findFormInputs(formNode)

  const handleDataSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDataSourceId = e.target.value
    updateNodeProps(formNode.id, {
      dataSourceId: newDataSourceId,
      fieldMapping: {} // Reset mapping when data source changes
    })
  }

  const handleFieldMappingChange = (paramName: string, inputId: string) => {
    const newMapping = { ...fieldMapping }
    if (inputId === '') {
      delete newMapping[paramName]
    } else {
      newMapping[paramName] = inputId
    }
    updateNodeProps(formNode.id, { fieldMapping: newMapping })
  }

  // Get display label for an input component
  const getInputLabel = (input: ComponentNode): string => {
    const placeholder = input.props?.placeholder as string
    const name = input.props?.name as string
    if (placeholder) return placeholder
    if (name) return name
    return `Input (${input.id.slice(0, 8)}...)`
  }

  return (
    <>
      <div className="forge-editor-panel__section">表单配置</div>

      {/* Data Source Selection */}
      <div style={{ padding: '8px 12px' }}>
        <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
          提交数据源
        </label>
        <select
          value={selectedDataSourceId}
          onChange={handleDataSourceChange}
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: 13,
            border: '1px solid #d0d0d0',
            borderRadius: 4,
          }}
        >
          <option value="">请选择数据源</option>
          {mutationDataSources.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.label || ds.id} ({ds.options.method})
            </option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          选择表单提交时调用的 API
        </div>
      </div>

      {/* Field Mapping Section */}
      {selectedDataSource && selectedDataSource.requestParams && selectedDataSource.requestParams.length > 0 && (
        <>
          <div className="forge-editor-panel__section">字段映射</div>
          <div style={{ padding: '8px 12px' }}>
            {formInputs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                表单中还没有输入组件，请先添加 Input 或 Textarea 组件
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                将 API 参数映射到表单输入组件：
              </div>
            )}

            {selectedDataSource.requestParams.map((param) => {
              const mappedInputId = fieldMapping[param.name] || ''
              return (
                <div
                  key={param.name}
                  style={{
                    marginBottom: 12,
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: 4,
                    borderLeft: param.required ? '3px solid #ff4d4f' : '3px solid #d0d0d0',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {param.name}
                    {param.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
                  </div>
                  {param.description && (
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                      {param.description}
                    </div>
                  )}
                  <select
                    value={mappedInputId}
                    onChange={(e) => handleFieldMappingChange(param.name, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: 12,
                      border: '1px solid #d0d0d0',
                      borderRadius: 4,
                      backgroundColor: '#fff',
                    }}
                    disabled={formInputs.length === 0}
                  >
                    <option value="">-- 选择输入组件 --</option>
                    {formInputs.map((input) => (
                      <option key={input.id} value={input.id}>
                        {getInputLabel(input)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}

            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              💡 必填参数用红色标记，请确保所有必填参数都已映射
            </div>
          </div>
        </>
      )}

      {/* Form Inputs Summary */}
      {formInputs.length > 0 && (
        <>
          <div className="forge-editor-panel__section">表单组件</div>
          <div style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              表单包含 {formInputs.length} 个输入组件
            </div>
            {formInputs.map((input) => {
              const isMapped = Object.values(fieldMapping).includes(input.id)
              return (
                <div
                  key={input.id}
                  style={{
                    fontSize: 11,
                    color: isMapped ? '#52c41a' : '#999',
                    marginBottom: 4,
                    padding: '4px 6px',
                    backgroundColor: isMapped ? '#f6ffed' : '#fafafa',
                    borderRadius: 3,
                  }}
                >
                  {isMapped ? '✓' : '○'} {getInputLabel(input)}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
