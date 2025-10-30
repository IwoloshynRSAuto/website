'use client'

import { useState } from 'react';
import { TimeInputWithCalculation } from '@/components/timekeeping/time-input-with-calculation';
import { CompactTimeSelector } from '@/components/timekeeping/compact-time-selector';

export default function TimeSelectorDemoPage() {
  const [regularHours, setRegularHours] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [compactRegularHours, setCompactRegularHours] = useState(0);
  const [compactOvertimeHours, setCompactOvertimeHours] = useState(0);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Time Selector Demo
          </h1>
          <p className="text-lg text-gray-600">
            Clean dropdown selectors for start and end times with automatic hour calculation.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Full Time Input Component */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Full Time Input Component
            </h2>
            <p className="text-gray-600 mb-4">
              Complete time selector with all features - perfect for forms and detailed time entry.
            </p>
            <div className="max-w-md">
              <TimeInputWithCalculation
                regularHours={regularHours}
                overtimeHours={overtimeHours}
                onRegularHoursChange={setRegularHours}
                onOvertimeHoursChange={setOvertimeHours}
              />
            </div>
          </div>

          {/* Compact Time Selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Compact Time Selector
            </h2>
            <p className="text-gray-600 mb-4">
              Streamlined version perfect for timesheet grids and compact layouts.
            </p>
            <div className="max-w-sm">
              <CompactTimeSelector
                regularHours={compactRegularHours}
                overtimeHours={compactOvertimeHours}
                onRegularHoursChange={setCompactRegularHours}
                onOvertimeHoursChange={setCompactOvertimeHours}
              />
            </div>
          </div>

          {/* Features */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Key Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Time Selection</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Dropdown selectors for start and end times</li>
                  <li>• 15-minute intervals (9:00 AM, 9:15 AM, etc.)</li>
                  <li>• 12-hour format with AM/PM display</li>
                  <li>• Optional break duration selection</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Automatic Calculation</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time hour calculation</li>
                  <li>• Cross-midnight support (overnight shifts)</li>
                  <li>• Automatic regular/overtime split</li>
                  <li>• Break time deduction</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">User Experience</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "Now" button to set current time</li>
                  <li>• Clear button to reset all fields</li>
                  <li>• Visual feedback with calculated results</li>
                  <li>• Clean, uncluttered interface</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Integration</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Drop-in replacement for manual inputs</li>
                  <li>• Compatible with existing backend</li>
                  <li>• Maintains current data structure</li>
                  <li>• Works with all timesheet components</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Usage Examples
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Regular 8-hour shift</h4>
                <p className="text-sm text-gray-600">
                  Start: 9:00 AM, End: 5:00 PM → 8:00 regular hours, 0:00 overtime
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Overtime shift</h4>
                <p className="text-sm text-gray-600">
                  Start: 9:00 AM, End: 7:00 PM → 8:00 regular hours, 2:00 overtime
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Overnight shift</h4>
                <p className="text-sm text-gray-600">
                  Start: 10:00 PM, End: 6:00 AM → 8:00 regular hours, 0:00 overtime
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">With break</h4>
                <p className="text-sm text-gray-600">
                  Start: 9:00 AM, End: 6:00 PM, Break: 1:00 PM → 8:00 regular hours, 0:00 overtime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
