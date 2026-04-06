"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PinInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  mask?: boolean
  placeholder?: string
}

const PinInput = React.forwardRef<HTMLDivElement, PinInputProps>(
  (
    {
      className,
      length = 4,
      value = "",
      onChange,
      onComplete,
      mask = false,
      placeholder = "○",
      ...props
    },
    ref
  ) => {
    const [values, setValues] = React.useState<string[]>(
      value.split("").slice(0, length)
    )
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

    React.useEffect(() => {
      const newValues = value.split("").slice(0, length)
      setValues(newValues)
    }, [value, length])

    const handleChange = (index: number, newValue: string) => {
      const newValues = [...values]
      newValues[index] = newValue
      setValues(newValues)

      const pinValue = newValues.join("")
      onChange?.(pinValue)

      if (pinValue.length === length && onComplete) {
        onComplete(pinValue)
      }
    }

    const handleKeyDown = (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (e.key === "Backspace" && !values[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData("text").slice(0, length)
      const newValues = pastedData.split("")
      setValues(newValues)
      onChange?.(pastedData)

      if (pastedData.length === length && onComplete) {
        onComplete(pastedData)
      }

      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
    }

    return (
      <div
        ref={ref}
        className={cn("flex gap-2", className)}
        onPaste={handlePaste}
        {...props}
      >
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type={mask ? "password" : "text"}
            value={values[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-center text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            )}
            maxLength={1}
            placeholder={placeholder}
            autoComplete="off"
          />
        ))}
      </div>
    )
  }
)

PinInput.displayName = "PinInput"

export { PinInput }


