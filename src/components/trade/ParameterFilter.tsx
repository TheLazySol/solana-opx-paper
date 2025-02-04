"use client"

import { Checkbox } from "@/components/ui/checkbox"

interface ParameterFilterProps {
  parameters: { id: string; name: string; visible: boolean }[]
  setParameters: (params: any[]) => void
}

export function ParameterFilter({ parameters, setParameters }: ParameterFilterProps) {
  const toggleParameter = (id: string) => {
    setParameters(
      parameters.map(param =>
        param.id === id ? { ...param, visible: !param.visible } : param
      )
    )
  }

  return (
    <div className="p-4 border rounded-md bg-muted/50">
      <h3 className="font-semibold mb-3">Display Parameters</h3>
      <div className="grid grid-cols-4 gap-4">
        {parameters.map(param => (
          <div key={param.id} className="flex items-center space-x-2">
            <Checkbox
              id={param.id}
              checked={param.visible}
              onCheckedChange={() => toggleParameter(param.id)}
            />
            <label
              htmlFor={param.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {param.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
} 