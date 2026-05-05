'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SearchableSelectOption {
  value: string
  label: string
  searchText?: string // Additional text to search against
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  disabled?: boolean
  emptyMessage?: string
  dense?: boolean
  /** Merged onto the trigger button (e.g. h-9 for compact toolbars). */
  triggerClassName?: string
  getTriggerLabel?: (selected: SearchableSelectOption) => string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  label,
  required = false,
  className,
  disabled = false,
  emptyMessage = "No options found.",
  dense = false,
  triggerClassName,
  getTriggerLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null)
  const [menuMaxHeight, setMenuMaxHeight] = useState<number>(dense ? 320 : 520)
  const [menuPlacement, setMenuPlacement] = useState<'bottom' | 'top'>('bottom')
  const [renderInPlace, setRenderInPlace] = useState(false)

  const selectedOption = useMemo(() => options?.find((option) => option && option.value === value) || null, [options, value])

  // Filter options based on search
  useEffect(() => {
    if (!options || options.length === 0) {
      setFilteredOptions([])
      return
    }
    if (!searchValue) {
      setFilteredOptions(options)
    } else {
      const filtered = options.filter(option => {
        if (!option) return false
        const searchText = searchValue.toLowerCase()
        return (
          (option.label?.toLowerCase() || '').includes(searchText) ||
          (option.value?.toLowerCase() || '').includes(searchText) ||
          (option.searchText && option.searchText.toLowerCase().includes(searchText))
        )
      })
      setFilteredOptions(filtered)
    }
  }, [searchValue, options])

  // Reset search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearchValue('')
    }
  }, [open])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node
      const inTrigger = containerRef.current?.contains(t)
      const inMenu = menuRef.current?.contains(t)
      if (!inTrigger && !inMenu) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Focus search input when opening (makes selection much faster)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => searchRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const compute = () => {
      const btn = buttonRef.current
      if (!btn) return
      const inDialog =
        !!btn.closest('[data-radix-dialog-content]') ||
        // Our `DialogContent` wrapper does not add the data-radix attr, but Radix always sets role="dialog".
        !!btn.closest('[role="dialog"]')
      setRenderInPlace(inDialog)
      const r = btn.getBoundingClientRect()
      const viewportH = window.innerHeight
      const spaceBelow = viewportH - r.bottom - 8
      const spaceAbove = r.top - 8

      const preferredMax = dense ? 320 : 520
      const placement: 'bottom' | 'top' = spaceBelow >= 220 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
      const available = placement === 'bottom' ? spaceBelow : spaceAbove
      const maxH = Math.max(180, Math.min(preferredMax, Math.floor(available)))

      setMenuPlacement(placement)
      setMenuMaxHeight(maxH)
      if (inDialog) {
        setMenuStyle({
          position: 'absolute',
          left: 0,
          top: placement === 'bottom' ? 'calc(100% + 4px)' : undefined,
          bottom: placement === 'top' ? 'calc(100% + 4px)' : undefined,
          width: '100%',
          zIndex: 10000,
        })
      } else {
        setMenuStyle({
          position: 'fixed',
          left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
          top: placement === 'bottom' ? r.bottom + 4 : r.top - 4,
          width: r.width,
          zIndex: 10000,
        })
      }
    }

    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [dense, open])

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative min-w-0">
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            dense ? "w-full justify-between h-10 px-3 text-sm gap-2 min-w-0" : "w-full justify-between min-h-[44px] text-base gap-2 min-w-0",
            !selectedOption && "text-muted-foreground",
            triggerClassName
          )}
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          <span className="truncate text-left flex-1 min-w-0">
            {selectedOption ? (getTriggerLabel ? getTriggerLabel(selectedOption) : selectedOption.label) : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && menuStyle ? (
          renderInPlace ? (
            <div
              ref={menuRef}
              className="rounded-md border border-gray-300 bg-white shadow-lg overflow-hidden"
              style={menuStyle}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
              }}
            >
              <div className={cn("flex items-center border-b px-3 sticky top-0 bg-white", dense ? "py-1.5" : "py-2")}>
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  ref={searchRef}
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className={cn(
                    "flex w-full rounded-md bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0",
                    dense ? "h-8 text-sm" : "h-10 text-base"
                  )}
                />
              </div>

              <div
                className="overflow-y-auto overscroll-contain"
                style={{ maxHeight: menuMaxHeight }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {filteredOptions.length === 0 ? (
                  <div className={cn("px-3 text-gray-500", dense ? "py-2 text-sm" : "py-3 text-base")}>{emptyMessage}</div>
                ) : (
                  filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        dense
                          ? "flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                          : "flex items-center px-3 py-3 text-base cursor-pointer hover:bg-gray-100",
                        value === option.value && "bg-blue-50"
                      )}
                      onClick={() => {
                        onValueChange(option.value)
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                      {option.label}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            createPortal(
              <div
                ref={menuRef}
                className="rounded-md border border-gray-300 bg-white shadow-lg overflow-hidden"
                style={{
                  ...menuStyle,
                  transform: menuPlacement === 'top' ? 'translateY(-100%)' : undefined,
                  willChange: 'transform',
                }}
                onMouseDown={(e) => {
                  // Portal content is outside containerRef; prevent "outside click" closing before selection.
                  e.stopPropagation()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                }}
              >
                <div className={cn("flex items-center border-b px-3 sticky top-0 bg-white", dense ? "py-1.5" : "py-2")}>
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    ref={searchRef}
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className={cn(
                      "flex w-full rounded-md bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0",
                      dense ? "h-8 text-sm" : "h-10 text-base"
                    )}
                  />
                </div>

                <div
                  className="overflow-y-auto overscroll-contain"
                  style={{ maxHeight: menuMaxHeight }}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  {filteredOptions.length === 0 ? (
                    <div className={cn("px-3 text-gray-500", dense ? "py-2 text-sm" : "py-3 text-base")}>{emptyMessage}</div>
                  ) : (
                    filteredOptions.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          dense
                            ? "flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                            : "flex items-center px-3 py-3 text-base cursor-pointer hover:bg-gray-100",
                          value === option.value && "bg-blue-50"
                        )}
                        onClick={() => {
                          onValueChange(option.value)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                        {option.label}
                      </div>
                    ))
                  )}
                </div>
              </div>,
              document.body
            )
          )
        ) : null}
      </div>
    </div>
  )
}
