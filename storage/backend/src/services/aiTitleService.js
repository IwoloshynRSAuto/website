import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { checkDailyLimits, trackAICost } from './aiCostService.js';
import { acquireLock, releaseLock } from './aiQueueService.js';

// Check if AI is enabled
const USE_REAL_AI = process.env.ENABLE_REAL_AI === 'true' && process.env.OPENAI_API_KEY;

const openai = USE_REAL_AI ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Generate ONLY a listing title from images using OpenAI Vision
 * @param {string[]} imagePaths - Array of image file paths
 * @param {number|null} listingId - Optional listing ID for cost tracking
 * @returns {Promise<{title: string, cost?: Object}>}
 */
export async function generateTitleFromImages(imagePaths, listingId = null) {
    if (!imagePaths || imagePaths.length === 0) {
        throw new Error('No images provided for analysis');
    }

    // Stub if real AI is not enabled
    if (!USE_REAL_AI) {
        console.log('[AI Title] Using stub - real AI not connected');
        return {
            title: 'Product Listing - AI Not Connected',
            cost: null
        };
    }

    // Check daily limits
    const limitCheck = await checkDailyLimits();
    if (!limitCheck.allowed) {
        throw new Error(`Daily limit exceeded: ${limitCheck.reason}`);
    }

    // Acquire queue lock
    const lockResult = await acquireLock();
    if (!lockResult.acquired) {
        throw new Error(`AI operation in progress: ${lockResult.reason}`);
    }

    let lockId = lockResult.lockId;

    try {
        // Convert images to base64 (max 4 images)
        const imageContents = await Promise.all(
            imagePaths.slice(0, 4).map(async (imagePath) => {
                const imageBuffer = await fs.readFile(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const ext = path.extname(imagePath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                return {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                };
            })
        );

        const prompt = `Analyze these product images and generate ONLY a clean eBay-style listing title.

CRITICAL REQUIREMENTS:
- Return ONLY the title text, nothing else
- Maximum 80 characters
- Format: Brand + Model + Key Features
- Include condition if visible (e.g., "(Needs Testing)", "(For Parts)")
- Be specific and accurate
- Use eBay title conventions (no special characters, concise)

EXAMPLES:
- "Dell OptiPlex 7090 SFF i7 16GB RAM 512GB SSD"
- "Apple iPhone 13 Pro Max 256GB Sierra Blue A2484"
- "HP LaserJet 4200 Printer (Needs Testing)"
- "Samsung Galaxy S21 5G 128GB Phantom Gray Unlocked"

Return ONLY the title text, no JSON, no markdown, no explanations.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at creating concise, accurate eBay listing titles. Generate only the title text, nothing else.'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        ...imageContents
                    ]
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        });

        // Extract token usage
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        // Get title from response (should be plain text)
        let title = response.choices[0].message.content.trim();
        
        // Clean up title (remove quotes, markdown, etc.)
        title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
        title = title.replace(/^#+\s*/, ''); // Remove markdown headers
        title = title.replace(/\*\*/g, ''); // Remove markdown bold
        title = title.trim();
        
        // Limit to 80 characters
        if (title.length > 80) {
            title = title.substring(0, 77) + '...';
        }

        // Track cost
        const costInfo = await trackAICost('generate_title', inputTokens, outputTokens, listingId);

        // Release lock
        releaseLock(lockId);

        return {
            title: title || 'Product Listing',
            cost: costInfo
        };
    } catch (error) {
        // Release lock on error
        if (lockId) {
            releaseLock(lockId);
        }
        console.error('[AI Title] Error:', error);
        throw new Error(`AI title generation failed: ${error.message}`);
    }
}

export default {
    generateTitleFromImages
};




