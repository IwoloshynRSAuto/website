import { prisma } from '../lib/prisma'

// This script will help categorize parts based on part numbers, manufacturers, and descriptions
// Run with: npx tsx scripts/categorize-parts.ts

interface PartCategory {
  partNumber: string
  manufacturer: string
  description: string | null
  category: string
  subcategory?: string
  reasoning: string
}

// Research-based categorization logic
function categorizePart(part: { partNumber: string; manufacturer: string; description: string | null }): PartCategory | null {
  const partNum = part.partNumber.toLowerCase()
  const manufacturer = part.manufacturer.toLowerCase()
  const description = (part.description || '').toLowerCase()

  // Combine all searchable text
  const searchText = `${partNum} ${manufacturer} ${description}`

  // Communications/Network modules (for PLCs and drives)
  if (
    searchText.includes('ethernet') ||
    searchText.includes('communication') ||
    searchText.includes('network') ||
    searchText.includes('switch') && searchText.includes('ethernet') ||
    partNum.includes('1756-en') || // ControlLogix Ethernet modules
    partNum.includes('1783-') || // Stratix switches
    partNum.includes('20-750-') || // PowerFlex Ethernet option
    partNum.includes('440c-') // Ethernet module
  ) {
    return {
      ...part,
      category: 'Panel Build',
      subcategory: 'Communications',
      reasoning: 'Communication/network module for PLC or drive systems'
    }
  }

  // PLC (Programmable Logic Controller)
  if (
    searchText.includes('plc') ||
    searchText.includes('compactlogix') ||
    searchText.includes('contrologix') ||
    searchText.includes('micro800') ||
    searchText.includes('micro850') ||
    searchText.includes('micro870') ||
    searchText.includes('micro830') ||
    searchText.includes('micro820') ||
    searchText.includes('s7-') ||
    searchText.includes('s7') ||
    searchText.includes('controller') && (searchText.includes('logix') || searchText.includes('guardlogix') || searchText.includes('armor')) ||
    (manufacturer.includes('allen') || manufacturer.includes('bradley')) && (
      partNum.includes('1769') || 
      partNum.includes('1756') || 
      partNum.startsWith('2080-lc') ||
      partNum.startsWith('1756-l') ||
      partNum.includes('1756-l72') ||
      partNum.includes('1756-l73') ||
      partNum.includes('1756-l81')
    ) ||
    manufacturer.includes('siemens') && (partNum.includes('6es7') || partNum.includes('cpu'))
  ) {
    return {
      ...part,
      category: 'PLC',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 
                   (partNum.includes('1756') ? 'ControlLogix' : 
                    partNum.startsWith('2080') ? 'Micro800' : 
                    partNum.includes('1769') ? 'CompactLogix' : 'Allen-Bradley') : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
      reasoning: 'PLC controller based on part number/manufacturer patterns'
    }
  }

  // HMI (Human Machine Interface)
  if (
    searchText.includes('hmi') ||
    searchText.includes('panelview') ||
    searchText.includes('touchscreen') ||
    searchText.includes('operator interface') ||
    partNum.includes('2711') || // Allen-Bradley PanelView
    partNum.includes('6av') || // Siemens HMI
    manufacturer.includes('red lion') ||
    manufacturer.includes('proface')
  ) {
    return {
      ...part,
      category: 'HMI',
      subcategory: manufacturer.includes('allen-bradley') ? 'PanelView' : undefined,
      reasoning: 'HMI/touchscreen based on part number/manufacturer patterns'
    }
  }

  // Drive (Variable Frequency Drive, Servo Drive)
  if (
    searchText.includes('drive') ||
    searchText.includes('vfd') ||
    searchText.includes('variable frequency') ||
    searchText.includes('servo') ||
    searchText.includes('inverter') ||
    searchText.includes('soft starter') ||
    searchText.includes('smc-flex') ||
    partNum.includes('powerflex') ||
    partNum.includes('powerflex 525') ||
    partNum.includes('powerflex 755') ||
    partNum.startsWith('20g') || // PowerFlex 755 drives
    partNum.startsWith('25-') || // PowerFlex 525 accessories
    partNum.includes('525') || // PowerFlex 525
    partNum.includes('755') || // PowerFlex 755
    partNum.includes('g15') || // PowerFlex G15
    partNum.includes('150-f') || // SMC-Flex soft starter
    partNum.includes('6se') || // Siemens drives
    partNum.startsWith('acs880') || // ABB drives
    partNum.startsWith('acs') || // ABB drives
    manufacturer.includes('danfoss') && (partNum.includes('vlt') || partNum.includes('fc')) ||
    manufacturer.includes('abb') && (searchText.includes('drive') || searchText.includes('inverter'))
  ) {
    return {
      ...part,
      category: 'Drive',
      subcategory: (partNum.includes('powerflex') || partNum.startsWith('20g') || partNum.includes('755') || partNum.includes('525') || (manufacturer.includes('allen') || manufacturer.includes('bradley'))) ? 
                   (partNum.includes('755') || partNum.startsWith('20g') ? 'PowerFlex 755' :
                    partNum.includes('525') || partNum.startsWith('25-') ? 'PowerFlex 525' :
                    partNum.includes('150-f') ? 'Soft Starter' : 'PowerFlex') : 
                   (manufacturer.includes('abb') || partNum.startsWith('acs')) ? 'ABB' :
                   manufacturer.includes('danfoss') ? 'VLT' :
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
      reasoning: 'Drive/VFD based on part number/manufacturer patterns'
    }
  }

  // Motor Circuit Breaker
  if (
    searchText.includes('motor circuit breaker') ||
    searchText.includes('motor protection') ||
    (searchText.includes('breaker') && searchText.includes('motor')) ||
    searchText.includes('mcb') ||
    searchText.includes('mccb') ||
    partNum.includes('tm') && manufacturer.includes('eaton') ||
    partNum.includes('mccb') ||
    (partNum.includes('140m') || partNum.startsWith('140m-') || partNum.startsWith('140ut-')) && searchText.includes('breaker') ||
    partNum.includes('140m-c') && searchText.includes('breaker') ||
    partNum.startsWith('140ut-') ||
    (partNum.includes('140m') && searchText.includes('circuit breaker'))
  ) {
    return {
      ...part,
      category: 'Motor Circuit Breaker',
      subcategory: manufacturer.includes('eaton') ? 'Eaton' : 
                   (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 'Allen-Bradley' : undefined,
      reasoning: 'Motor circuit breaker based on description/part number'
    }
  }

  // Eaton Breakers (including Allen-Bradley 140G series which are Eaton)
  if (
    (manufacturer.includes('eaton') || (manufacturer.includes('allen') && partNum.includes('140g-k'))) && (
      searchText.includes('breaker') ||
      searchText.includes('circuit breaker') ||
      searchText.includes('molded case') ||
      searchText.includes('power defense') ||
      partNum.includes('br') ||
      partNum.includes('cb') ||
      partNum.includes('140g-k6') ||
      partNum.includes('140g-k') ||
      partNum.startsWith('pdg') // Power Defense breakers
    )
  ) {
    return {
      ...part,
      category: 'Eaton Breakers',
      subcategory: (searchText.includes('molded case') || partNum.includes('140g-k') || partNum.startsWith('pdg')) ? 'MCCB' : 
                   searchText.includes('miniature') ? 'MCB' : undefined,
      reasoning: 'Eaton circuit breaker (140G series and Power Defense are Eaton breakers)'
    }
  }

  // Contactor
  if (
    searchText.includes('contactor') ||
    partNum.startsWith('100-') || // Allen-Bradley contactors
    partNum.startsWith('100s-') || // Allen-Bradley contactors
    partNum.startsWith('200-') || // Allen-Bradley contactors
    partNum.includes('3tb') || // Siemens contactors
    manufacturer.includes('telemecanique') ||
    manufacturer.includes('schneider') && searchText.includes('contactor')
  ) {
    return {
      ...part,
      category: 'Contactor',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 'Allen-Bradley' : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
      reasoning: 'Contactor based on part number/manufacturer patterns'
    }
  }

  // Relays
  if (
    searchText.includes('relay') ||
    partNum.includes('700-') || // Allen-Bradley relays
    partNum.includes('3rh') || // Siemens relays
    manufacturer.includes('omron') && searchText.includes('relay')
  ) {
    return {
      ...part,
      category: 'Relays',
      subcategory: manufacturer.includes('allen-bradley') ? 'Allen-Bradley' : undefined,
      reasoning: 'Relay based on part number/manufacturer patterns'
    }
  }

  // IO (Input/Output modules)
  if (
    searchText.includes('i/o') ||
    searchText.includes('input output') ||
    searchText.includes('io module') ||
    searchText.includes('input module') ||
    searchText.includes('output module') ||
    searchText.includes('analog input') ||
    searchText.includes('analog output') ||
    searchText.includes('counter module') ||
    searchText.includes('high speed counter') ||
    partNum.includes('1734') || // Allen-Bradley Point I/O
    partNum.startsWith('1794-') || // Allen-Bradley FLEX I/O
    partNum.startsWith('2080-mot-') || // Micro800 counter module
    (partNum.includes('1769') && (partNum.includes('iq') || partNum.includes('ob') || partNum.includes('if') || partNum.includes('ie') || partNum.includes('oe'))) || // Allen-Bradley Compact I/O
    (partNum.includes('1756') && (partNum.includes('ib') || partNum.includes('ob') || partNum.includes('if') || partNum.includes('of') || partNum.includes('ie') || partNum.includes('oe'))) || // Allen-Bradley ControlLogix I/O
    partNum.includes('6es7') && (partNum.includes('32') || partNum.includes('33')) || // Siemens I/O modules
    manufacturer.includes('phoenix contact') && searchText.includes('io')
  ) {
    return {
      ...part,
      category: 'IO',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 
                   (partNum.startsWith('1794') ? 'FLEX I/O' : 
                    partNum.startsWith('1734') ? 'Point I/O' : 
                    partNum.startsWith('2080-mot') ? 'Micro800 Module' :
                    partNum.includes('1756') ? 'ControlLogix I/O' : 'Allen-Bradley') : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
      reasoning: 'I/O module based on part number/manufacturer patterns'
    }
  }

  // Power Supply
  if (
    searchText.includes('power supply') ||
    searchText.includes('psu') ||
    searchText.includes('24v') && searchText.includes('power') ||
    partNum.includes('1606-') || // Allen-Bradley power supplies
    partNum.includes('6ep1') || // Siemens power supplies
    manufacturer.includes('phoenix contact') && (partNum.includes('quint') || searchText.includes('power'))
  ) {
    return {
      ...part,
      category: 'Power Supply',
      subcategory: manufacturer.includes('allen-bradley') ? 'Allen-Bradley' : 
                   manufacturer.includes('siemens') ? 'Siemens' : 
                   manufacturer.includes('phoenix contact') ? 'Phoenix Contact' : undefined,
      reasoning: 'Power supply based on part number/manufacturer patterns'
    }
  }

  // Terminals
  if (
    searchText.includes('terminal') ||
    searchText.includes('terminal block') ||
    searchText.includes('terminal strip') ||
    searchText.includes('ground bar') ||
    searchText.includes('power distribution block') ||
    searchText.includes('busbar') ||
    searchText.includes('feeder lug') ||
    manufacturer.includes('phoenix contact') ||
    manufacturer.includes('weidmuller') ||
    manufacturer.includes('wago') ||
    manufacturer.includes('ilsco') ||
    manufacturer.includes('edison') && searchText.includes('block') ||
    (manufacturer.includes('eaton') && (partNum.startsWith('z-') || searchText.includes('busbar')))
  ) {
    return {
      ...part,
      category: 'Terminals',
      subcategory: manufacturer.includes('phoenix contact') ? 'Phoenix Contact' : 
                   manufacturer.includes('weidmuller') ? 'Weidmuller' : 
                   manufacturer.includes('wago') ? 'Wago' :
                   manufacturer.includes('ilsco') ? 'ILSCO' :
                   manufacturer.includes('edison') ? 'Edison' :
                   (manufacturer.includes('eaton') && partNum.startsWith('z-')) ? 'Eaton' : undefined,
      reasoning: 'Terminal/terminal block/ground bar/busbar based on manufacturer/description'
    }
  }

  // Transformers
  if (
    searchText.includes('transformer') ||
    searchText.includes('control transformer') ||
    partNum.includes('tr') && searchText.includes('transformer') ||
    manufacturer.includes('hammond') ||
    manufacturer.includes('acme')
  ) {
    return {
      ...part,
      category: 'Transformers',
      subcategory: searchText.includes('control') ? 'Control Transformer' : undefined,
      reasoning: 'Transformer based on description/manufacturer'
    }
  }

  // Panels
  if (
    searchText.includes('panel') ||
    searchText.includes('enclosure') ||
    searchText.includes('cabinet') ||
    searchText.includes('consolet') ||
    searchText.includes('air conditioner') ||
    searchText.includes('btu') ||
    manufacturer.includes('hoffman') ||
    manufacturer.includes('rittal') ||
    manufacturer.includes('saginaw') ||
    (partNum.startsWith('sce-') && (searchText.includes('enclosure') || searchText.includes('air') || searchText.includes('conditioner')))
  ) {
    return {
      ...part,
      category: 'Panels',
      subcategory: searchText.includes('control panel') ? 'Control Panel' : 
                   (searchText.includes('enclosure') || searchText.includes('consolet')) ? 'Enclosure' :
                   (searchText.includes('air conditioner') || searchText.includes('btu')) ? 'Climate Control' : undefined,
      reasoning: 'Panel/enclosure/climate control based on description/manufacturer'
    }
  }

  // Panel Build (components typically used in panel builds)
  if (
    searchText.includes('wire') ||
    searchText.includes('cable') ||
    searchText.includes('wiring duct') ||
    searchText.includes('panduct') ||
    searchText.includes('fuse') ||
    searchText.includes('class cc') ||
    searchText.includes('bussmann') ||
    searchText.includes('disconnect') ||
    searchText.includes('push button') ||
    searchText.includes('selector switch') ||
    searchText.includes('indicator light') ||
    searchText.includes('pilot light') ||
    searchText.includes('ez-light') ||
    searchText.includes('indicator') && searchText.includes('light') ||
    searchText.includes('auxiliary contact') ||
    searchText.includes('aux contact') ||
    searchText.includes('contact block') ||
    searchText.includes('legend plate') ||
    searchText.includes('din rail') ||
    searchText.includes('chassis') ||
    searchText.includes('slot filler') ||
    searchText.includes('connecting module') ||
    searchText.includes('spacing adapter') ||
    searchText.includes('safety light curtain') ||
    searchText.includes('guardshield') ||
    searchText.includes('e-stop') ||
    searchText.includes('emergency stop') ||
    searchText.includes('analog signal splitter') ||
    searchText.includes('air fitting') ||
    searchText.includes('control valve') ||
    searchText.includes('solenoid') ||
    searchText.includes('manifold') ||
    searchText.includes('pneumatic') ||
    searchText.includes('hydraulic') ||
    searchText.includes('vacuum cup') ||
    searchText.includes('vacuum pump') ||
    searchText.includes('vacuum') ||
    searchText.includes('modular base') ||
    searchText.includes('base plate') ||
    partNum.startsWith('vac-') ||
    partNum.startsWith('vnt-') ||
    searchText.includes('chart recorder') ||
    searchText.includes('truline') ||
    searchText.includes('studio 5000') ||
    searchText.includes('rslinx') ||
    searchText.includes('factorytalk') ||
    (partNum.includes('140m') && (searchText.includes('contact') || searchText.includes('pec') || searchText.includes('te'))) ||
    (partNum.includes('140mt') || partNum.includes('140g') || partNum.includes('194')) && (!searchText.includes('breaker') && !searchText.includes('terminal')) ||
    partNum.includes('199-') || // DIN rail
    partNum.includes('1492-') || // DIN rail
    partNum.includes('1756-a') || // Chassis
    partNum.includes('1756-n') || // Slot filler
    partNum.includes('194l-') || // Actuator
    partNum.includes('194u-') || // Contact block
    partNum.startsWith('800f-') || // Legend plate
    partNum.startsWith('800fm-') || // E-Stop buttons
    partNum.startsWith('800fp-') || // E-Stop buttons
    partNum.includes('440l-') || // Safety light curtain
    partNum.includes('440c-') || // Ethernet module
    partNum.startsWith('931n-') || // Signal splitter
    partNum.startsWith('air-fit') || // Air fittings
    partNum.startsWith('acs') && !searchText.includes('drive') || // ABB accessories (not drives)
    partNum.startsWith('c2') || // PANDUIT wiring duct
    partNum.startsWith('f2x') || // PANDUIT wiring duct
    partNum.startsWith('ccp') || // Bussmann fuses
    partNum.startsWith('cs-') || // CS Automation pneumatic
    partNum.startsWith('k50') || // Banner indicators
    partNum.startsWith('9324-') || // Software
    partNum.startsWith('9355-') || // Software
    partNum.startsWith('9701m-') || // Software
    partNum.startsWith('dr45') || // Chart recorder
    partNum.startsWith('control-valve') || // Control valves
    partNum.startsWith('ms') && manufacturer.includes('cisco') || // Cisco switches
    partNum.startsWith('pbc') // Power distribution block covers
  ) {
    return {
      ...part,
      category: 'Panel Build',
      subcategory: (searchText.includes('wire') || searchText.includes('cable') || searchText.includes('wiring duct') || searchText.includes('panduct') || partNum.startsWith('c2') || partNum.startsWith('f2x')) ? 'Wire/Cable' :
                   (searchText.includes('fuse') || searchText.includes('class cc') || searchText.includes('bussmann') || partNum.startsWith('ccp')) ? 'Fuse' :
                   searchText.includes('disconnect') ? 'Disconnect Switch' :
                   searchText.includes('din rail') || partNum.includes('199-') || partNum.includes('1492-') ? 'DIN Rail' :
                   searchText.includes('chassis') || partNum.includes('1756-a') ? 'Chassis' :
                   searchText.includes('auxiliary') || searchText.includes('aux contact') || searchText.includes('contact') || partNum.includes('194') || partNum.includes('pec') || partNum.startsWith('931n-') ? 'Accessories' :
                   (searchText.includes('push button') || searchText.includes('selector') || searchText.includes('indicator') || searchText.includes('legend') || partNum.startsWith('800f-') || searchText.includes('e-stop') || searchText.includes('emergency stop') || partNum.startsWith('k50')) ? 'Controls' :
                   searchText.includes('safety') || searchText.includes('light curtain') || partNum.includes('440l-') ? 'Safety' :
                   (searchText.includes('ethernet') || partNum.includes('440c-') || partNum.includes('20-750-')) ? 'Communications' :
                   (searchText.includes('air') || searchText.includes('pneumatic') || searchText.includes('hydraulic') || searchText.includes('control valve') || searchText.includes('solenoid') || searchText.includes('manifold') || searchText.includes('vacuum') || partNum.startsWith('air-fit') || partNum.startsWith('cs-') || partNum.startsWith('control-valve') || partNum.startsWith('vac-')) ? 'Pneumatic/Hydraulic' :
                   (searchText.includes('modular base') || searchText.includes('base plate') || partNum.startsWith('vnt-')) ? 'Hardware' :
                   (searchText.includes('chart recorder') || searchText.includes('truline') || partNum.startsWith('dr45')) ? 'Instrumentation' :
                   (searchText.includes('studio 5000') || searchText.includes('rslinx') || searchText.includes('factorytalk') || partNum.startsWith('9324-') || partNum.startsWith('9355-') || partNum.startsWith('9701m-')) ? 'Software' :
                   (partNum.startsWith('ms') && manufacturer.includes('cisco')) ? 'Communications' :
                   (partNum.startsWith('pbc')) ? 'Accessories' :
                   (manufacturer.includes('eaton') && partNum.startsWith('z-') && searchText.includes('aux')) ? 'Accessories' : undefined,
      reasoning: 'Panel build component based on description/part number'
    }
  }

  return null
}

async function main() {
  console.log('Fetching parts without categories...\n')

  // Get all parts without categories
  const uncategorizedParts = await prisma.part.findMany({
    where: {
      OR: [
        { category: null },
        { category: '' }
      ]
    },
    select: {
      id: true,
      partNumber: true,
      manufacturer: true,
      description: true,
      category: true,
      subcategory: true
    },
    orderBy: {
      partNumber: 'asc'
    }
  })

  console.log(`Found ${uncategorizedParts.length} parts without categories\n`)

  if (uncategorizedParts.length === 0) {
    console.log('No parts to categorize!')
    return
  }

  const updates: Array<{ id: string; category: string; subcategory: string | null; reasoning: string }> = []

  // Categorize each part
  for (const part of uncategorizedParts) {
    const categorization = categorizePart(part)
    
    if (categorization) {
      updates.push({
        id: part.id,
        category: categorization.category,
        subcategory: categorization.subcategory || null,
        reasoning: categorization.reasoning
      })
      
      console.log(`✓ ${part.partNumber} (${part.manufacturer})`)
      console.log(`  → Category: ${categorization.category}${categorization.subcategory ? ` / ${categorization.subcategory}` : ''}`)
      console.log(`  → Reasoning: ${categorization.reasoning}\n`)
    } else {
      console.log(`✗ ${part.partNumber} (${part.manufacturer})`)
      console.log(`  → Could not determine category automatically`)
      console.log(`  → Description: ${part.description || 'N/A'}\n`)
    }
  }

  console.log(`\nReady to update ${updates.length} parts.`)
  console.log('Review the categorizations above.')
  console.log('\nTo apply updates, I will create an API endpoint or update script.')
  
  // Apply updates directly
  if (updates.length > 0) {
    console.log('\nApplying updates to database...')
    for (const update of updates) {
      await prisma.part.update({
        where: { id: update.id },
        data: {
          category: update.category,
          subcategory: update.subcategory
        }
      })
    }
    console.log(`✓ Successfully updated ${updates.length} parts!`)
  }
}

// Function to apply the updates
export async function applyUpdates() {
  // This would be called separately after review
  // Implementation would update parts in database
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

