import React from 'react'
import { DATASOURCE_TEMPLATES, DataSourceTemplate, type DataSourceTemplateConfig } from '../datasource-templates'

interface DataSourceTemplateSelectorProps {
  onSelect: (template: DataSourceTemplateConfig) => void
  onCancel: () => void
}

export function DataSourceTemplateSelector({ onSelect, onCancel }: DataSourceTemplateSelectorProps) {
  const templates = Object.values(DATASOURCE_TEMPLATES)

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
        快速创建数据源
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map((template) => (
          <button
            key={template.template}
            onClick={() => onSelect(template)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              background: template.recommended ? '#f0f7ff' : '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1890ff'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: 24 }}>{template.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {template.title}
                {template.recommended && (
                  <span style={{
                    marginLeft: 8,
                    padding: '2px 6px',
                    fontSize: 11,
                    color: '#1890ff',
                    background: '#e6f7ff',
                    borderRadius: 3
                  }}>
                    推荐
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {template.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="forge-editor-btn"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}
