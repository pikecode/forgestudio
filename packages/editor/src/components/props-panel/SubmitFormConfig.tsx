import { useState, useEffect } from 'react'
import type { DataSourceDef, FormStateDef, RequestParamDef } from '@forgestudio/protocol'

interface SubmitFormConfigProps {
  dataSources: DataSourceDef[]
  formStates: FormStateDef[]
  value: {
    dataSourceId?: string
    fieldMapping?: Record<string, string>
    // Legacy fields
    url?: string
    method?: string
    fields?: string[]
    successMessage?: string
    errorMessage?: string
  }
  onChange: (value: any) => void
}

export function SubmitFormConfig({ dataSources, formStates, value, onChange }: SubmitFormConfigProps) {
  const [useDataSource, setUseDataSource] = useState(!!value.dataSourceId)

  // Filter mutation data sources
  const mutationDataSources = dataSources.filter(ds => ds.purpose === 'mutation')

  // Get selected data source
  const selectedDataSource = mutationDataSources.find(ds => ds.id === value.dataSourceId)

  // Initialize field mapping when data source changes
  useEffect(() => {
    if (useDataSource && value.dataSourceId && selectedDataSource?.requestParams) {
      // Initialize empty mapping if not exists
      if (!value.fieldMapping) {
        onChange({ ...value, fieldMapping: {} })
      }
    }
  }, [value.dataSourceId, useDataSource])

  const inputStyle = {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    fontSize: 13,
  }

  const labelStyle = {
    fontSize: 13,
    color: '#555',
    display: 'block',
    marginBottom: 4,
  }

  const handleToggleMode = (useDsMode: boolean) => {
    setUseDataSource(useDsMode)
    if (useDsMode) {
      // Switch to data source mode - clear legacy fields
      onChange({
        dataSourceId: mutationDataSources[0]?.id || '',
        fieldMapping: {},
        successMessage: value.successMessage,
        errorMessage: value.errorMessage,
      })
    } else {
      // Switch to legacy mode - clear data source fields
      onChange({
        url: '',
        method: 'POST',
        fields: [],
        successMessage: value.successMessage,
        errorMessage: value.errorMessage,
      })
    }
  }

  return (
    <>
      {/* Mode selector */}
      <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>配置方式</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={useDataSource}
              onChange={() => handleToggleMode(true)}
            />
            使用数据源（推荐）
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={!useDataSource}
              onChange={() => handleToggleMode(false)}
            />
            直接配置 URL
          </label>
        </div>
      </div>

      {useDataSource ? (
        <>
          {/* Data source mode */}
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>选择数据源</label>
            {mutationDataSources.length > 0 ? (
              <select
                value={value.dataSourceId || ''}
                onChange={(e) => onChange({ ...value, dataSourceId: e.target.value, fieldMapping: {} })}
                style={inputStyle}
              >
                <option value="">请选择...</option>
                {mutationDataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.label || ds.id} ({ds.options.method} {ds.options.url})
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: 12, color: '#999', padding: 8, border: '1px solid #e0e0e0', borderRadius: 4 }}>
                暂无可用的 mutation 数据源，请先在数据源面板中创建
              </div>
            )}
          </div>

          {/* Field mapping */}
          {selectedDataSource && selectedDataSource.requestParams && selectedDataSource.requestParams.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>字段映射</label>
              <div style={{ border: '1px solid #d0d0d0', borderRadius: 4, padding: 8, backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  将表单字段映射到 API 请求参数
                </div>
                {selectedDataSource.requestParams.map((param: RequestParamDef) => (
                  <div key={param.name} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{param.name}</span>
                      {param.required && <span style={{ color: '#f56', marginLeft: 4 }}>*</span>}
                      <span style={{ color: '#999', marginLeft: 4, fontSize: 11 }}>
                        ({param.type})
                      </span>
                    </div>
                    {param.description && (
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{param.description}</div>
                    )}
                    <select
                      value={value.fieldMapping?.[param.name] || ''}
                      onChange={(e) => {
                        const newMapping = { ...(value.fieldMapping || {}), [param.name]: e.target.value }
                        onChange({ ...value, fieldMapping: newMapping })
                      }}
                      style={{ ...inputStyle, fontSize: 12 }}
                    >
                      <option value="">
                        {param.required ? '请选择表单字段...' : '不映射（使用默认值）'}
                      </option>
                      {formStates.map((fs: FormStateDef) => (
                        <option key={fs.id} value={fs.id}>
                          {fs.id} ({fs.type})
                        </option>
                      ))}
                    </select>
                    {param.defaultValue !== undefined && !value.fieldMapping?.[param.name] && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        默认值: {JSON.stringify(param.defaultValue)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Legacy mode */}
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>提交地址</label>
            <input
              type="text"
              value={value.url || ''}
              onChange={(e) => onChange({ ...value, url: e.target.value })}
              placeholder="https://api.example.com/submit"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>请求方法</label>
            <select
              value={value.method || 'POST'}
              onChange={(e) => onChange({ ...value, method: e.target.value })}
              style={inputStyle}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>提交字段（多选）</label>
            {formStates.length > 0 ? (
              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #d0d0d0', borderRadius: 4, padding: 4 }}>
                {formStates.map((fs: FormStateDef) => (
                  <label key={fs.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(value.fields || []).includes(fs.id)}
                      onChange={(e) => {
                        const fields = value.fields || []
                        onChange({
                          ...value,
                          fields: e.target.checked ? [...fields, fs.id] : fields.filter((f: string) => f !== fs.id),
                        })
                      }}
                    />
                    {fs.id} ({fs.type})
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#999', padding: 8 }}>暂无可用的状态变量</div>
            )}
          </div>
        </>
      )}

      {/* Common fields */}
      <div style={{ marginBottom: 6 }}>
        <label style={labelStyle}>成功提示</label>
        <input
          type="text"
          value={value.successMessage || ''}
          onChange={(e) => onChange({ ...value, successMessage: e.target.value })}
          placeholder="提交成功"
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 6 }}>
        <label style={labelStyle}>失败提示</label>
        <input
          type="text"
          value={value.errorMessage || ''}
          onChange={(e) => onChange({ ...value, errorMessage: e.target.value })}
          placeholder="提交失败"
          style={inputStyle}
        />
      </div>
    </>
  )
}
