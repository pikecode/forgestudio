import React from 'react'

interface BorderSetterProps {
  value: {
    borderWidth?: number | string
    borderColor?: string
    borderRadius?: number | string
  }
  onChange: (value: {
    borderWidth?: number | string
    borderColor?: string
    borderRadius?: number | string
  }) => void
}

export function BorderSetter({ value, onChange }: BorderSetterProps) {
  const borderWidthValue = typeof value.borderWidth === 'number' ? value.borderWidth : parseFloat(String(value.borderWidth || '0'))
  const borderColorValue = String(value.borderColor || '#d0d0d0')
  const borderRadiusValue = typeof value.borderRadius === 'number' ? value.borderRadius : parseFloat(String(value.borderRadius || '0'))

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Border Width */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          边框宽度
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={borderWidthValue}
            onChange={(e) => {
              const newValue = parseInt(e.target.value)
              onChange({ ...value, borderWidth: newValue })
            }}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={borderWidthValue}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0
              onChange({ ...value, borderWidth: newValue })
            }}
            style={{ width: 50, padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>px</span>
        </div>
      </div>

      {/* Border Color */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          边框颜色
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="color"
            value={borderColorValue}
            onChange={(e) => onChange({ ...value, borderColor: e.target.value })}
            style={{ width: 40, height: 32, border: '1px solid #d0d0d0', borderRadius: 4, cursor: 'pointer' }}
          />
          <input
            type="text"
            value={borderColorValue}
            onChange={(e) => onChange({ ...value, borderColor: e.target.value })}
            placeholder="#d0d0d0"
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
          />
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          圆角
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={borderRadiusValue}
            onChange={(e) => {
              const newValue = parseInt(e.target.value)
              onChange({ ...value, borderRadius: newValue })
            }}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={borderRadiusValue}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0
              onChange({ ...value, borderRadius: newValue })
            }}
            style={{ width: 50, padding: '4px 8px', fontSize: 12, border: '1px solid #d0d0d0', borderRadius: 4 }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>px</span>
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>预览</div>
        <div
          style={{
            width: '100%',
            height: 60,
            backgroundColor: '#fff',
            borderWidth: `${borderWidthValue}px`,
            borderStyle: 'solid',
            borderColor: borderColorValue,
            borderRadius: `${borderRadiusValue}px`,
          }}
        />
      </div>
    </div>
  )
}
