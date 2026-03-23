/**
 * Task Codes - PM, SV, and AD codes for task assignment
 * Format: <code> — <description>
 */

export interface TaskCode {
  code: string
  description: string
  category: 'PM' | 'SV' | 'AD'
}

export const TASK_CODES: TaskCode[] = [
  // PM010 - PRE-PROJECT SALES
  { code: 'PM010-0000', description: 'PM010 - PRE-PROJECT SALES', category: 'PM' },
  { code: 'PM010-0100', description: 'PROJECT QUOTATION', category: 'PM' },
  { code: 'PM010-0200', description: 'ASSIGN NUMBER, DATE & STATUS', category: 'PM' },
  { code: 'PM010-0300', description: 'FILE QUOTATION IN QUOTE BOOK', category: 'PM' },
  { code: 'PM010-0400', description: 'OPEN QUOTE FILE BACKUP', category: 'PM' },
  { code: 'PM010-0500', description: 'QUOTE BASIC DATA REPORT', category: 'PM' },
  
  // PM020 - ORDER ENTRY
  { code: 'PM020-0000', description: 'PM020 - ORDER ENTRY', category: 'PM' },
  { code: 'PM020-0100', description: 'ANALYZE PURCHASE ORDER', category: 'PM' },
  { code: 'PM020-0200', description: 'CONTRACT INITIATE', category: 'PM' },
  { code: 'PM020-0300', description: 'ASSIGN JOB NUMBER', category: 'PM' },
  { code: 'PM020-0400', description: 'INVOICE DOWN PAYMENT', category: 'PM' },
  { code: 'PM020-0500', description: 'COMPLETE JOB REFERENCE SHEET', category: 'PM' },
  { code: 'PM020-0600', description: 'BUILD WIP FILE', category: 'PM' },
  { code: 'PM020-0700', description: 'SET UP JOB BOOK', category: 'PM' },
  { code: 'PM020-0800', description: 'CREATE OPEN JOB FILE', category: 'PM' },
  { code: 'PM020-0900', description: 'ASSIGN PROJECT MANAGER', category: 'PM' },
  { code: 'PM020-1000', description: 'TRANSFER JOB BOOK TO ENGINEERING', category: 'PM' },
  
  // PM030 - PROJECT MANAGEMENT
  { code: 'PM030-0000', description: 'PM030 - PROJECT MANAGEMENT', category: 'PM' },
  { code: 'PM030-0100', description: 'PROJECT REVIEW COMMITTEE ASSIGNS PM', category: 'PM' },
  { code: 'PM030-0200', description: 'PROJECT MANAGER ASSUMES RESPONSIBILITY', category: 'PM' },
  { code: 'PM030-0300', description: 'DEVELOP PROJECT PLAN', category: 'PM' },
  { code: 'PM030-0400', description: 'HOLD KICK-OFF MEETING', category: 'PM' },
  { code: 'PM030-0500', description: 'CONDUCT PERIODIC PROJECT UPDATES', category: 'PM' },
  
  // PM040 - FUNCTIONAL DESCRIPTION
  { code: 'PM040-0000', description: 'PM040 - FUNCTIONAL DESCRIPTION', category: 'PM' },
  { code: 'PM040-0100', description: 'GENERATE FUNCTIONAL DESCRIPTION', category: 'PM' },
  { code: 'PM040-0200', description: 'APPROVALS OF FUNCTIONAL DESCRIPTION', category: 'PM' },
  { code: 'PM040-0300', description: 'RECEIVE ACCEPTANCE & INVOICE CUSTOMER', category: 'PM' },
  
  // PM050 - PROCESS DESIGN & DEVELOPMENT
  { code: 'PM050-0000', description: 'PM050 - PROCESS DESIGN & DEVELOPMENT', category: 'PM' },
  { code: 'PM050-0100', description: 'PROCESS & INSTRUMENT DRAWING', category: 'PM' },
  { code: 'PM050-0101', description: 'INVOICE CUSTOMER UPON DELIVERY OF P&ID', category: 'PM' },
  { code: 'PM050-0200', description: 'PRELIMINARY BOM', category: 'PM' },
  { code: 'PM050-0201', description: 'ORDER LONG LEAD ITEMS', category: 'PM' },
  { code: 'PM050-0300', description: 'PM050 - MECHANICAL DESIGN', category: 'PM' },
  { code: 'PM050-0310', description: 'EQUIPMENT SIZING', category: 'PM' },
  { code: 'PM050-0320', description: 'ORDER MECHANICAL EQUIPMENT', category: 'PM' },
  { code: 'PM050-0330', description: 'SKID DESIGN', category: 'PM' },
  { code: 'PM050-0340', description: 'SKID CAD', category: 'PM' },
  { code: 'PM050-0350', description: 'PLANT PROCESS PIPING DESIGN', category: 'PM' },
  { code: 'PM050-0360', description: 'PLANT PROCESS PIPING CAD', category: 'PM' },
  { code: 'PM050-0370', description: 'PIPING SCHEDULE', category: 'PM' },
  { code: 'PM050-0380', description: 'DESIGN APPROVAL', category: 'PM' },
  { code: 'PM050-0390', description: 'FINAL MECHANICAL BILL OF MATERIALS', category: 'PM' },
  { code: 'PM050-0395', description: 'FABRICATION BID', category: 'PM' },
  
  // PM060 - CONTROLS DESIGN & IMPLEMENTATION
  { code: 'PM060-0000', description: 'PM060 - CONTROLS DESIGN & IMPLEMENTATION', category: 'PM' },
  { code: 'PM060-0100', description: 'REVIEW FDD and P&ID', category: 'PM' },
  { code: 'PM060-0200', description: 'ASSIGN I/O and GENERATE DRAWING', category: 'PM' },
  { code: 'PM060-0300', description: 'ASSIGN EQUIPMENT IDENTIFIER (IDF)', category: 'PM' },
  { code: 'PM060-0400', description: 'ELECTRICAL SCHEMATIC DESIGN', category: 'PM' },
  { code: 'PM060-0500', description: 'FIELD DESIGN and CAD', category: 'PM' },
  { code: 'PM060-0600', description: 'CONDUIT SCHEDULE', category: 'PM' },
  { code: 'PM060-0700', description: 'ASSEMBLY LAYOUT', category: 'PM' },
  { code: 'PM060-0800', description: 'ELECTRICAL CAD', category: 'PM' },
  { code: 'PM060-0900', description: 'PNEUMATIC DESIGN and CAD', category: 'PM' },
  { code: 'PM060-1000', description: 'ELECTRICAL DESIGN APPROVAL', category: 'PM' },
  { code: 'PM060-1100', description: 'FINAL ELECTRICAL BOM', category: 'PM' },
  { code: 'PM060-1200', description: 'FINALIZE PURCHASING', category: 'PM' },
  
  // PM070 - SOFTWARE DESIGN & IMPLEMENTATION
  { code: 'PM070-0000', description: 'PM070 - SOFTWARE DESIGN & IMPLEMENTATION', category: 'PM' },
  { code: 'PM070-0100', description: 'SOFTWARE KICK-OFF MEETING', category: 'PM' },
  { code: 'PM070-0200', description: 'ORDER SOFTWARE', category: 'PM' },
  { code: 'PM070-0300', description: 'PLC MEMORY MAPPING & PROGRAM LAYOUT', category: 'PM' },
  { code: 'PM070-0400', description: 'GENERATE DATABASE', category: 'PM' },
  { code: 'PM070-0500', description: 'HMI SCREEN DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0600', description: 'SUPERVISORY COMPUTER DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0700', description: 'PLC DEVELOPMENT', category: 'PM' },
  { code: 'PM070-0800', description: 'MODULE LEVEL TESTING', category: 'PM' },
  
  // PM080 - FABRICATION & ASSEMBLY
  { code: 'PM080-0000', description: 'PM080 - FABRICATION & ASSEMBLY', category: 'PM' },
  { code: 'PM080-0100', description: 'ENCLOSURE WIRING & ASSEMBLY', category: 'PM' },
  { code: 'PM080-0110', description: 'DELIVERY OF PANEL MATERIAL', category: 'PM' },
  { code: 'PM080-0120', description: 'PANEL LAYOUT', category: 'PM' },
  { code: 'PM080-0130', description: 'PANEL ASSEMBLY & WIRING', category: 'PM' },
  { code: 'PM080-0140', description: 'PANEL TESTING', category: 'PM' },
  { code: 'PM080-0150', description: 'CERTIFICATION OF SKID COMPLETION', category: 'PM' },
  { code: 'PM080-0200', description: 'SKID FABRICATION', category: 'PM' },
  { code: 'PM080-0210', description: 'DELIVERY OF SKID MATERIAL', category: 'PM' },
  { code: 'PM080-0220', description: 'SKID LAYOUT', category: 'PM' },
  { code: 'PM080-0230', description: 'SKID ASSEMBLY', category: 'PM' },
  { code: 'PM080-0240', description: 'SKID TESTING', category: 'PM' },
  { code: 'PM080-0250', description: 'CERTIFICATION OF SKID COMPLETION', category: 'PM' },
  
  // PM090 - INTEGRATION & FAT
  { code: 'PM090-0000', description: 'PM090 - INTEGRATION & FAT', category: 'PM' },
  { code: 'PM090-0100', description: 'SYSTEM COMPONENT INTEGRATION', category: 'PM' },
  { code: 'PM090-0110', description: 'CONTROL INTEGRATION', category: 'PM' },
  { code: 'PM090-0120', description: 'SOFTWARE INTEGRATION TEST', category: 'PM' },
  { code: 'PM090-0200', description: 'FACTORY ACCEPTANCE TEST (FAT)', category: 'PM' },
  { code: 'PM090-0300', description: 'SHIP EQUIPMENT TO CUSTOMER SITE', category: 'PM' },
  
  // PM100 - INSTALLATION
  { code: 'PM100-0000', description: 'PM100 - INSTALLATION', category: 'PM' },
  { code: 'PM100-0100', description: 'ON-SITE RECEIVING, UNLOADING & SET-UP', category: 'PM' },
  { code: 'PM100-0200', description: 'PERIODIC CONTRACTOR REVIEW MEETINGS', category: 'PM' },
  { code: 'PM100-0300', description: 'FIELD PIPING', category: 'PM' },
  { code: 'PM100-0400', description: 'FIELD MECHANICAL INSTALLATION SUPERVISION', category: 'PM' },
  { code: 'PM100-0500', description: 'FIELD WIRING', category: 'PM' },
  { code: 'PM100-0600', description: 'FIELD SOFTWARE INSTALLATION', category: 'PM' },
  { code: 'PM100-0700', description: 'I/O LOOP CHECK', category: 'PM' },
  { code: 'PM100-0800', description: 'CALIBRATION', category: 'PM' },
  
  // PM110 - COMMISSIONING & FINAL ACCEPTANCE
  { code: 'PM110-0000', description: 'PM110 - COMMISSIONING & FINAL ACCEPTANCE', category: 'PM' },
  { code: 'PM110-0100', description: 'LOAD ALL APPLICATION SOFTWARE', category: 'PM' },
  { code: 'PM110-0200', description: 'VERIFY INTEGRATION OF SYSTEM', category: 'PM' },
  { code: 'PM110-0300', description: 'PERFORM SITE ACCEPTANCE TEST (SAT)', category: 'PM' },
  { code: 'PM110-0400', description: 'MODIFY SYSTEM and RE-TEST', category: 'PM' },
  { code: 'PM110-0500', description: 'START COMMERCIAL PRODUCTION', category: 'PM' },
  { code: 'PM110-0600', description: 'OBTAIN PERFORMANCE TEST CERTIFICATE', category: 'PM' },
  { code: 'PM110-0700', description: 'OBTAIN CUSTOMER TAKE-OVER CERTIFICATE', category: 'PM' },
  { code: 'PM110-0800', description: 'GENERATE PUNCH LIST', category: 'PM' },
  { code: 'PM110-0900', description: 'GENERATE COMMISSIONING INVOICE', category: 'PM' },
  { code: 'PM110-1000', description: 'MODIFY DRAWING PKG & APPLICATION SOFTWARE', category: 'PM' },
  
  // PM120 - TRAINING
  { code: 'PM120-0000', description: 'PM120 - TRAINING', category: 'PM' },
  { code: 'PM120-0100', description: 'ESTABLISH TRAINING SCHEDULE', category: 'PM' },
  { code: 'PM120-0200', description: 'PRODUCTION TRAINING', category: 'PM' },
  { code: 'PM120-0300', description: 'SANITATION TRAINING', category: 'PM' },
  { code: 'PM120-0400', description: 'MAINTENANCE TRAINING', category: 'PM' },
  
  // PM130 - DOCUMENTATION
  { code: 'PM130-0000', description: 'PM130 - DOCUMENTATION', category: 'PM' },
  { code: 'PM130-0100', description: 'PROVIDE FINAL DOCUMENTATION', category: 'PM' },
  { code: 'PM130-0200', description: 'GENERATE FINAL DOCUMENTATION INVOICE', category: 'PM' },
  
  // PM140 - WARRANTY
  { code: 'PM140-0000', description: 'PM140 - WARRANTY', category: 'PM' },
  { code: 'PM140-0100', description: 'OBSERVATIONS', category: 'PM' },
  { code: 'PM140-0200', description: 'SCENARIO OF ACTION', category: 'PM' },
  { code: 'PM140-0300', description: 'WARRANTY MAINTENANCE', category: 'PM' },
  
  // SV010 - SERVICE
  { code: 'SV010-0000', description: 'SV010 - SERVICE', category: 'SV' },
  { code: 'SV010-0100', description: 'ON-SITE SERVICE', category: 'SV' },
  { code: 'SV010-0200', description: 'REMOTE SERVICE', category: 'SV' },
  
  // AD900 - ADMINISTRATIVE
  { code: 'AD900-0000', description: 'AD900 - ADMINISTRATIVE', category: 'AD' },
  { code: 'AD900-0100', description: 'ADMINISTRATIVE TIME (NOC)', category: 'AD' },
  { code: 'AD900-0200', description: 'SALES ASSISTANCE', category: 'AD' },
  { code: 'AD900-0300', description: 'EMPLOYEE TRAVEL TIME - BILLABLE', category: 'AD' },
  { code: 'AD900-0350', description: 'EMPLOYEE AIRLINE FARE', category: 'AD' },
  { code: 'AD900-0370', description: 'EMPLOYEE TRAVEL/LIVING EXPENSE LOCAL', category: 'AD' },
  { code: 'AD900-0380', description: 'EMPLOYEE TRAVEL/LIVING EXPENSE REMOTE', category: 'AD' },
]

/**
 * Get task code by code string
 */
export function getTaskCodeByCode(code: string): TaskCode | undefined {
  return TASK_CODES.find(tc => tc.code === code)
}

/**
 * Search task codes by code or description
 */
export function searchTaskCodes(query: string): TaskCode[] {
  const lowerQuery = query.toLowerCase()
  return TASK_CODES.filter(tc => 
    tc.code.toLowerCase().includes(lowerQuery) ||
    tc.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get task codes by category
 */
export function getTaskCodesByCategory(category: 'PM' | 'SV' | 'AD'): TaskCode[] {
  return TASK_CODES.filter(tc => tc.category === category)
}





