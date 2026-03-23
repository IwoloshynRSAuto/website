/**
 * Shared geolocation utilities for clock-in and clock-out
 */

export interface LocationData {
  lat: number
  lon: number
  accuracy: number
}

/**
 * Patches clock-in geolocation to a timesheet
 * Returns true if successful, false otherwise
 */
export async function patchClockInGeolocation(
  timesheetId: string,
  locationData: LocationData
): Promise<boolean> {
  if (!timesheetId) {
    console.error('[patchClockInGeolocation] ❌ No timesheet ID provided')
    return false
  }

  try {
    console.log('[patchClockInGeolocation] Patching geolocation to timesheet:', timesheetId)
    const geoResponse = await fetch(`/api/timesheets/${timesheetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geoLat: locationData.lat,
        geoLon: locationData.lon,
        geoAccuracy: locationData.accuracy,
      })
    })

    if (!geoResponse.ok) {
      const errorText = await geoResponse.text()
      console.error('[patchClockInGeolocation] ❌ PATCH failed:', geoResponse.status, errorText)
      return false
    }

    const geoResponseData = await geoResponse.json()
    console.log('[patchClockInGeolocation] ✅ PATCH response received:', geoResponseData)

    // Verify the write by fetching the timesheet
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for DB to update
    
    const verifyResponse = await fetch(`/api/timesheets/${timesheetId}`)
    if (!verifyResponse.ok) {
      console.error('[patchClockInGeolocation] ❌ Verification fetch failed:', verifyResponse.status)
      return false
    }

    const verifyData = await verifyResponse.json()
    const saved = verifyData.data || verifyData
    
    if (saved?.geoLat && saved?.geoLon) {
      console.log('[patchClockInGeolocation] ✅✅✅ VERIFIED: Geolocation saved to database:', {
        geoLat: saved.geoLat,
        geoLon: saved.geoLon,
        geoAccuracy: saved.geoAccuracy
      })
      return true
    } else {
      console.error('[patchClockInGeolocation] ❌❌❌ VERIFICATION FAILED: Geolocation not found in database!')
      console.error('[patchClockInGeolocation] Saved object:', JSON.stringify(saved, null, 2))
      return false
    }
  } catch (error: any) {
    console.error('[patchClockInGeolocation] ❌ Exception:', error)
    return false
  }
}

/**
 * Patches clock-out geolocation to a timesheet
 * Returns true if successful, false otherwise
 */
export async function patchClockOutGeolocation(
  timesheetId: string,
  locationData: LocationData
): Promise<boolean> {
  if (!timesheetId) {
    console.error('[patchClockOutGeolocation] ❌ No timesheet ID provided')
    return false
  }

  try {
    console.log('[patchClockOutGeolocation] Patching geolocation to timesheet:', timesheetId)
    const geoResponse = await fetch(`/api/timesheets/${timesheetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clockOutGeoLat: locationData.lat,
        clockOutGeoLon: locationData.lon,
        clockOutGeoAccuracy: locationData.accuracy,
      })
    })

    if (!geoResponse.ok) {
      const errorText = await geoResponse.text()
      console.error('[patchClockOutGeolocation] ❌ PATCH failed:', geoResponse.status, errorText)
      return false
    }

    const geoResponseData = await geoResponse.json()
    console.log('[patchClockOutGeolocation] ✅ PATCH response received:', geoResponseData)

    // Verify the write by fetching the timesheet
    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for DB to update
    
    const verifyResponse = await fetch(`/api/timesheets/${timesheetId}`)
    if (!verifyResponse.ok) {
      console.error('[patchClockOutGeolocation] ❌ Verification fetch failed:', verifyResponse.status)
      return false
    }

    const verifyData = await verifyResponse.json()
    const saved = verifyData.data || verifyData
    
    if (saved?.clockOutGeoLat && saved?.clockOutGeoLon) {
      console.log('[patchClockOutGeolocation] ✅✅✅ VERIFIED: Geolocation saved to database:', {
        clockOutGeoLat: saved.clockOutGeoLat,
        clockOutGeoLon: saved.clockOutGeoLon,
        clockOutGeoAccuracy: saved.clockOutGeoAccuracy
      })
      return true
    } else {
      console.error('[patchClockOutGeolocation] ❌❌❌ VERIFICATION FAILED: Geolocation not found in database!')
      console.error('[patchClockOutGeolocation] Saved object:', JSON.stringify(saved, null, 2))
      return false
    }
  } catch (error: any) {
    console.error('[patchClockOutGeolocation] ❌ Exception:', error)
    return false
  }
}


