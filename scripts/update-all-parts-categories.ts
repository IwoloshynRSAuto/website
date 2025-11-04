import { prisma } from '../lib/prisma'

// Import the categorization logic
function categorizePart(part: { partNumber: string; manufacturer: string; description: string | null }): { category: string; subcategory?: string } | null {
  const partNum = part.partNumber.toLowerCase()
  const manufacturer = part.manufacturer.toLowerCase()
  const description = (part.description || '').toLowerCase()

  const searchText = `${partNum} ${manufacturer} ${description}`

  // PLC
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
      category: 'PLC',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 
                   (partNum.includes('1756') ? 'ControlLogix' : 
                    partNum.startsWith('2080') ? 'Micro800' : 
                    partNum.includes('1769') ? 'CompactLogix' : 'Allen-Bradley') : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
    }
  }

  // HMI
  if (
    searchText.includes('hmi') ||
    searchText.includes('panelview') ||
    searchText.includes('touchscreen') ||
    searchText.includes('operator interface') ||
    partNum.includes('2711') ||
    partNum.includes('6av') ||
    manufacturer.includes('red lion') ||
    manufacturer.includes('proface')
  ) {
    return {
      category: 'HMI',
      subcategory: manufacturer.includes('allen') || manufacturer.includes('bradley') ? 'PanelView' : undefined,
    }
  }

  // Drive
  if (
    searchText.includes('drive') ||
    searchText.includes('vfd') ||
    searchText.includes('variable frequency') ||
    searchText.includes('servo') ||
    searchText.includes('inverter') ||
    searchText.includes('soft starter') ||
    searchText.includes('smc-flex') ||
    partNum.includes('powerflex') ||
    partNum.startsWith('20g') ||
    partNum.startsWith('25-') ||
    partNum.includes('525') ||
    partNum.includes('755') ||
    partNum.includes('g15') ||
    partNum.includes('150-f') ||
    partNum.includes('6se') ||
    partNum.startsWith('acs880') ||
    partNum.startsWith('acs') ||
    manufacturer.includes('danfoss') && (partNum.includes('vlt') || partNum.includes('fc')) ||
    manufacturer.includes('abb') && (searchText.includes('drive') || searchText.includes('inverter'))
  ) {
    return {
      category: 'Drive',
      subcategory: (partNum.includes('powerflex') || partNum.startsWith('20g') || partNum.includes('755') || partNum.includes('525') || (manufacturer.includes('allen') || manufacturer.includes('bradley'))) ? 
                   (partNum.includes('755') || partNum.startsWith('20g') ? 'PowerFlex 755' :
                    partNum.includes('525') || partNum.startsWith('25-') ? 'PowerFlex 525' :
                    partNum.includes('150-f') ? 'Soft Starter' : 'PowerFlex') : 
                   (manufacturer.includes('abb') || partNum.startsWith('acs')) ? 'ABB' :
                   manufacturer.includes('danfoss') ? 'VLT' :
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
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
      category: 'Motor Circuit Breaker',
      subcategory: manufacturer.includes('eaton') ? 'Eaton' : 
                   (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 'Allen-Bradley' : undefined,
    }
  }

  // Eaton Breakers
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
      partNum.startsWith('pdg')
    )
  ) {
    return {
      category: 'Eaton Breakers',
      subcategory: (searchText.includes('molded case') || partNum.includes('140g-k') || partNum.startsWith('pdg')) ? 'MCCB' : 
                   searchText.includes('miniature') ? 'MCB' : undefined,
    }
  }

  // Contactor
  if (
    searchText.includes('contactor') ||
    partNum.startsWith('100-') ||
    partNum.startsWith('100s-') ||
    partNum.startsWith('200-') ||
    partNum.includes('3tb') ||
    manufacturer.includes('telemecanique') ||
    manufacturer.includes('schneider') && searchText.includes('contactor')
  ) {
    return {
      category: 'Contactor',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 'Allen-Bradley' : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
    }
  }

  // Relays
  if (
    searchText.includes('relay') ||
    partNum.includes('700-') ||
    partNum.includes('3rh') ||
    manufacturer.includes('omron') && searchText.includes('relay')
  ) {
    return {
      category: 'Relays',
      subcategory: manufacturer.includes('allen') || manufacturer.includes('bradley') ? 'Allen-Bradley' : undefined,
    }
  }

  // IO
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
    partNum.includes('1734') ||
    partNum.startsWith('1794-') ||
    partNum.startsWith('2080-mot-') ||
    (partNum.includes('1769') && (partNum.includes('iq') || partNum.includes('ob') || partNum.includes('if') || partNum.includes('ie') || partNum.includes('oe'))) ||
    (partNum.includes('1756') && (partNum.includes('ib') || partNum.includes('ob') || partNum.includes('if') || partNum.includes('of') || partNum.includes('ie') || partNum.includes('oe'))) ||
    partNum.includes('6es7') && (partNum.includes('32') || partNum.includes('33')) ||
    manufacturer.includes('phoenix contact') && searchText.includes('io')
  ) {
    return {
      category: 'IO',
      subcategory: (manufacturer.includes('allen') || manufacturer.includes('bradley')) ? 
                   (partNum.startsWith('1794') ? 'FLEX I/O' : 
                    partNum.startsWith('1734') ? 'Point I/O' : 
                    partNum.startsWith('2080-mot') ? 'Micro800 Module' :
                    partNum.includes('1756') ? 'ControlLogix I/O' : 'Allen-Bradley') : 
                   manufacturer.includes('siemens') ? 'Siemens' : undefined,
    }
  }

  // Power Supply
  if (
    searchText.includes('power supply') ||
    searchText.includes('psu') ||
    searchText.includes('24v') && searchText.includes('power') ||
    partNum.includes('1606-') ||
    partNum.includes('6ep1') ||
    manufacturer.includes('phoenix contact') && (partNum.includes('quint') || searchText.includes('power'))
  ) {
    return {
      category: 'Power Supply',
      subcategory: manufacturer.includes('allen') || manufacturer.includes('bradley') ? 'Allen-Bradley' : 
                   manufacturer.includes('siemens') ? 'Siemens' : 
                   manufacturer.includes('phoenix contact') ? 'Phoenix Contact' : undefined,
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
      category: 'Terminals',
      subcategory: manufacturer.includes('phoenix contact') ? 'Phoenix Contact' : 
                   manufacturer.includes('weidmuller') ? 'Weidmuller' : 
                   manufacturer.includes('wago') ? 'Wago' :
                   manufacturer.includes('ilsco') ? 'ILSCO' :
                   manufacturer.includes('edison') ? 'Edison' :
                   (manufacturer.includes('eaton') && partNum.startsWith('z-')) ? 'Eaton' : undefined,
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
      category: 'Transformers',
      subcategory: searchText.includes('control') ? 'Control Transformer' : undefined,
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
      category: 'Panels',
      subcategory: searchText.includes('control panel') ? 'Control Panel' : 
                   (searchText.includes('enclosure') || searchText.includes('consolet')) ? 'Enclosure' :
                   (searchText.includes('air conditioner') || searchText.includes('btu')) ? 'Climate Control' : undefined,
    }
  }

  // Panel Build
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
    partNum.includes('199-') ||
    partNum.includes('1492-') ||
    partNum.includes('1756-a') ||
    partNum.includes('1756-n') ||
    partNum.includes('194l-') ||
    partNum.includes('194u-') ||
    partNum.startsWith('800f-') ||
    partNum.startsWith('800fm-') ||
    partNum.startsWith('800fp-') ||
    partNum.includes('440l-') ||
    partNum.includes('440c-') ||
    partNum.startsWith('931n-') ||
    partNum.startsWith('air-fit') ||
    partNum.startsWith('acs') && !searchText.includes('drive') ||
    partNum.startsWith('c2') ||
    partNum.startsWith('f2x') ||
    partNum.startsWith('ccp') ||
    partNum.startsWith('cs-') ||
    partNum.startsWith('k50') ||
    partNum.startsWith('9324-') ||
    partNum.startsWith('9355-') ||
    partNum.startsWith('9701m-') ||
    partNum.startsWith('dr45') ||
    partNum.startsWith('control-valve') ||
    partNum.startsWith('ms') && manufacturer.includes('cisco') ||
    partNum.startsWith('pbc')
  ) {
    return {
      category: 'Panel Build',
      subcategory: (searchText.includes('wire') || searchText.includes('cable') || searchText.includes('wiring duct') || searchText.includes('panduct') || partNum.startsWith('c2') || partNum.startsWith('f2x')) ? 'Wire/Cable' :
                   (searchText.includes('fuse') || searchText.includes('class cc') || searchText.includes('bussmann') || partNum.startsWith('ccp')) ? 'Fuse' :
                   searchText.includes('disconnect') ? 'Disconnect Switch' :
                   searchText.includes('din rail') || partNum.includes('199-') || partNum.includes('1492-') ? 'DIN Rail' :
                   searchText.includes('chassis') || partNum.includes('1756-a') ? 'Chassis' :
                   searchText.includes('auxiliary') || searchText.includes('aux contact') || searchText.includes('contact') || partNum.includes('194') || partNum.includes('pec') || partNum.startsWith('931n-') ? 'Accessories' :
                   (searchText.includes('push button') || searchText.includes('selector') || searchText.includes('indicator') || searchText.includes('legend') || partNum.startsWith('800f-') || searchText.includes('e-stop') || searchText.includes('emergency stop') || partNum.startsWith('k50')) ? 'Controls' :
                   searchText.includes('safety') || searchText.includes('light curtain') || partNum.includes('440l-') ? 'Safety' :
                   (searchText.includes('ethernet') || partNum.includes('440c-') || partNum.includes('20-750-') || (partNum.startsWith('ms') && manufacturer.includes('cisco'))) ? 'Communications' :
                   (searchText.includes('air') || searchText.includes('pneumatic') || searchText.includes('hydraulic') || searchText.includes('control valve') || searchText.includes('solenoid') || searchText.includes('manifold') || searchText.includes('vacuum') || partNum.startsWith('air-fit') || partNum.startsWith('cs-') || partNum.startsWith('control-valve') || partNum.startsWith('vac-')) ? 'Pneumatic/Hydraulic' :
                   (searchText.includes('modular base') || searchText.includes('base plate') || partNum.startsWith('vnt-')) ? 'Hardware' :
                   (searchText.includes('chart recorder') || searchText.includes('truline') || partNum.startsWith('dr45')) ? 'Instrumentation' :
                   (searchText.includes('studio 5000') || searchText.includes('rslinx') || searchText.includes('factorytalk') || partNum.startsWith('9324-') || partNum.startsWith('9355-') || partNum.startsWith('9701m-')) ? 'Software' :
                   (manufacturer.includes('eaton') && partNum.startsWith('z-') && searchText.includes('aux')) ? 'Accessories' : undefined,
    }
  }

  return null
}

async function main() {
  console.log('Fetching ALL parts to update categories...\n')

  // Get ALL parts
  const allParts = await prisma.part.findMany({
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

  console.log(`Found ${allParts.length} parts to process\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const part of allParts) {
    const categorization = categorizePart(part)
    
    if (categorization) {
      // Check if update is needed
      const needsUpdate = 
        part.category !== categorization.category ||
        part.subcategory !== categorization.subcategory

      if (needsUpdate) {
        try {
          await prisma.part.update({
            where: { id: part.id },
            data: {
              category: categorization.category,
              subcategory: categorization.subcategory || null
            }
          })
          updated++
          if (updated % 100 === 0) {
            console.log(`Updated ${updated} parts...`)
          }
        } catch (error) {
          console.error(`Error updating ${part.partNumber}:`, error)
          errors++
        }
      } else {
        skipped++
      }
    } else {
      // Part couldn't be categorized - only update if it currently has a category (shouldn't happen)
      if (part.category) {
        console.log(`⚠ Could not categorize ${part.partNumber} but it has category: ${part.category}`)
      }
      skipped++
    }
  }

  console.log(`\n✓ Completed!`)
  console.log(`  Updated: ${updated} parts`)
  console.log(`  Skipped (already correct): ${skipped} parts`)
  console.log(`  Errors: ${errors} parts`)
  
  // Verify final counts
  const total = await prisma.part.count()
  const withCategory = await prisma.part.count({
    where: {
      AND: [
        { category: { not: null } },
        { category: { not: '' } }
      ]
    }
  })

  console.log(`\nFinal status:`)
  console.log(`  Total parts: ${total}`)
  console.log(`  With category: ${withCategory} (${((withCategory / total) * 100).toFixed(1)}%)`)

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

