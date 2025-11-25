import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// GPT-4o pricing (as of 2024)
const PRICING = {
    input: 2.50 / 1000000,  // $2.50 per 1M input tokens
    output: 10.00 / 1000000, // $10.00 per 1M output tokens
};

/**
 * Get or create AI settings (singleton)
 */
async function getAISettings() {
    let settings = await prisma.aISettings.findFirst();
    
    if (!settings) {
        settings = await prisma.aISettings.create({
            data: {
                dailyTokenLimit: parseInt(process.env.AI_DAILY_TOKEN_LIMIT) || 100000,
                dailyCostLimit: parseFloat(process.env.AI_DAILY_COST_LIMIT) || 5.00,
                maxConcurrentOperations: parseInt(process.env.AI_MAX_CONCURRENT) || 1,
                currentDailyTokens: 0,
                currentDailyCost: 0.0,
                lastResetDate: new Date(),
            },
        });
    }
    
    return settings;
}

/**
 * Reset daily counters if it's a new day
 */
async function resetDailyCounters() {
    const settings = await getAISettings();
    const now = new Date();
    const lastReset = new Date(settings.lastResetDate);
    
    // Check if it's a new day (compare dates, not times)
    const isNewDay = 
        now.getFullYear() !== lastReset.getFullYear() ||
        now.getMonth() !== lastReset.getMonth() ||
        now.getDate() !== lastReset.getDate();
    
    if (isNewDay) {
        await prisma.aISettings.update({
            where: { id: settings.id },
            data: {
                currentDailyTokens: 0,
                currentDailyCost: 0.0,
                lastResetDate: now,
            },
        });
        console.log('[AI Cost] Daily counters reset');
    }
}

/**
 * Check if daily limits are exceeded
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkDailyLimits() {
    await resetDailyCounters();
    
    const settings = await getAISettings();
    
    if (settings.currentDailyTokens >= settings.dailyTokenLimit) {
        return {
            allowed: false,
            reason: `Daily token limit exceeded (${settings.currentDailyTokens}/${settings.dailyTokenLimit})`,
        };
    }
    
    if (settings.currentDailyCost >= settings.dailyCostLimit) {
        return {
            allowed: false,
            reason: `Daily cost limit exceeded ($${settings.currentDailyCost.toFixed(2)}/$${settings.dailyCostLimit.toFixed(2)})`,
        };
    }
    
    return { allowed: true };
}

/**
 * Calculate cost based on token usage
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Cost in USD
 */
export function calculateCost(inputTokens, outputTokens) {
    const inputCost = inputTokens * PRICING.input;
    const outputCost = outputTokens * PRICING.output;
    return inputCost + outputCost;
}

/**
 * Track AI cost for an operation
 * @param {string} operationType - 'analyze' or 'description'
 * @param {number} inputTokens - Input tokens used
 * @param {number} outputTokens - Output tokens used
 * @param {number|null} listingId - Optional listing ID
 * @returns {Promise<{cost: number, totalDailyCost: number, totalDailyTokens: number}>}
 */
export async function trackAICost(operationType, inputTokens, outputTokens, listingId = null) {
    await resetDailyCounters();
    
    const cost = calculateCost(inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;
    
    // Record the cost tracking entry
    await prisma.aICostTracking.create({
        data: {
            operationType,
            tokensUsed: totalTokens,
            costUSD: cost,
            listingId,
        },
    });
    
    // Update daily counters
    const settings = await getAISettings();
    const updated = await prisma.aISettings.update({
        where: { id: settings.id },
        data: {
            currentDailyTokens: {
                increment: totalTokens,
            },
            currentDailyCost: {
                increment: cost,
            },
        },
    });
    
    console.log(`[AI Cost] Tracked ${operationType}: ${totalTokens} tokens, $${cost.toFixed(4)}`);
    console.log(`[AI Cost] Daily totals: ${updated.currentDailyTokens} tokens, $${updated.currentDailyCost.toFixed(2)}`);
    
    return {
        cost,
        totalDailyCost: updated.currentDailyCost,
        totalDailyTokens: updated.currentDailyTokens,
    };
}

/**
 * Estimate cost for an operation before running it
 * @param {string} operationType - 'analyze' or 'description'
 * @param {number} imageCount - Number of images (for analyze operation)
 * @returns {Promise<{estimatedCost: number, estimatedTokens: number, canProceed: boolean, reason?: string}>}
 */
export async function getCostEstimate(operationType, imageCount = 0) {
    await resetDailyCounters();
    
    // Rough estimates based on typical usage
    let estimatedInputTokens = 0;
    let estimatedOutputTokens = 0;
    
    if (operationType === 'analyze') {
        // Image analysis: ~1000 tokens per image + prompt (~500 tokens)
        estimatedInputTokens = (imageCount * 1000) + 500;
        // Response: ~800 tokens for analysis
        estimatedOutputTokens = 800;
    } else if (operationType === 'description') {
        // Description generation: ~200 tokens input
        estimatedInputTokens = 200;
        // Response: ~300 tokens for description
        estimatedOutputTokens = 300;
    }
    
    const estimatedCost = calculateCost(estimatedInputTokens, estimatedOutputTokens);
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
    
    // Check if we can proceed
    const settings = await getAISettings();
    const canProceed = 
        (settings.currentDailyTokens + estimatedTotalTokens) <= settings.dailyTokenLimit &&
        (settings.currentDailyCost + estimatedCost) <= settings.dailyCostLimit;
    
    return {
        estimatedCost,
        estimatedTokens: estimatedTotalTokens,
        canProceed,
        reason: canProceed ? null : 'Would exceed daily limits',
    };
}

/**
 * Get current usage statistics
 * @returns {Promise<{dailyTokens: number, dailyCost: number, dailyLimit: number, costLimit: number, recentOperations: Array}>}
 */
export async function getUsageStats() {
    await resetDailyCounters();
    
    const settings = await getAISettings();
    
    // Get recent operations (last 10)
    const recentOperations = await prisma.aICostTracking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            operationType: true,
            tokensUsed: true,
            costUSD: true,
            listingId: true,
            createdAt: true,
        },
    });
    
    return {
        dailyTokens: settings.currentDailyTokens,
        dailyCost: settings.currentDailyCost,
        dailyTokenLimit: settings.dailyTokenLimit,
        dailyCostLimit: settings.dailyCostLimit,
        recentOperations,
    };
}

/**
 * Update AI settings (for admin use)
 */
export async function updateAISettings(updates) {
    const settings = await getAISettings();
    
    return await prisma.aISettings.update({
        where: { id: settings.id },
        data: updates,
    });
}

export default {
    checkDailyLimits,
    trackAICost,
    getCostEstimate,
    getUsageStats,
    calculateCost,
    updateAISettings,
    resetDailyCounters,
};

