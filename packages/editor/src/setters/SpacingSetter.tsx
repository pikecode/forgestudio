import React, { useState } from 'react'

interface SpacingSetterProps {
  label: string
  value: {
    top?: number | string
    right?: number | string
    bottom?: number | string
    left?: number | string
  }
  onChange: (value: {
    top?: number | string
    right?: number | string
    bottom?: number | string
    left?: number | string
  }) => void
  type: 'padding' | 'margin'
}

export function SpacingSetter({ label, value, onChange, type }: SpacingSetterProps) {
  const [unified, setUnified] = useState(true)

  const top = value.top ?? ''
  const right = value.right ?? ''
  const bottom = value.bottom ?? ''
  const left = value.left ?? ''

  const handleUnifiedChange = (val: string) => {
    const numVal = val === '' ? undefined : Number(val)
    onChange({
      top: numVal,
      right: numVal,
      bottom: numVal,
      left: numVal,
    })
  }

  const handleDirectionChange = (direction: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const numVal = val === '' ? undefined : Number(val)
    onChange({
      ...value,
      [direction]: numVal,
    })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>
          {label}
        </label>
        <button
          onClick={() => setUnified(!unified)}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            background: 'transparent',
            border: '1px solid #d0d0d0',
            borderRadius: 4,
            cursor: 'pointer',
            color: '#666',
          }}
        >
          {unified ? '分别设置' : '统一设置'}
        </button>
      </div>

      {unified ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            value={top}
            onChange={(e) => handleUnifiedChange(e.target.value)}
            placeholder="0"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: 13,
              border: '1px solid #d0d0d0',
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: 12, color: '#999' }}>px</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>上</div>
            <input
              type="number"
              value={top}
              onChange={(e) => handleDirectionChange('top', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>右</div>
            <input
              type="number"
              value={right}
              onChange={(e) => handleDirectionChange('right', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>下</div>
            <input
              type="number"
              value={bottom}
              onChange={(e) => handleDirectionChange('bottom', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>左</div>
            <input
              type="number"
              value={left}
              onChange={(e) => handleDirectionChange('left', e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      )}

      {/* Visual Indicator */}
      <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 60,
            background: type === 'padding' ? '#e0f2ff' : '#fef3c7',
            borderRadius: 4,
            position: 'relative',
            paddingTop: top || 0,
            paddingRight: right || 0,
            paddingBottom: bottom || 0,
            paddingLeft: left || 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: '#fff',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#999',
            }}
          >
            内容
          </div>
        </div>
      </div>
    </div>
  )
}
