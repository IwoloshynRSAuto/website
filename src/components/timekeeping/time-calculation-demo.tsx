'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeInputWithCalculation } from './time-input-with-calculation'

export function TimeCalculationDemo() {
  const [regularHours, setRegularHours] = useState(0)
  const [overtimeHours, setOvertimeHours] = useState(0)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Time Calculation Demo</CardTitle>
        <p className="text-sm text-gray-600">
          Enter your start and end times to automatically calculate regular and overtime hours.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter your start time (e.g., 09:00)</li>
              <li>• Enter your end time (e.g., 17:30)</li>
              <li>• Optionally add break duration (e.g., 01:00)</li>
              <li>• System automatically calculates total hours</li>
              <li>• Hours are split: up to 8 hours = regular, rest = overtime</li>
              <li>• Supports overnight shifts (e.g., 22:00 to 06:00)</li>
            </ul>
          </div>
          
          <TimeInputWithCalculation
            regularHours={regularHours}
            overtimeHours={overtimeHours}
            onRegularHoursChange={setRegularHours}
            onOvertimeHoursChange={setOvertimeHours}
          />
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Values:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Regular Hours:</span>
                <span className="ml-2 font-medium">{regularHours.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Overtime Hours:</span>
                <span className="ml-2 font-medium">{overtimeHours.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
