import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, statSync } from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    console.log('[POST /api/open-folder] Request:', { filePath })
    
    if (!filePath) {
      console.error('[POST /api/open-folder] No file path provided')
      return NextResponse.json({ 
        success: false,
        error: 'File path is required' 
      }, { status: 400 })
    }
    
    // Clean up the path - remove file:// prefix if present
    let cleanPath = filePath.trim()
    if (filePath.startsWith('file:///')) {
      cleanPath = filePath.replace('file:///', '').replace(/\//g, '\\')
    }
    
    // Validate Windows path format (e.g., L:\Customers\CustomerName or C:\Users\...)
    // Also allow UNC paths (\\server\share\path)
    const windowsPathRegex = /^([A-Za-z]:\\.*|\\\\[^\\]+\\[^\\]+.*)$/
    if (!cleanPath.match(windowsPathRegex)) {
      console.warn('[POST /api/open-folder] Invalid path format:', cleanPath)
      return NextResponse.json({ 
        success: false,
        error: 'Invalid Windows path format. Path should be like L:\\Customers\\CustomerName or \\\\server\\share\\path' 
      }, { status: 400 })
    }
    
    // Check if the path exists
    if (!existsSync(cleanPath)) {
      console.warn('[POST /api/open-folder] Path does not exist:', cleanPath)
      return NextResponse.json({ 
        success: false,
        error: 'Path does not exist', 
        details: `The path "${cleanPath}" does not exist or is not accessible.`,
        path: cleanPath
      }, { status: 404 })
    }
    
    // Use Windows explorer command to open the folder
    // For folders, just open them; for files, select them in their parent folder
    const stats = statSync(cleanPath)
    const isDirectory = stats.isDirectory()
    
    let command: string
    if (isDirectory) {
      // For directories, just open them (this prevents opening parent + child)
      command = `explorer "${cleanPath}"`
    } else {
      // For files, select them in their parent folder
      command = `explorer /select,"${cleanPath}"`
    }
    
    console.log('[POST /api/open-folder] Executing command:', command)
    
    try {
      await execAsync(command)
      console.log('[POST /api/open-folder] File Explorer opened successfully')
      return NextResponse.json({ 
        success: true, 
        message: 'File Explorer opened successfully',
        path: cleanPath 
      })
    } catch (error) {
      console.error('[POST /api/open-folder] Failed to open File Explorer:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to open File Explorer', 
        details: error instanceof Error ? error.message : 'Unknown error',
        path: cleanPath
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[POST /api/open-folder] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
