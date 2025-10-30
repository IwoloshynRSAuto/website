'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpCircle, FileText } from 'lucide-react'

interface SOP {
  code: string
  title: string
  purpose: string
  scope?: string
  procedure: string[]
  verification: string[]
}

interface MultiSOPButtonProps {
  sops: SOP[]
  buttonText?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function MultiSOPButton({ 
  sops,
  buttonText = 'How To',
  variant = 'default',
  size = 'default',
  className = ''
}: MultiSOPButtonProps) {
  const [selectedSOPIndex, setSelectedSOPIndex] = useState(0)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <HelpCircle className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">How To Guides</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-4 gap-4">
          {/* SOP List */}
          <div className="col-span-1 border-r pr-4">
            <ScrollArea className="h-[70vh]">
              <div className="space-y-2">
                {sops.map((sop, index) => (
                  <button
                    key={sop.code}
                    onClick={() => setSelectedSOPIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSOPIndex === index
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <FileText className={`h-5 w-5 mt-0.5 ${
                        selectedSOPIndex === index ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${
                          selectedSOPIndex === index ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {sop.code}
                        </div>
                        <div className={`text-sm font-medium leading-tight ${
                          selectedSOPIndex === index ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {sop.title}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* SOP Content */}
          <div className="col-span-3">
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b pb-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-sm font-semibold text-blue-600">{sops[selectedSOPIndex].code}</div>
                      <h3 className="text-2xl font-bold text-gray-900">{sops[selectedSOPIndex].title}</h3>
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Purpose:</h4>
                  <p className="text-gray-700">{sops[selectedSOPIndex].purpose}</p>
                </div>

                {/* Scope (if exists) */}
                {sops[selectedSOPIndex].scope && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Scope:</h4>
                    <p className="text-gray-700">{sops[selectedSOPIndex].scope}</p>
                  </div>
                )}

                {/* Procedure */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Procedure:</h4>
                  <ol className="space-y-3">
                    {sops[selectedSOPIndex].procedure.map((step, index) => (
                      <li key={index} className="flex">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-semibold text-sm mr-3">
                          {index + 1}
                        </span>
                        <div className="flex-1 pt-1">
                          <p className="text-gray-700 whitespace-pre-line">{step}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Verification */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-green-900 mb-3">Verification:</h4>
                  <ul className="space-y-2">
                    {sops[selectedSOPIndex].verification.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-500 text-white rounded-full text-xs mr-2 mt-0.5">
                          ✓
                        </span>
                        <p className="text-green-800">{item}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

