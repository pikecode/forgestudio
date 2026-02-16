import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { getDraggableComponents } from '@forgestudio/components'

function DraggableItem({ name, title }: { name: string; title: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${name}`,
    data: { type: 'palette', componentName: name },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="forge-editor-comp-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {title}
    </div>
  )
}

export function ComponentPanel() {
  const components = getDraggableComponents()
  const basics = components.filter((c) => c.category === 'basic')
  const layouts = components.filter((c) => c.category === 'layout')
  const dataComponents = components.filter((c) => c.category === 'data')

  return (
    <div className="forge-editor-panel forge-editor-panel--left">
      <div className="forge-editor-panel__title">组件</div>
      {layouts.length > 0 && (
        <>
          <div className="forge-editor-panel__group">布局</div>
          {layouts.map((c) => (
            <DraggableItem key={c.name} name={c.name} title={c.title} />
          ))}
        </>
      )}
      {basics.length > 0 && (
        <>
          <div className="forge-editor-panel__group">基础</div>
          {basics.map((c) => (
            <DraggableItem key={c.name} name={c.name} title={c.title} />
          ))}
        </>
      )}
      {dataComponents.length > 0 && (
        <>
          <div className="forge-editor-panel__group">数据</div>
          {dataComponents.map((c) => (
            <DraggableItem key={c.name} name={c.name} title={c.title} />
          ))}
        </>
      )}
    </div>
  )
}
