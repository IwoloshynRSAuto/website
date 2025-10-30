'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpCircle } from 'lucide-react'

interface HowToButtonProps {
  sopCode: string
  title: string
  purpose: string
  scope?: string
  procedure: string[]
  verification: string[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function HowToButton({ 
  sopCode, 
  title, 
  purpose, 
  scope, 
  procedure, 
  verification,
  variant = 'outline',
  size = 'sm'
}: HowToButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <HelpCircle className="h-4 w-4 mr-2" />
          How To
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div>
              <div className="text-sm font-semibold text-blue-600">{sopCode}</div>
              <div className="text-xl font-bold text-gray-900">{title}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Purpose */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Purpose:</h4>
              <p className="text-gray-700">{purpose}</p>
            </div>

            {/* Scope (if provided) */}
            {scope && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Scope:</h4>
                <p className="text-gray-700">{scope}</p>
              </div>
            )}

            {/* Procedure */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Procedure:</h4>
              <ol className="space-y-3">
                {procedure.map((step, index) => (
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
                {verification.map((item, index) => (
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
      </DialogContent>
    </Dialog>
  )
}

