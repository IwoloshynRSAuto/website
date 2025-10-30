import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }
    
    // Clean up the path - remove file:// prefix if present
    let cleanPath = filePath
    if (filePath.startsWith('file:///')) {
      cleanPath = filePath.replace('file:///', '').replace(/\//g, '\\')
    }
    
    // Validate Windows path format
    if (!cleanPath.match(/^[A-Za-z]:\\.*$/)) {
      return NextResponse.json({ error: 'Invalid Windows path format' }, { status: 400 })
    }
    
    // Check if the path exists
    if (!existsSync(cleanPath)) {
      return NextResponse.json({ 
        error: 'Path does not exist', 
        details: `The path "${cleanPath}" does not exist or is not accessible.`,
        path: cleanPath
      }, { status: 404 })
    }
    
    // Use Windows explorer command to open the folder
    // Use a simpler approach that handles special characters better
    const command = `explorer /select,"${cleanPath}"`
    
    try {
      await execAsync(command)
      return NextResponse.json({ 
        success: true, 
        message: 'File Explorer opened successfully',
        path: cleanPath 
      })
    } catch (error) {
      console.error('Failed to open File Explorer:', error)
      
      // Try alternative method using start command
      try {
        const altCommand = `start "" "${cleanPath}"`
        await execAsync(altCommand)
        return NextResponse.json({ 
          success: true, 
          message: 'File Explorer opened successfully (alternative method)',
          path: cleanPath 
        })
      } catch (altError) {
        console.error('Alternative method also failed:', altError)
        return NextResponse.json({ 
          error: 'Failed to open File Explorer', 
          details: 'Both explorer and start commands failed. The path may not exist or be accessible.',
          path: cleanPath,
          originalError: error instanceof Error ? error.message : 'Unknown error',
          alternativeError: altError instanceof Error ? altError.message : 'Unknown error'
        }, { status: 500 })
      }
    }
  } catch (error) {
    console.error('Error in open-folder API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
