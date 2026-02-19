import React from 'react'

interface SetterProps {
  label: string
  value: unknown
  onChange: (v: unknown) => void
}

interface StringSetterExtraProps {
  enableExpressionMode?: boolean
  expressionContext?: {
    stateVars?: Array<{ id: string; type: string }>
    dataSourceFields?: Array<{ dataSourceId: string; fieldName: string; displayName: string; fullPath: string }>
    itemFields?: string[]
  }
}

export function StringSetter({ label, value, onChange, enableExpressionMode, expressionContext }: SetterProps & StringSetterExtraProps) {
  const [showExpressionBuilder, setShowExpressionBuilder] = React.useState(false)

  if (showExpressionBuilder) {
    return (
      <div style={{ padding: '6px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{label}</span>
          <button
            onClick={() => setShowExpressionBuilder(false)}
            style={{
              padding: '2px 8px',
              fontSize: 11,
              background: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer'
            }}
          >
            收起
          </button>
        </div>
        <ExpressionSetter
          label=""
          value={value}
          onChange={onChange}
          context={expressionContext}
        />
      </div>
    )
  }

  return (
    <div className="forge-editor-setter">
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {enableExpressionMode && (
          <button
            onClick={() => setShowExpressionBuilder(true)}
            style={{
              padding: '2px 8px',
              fontSize: 11,
              background: '#f0f0f0',
              color: '#666',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer'
            }}
            title="切换表达式绑定"
          >
            绑定
          </button>
        )}
      </label>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function NumberSetter({ label, value, onChange }: SetterProps) {
  return (
    <div className="forge-editor-setter">
      <label>{label}</label>
      <input
        type="number"
        value={Number(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function BooleanSetter({ label, value, onChange }: SetterProps) {
  return (
    <div className="forge-editor-setter">
      <label>{label}</label>
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  )
}

export function EnumSetter({
  label,
  value,
  onChange,
  options,
}: SetterProps & { options?: { label: string; value: unknown }[] }) {
  return (
    <div className="forge-editor-setter">
      <label>{label}</label>
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- 请选择 --</option>
        {(options ?? []).map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ColorSetter({ label, value, onChange }: SetterProps) {
  return (
    <div className="forge-editor-setter">
      <label>{label}</label>
      <input
        type="color"
        value={String(value ?? '#000000')}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

interface ExpressionSetterProps extends SetterProps {
  context?: {
    stateVars?: Array<{ id: string; type: string }>
    dataSourceFields?: Array<{ dataSourceId: string; fieldName: string; displayName: string; fullPath: string }>
    itemFields?: string[]
  }
}

export function ExpressionSetter({ label, value, onChange, context }: ExpressionSetterProps) {
  const [mode, setMode] = React.useState<'manual' | 'builder'>('builder')
  const [varType, setVarType] = React.useState<'state' | 'item' | 'ds' | 'literal'>(
    // Auto-select 'ds' if data source fields are the only context available
    context?.dataSourceFields && context.dataSourceFields.length > 0 ? 'ds' : 'literal'
  )
  const [selectedVar, setSelectedVar] = React.useState('')
  const [operator, setOperator] = React.useState('')
  const [compareValue, setCompareValue] = React.useState('')

  const currentValue = String(value ?? '')

  const buildExpression = () => {
    if (varType === 'literal') return compareValue
    let expr = ''
    if (varType === 'state') expr = `{{$state.${selectedVar}}}`
    else if (varType === 'item') expr = `{{$item.${selectedVar}}}`
    else if (varType === 'ds') expr = selectedVar
    if (operator && compareValue) {
      const varRef = expr.slice(2, -2)
      expr = `{{${varRef} ${operator} ${compareValue}}}`
    }
    return expr
  }

  const handleApply = () => onChange(buildExpression())

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: 13,
    border: '1px solid #d0d0d0', borderRadius: 4, outline: 'none',
    background: '#fff',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: 13,
    border: '1px solid #d0d0d0', borderRadius: 4, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 10, border: '1px solid #e8e8e8' }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button
          onClick={() => setMode('builder')}
          style={{
            flex: 1, padding: '5px 8px', fontSize: 12,
            background: mode === 'builder' ? '#1890ff' : '#fff',
            color: mode === 'builder' ? '#fff' : '#555',
            border: mode === 'builder' ? 'none' : '1px solid #d0d0d0',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          可视化
        </button>
        <button
          onClick={() => setMode('manual')}
          style={{
            flex: 1, padding: '5px 8px', fontSize: 12,
            background: mode === 'manual' ? '#1890ff' : '#fff',
            color: mode === 'manual' ? '#fff' : '#555',
            border: mode === 'manual' ? 'none' : '1px solid #d0d0d0',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          手动输入
        </button>
      </div>

      {mode === 'manual' ? (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{{$state.varName}} 或 {{$ds.id.field}}"
          style={inputStyle}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Variable type selector */}
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>绑定类型</div>
            <select
              value={varType}
              onChange={(e) => { setVarType(e.target.value as any); setSelectedVar('') }}
              style={selectStyle}
            >
              <option value="literal">字面值</option>
              {context?.stateVars && context.stateVars.length > 0 && (
                <option value="state">状态变量</option>
              )}
              {context?.itemFields && context.itemFields.length > 0 && (
                <option value="item">循环项字段</option>
              )}
              {context?.dataSourceFields && context.dataSourceFields.length > 0 && (
                <option value="ds">数据源字段</option>
              )}
            </select>
          </div>

          {/* Variable selector */}
          {varType === 'state' && context?.stateVars && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>选择变量</div>
              <select value={selectedVar} onChange={(e) => setSelectedVar(e.target.value)} style={selectStyle}>
                <option value="">-- 请选择 --</option>
                {context.stateVars.map((sv) => (
                  <option key={sv.id} value={sv.id}>{sv.id} ({sv.type})</option>
                ))}
              </select>
            </div>
          )}

          {varType === 'item' && context?.itemFields && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>选择字段</div>
              <select value={selectedVar} onChange={(e) => setSelectedVar(e.target.value)} style={selectStyle}>
                <option value="">-- 请选择 --</option>
                {context.itemFields.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          )}

          {varType === 'ds' && context?.dataSourceFields && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>选择数据源字段</div>
              <select value={selectedVar} onChange={(e) => setSelectedVar(e.target.value)} style={selectStyle}>
                <option value="">-- 请选择 --</option>
                {context.dataSourceFields.map((field) => (
                  <option key={field.fullPath} value={field.fullPath}>{field.displayName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Operator (optional, collapsed by default) */}
          {varType !== 'literal' && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>运算符（可选）</div>
              <select value={operator} onChange={(e) => setOperator(e.target.value)} style={selectStyle}>
                <option value="">无</option>
                <option value=">">大于 {'>'}</option>
                <option value="<">小于 {'<'}</option>
                <option value=">=">大于等于 {'>='}</option>
                <option value="<=">小于等于 {'<='}</option>
                <option value="===">等于 ===</option>
                <option value="!==">不等于 !==</option>
              </select>
              {operator && (
                <input
                  type="text"
                  value={compareValue}
                  onChange={(e) => setCompareValue(e.target.value)}
                  placeholder="比较值"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}
            </div>
          )}

          {varType === 'literal' && (
            <input
              type="text"
              value={compareValue}
              onChange={(e) => setCompareValue(e.target.value)}
              placeholder="输入字面值"
              style={inputStyle}
            />
          )}

          {/* Preview + Apply */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div style={{
              flex: 1, fontSize: 11, color: '#666',
              padding: '5px 8px', background: '#fff', borderRadius: 4,
              border: '1px solid #e8e8e8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {buildExpression() || <span style={{ color: '#bbb' }}>(空)</span>}
            </div>
            <button
              onClick={handleApply}
              style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 500,
                background: '#1890ff', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              应用
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { SpacingSetter } from './SpacingSetter'
export { LayoutSetter } from './LayoutSetter'
export { TypographySetter } from './TypographySetter'
export { BorderSetter } from './BorderSetter'
