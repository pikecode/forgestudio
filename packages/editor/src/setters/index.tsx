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
