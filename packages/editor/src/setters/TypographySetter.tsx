import React from 'react'

interface TypographySetterProps {
  value: {
    fontSize?: number | string
    fontWeight?: string | number
    lineHeight?: number | string
    textAlign?: string
  }
  onChange: (value: {
    fontSize?: number | string
    fontWeight?: string | number
    lineHeight?: number | string
    textAlign?: string
  }) => void
}

export function TypographySetter({ value, onChange }: TypographySetterProps) {
  const fontSizeValue = typeof value.fontSize === 'number' ? value.fontSize : parseInt(String(value.fontSize || '14'))
  const lineHeightValue = typeof value.lineHeight === 'number' ? value.lineHeight : parseFloat(String(value.lineHeight || '1.5'))

  return (
    <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#666' }}>字体</div>

      {/* Font Size */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>字号</span>
          <span style={{ color: '#333', fontWeight: 500 }}>{fontSizeValue}px</span>
        </label>
        <input
          type="range"
          min="12"
          max="48"
          value={fontSizeValue}
          onChange={(e) => onChange({ ...value, fontSize: parseInt(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Font Weight */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>字重</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { label: '细', value: '300' },
            { label: '正常', value: '400' },
            { label: '中', value: '500' },
            { label: '粗', value: '700' },
          ].map((w) => (
            <button
              key={w.value}
              onClick={() => onChange({ ...value, fontWeight: w.value })}
              style={{
                padding: '6px',
                fontSize: 11,
                border: String(value.fontWeight) === w.value ? '2px solid #1890ff' : '1px solid #d0d0d0',
                borderRadius: 4,
                background: String(value.fontWeight) === w.value ? '#e6f7ff' : '#fff',
                cursor: 'pointer',
                fontWeight: parseInt(w.value),
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>行高</span>
          <span style={{ color: '#333', fontWeight: 500 }}>{lineHeightValue.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={lineHeightValue}
          onChange={(e) => onChange({ ...value, lineHeight: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Text Align */}
      <div>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>对齐</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { label: '左', value: 'left', icon: '⇤' },
            { label: '中', value: 'center', icon: '↔' },
            { label: '右', value: 'right', icon: '⇥' },
            { label: '两端', value: 'justify', icon: '⇔' },
          ].map((a) => (
            <button
              key={a.value}
              onClick={() => onChange({ ...value, textAlign: a.value })}
              style={{
                padding: '6px',
                fontSize: 11,
                border: value.textAlign === a.value ? '2px solid #1890ff' : '1px solid #d0d0d0',
                borderRadius: 4,
                background: value.textAlign === a.value ? '#e6f7ff' : '#fff',
                cursor: 'pointer',
              }}
              title={a.label}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
