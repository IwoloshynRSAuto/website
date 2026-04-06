"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Link,
  Unlink,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react"

export interface RichTextEditorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ className, value = "", onChange, placeholder, readOnly, ...props }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const [isFocused, setIsFocused] = React.useState(false)

    React.useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }, [value])

    const handleInput = () => {
      if (editorRef.current && onChange) {
        onChange(editorRef.current.innerHTML)
      }
    }

    const execCommand = (command: string, value?: string) => {
      document.execCommand(command, false, value)
      editorRef.current?.focus()
      handleInput()
    }

    const insertLink = () => {
      const url = prompt("Enter URL:")
      if (url) {
        execCommand("createLink", url)
      }
    }

    const insertImage = () => {
      const url = prompt("Enter image URL:")
      if (url) {
        execCommand("insertImage", url)
      }
    }

    const ToolbarButton = ({
      onClick,
      children,
      isActive = false,
    }: {
      onClick: () => void
      children: React.ReactNode
      isActive?: boolean
    }) => (
      <Button
        type="button"
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onClick}
        className="h-8 w-8 p-0"
      >
        {children}
      </Button>
    )

    return (
      <div
        ref={ref}
        className={cn(
          "border border-input rounded-md overflow-hidden",
          isFocused && "ring-2 ring-ring ring-offset-2",
          className
        )}
        {...props}
      >
        {!readOnly && (
          <div className="border-b border-input p-2 flex flex-wrap gap-1">
            <div className="flex gap-1">
              <ToolbarButton onClick={() => execCommand("bold")}>
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("italic")}>
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("underline")}>
                <Underline className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("strikeThrough")}>
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
            </div>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <div className="flex gap-1">
              <ToolbarButton onClick={() => execCommand("insertUnorderedList")}>
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("insertOrderedList")}>
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("formatBlock", "blockquote")}>
                <Quote className="h-4 w-4" />
              </ToolbarButton>
            </div>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <div className="flex gap-1">
              <ToolbarButton onClick={insertLink}>
                <Link className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={insertImage}>
                <Image className="h-4 w-4" />
              </ToolbarButton>
            </div>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <div className="flex gap-1">
              <ToolbarButton onClick={() => execCommand("justifyLeft")}>
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("justifyCenter")}>
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("justifyRight")}>
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => execCommand("justifyFull")}>
                <AlignJustify className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>
        )}
        
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "min-h-[200px] p-4 focus:outline-none",
            readOnly && "cursor-default"
          )}
          style={{ minHeight: "200px" }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
        
        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        `}</style>
      </div>
    )
  }
)

RichTextEditor.displayName = "RichTextEditor"

export { RichTextEditor }


