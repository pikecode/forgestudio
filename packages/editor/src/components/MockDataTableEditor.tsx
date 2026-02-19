import React, { useState, useEffect, useRef } from 'react'

interface MockDataTableEditorProps {
  value: string // JSON string
  onChange: (value: string) => void
}

export function MockDataTableEditor({ value, onChange }: MockDataTableEditorProps) {
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [newColumnName, setNewColumnName] = useState('')
  const [showAddColumn, setShowAddColumn] = useState(false)
  const isInternalChange = useRef(false)

  // Parse JSON to table data — skip if the change came from this component
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
        const dataArray = parsed.data
        if (dataArray.length > 0) {
          const cols = Object.keys(dataArray[0])
          setColumns(cols)
          setRows(dataArray)
        } else {
          setColumns([])
          setRows([])
        }
      } else {
        setColumns([])
        setRows([])
      }
    } catch (e) {
      setColumns([])
      setRows([])
    }
  }, [value])

  // Update JSON when table changes
  const updateJSON = (newRows: Record<string, any>[]) => {
    isInternalChange.current = true
    const json = { data: newRows }
    onChange(JSON.stringify(json, null, 2))
  }

  const handleCellChange = (rowIndex: number, column: string, newValue: string) => {
    const newRows = rows.map((row, i) => {
      if (i !== rowIndex) return row
      let typedValue: any = newValue
      if (!isNaN(Number(newValue)) && newValue !== '') {
        typedValue = Number(newValue)
      } else if (newValue === 'true' || newValue === 'false') {
        typedValue = newValue === 'true'
      }
      return { ...row, [column]: typedValue }
    })
    setRows(newRows)
    updateJSON(newRows)
  }

  const handleAddRow = () => {
    const newRow: Record<string, any> = {}
    columns.forEach(col => {
      // Infer default value from existing rows
      if (rows.length > 0) {
        const existingValue = rows[0][col]
        if (typeof existingValue === 'number') {
          newRow[col] = 0
        } else if (typeof existingValue === 'boolean') {
          newRow[col] = false
        } else {
          newRow[col] = ''
        }
      } else {
        newRow[col] = ''
      }
    })
    const newRows = [...rows, newRow]
    setRows(newRows)
    updateJSON(newRows)
  }

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = rows.filter((_, i) => i !== rowIndex)
    setRows(newRows)
    updateJSON(newRows)
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      alert('请输入列名')
      return
    }
    if (columns.includes(newColumnName)) {
      alert('列名已存在')
      return
    }
    const newCols = [...columns, newColumnName]
    const newRows = rows.map(row => ({ ...row, [newColumnName]: '' }))
    setColumns(newCols)
    setRows(newRows)
    updateJSON(newRows)
    setNewColumnName('')
    setShowAddColumn(false)
  }

  const handleDeleteColumn = (column: string) => {
    if (!confirm(`确定删除列"${column}"吗？`)) return
    const newCols = columns.filter(col => col !== column)
    const newRows = rows.map(row => {
      const { [column]: _, ...rest } = row
      return rest
    })
    setColumns(newCols)
    setRows(newRows)
    updateJSON(newRows)
  }

  if (columns.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: 13 }}>
        <div style={{ marginBottom: 8 }}>Mock 数据为空或格式不正确</div>
        <div style={{ fontSize: 12 }}>请切换到 JSON 编辑模式修复数据格式：{`{"data": [...]}`}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px', overflow: 'auto' }}>
      {/* Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
        border: '1px solid #d0d0d0'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '6px 8px', border: '1px solid #d0d0d0', width: 40 }}>#</th>
            {columns.map(col => (
              <th key={col} style={{ padding: '6px 8px', border: '1px solid #d0d0d0', minWidth: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{col}</span>
                  <button
                    onClick={() => handleDeleteColumn(col)}
                    style={{
                      padding: '0 4px',
                      fontSize: 11,
                      border: 'none',
                      background: 'transparent',
                      color: '#999',
                      cursor: 'pointer'
                    }}
                    title="删除列"
                  >
                    ✕
                  </button>
                </div>
              </th>
            ))}
            <th style={{ padding: '6px 8px', border: '1px solid #d0d0d0', width: 60 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td style={{ padding: '4px 8px', border: '1px solid #d0d0d0', textAlign: 'center', color: '#999' }}>
                {rowIndex + 1}
              </td>
              {columns.map(col => (
                <td key={col} style={{ padding: '2px', border: '1px solid #d0d0d0' }}>
                  <input
                    type="text"
                    value={row[col] ?? ''}
                    onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      border: 'none',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                </td>
              ))}
              <td style={{ padding: '4px 8px', border: '1px solid #d0d0d0', textAlign: 'center' }}>
                <button
                  onClick={() => handleDeleteRow(rowIndex)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 11,
                    border: '1px solid #d0d0d0',
                    borderRadius: 3,
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Actions */}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleAddRow}
          className="forge-editor-btn forge-editor-btn--small"
        >
          + 添加行
        </button>

        {!showAddColumn ? (
          <button
            onClick={() => setShowAddColumn(true)}
            className="forge-editor-btn forge-editor-btn--small"
          >
            + 添加列
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="列名"
              style={{
                padding: '4px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: 3,
                fontSize: 12,
                width: 100
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn()
                if (e.key === 'Escape') {
                  setShowAddColumn(false)
                  setNewColumnName('')
                }
              }}
              autoFocus
            />
            <button
              onClick={handleAddColumn}
              className="forge-editor-btn forge-editor-btn--small"
            >
              确定
            </button>
            <button
              onClick={() => {
                setShowAddColumn(false)
                setNewColumnName('')
              }}
              className="forge-editor-btn forge-editor-btn--small"
            >
              取消
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
        提示：数字会自动识别为 number 类型，true/false 识别为 boolean 类型
      </div>
    </div>
  )
}
