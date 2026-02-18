import React from 'react'

interface SetterProps {
  label: string
  value: unknown
  onChange: (v: unknown) => void
}

export function StringSetter({ label, value, onChange }: SetterProps) {
  return (
    <div className="forge-editor-setter">
      <label>{label}</label>
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
    dataSourceFields?: Array<{ name: string; dsId: string }>
    itemFields?: string[]
  }
}

export function ExpressionSetter({ label, value, onChange, context }: ExpressionSetterProps) {
  const [mode, setMode] = React.useState<'manual' | 'builder'>('builder')
  const [varType, setVarType] = React.useState<'state' | 'item' | 'ds' | 'literal'>('literal')
  const [selectedVar, setSelectedVar] = React.useState('')
  const [operator, setOperator] = React.useState('')
  const [compareValue, setCompareValue] = React.useState('')

  const currentValue = String(value ?? '')

  // Build expression from builder inputs
  const buildExpression = () => {
    if (varType === 'literal') {
      return compareValue
    }

    let expr = ''
    if (varType === 'state') {
      expr = `{{$state.${selectedVar}}}`
    } else if (varType === 'item') {
      expr = `{{$item.${selectedVar}}}`
    } else if (varType === 'ds') {
      expr = `{{$ds.${selectedVar}.data}}`
    }

    // Add operator and comparison value if provided
    if (operator && compareValue) {
      // Remove {{ }} for complex expressions
      const varRef = expr.slice(2, -2)
      expr = `{{${varRef} ${operator} ${compareValue}}}`
    }

    return expr
  }

  const handleApply = () => {
    const expr = buildExpression()
    onChange(expr)
  }

  return (
    <div className="forge-editor-setter">
      <label>{label}</label>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button
          onClick={() => setMode('builder')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: 12,
            background: mode === 'builder' ? '#1890ff' : '#f0f0f0',
            color: mode === 'builder' ? '#fff' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          可视化
        </button>
        <button
          onClick={() => setMode('manual')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: 12,
            background: mode === 'manual' ? '#1890ff' : '#f0f0f0',
            color: mode === 'manual' ? '#fff' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
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
          placeholder="{{$state.varName}} 或 {{$item.field}}"
          style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Variable type selector */}
          <select
            value={varType}
            onChange={(e) => {
              setVarType(e.target.value as any)
              setSelectedVar('')
            }}
            style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
          >
            <option value="literal">字面值</option>
            {context?.stateVars && context.stateVars.length > 0 && (
              <option value="state">状态变量</option>
            )}
            {context?.itemFields && context.itemFields.length > 0 && (
              <option value="item">循环项字段</option>
            )}
            {context?.dataSourceFields && context.dataSourceFields.length > 0 && (
              <option value="ds">数据源</option>
            )}
          </select>

          {/* Variable selector */}
          {varType === 'state' && context?.stateVars && (
            <select
              value={selectedVar}
              onChange={(e) => setSelectedVar(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
            >
              <option value="">-- 选择状态变量 --</option>
              {context.stateVars.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.id} ({sv.type})
                </option>
              ))}
            </select>
          )}

          {varType === 'item' && context?.itemFields && (
            <select
              value={selectedVar}
              onChange={(e) => setSelectedVar(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
            >
              <option value="">-- 选择字段 --</option>
              {context.itemFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          )}

          {varType === 'ds' && context?.dataSourceFields && (
            <select
              value={selectedVar}
              onChange={(e) => setSelectedVar(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
            >
              <option value="">-- 选择数据源 --</option>
              {context.dataSourceFields.map((ds) => (
                <option key={ds.dsId} value={ds.dsId}>
                  {ds.name}
                </option>
              ))}
            </select>
          )}

          {/* Operator selector (optional) */}
          {varType !== 'literal' && (
            <>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
              >
                <option value="">-- 无运算符 --</option>
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
                  placeholder="比较值（如：0 或 'text'）"
                  style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
                />
              )}
            </>
          )}

          {varType === 'literal' && (
            <input
              type="text"
              value={compareValue}
              onChange={(e) => setCompareValue(e.target.value)}
              placeholder="输入字面值"
              style={{ width: '100%', padding: '4px 8px', fontSize: 13 }}
            />
          )}

          {/* Preview */}
          <div style={{ fontSize: 11, color: '#999', padding: '4px 8px', background: '#f9f9f9', borderRadius: 4 }}>
            预览: {buildExpression() || '(空)'}
          </div>

          {/* Apply button */}
          <button
            onClick={handleApply}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              background: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            应用
          </button>
        </div>
      )}
    </div>
  )
}

export { SpacingSetter } from './SpacingSetter'
export { LayoutSetter } from './LayoutSetter'
export { TypographySetter } from './TypographySetter'
export { BorderSetter } from './BorderSetter'
