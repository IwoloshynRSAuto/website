import { TimeCalculationDemo } from '@/components/timekeeping/time-calculation-demo'

export default function TimeCalculationDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Timesheet Time Calculation Demo
          </h1>
          <p className="text-lg text-gray-600">
            Experience the new time tracking system with automatic hour calculation.
          </p>
        </div>
        
        <div className="grid gap-8">
          <TimeCalculationDemo />
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              How to Use the New System
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Step 1: Enter Times</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click on Start Time field</li>
                  <li>• Select your shift start time</li>
                  <li>• Click on End Time field</li>
                  <li>• Select your shift end time</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Step 2: Add Breaks (Optional)</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click on Break Duration field</li>
                  <li>• Enter your break time</li>
                  <li>• System will deduct from total</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Step 3: Review Calculation</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• See total hours calculated</li>
                  <li>• Check regular/overtime split</li>
                  <li>• Verify the calculation is correct</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Step 4: Apply to Timesheet</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Click "Apply" button</li>
                  <li>• Hours are added to timesheet</li>
                  <li>• Ready to submit or continue</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">
              Special Features
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">🌙</div>
                <h3 className="font-medium text-yellow-900 mb-1">Overnight Shifts</h3>
                <p className="text-sm text-yellow-800">
                  Supports shifts that cross midnight (e.g., 10 PM to 6 AM)
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⏰</div>
                <h3 className="font-medium text-yellow-900 mb-1">Break Tracking</h3>
                <p className="text-sm text-yellow-800">
                  Automatically deducts break time from total hours
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium text-yellow-900 mb-1">Auto Split</h3>
                <p className="text-sm text-yellow-800">
                  Automatically splits hours between regular and overtime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
