import React, { useEffect, useRef, useCallback } from 'react'
import type { WFPSchema } from '@forgestudio/workflow-protocol'
import { wfpToLogicFlow, logicFlowToWfp } from './converter'
import { registerCustomNodes, NODE_STYLES } from './nodes'
import './styles.css'

export interface WorkflowEditorProps {
  value: WFPSchema
  onChange?: (schema: WFPSchema) => void
  readOnly?: boolean
}

export function WorkflowEditor({
  value,
  onChange,
  readOnly = false,
}: WorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lfRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = React.useState<any>(null)
  // Keep a stable ref to the latest value/onChange so the effect closure
  // does not need to re-run when they change.
  const valueRef = useRef<WFPSchema>(value)
  valueRef.current = value
  const onChangeRef = useRef<((s: WFPSchema) => void) | undefined>(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    let lf: any

    const init = async () => {
      const mod = await import('@logicflow/core')
      // LF v2 is a named export *and* a default export depending on bundler.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LogicFlowClass: any = (mod as any).LogicFlow ?? (mod as any).default

      lf = new LogicFlowClass({
        container: containerRef.current!,
        grid: true,
        isSilentMode: readOnly,
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight,
      })

      registerCustomNodes(lf)
      lf.render(wfpToLogicFlow(valueRef.current))
      lfRef.current = lf

      // Register DND event listeners on canvas
      if (!readOnly && containerRef.current) {
        const eventMap = lf.dnd.eventMap()
        const canvas = containerRef.current
        canvas.addEventListener('mouseenter', eventMap.onMouseEnter)
        canvas.addEventListener('mouseover', eventMap.onMouseOver)
        canvas.addEventListener('mousemove', eventMap.onMouseMove)
        canvas.addEventListener('mouseleave', eventMap.onMouseLeave)
        canvas.addEventListener('mouseup', eventMap.onMouseUp)
      }

      if (!readOnly) {
        const handleChange = () => {
          const cb = onChangeRef.current
          if (!cb) return
          const graphData = lf.getGraphData()
          const updated = logicFlowToWfp(graphData, valueRef.current)
          cb(updated)
        }

        lf.on('node:dnd-add', handleChange)
        lf.on('edge:add', handleChange)
        lf.on('node:delete', handleChange)
        lf.on('edge:delete', handleChange)
        lf.on('node:drag', handleChange)
        lf.on('node:drop', handleChange)

        lf.on('node:click', ({ data }: any) => {
          // Normalize text field - LogicFlow v2 uses text.value
          const normalizedData = {
            ...data,
            text: typeof data.text === 'object' ? data.text?.value : data.text,
          }
          setSelectedNode(normalizedData)
        })
        lf.on('blank:click', () => {
          setSelectedNode(null)
        })

        // Auto-label condition node edges as true/false
        lf.on('edge:add', ({ data }: any) => {
          const sourceNode = lf.getNodeModelById(data.sourceNodeId)
          if (sourceNode?.type === 'condition') {
            const outEdges = lf.getNodeOutgoingEdge(data.sourceNodeId)
            if (outEdges.length === 1) {
              // First edge: true branch
              lf.getEdgeModelById(data.id)?.setText('true')
              lf.getEdgeModelById(data.id)?.setProperties({ condition: 'true', label: 'true' })
            } else if (outEdges.length === 2) {
              // Second edge: false branch
              lf.getEdgeModelById(data.id)?.setText('false')
              lf.getEdgeModelById(data.id)?.setProperties({ condition: 'false', label: 'false' })
            } else if (outEdges.length > 2) {
              // Limit to 2 branches
              lf.deleteEdge(data.id)
              alert('条件节点最多只能有两个分支（true/false）')
            }
          }
        })
      }
    }

    init().catch((err: unknown) => {
      throw new Error(
        `WorkflowEditor: failed to initialise LogicFlow — ${String(err)}`,
      )
    })

    return () => {
      if (containerRef.current && lfRef.current?.dnd) {
        const eventMap = lfRef.current.dnd.eventMap()
        const canvas = containerRef.current
        canvas.removeEventListener('mouseenter', eventMap.onMouseEnter)
        canvas.removeEventListener('mouseover', eventMap.onMouseOver)
        canvas.removeEventListener('mousemove', eventMap.onMouseMove)
        canvas.removeEventListener('mouseleave', eventMap.onMouseLeave)
        canvas.removeEventListener('mouseup', eventMap.onMouseUp)
      }
      if (lfRef.current?.destroy) {
        lfRef.current.destroy()
      }
      lfRef.current = null
    }
    // We intentionally run this effect only once on mount.  The `readOnly`
    // flag is part of the effect (captured at init time) so a change requires
    // a remount (achieved by the consumer keying on readOnly if desired).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFitView = useCallback(() => {
    if (lfRef.current?.fitView) {
      lfRef.current.fitView()
    }
  }, [])

  const handleUpdateNode = useCallback((nodeId: string, updates: any) => {
    if (!lfRef.current) return
    const node = lfRef.current.getNodeModelById(nodeId)
    if (!node) return

    const currentProps = node.properties || {}
    node.setProperties({ ...currentProps, ...updates })

    // Trigger change
    const graphData = lfRef.current.getGraphData()
    const updated = logicFlowToWfp(graphData, valueRef.current)
    onChangeRef.current?.(updated)
  }, [])

  return (
    <div className="wf-editor" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="wf-editor__toolbar">
        <span className="wf-editor__workflow-name">{value.name}</span>
        <button onClick={handleFitView} className="wf-editor__btn">
          适应画布
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!readOnly && (
          <div className="wf-editor__node-panel">
            <div className="wf-editor__node-panel-title">节点类型</div>
            {[
              { type: 'action', label: '动作', icon: '▣' },
              { type: 'condition', label: '条件', icon: '◆' },
              { type: 'parallel', label: '并行', icon: '⫴' },
              { type: 'wait', label: '等待', icon: '⏱' },
              { type: 'subprocess', label: '子流程', icon: '⊞' },
              { type: 'loop', label: '循环', icon: '↻' },
            ].map(({ type, label, icon }) => (
              <div
                key={type}
                className="wf-editor__node-item"
                onMouseDown={(e) => {
                  if (lfRef.current?.dnd) {
                    lfRef.current.dnd.startDrag({
                      type,
                      text: label,
                    })
                  }
                }}
                style={{
                  borderLeft: `3px solid ${NODE_STYLES[type as keyof typeof NODE_STYLES]?.stroke || '#999'}`,
                }}
              >
                <span className="wf-editor__node-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
        <div
          ref={containerRef}
          className="wf-editor__canvas"
          style={{ flex: 1 }}
        />
        {!readOnly && selectedNode && (
          <div className="wf-editor__props-panel">
            <div className="wf-editor__props-title">节点属性</div>
            <div className="wf-editor__props-content">
              <div className="wf-editor__prop-group">
                <label>节点标签</label>
                <input
                  type="text"
                  value={typeof selectedNode.text === 'string' ? selectedNode.text : (selectedNode.text?.value || '')}
                  onChange={(e) => {
                    lfRef.current?.getNodeModelById(selectedNode.id)?.setText(e.target.value)
                    setSelectedNode({ ...selectedNode, text: e.target.value })
                  }}
                />
              </div>

              {selectedNode.type === 'action' && (
                <>
                  <div className="wf-editor__prop-group">
                    <label>动作类型</label>
                    <select
                      value={selectedNode.properties?.actionType || 'showToast'}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { actionType: e.target.value })}
                    >
                      <option value="showToast">显示提示</option>
                      <option value="navigate">页面跳转</option>
                      <option value="setState">设置状态</option>
                      <option value="callApi">调用接口</option>
                      <option value="validateForm">表单校验</option>
                    </select>
                  </div>

                  {selectedNode.properties?.actionType === 'showToast' && (
                    <>
                      <div className="wf-editor__prop-group">
                        <label>提示文本</label>
                        <input
                          type="text"
                          value={selectedNode.properties?.config?.title || ''}
                          onChange={(e) => handleUpdateNode(selectedNode.id, {
                            config: { ...selectedNode.properties?.config, title: e.target.value }
                          })}
                        />
                      </div>
                      <div className="wf-editor__prop-group">
                        <label>图标</label>
                        <select
                          value={selectedNode.properties?.config?.icon || 'none'}
                          onChange={(e) => handleUpdateNode(selectedNode.id, {
                            config: { ...selectedNode.properties?.config, icon: e.target.value }
                          })}
                        >
                          <option value="success">成功</option>
                          <option value="error">错误</option>
                          <option value="none">无</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedNode.properties?.actionType === 'navigate' && (
                    <div className="wf-editor__prop-group">
                      <label>跳转路径</label>
                      <input
                        type="text"
                        placeholder="/pages/detail/index"
                        value={selectedNode.properties?.config?.url || ''}
                        onChange={(e) => handleUpdateNode(selectedNode.id, {
                          config: { ...selectedNode.properties?.config, url: e.target.value }
                        })}
                      />
                    </div>
                  )}

                  {selectedNode.properties?.actionType === 'setState' && (
                    <>
                      <div className="wf-editor__prop-group">
                        <label>状态变量</label>
                        <input
                          type="text"
                          placeholder="loading"
                          value={selectedNode.properties?.config?.target || ''}
                          onChange={(e) => handleUpdateNode(selectedNode.id, {
                            config: { ...selectedNode.properties?.config, target: e.target.value }
                          })}
                        />
                      </div>
                      <div className="wf-editor__prop-group">
                        <label>设置值</label>
                        <input
                          type="text"
                          placeholder="true"
                          value={selectedNode.properties?.config?.value || ''}
                          onChange={(e) => handleUpdateNode(selectedNode.id, {
                            config: { ...selectedNode.properties?.config, value: e.target.value }
                          })}
                        />
                      </div>
                    </>
                  )}

                  {selectedNode.properties?.actionType === 'callApi' && (
                    <>
                      <div className="wf-editor__prop-group">
                        <label>数据源 ID</label>
                        <input
                          type="text"
                          placeholder="userApi"
                          value={selectedNode.properties?.config?.dataSourceId || ''}
                          onChange={(e) => handleUpdateNode(selectedNode.id, {
                            config: { ...selectedNode.properties?.config, dataSourceId: e.target.value }
                          })}
                        />
                      </div>
                      <div className="wf-editor__prop-group">
                        <label>输出变量 (可选)</label>
                        <input
                          type="text"
                          placeholder="result"
                          value={selectedNode.properties?.outputVar || ''}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { outputVar: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {selectedNode.type === 'condition' && (
                <div className="wf-editor__prop-group">
                  <label>条件表达式</label>
                  <input
                    type="text"
                    placeholder="result.code === 0"
                    value={selectedNode.properties?.expression || ''}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { expression: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
