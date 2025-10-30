interface DebugLogData {
  level: 'info' | 'warn' | 'error' | 'success'
  component: string
  function: string
  message: string
  data?: any
}

class DebugLogger {
  private isEnabled = true
  private logs: DebugLogData[] = []

  enable() {
    this.isEnabled = true
  }

  disable() {
    this.isEnabled = false
  }

  log(level: DebugLogData['level'], component: string, functionName: string, message: string, data?: any) {
    if (!this.isEnabled) return

    const logData: DebugLogData = {
      level,
      component,
      function: functionName,
      message,
      data
    }

    // Store in memory
    this.logs.push(logData)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500) // Keep last 500 logs
    }

    // Emit to debug panel
    const event = new CustomEvent('debug-log', { detail: logData })
    window.dispatchEvent(event)

    // Also log to console with styling
    const timestamp = new Date()
      .toISOString()
      .split('T')[1]
      .replace('Z', '')

    const style = this.getConsoleStyle(level)
    const prefix = `[${timestamp}] ${component}.${functionName}`
    
    if (data) {
      console.log(`%c${prefix}: ${message}`, style, data)
    } else {
      console.log(`%c${prefix}: ${message}`, style)
    }
  }

  private getConsoleStyle(level: string): string {
    switch (level) {
      case 'error':
        return 'color: #dc2626; font-weight: bold;'
      case 'warn':
        return 'color: #d97706; font-weight: bold;'
      case 'success':
        return 'color: #16a34a; font-weight: bold;'
      default:
        return 'color: #2563eb;'
    }
  }

  info(component: string, functionName: string, message: string, data?: any) {
    this.log('info', component, functionName, message, data)
  }

  warn(component: string, functionName: string, message: string, data?: any) {
    this.log('warn', component, functionName, message, data)
  }

  error(component: string, functionName: string, message: string, data?: any) {
    this.log('error', component, functionName, message, data)
  }

  success(component: string, functionName: string, message: string, data?: any) {
    this.log('success', component, functionName, message, data)
  }

  // Specialized logging for timesheet operations
  timesheet(operation: string, message: string, data?: any) {
    this.info('Timesheet', operation, message, data)
  }

  apiCall(method: string, url: string, data?: any) {
    this.info('API', `${method} ${url}`, 'Making API call', data)
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    const level = status >= 400 ? 'error' : 'success'
    this.log(level, 'API', `${method} ${url}`, `Response: ${status}`, data)
  }

  stateChange(component: string, stateName: string, oldValue: any, newValue: any) {
    this.info(component, 'StateChange', `${stateName} changed`, {
      from: oldValue,
      to: newValue
    })
  }

  dataProcessing(operation: string, inputCount: number, outputCount: number, data?: any) {
    this.info('DataProcessing', operation, `Processed ${inputCount} items → ${outputCount} results`, data)
  }
}

// Create global instance
export const debug = new DebugLogger()

// Make it available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).debug = debug
}




