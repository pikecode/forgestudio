import React from 'react'

interface LayoutSetterProps {
  value: {
    display?: string
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    gap?: number | string
  }
  onChange: (value: {
    display?: string
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    gap?: number | string
  }) => void
}

export function LayoutSetter({ value, onChange }: LayoutSetterProps) {
  const isFlex = value.display === 'flex'

  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>布局</div>

      {/* Display */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          Display
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onChange({ ...value, display: 'block' })}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              background: !isFlex ? '#1890ff' : '#fff',
              color: !isFlex ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            Block
          </button>
          <button
            onClick={() => onChange({ ...value, display: 'flex' })}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              background: isFlex ? '#1890ff' : '#fff',
              color: isFlex ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            Flex
          </button>
        </div>
      </div>

      {isFlex && (
        <>
          {/* Flex Direction */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
              方向 (Flex Direction)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {['row', 'column', 'row-reverse', 'column-reverse'].map((dir) => (
                <button
                  key={dir}
                  onClick={() => onChange({ ...value, flexDirection: dir })}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    border: '1px solid #d0d0d0',
                    borderRadius: 4,
                    background: value.flexDirection === dir ? '#1890ff' : '#fff',
                    color: value.flexDirection === dir ? '#fff' : '#333',
                    cursor: 'pointer',
                  }}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* Justify Content */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
              主轴对齐 (Justify)
            </label>
            <select
              value={value.justifyContent || 'flex-start'}
              onChange={(e) => onChange({ ...value, justifyContent: e.target.value })}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            >
              <option value="flex-start">flex-start</option>
              <option value="center">center</option>
              <option value="flex-end">flex-end</option>
              <option value="space-between">space-between</option>
              <option value="space-around">space-around</option>
              <option value="space-evenly">space-evenly</option>
            </select>
          </div>

          {/* Align Items */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
              交叉轴对齐 (Align)
            </label>
            <select
              value={value.alignItems || 'stretch'}
              onChange={(e) => onChange({ ...value, alignItems: e.target.value })}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            >
              <option value="flex-start">flex-start</option>
              <option value="center">center</option>
              <option value="flex-end">flex-end</option>
              <option value="stretch">stretch</option>
              <option value="baseline">baseline</option>
            </select>
          </div>

          {/* Gap */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
              间距 (Gap)
            </label>
            <input
              type="number"
              value={value.gap || 0}
              onChange={(e) => onChange({ ...value, gap: Number(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 12,
                border: '1px solid #d0d0d0',
                borderRadius: 4,
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
