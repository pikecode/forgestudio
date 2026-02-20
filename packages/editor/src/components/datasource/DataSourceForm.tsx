import type { DataSourceDef, FieldSchema, RequestParamDef } from '@forgestudio/protocol'
import { DATASOURCE_TEMPLATES, DataSourceTemplate } from '../../datasource-templates'
import { DataSourceTester } from './DataSourceTester'
import { RequestParamsEditor } from './RequestParamsEditor'

interface DataSourceFormData {
  purpose: 'query' | 'mutation'
  label: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  dataType: 'array' | 'object'
  headers: Record<string, string>
  body: string
  autoFetch: boolean
  dependsOn: string[]
  pagination?: { type: 'page' | 'cursor'; pageSize: number; pageParam?: string; sizeParam?: string }
  requestParams: RequestParamDef[]
  responseFields: FieldSchema[]
  sampleData: unknown[]
}

interface DataSourceFormProps {
  formData: DataSourceFormData
  editingId: string | null
  isGlobalDataSource: boolean
  availableDataSources: DataSourceDef[]
  onFormDataChange: (data: Partial<DataSourceFormData>) => void
  onIsGlobalChange: (isGlobal: boolean) => void
  onSubmit: () => void
  onCancel: () => void
}

export function DataSourceForm({
  formData,
  editingId,
  isGlobalDataSource,
  availableDataSources,
  onFormDataChange,
  onIsGlobalChange,
  onSubmit,
  onCancel
}: DataSourceFormProps) {
  const handleTestSuccess = (fields: FieldSchema[], sampleData: unknown[]) => {
    onFormDataChange({ responseFields: fields, sampleData })
  }

  return (
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
                onChange={(e) => onIsGlobalChange(e.target.checked)}
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
                    onFormDataChange({
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
              onFormDataChange({
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
            onChange={(e) => onFormDataChange({ label: e.target.value })}
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'column' }}>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => onFormDataChange({ url: e.target.value })}
              placeholder="https://api.example.com/products"
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <DataSourceTester
              url={formData.url}
              method={formData.method}
              headers={formData.headers}
              body={formData.body}
              onTestSuccess={handleTestSuccess}
            />
          </div>
        </div>

        {/* Method */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
            请求方法
          </label>
          <select
            value={formData.method}
            onChange={(e) => onFormDataChange({ method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' })}
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
              onChange={(e) => onFormDataChange({ body: e.target.value })}
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

        {/* Request Parameters Definition */}
        {formData.purpose === 'mutation' && (
          <RequestParamsEditor
            params={formData.requestParams || []}
            onChange={(params) => onFormDataChange({ requestParams: params })}
          />
        )}

        {/* Request Headers */}
        <div style={{ marginBottom: 8 }}>
          <details style={{ border: '1px solid #e0e0e0', borderRadius: 4, padding: 8 }}>
            <summary style={{ fontSize: 13, color: '#555', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
              请求头 (Headers) {Object.keys(formData.headers || {}).length > 0 && `(${Object.keys(formData.headers).length})`}
            </summary>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                配置 HTTP 请求头，如 Content-Type、Authorization 等
              </div>

              {/* Common header presets */}
              <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (!formData.headers['Content-Type']) {
                      onFormDataChange({ headers: { ...formData.headers, 'Content-Type': 'application/json' } })
                    }
                  }}
                  style={{ padding: '2px 6px', fontSize: 11, color: '#1890ff', background: '#fff', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer' }}
                >
                  + Content-Type
                </button>
                <button
                  onClick={() => {
                    if (!formData.headers['Authorization']) {
                      onFormDataChange({ headers: { ...formData.headers, 'Authorization': 'Bearer ' } })
                    }
                  }}
                  style={{ padding: '2px 6px', fontSize: 11, color: '#1890ff', background: '#fff', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer' }}
                >
                  + Authorization
                </button>
              </div>

              {/* Headers list */}
              {Object.entries(formData.headers || {}).map(([key, value]) => (
                <div key={key} style={{ marginBottom: 6, padding: 6, backgroundColor: '#fafafa', borderRadius: 4, border: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>{key}</span>
                    <button
                      onClick={() => {
                        const newHeaders = { ...formData.headers }
                        delete newHeaders[key]
                        onFormDataChange({ headers: newHeaders })
                      }}
                      style={{ padding: '1px 4px', fontSize: 10, color: '#ff4d4f', background: 'transparent', border: '1px solid #ff4d4f', borderRadius: 2, cursor: 'pointer' }}
                    >
                      删除
                    </button>
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      onFormDataChange({ headers: { ...formData.headers, [key]: e.target.value } })
                    }}
                    placeholder="header value"
                    style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: '1px solid #d0d0d0', borderRadius: 3 }}
                  />
                </div>
              ))}

              {/* Add custom header */}
              <button
                onClick={() => {
                  const key = prompt('请输入 Header 名称（如 X-Custom-Header）')
                  if (key && key.trim()) {
                    onFormDataChange({ headers: { ...formData.headers, [key.trim()]: '' } })
                  }
                }}
                style={{ padding: '4px 8px', fontSize: 11, color: '#1890ff', background: '#fff', border: '1px solid #1890ff', borderRadius: 3, cursor: 'pointer', width: '100%' }}
              >
                + 添加自定义 Header
              </button>
            </div>
          </details>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={formData.autoFetch}
              onChange={(e) => onFormDataChange({ autoFetch: e.target.checked })}
            />
            自动获取
          </label>
        </div>

        {/* Pagination configuration */}
        {formData.dataType === 'array' && (
          <details style={{ marginBottom: 8, border: '1px solid #e0e0e0', borderRadius: 4, padding: 8 }}>
            <summary style={{ fontSize: 13, color: '#555', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
              分页配置 {formData.pagination && '(已启用)'}
            </summary>
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!formData.pagination}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFormDataChange({ pagination: { type: 'page', pageSize: 10, pageParam: 'page', sizeParam: 'pageSize' } })
                      } else {
                        onFormDataChange({ pagination: undefined })
                      }
                    }}
                  />
                  启用分页
                </label>
              </div>

              {formData.pagination && (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                      分页类型
                    </label>
                    <select
                      value={formData.pagination.type}
                      onChange={(e) => onFormDataChange({ pagination: { ...formData.pagination!, type: e.target.value as 'page' | 'cursor' } })}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    >
                      <option value="page">页码分页</option>
                      <option value="cursor">游标分页</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                      每页数量
                    </label>
                    <input
                      type="number"
                      value={formData.pagination.pageSize}
                      onChange={(e) => onFormDataChange({ pagination: { ...formData.pagination!, pageSize: Number(e.target.value) || 10 } })}
                      placeholder="10"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    />
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                      页码参数名
                    </label>
                    <input
                      type="text"
                      value={formData.pagination.pageParam || ''}
                      onChange={(e) => onFormDataChange({ pagination: { ...formData.pagination!, pageParam: e.target.value } })}
                      placeholder="page"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    />
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                      每页数量参数名
                    </label>
                    <input
                      type="text"
                      value={formData.pagination.sizeParam || ''}
                      onChange={(e) => onFormDataChange({ pagination: { ...formData.pagination!, sizeParam: e.target.value } })}
                      placeholder="pageSize"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    分页参数将自动添加到请求 URL 中
                  </div>
                </>
              )}
            </div>
          </details>
        )}

        {/* Dependencies selector */}
        {availableDataSources.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              依赖数据源
            </label>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
              选择必须先加载的数据源（可多选）
            </div>
            {availableDataSources
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
                        onFormDataChange({ dependsOn: [...formData.dependsOn, ds.id] })
                      } else {
                        onFormDataChange({ dependsOn: formData.dependsOn.filter(id => id !== ds.id) })
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
              onClick={onSubmit}
            >
              保存
            </button>
            <button
              className="forge-editor-btn"
              onClick={onCancel}
            >
              取消
            </button>
          </div>
        ) : (
          <button
            className="forge-editor-btn forge-editor-btn--primary"
            onClick={onSubmit}
            style={{ width: '100%', marginBottom: 12 }}
          >
            添加数据源
          </button>
        )}
      </div>
    </>
  )
}
