import React from 'react'
import type { ComponentNode, PropDefinition } from '@forgestudio/protocol'
import { getComponentMeta } from '@forgestudio/components'
import { findNodeById } from '@forgestudio/protocol'
import { useEditorStore } from '../../store'
import {
  StringSetter,
  NumberSetter,
  BooleanSetter,
  EnumSetter,
  ColorSetter,
  ExpressionSetter,
  SpacingSetter,
  LayoutSetter,
  TypographySetter,
  BorderSetter,
} from '../../setters'
import { findLoopAncestor, getDataSourceFields } from './utils'

function SetterFor({ def, value, onChange }: { def: PropDefinition; value: unknown; onChange: (v: unknown) => void }) {
  switch (def.type) {
    case 'string':
    case 'image':
      return <StringSetter label={def.title} value={value} onChange={onChange} />
    case 'number':
      return <NumberSetter label={def.title} value={value} onChange={onChange} />
    case 'boolean':
      return <BooleanSetter label={def.title} value={value} onChange={onChange} />
    case 'enum':
      return <EnumSetter label={def.title} value={value} onChange={onChange} options={def.options} />
    case 'color':
      return <ColorSetter label={def.title} value={value} onChange={onChange} />
    default:
      return null
  }
}

export function AppearanceSection() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId)
  const schema = useEditorStore((s) => s.schema)
  const getCurrentPage = useEditorStore((s) => s.getCurrentPage)
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)
  const updateNodeStyles = useEditorStore((s) => s.updateNodeStyles)
  const updateNodeLoop = useEditorStore((s) => s.updateNodeLoop)
  const updateNodeCondition = useEditorStore((s) => s.updateNodeCondition)

  const currentPage = getCurrentPage()
  const pageDataSources = currentPage?.dataSources ?? []
  const pageFormStates = currentPage?.formStates ?? []

  const node = selectedNodeId ? findNodeById(schema.componentTree, selectedNodeId) : null
  if (!node) return null

  const meta = getComponentMeta(node.component)
  const propsSchema = meta?.propsSchema ?? []
  const loopAncestor = findLoopAncestor(schema.componentTree, node.id)

  const handlePropChange = (propName: string, value: unknown) => {
    updateNodeProps(node.id, { [propName]: value })
    if (node.component === 'List' && propName === 'dataSourceId') {
      if (value) {
        updateNodeLoop(node.id, { dataSourceId: String(value), itemName: 'item' })
      } else {
        updateNodeLoop(node.id, undefined)
      }
    }
  }

  return (
    <>
      {/* Properties */}
      <div className="forge-editor-panel__section">属性</div>
      {propsSchema.map((def) => {
        if (node.component === 'List' && def.name === 'dataSourceId') {
          const dsOptions = pageDataSources.map((ds) => ({ label: ds.label || ds.id, value: ds.id }))
          if (dsOptions.length === 0) {
            return (
              <div key={def.name} style={{ padding: '8px 12px', color: '#999', fontSize: 12 }}>
                请先在"数据源"标签页添加数据源
              </div>
            )
          }
          return (
            <EnumSetter
              key={def.name}
              label={def.title}
              value={node.props[def.name] ?? ''}
              onChange={(v) => handlePropChange(def.name, v)}
              options={dsOptions}
            />
          )
        }

        if (def.type === 'string' && loopAncestor) {
          const fields = getDataSourceFields(pageDataSources, loopAncestor.loop!.dataSourceId)
          if (fields.length > 0) {
            const fieldOptions = fields.map((f) => ({ label: `$item.${f}`, value: `{{$item.${f}}}` }))
            return (
              <div key={def.name}>
                <EnumSetter
                  label={`${def.title}（绑定字段）`}
                  value={node.props[def.name] ?? def.default}
                  onChange={(v) => handlePropChange(def.name, v)}
                  options={fieldOptions}
                />
              </div>
            )
          }
        }

        if (def.type === 'string' && !loopAncestor && pageDataSources.length > 0) {
          const dsFieldOptions: Array<{ dataSourceId: string; fieldName: string; displayName: string; fullPath: string }> = []
          for (const ds of pageDataSources) {
            const fields = getDataSourceFields(pageDataSources, ds.id)
            for (const field of fields) {
              dsFieldOptions.push({
                dataSourceId: ds.id,
                fieldName: field,
                displayName: `${ds.label || ds.id}.${field}`,
                fullPath: `{{$ds.${ds.id}.${field}}}`,
              })
            }
          }
          return (
            <div key={def.name}>
              <StringSetter
                key={`${node.id}-${def.name}`}
                label={def.title}
                value={node.props[def.name] ?? def.default}
                onChange={(v) => handlePropChange(def.name, v)}
                enableExpressionMode
                expressionContext={{
                  stateVars: pageFormStates.map(fs => ({ id: fs.id, type: fs.type })),
                  dataSourceFields: dsFieldOptions,
                }}
              />
            </div>
          )
        }

        return (
          <SetterFor
            key={def.name}
            def={def}
            value={node.props[def.name] ?? def.default}
            onChange={(v) => handlePropChange(def.name, v)}
          />
        )
      })}

      {/* Styles Section */}
      <div className="forge-editor-panel__section">样式</div>
      <div style={{ padding: '8px 12px' }}>
        {/* Size */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>尺寸</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>宽度</label>
            <input
              type="text"
              value={String(node.styles.width ?? '')}
              onChange={(e) => updateNodeStyles(node.id, { width: e.target.value.trim() || undefined })}
              placeholder="auto"
              style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>高度</label>
            <input
              type="text"
              value={String(node.styles.height ?? '')}
              onChange={(e) => updateNodeStyles(node.id, { height: e.target.value.trim() || undefined })}
              placeholder="auto"
              style={{ width: '100%', padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }}
            />
          </div>
        </div>

        {/* Spacing */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>间距</div>
          <SpacingSetter
            label="内边距"
            type="padding"
            value={{
              top: node.styles.paddingTop as string | number | undefined,
              right: node.styles.paddingRight as string | number | undefined,
              bottom: node.styles.paddingBottom as string | number | undefined,
              left: node.styles.paddingLeft as string | number | undefined,
            }}
            onChange={(value) => updateNodeStyles(node.id, {
              paddingTop: value.top, paddingRight: value.right,
              paddingBottom: value.bottom, paddingLeft: value.left,
            })}
          />
          <div style={{ height: 12 }} />
          <SpacingSetter
            label="外边距"
            type="margin"
            value={{
              top: node.styles.marginTop as string | number | undefined,
              right: node.styles.marginRight as string | number | undefined,
              bottom: node.styles.marginBottom as string | number | undefined,
              left: node.styles.marginLeft as string | number | undefined,
            }}
            onChange={(value) => updateNodeStyles(node.id, {
              marginTop: value.top, marginRight: value.right,
              marginBottom: value.bottom, marginLeft: value.left,
            })}
          />
        </div>

        {/* Layout - only for containers */}
        {(meta?.allowChildren || node.component === 'View' || node.component === 'Card') && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>布局</div>
            <LayoutSetter
              value={{
                display: node.styles.display as string | undefined,
                flexDirection: node.styles.flexDirection as string | undefined,
                justifyContent: node.styles.justifyContent as string | undefined,
                alignItems: node.styles.alignItems as string | undefined,
                gap: node.styles.gap as string | number | undefined,
              }}
              onChange={(value) => updateNodeStyles(node.id, value)}
            />
          </div>
        )}

        {/* Typography */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>文字</div>
          <TypographySetter
            value={{
              fontSize: node.styles.fontSize as string | number | undefined,
              fontWeight: node.styles.fontWeight as string | undefined,
              lineHeight: node.styles.lineHeight as string | number | undefined,
              textAlign: node.styles.textAlign as string | undefined,
            }}
            onChange={(value) => updateNodeStyles(node.id, value)}
          />
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>文字颜色</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={String(node.styles.color ?? '#000000')}
                onChange={(e) => updateNodeStyles(node.id, { color: e.target.value })}
                style={{ width: 40, height: 32, border: '1px solid #d0d0d0', borderRadius: 4 }} />
              <input type="text" value={String(node.styles.color ?? '')}
                onChange={(e) => updateNodeStyles(node.id, { color: e.target.value.trim() || undefined })}
                placeholder="#000000"
                style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* Background & Border */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>背景 & 边框</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>背景色</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={String(node.styles.backgroundColor ?? '#ffffff')}
                onChange={(e) => updateNodeStyles(node.id, { backgroundColor: e.target.value })}
                style={{ width: 40, height: 32, border: '1px solid #d0d0d0', borderRadius: 4 }} />
              <input type="text" value={String(node.styles.backgroundColor ?? '')}
                onChange={(e) => updateNodeStyles(node.id, { backgroundColor: e.target.value.trim() || undefined })}
                placeholder="#ffffff"
                style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid #d0d0d0', borderRadius: 4 }} />
            </div>
          </div>
          <BorderSetter
            value={{
              borderWidth: node.styles.borderWidth as string | number | undefined,
              borderColor: node.styles.borderColor as string | undefined,
              borderRadius: node.styles.borderRadius as string | number | undefined,
            }}
            onChange={(value) => updateNodeStyles(node.id, value)}
          />
        </div>
      </div>

      {/* Conditional Rendering */}
      {node.component !== 'Page' && (
        <>
          <div className="forge-editor-panel__section">条件渲染</div>
          <div style={{ padding: '8px 12px' }}>
            <ExpressionSetter
              label="显示条件"
              value={node.condition?.expression || ''}
              onChange={(expr) => {
                const exprStr = String(expr).trim()
                if (exprStr) {
                  updateNodeCondition(node.id, { type: 'expression', expression: exprStr })
                } else {
                  updateNodeCondition(node.id, undefined)
                }
              }}
              context={{
                stateVars: pageFormStates.map(fs => ({ id: fs.id, type: fs.type })),
                itemFields: loopAncestor ? getDataSourceFields(pageDataSources, loopAncestor.loop!.dataSourceId) : [],
                dataSourceFields: pageDataSources.flatMap(ds => {
                  const fields = getDataSourceFields(pageDataSources, ds.id)
                  return fields.map(field => ({
                    dataSourceId: ds.id, fieldName: field,
                    displayName: `${ds.label || ds.id}.${field}`,
                    fullPath: `$ds.${ds.id}.${field}`,
                  }))
                }),
              }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              使用可视化构建器选择变量和运算符，或切换到手动输入模式
            </div>
          </div>
        </>
      )}
    </>
  )
}