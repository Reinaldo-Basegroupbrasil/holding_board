"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, defaultChecked, ...props }, ref) => {
    // Estado interno para funcionar mesmo sem controle externo
    const [isChecked, setIsChecked] = React.useState(defaultChecked || checked || false)
    
    // Sincroniza se a prop checked mudar externamente
    React.useEffect(() => {
        if (checked !== undefined) setIsChecked(checked)
    }, [checked])

    const toggle = () => {
        const newState = !isChecked
        setIsChecked(newState)
        if (onCheckedChange) onCheckedChange(newState)
    }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      onClick={(e) => {
          toggle()
          props.onClick?.(e)
      }}
      className={cn(
        "peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200",
        className
      )}
      ref={ref}
      {...props}
    >
      <span
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </button>
  )
})
Switch.displayName = "Switch"

export { Switch }