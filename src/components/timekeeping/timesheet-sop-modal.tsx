'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { HelpCircle, Clock, CheckCircle, Edit, Save, Send } from 'lucide-react'

export function TimesheetSOPModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
          <HelpCircle className="h-4 w-4 mr-2" />
          How To
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            🧾 Time Entry – User Guide (SOP)
          </DialogTitle>
          <DialogDescription>
            Step-by-step instructions for creating time entries and tracking work hours and billable time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Purpose Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Purpose:</h3>
            <p className="text-blue-800">
              To show how to correctly create time entries for tracking work hours and billable time.
            </p>
          </div>

          {/* Steps to Add Time Entry */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Steps to Add a Time Entry:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                <div>
                  <p className="font-medium">Click "Add Time Entry" button.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <div>
                  <p className="font-medium">Fill in the required fields:</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• <strong>Date *</strong> - Select the work date</li>
                    <li>• <strong>Regular Hours *</strong> - Enter hours worked (e.g., 8.0)</li>
                    <li>• <strong>Overtime Hours</strong> - Enter overtime if applicable (e.g., 0.0)</li>
                    <li>• <strong>User *</strong> - Select a user from dropdown</li>
                    <li>• <strong>Job *</strong> - Select a job from dropdown</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                <div>
                  <p className="font-medium">Fill in optional fields:</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• <strong>Labor Code (Optional)</strong> - Select from dropdown if applicable</li>
                    <li>• <strong>Notes</strong> - Add any notes about the work performed</li>
                    <li>• <strong>Hourly Rate (Optional)</strong> - Leave empty to use labor code rate</li>
                    <li>• <strong>Billable</strong> - Check if this time is billable</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Click</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    <Save className="h-3 w-3" />
                    Create Time Entry
                  </div>
                  <p className="font-medium">to save your entry.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Steps to Approve (Self-Check) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-600" />
              Steps to Approve (Self-Check):
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                <div>
                  <p className="font-medium">Review your entered time records for accuracy.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Once reviewed, click</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    <Send className="h-3 w-3" />
                    Submit for Approval
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                <div>
                  <p className="font-medium">
                    If you notice any mistakes after submitting, you can still 
                    <span className="inline-flex items-center gap-1 mx-1 px-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                      <Edit className="h-3 w-3" />
                      edit
                    </span>
                    or delete your entry until it's locked by your manager.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Behavior Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Important Notes:</h3>
            <ul className="text-yellow-800 space-y-1 text-sm">
              <li>• Always double-check your time entries before submitting</li>
              <li>• Include relevant notes for better project tracking</li>
              <li>• Contact your manager if you need to make changes after approval</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
