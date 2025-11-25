/**
 * AI Queue Service
 * Ensures only one AI operation runs at a time to prevent concurrent API calls
 */

let operationLock = null;
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Acquire lock for AI operation
 * @returns {Promise<{acquired: boolean, reason?: string}>}
 */
export async function acquireLock() {
    // Check if lock exists and is still valid
    if (operationLock) {
        const lockAge = Date.now() - operationLock.timestamp;
        
        // If lock is expired, release it
        if (lockAge > LOCK_TIMEOUT) {
            console.log('[AI Queue] Lock expired, releasing');
            operationLock = null;
        } else {
            return {
                acquired: false,
                reason: `AI operation already in progress (started ${Math.round(lockAge / 1000)}s ago)`,
            };
        }
    }
    
    // Acquire lock
    operationLock = {
        timestamp: Date.now(),
        id: Math.random().toString(36).substring(7),
    };
    
    console.log('[AI Queue] Lock acquired:', operationLock.id);
    return { acquired: true, lockId: operationLock.id };
}

/**
 * Release lock for AI operation
 * @param {string} lockId - Optional lock ID to verify
 * @returns {boolean} Success
 */
export function releaseLock(lockId = null) {
    if (!operationLock) {
        console.warn('[AI Queue] Attempted to release lock but no lock exists');
        return false;
    }
    
    // If lockId provided, verify it matches
    if (lockId && operationLock.id !== lockId) {
        console.warn('[AI Queue] Lock ID mismatch, not releasing');
        return false;
    }
    
    const lockAge = Date.now() - operationLock.timestamp;
    console.log(`[AI Queue] Lock released: ${operationLock.id} (held for ${Math.round(lockAge / 1000)}s)`);
    
    operationLock = null;
    return true;
}

/**
 * Check if lock is currently held
 * @returns {boolean}
 */
export function isLocked() {
    if (!operationLock) {
        return false;
    }
    
    const lockAge = Date.now() - operationLock.timestamp;
    
    // If lock is expired, clear it
    if (lockAge > LOCK_TIMEOUT) {
        operationLock = null;
        return false;
    }
    
    return true;
}

/**
 * Get lock status (for debugging)
 * @returns {{locked: boolean, age?: number, id?: string}}
 */
export function getLockStatus() {
    if (!operationLock) {
        return { locked: false };
    }
    
    const lockAge = Date.now() - operationLock.timestamp;
    
    if (lockAge > LOCK_TIMEOUT) {
        operationLock = null;
        return { locked: false };
    }
    
    return {
        locked: true,
        age: lockAge,
        id: operationLock.id,
    };
}

export default {
    acquireLock,
    releaseLock,
    isLocked,
    getLockStatus,
};

