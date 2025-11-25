import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { analyzeImagesStub, generateDescriptionStub } from './aiServiceStub.js';
import { checkDailyLimits, trackAICost, getCostEstimate } from './aiCostService.js';
import { acquireLock, releaseLock } from './aiQueueService.js';
import { findComparableItems } from './ebayMarketService.js';

// Check if AI is enabled (set ENABLE_REAL_AI=true to use real OpenAI)
const USE_REAL_AI = process.env.ENABLE_REAL_AI === 'true' && process.env.OPENAI_API_KEY;

const openai = USE_REAL_AI ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Generate listing title from product information
 */
function generateListingTitle(brand, itemType, condition) {
    const conditionMap = {
        'new': 'New',
        'like_new': 'Like New',
        'good': 'Used - Good',
        'fair': 'Used - Fair',
        'for_parts': 'For Parts/Repair'
    };
    
    const conditionText = conditionMap[condition] || 'Used';
    const parts = [brand, itemType].filter(Boolean);
    
    if (parts.length === 0) {
        return 'Product Listing';
    }
    
    return `${parts.join(' ')} — ${conditionText}`;
}

/**
 * Generate bullet points from product information
 */
function generateBullets(brand, model, itemSpecifics, condition) {
    const bullets = [];
    
    if (brand) {
        bullets.push(`Brand: ${brand}`);
    }
    
    if (model) {
        bullets.push(`Model: ${model}`);
    }
    
    if (itemSpecifics) {
        const specifics = typeof itemSpecifics === 'string' ? JSON.parse(itemSpecifics) : itemSpecifics;
        
        if (specifics.color) {
            bullets.push(`Color: ${specifics.color}`);
        }
        
        if (specifics.material) {
            bullets.push(`Material: ${specifics.material}`);
        }
        
        if (specifics.size) {
            bullets.push(`Size: ${specifics.size}`);
        }
        
        if (specifics.features && Array.isArray(specifics.features) && specifics.features.length > 0) {
            bullets.push(`Features: ${specifics.features.join(', ')}`);
        }
    }
    
    const conditionMap = {
        'new': 'Condition: New - Never used',
        'like_new': 'Condition: Like New - Minimal wear',
        'good': 'Condition: Good - Shows some wear but fully functional',
        'fair': 'Condition: Fair - Shows wear, may have minor issues',
        'for_parts': 'Condition: For Parts/Repair - Not working or significant damage'
    };
    
    if (condition) {
        bullets.push(conditionMap[condition] || `Condition: ${condition}`);
    }
    
    return bullets;
}

/**
 * Build comprehensive description
 */
function buildDescription(brand, model, itemType, condition, itemSpecifics, features) {
    const conditionMap = {
        'new': 'This item is brand new and has never been used.',
        'like_new': 'This item is in like-new condition with minimal to no signs of wear.',
        'good': 'This item is in good condition and shows some signs of normal wear but is fully functional.',
        'fair': 'This item is in fair condition and shows visible wear. It may have minor cosmetic issues but is functional.',
        'for_parts': 'This item is being sold for parts or repair. It is not working or has significant damage.'
    };
    
    let description = '';
    
    if (brand && itemType) {
        description += `This is a ${brand} ${itemType}`;
        if (model) {
            description += ` (Model: ${model})`;
        }
        description += '. ';
    } else if (itemType) {
        description += `This ${itemType} `;
    } else {
        description += 'This item ';
    }
    
    if (itemSpecifics) {
        const specifics = typeof itemSpecifics === 'string' ? JSON.parse(itemSpecifics) : itemSpecifics;
        if (specifics.color) {
            description += `It features a ${specifics.color} color scheme. `;
        }
        if (specifics.material) {
            description += `Made from ${specifics.material}. `;
        }
    }
    
    if (condition && conditionMap[condition]) {
        description += conditionMap[condition] + ' ';
    }
    
    if (features && Array.isArray(features) && features.length > 0) {
        description += `Key features include: ${features.slice(0, 3).join(', ')}. `;
    }
    
    description += 'Perfect for anyone looking for a quality item at a great price.';
    
    return description.trim();
}

/**
 * Extract SEO keywords from analysis
 */
function extractKeywords(brand, model, itemType, category, itemSpecifics) {
    const keywords = [];
    
    if (brand) keywords.push(brand);
    if (model) keywords.push(model);
    if (itemType) keywords.push(itemType);
    if (category) {
        const parts = category.split('>').map(p => p.trim());
        keywords.push(...parts);
    }
    
    if (itemSpecifics) {
        const specifics = typeof itemSpecifics === 'string' ? JSON.parse(itemSpecifics) : itemSpecifics;
        if (specifics.color) keywords.push(specifics.color);
        if (specifics.material) keywords.push(specifics.material);
        if (specifics.features) {
            keywords.push(...(Array.isArray(specifics.features) ? specifics.features : []));
        }
    }
    
    // Remove duplicates and empty values
    return [...new Set(keywords.filter(k => k && k.trim()))];
}

/**
 * Suggest additional photos based on what's missing
 */
function suggestPhotos(itemType, itemSpecifics, currentImageCount) {
    const suggestions = [];
    
    if (currentImageCount < 2) {
        suggestions.push('Close-up of product label or branding');
        suggestions.push('Different angle view');
    }
    
    if (itemSpecifics) {
        const specifics = typeof itemSpecifics === 'string' ? JSON.parse(itemSpecifics) : itemSpecifics;
        if (specifics.size) {
            suggestions.push('Photo showing size/scale (with ruler or common object for reference)');
        }
    }
    
    suggestions.push('Photo of any accessories or original packaging if included');
    suggestions.push('Photo highlighting any notable features or condition details');
    
    return suggestions.slice(0, 5);
}

/**
 * Comprehensive image analysis using OpenAI Vision API
 * Returns full listing data with market pricing
 * @param {string[]} imagePaths - Array of image file paths
 * @param {number|null} listingId - Optional listing ID for cost tracking
 * @returns {Promise<Object>} Comprehensive analysis result
 */
export async function analyzeImages(imagePaths, listingId = null) {
    if (!imagePaths || imagePaths.length === 0) {
        throw new Error('No images provided for analysis');
    }

    // Use stub if real AI is not enabled
    if (!USE_REAL_AI) {
        console.log('[AI] Using stub analysis - real AI not connected');
        const analysis = await analyzeImagesStub(imagePaths);
        return { analysis, cost: null };
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
        // Convert local images to base64
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

        const prompt = `You are an expert product analyst for eBay listings. Analyze these product images thoroughly and provide comprehensive, accurate information in JSON format.

CRITICAL: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

{
  "brand": "exact brand name if clearly visible (e.g., 'Apple', 'Samsung', 'Nike'), or null if not visible",
  "model": "exact model number or name if visible (e.g., 'iPhone 13', 'Galaxy S21'), or null",
  "itemType": "specific product type (e.g., 'Smartphone', 'Laptop Computer', 'Wireless Headphones', 'Digital Camera', 'Gaming Console')",
  "category": {
    "main": "main eBay category (e.g., 'Electronics', 'Clothing', 'Home & Garden')",
    "subcategory": "specific subcategory if applicable"
  },
  "condition": "one of: new, like_new, good, fair, for_parts - be honest based on visible wear/damage",
  "conditionDetails": "specific observable details about condition, wear, scratches, damage, functionality",
  "itemSpecifics": {
    "color": "primary color(s) visible (e.g., 'Black', 'Silver', 'Red and Blue')",
    "material": "material if clearly visible (e.g., 'Plastic', 'Metal', 'Leather', 'Fabric')",
    "size": "size or dimensions if determinable from images",
    "features": ["specific feature 1", "specific feature 2", "specific feature 3"]
  },
  "description": "Write a compelling 3-5 sentence product description for eBay. Include: what the item is, key features, condition assessment, and why someone would want it. Be honest and persuasive.",
  "keywords": ["brand keyword", "model keyword", "item type keyword", "color keyword", "feature keyword"]
}

Return ONLY the JSON object, nothing else.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert product analyst specializing in eBay listings. Analyze product images thoroughly and provide accurate, detailed information.'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        ...imageContents
                    ]
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });

        // Extract token usage
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        const content = response.choices[0].message.content;

        // Parse JSON from response
        let aiAnalysis;
        try {
            // Try to extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
            const jsonString = jsonMatch ? jsonMatch[1] : content.trim();
            
            // Remove any leading/trailing whitespace and try to parse
            const cleanedJson = jsonString.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '');
            aiAnalysis = JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error('[AI] Failed to parse AI response. Raw content:', content.substring(0, 500));
            console.error('[AI] Parse error:', parseError.message);
            throw new Error(`Failed to parse AI analysis response: ${parseError.message}`);
        }

        // Extract data
        const brand = aiAnalysis.brand || null;
        const model = aiAnalysis.model || null;
        const itemType = aiAnalysis.itemType || 'Product';
        const condition = aiAnalysis.condition || 'good';
        const itemSpecifics = aiAnalysis.itemSpecifics || {};
        const features = itemSpecifics.features || [];

        // Generate title
        const title = generateListingTitle(brand, itemType, condition);

        // Generate bullets
        const bullets = generateBullets(brand, model, itemSpecifics, condition);

        // Build description
        const description = buildDescription(brand, model, itemType, condition, itemSpecifics, features);

        // Extract keywords
        const seoKeywords = extractKeywords(brand, model, itemType, 
            aiAnalysis.category ? `${aiAnalysis.category.main}${aiAnalysis.category.subcategory ? ' > ' + aiAnalysis.category.subcategory : ''}` : null,
            itemSpecifics);

        // Get market data and pricing (DISABLED for now - user doesn't have eBay credentials yet)
        const ENABLE_EBAY_MARKET_DATA = process.env.ENABLE_EBAY_MARKET_DATA === 'true';
        
        let marketData = { pricing: { low: 0, median: 0, high: 0, recommended: 0, count: 0 }, samples: [] };
        let pricingDisplay = 'Price analysis unavailable';
        let pricingReason = 'eBay market data integration is disabled. Enable it in backend/.env with ENABLE_EBAY_MARKET_DATA=true';

        if (ENABLE_EBAY_MARKET_DATA && (brand || itemType)) {
            try {
                marketData = await findComparableItems(brand, itemType, model);
                
                if (marketData.pricing.count > 0) {
                    const { low, median, high, recommended } = marketData.pricing;
                    pricingDisplay = `$${recommended.toFixed(2)} (Range: $${low.toFixed(2)} - $${high.toFixed(2)})`;
                    pricingReason = `Based on ${marketData.pricing.count} comparable sold listings, the recommended price is $${recommended.toFixed(2)}, which is competitive within the market range of $${low.toFixed(2)} to $${high.toFixed(2)}.`;
                } else {
                    pricingDisplay = 'Market data unavailable';
                    pricingReason = 'No comparable listings found. Consider researching similar items manually.';
                }
            } catch (marketError) {
                console.error('[AI] Market data error:', marketError);
                pricingReason = 'Market data search failed. Using AI-estimated pricing.';
            }
        } else {
            // Use AI's suggested price range if available
            if (aiAnalysis.suggestedPrice) {
                const { min, max } = aiAnalysis.suggestedPrice;
                const avgPrice = ((min + max) / 2).toFixed(2);
                pricingDisplay = `$${avgPrice} (AI Estimate: $${min.toFixed(2)} - $${max.toFixed(2)})`;
                pricingReason = `AI-estimated price based on product analysis. Research similar items on eBay for market validation.`;
            }
        }

        // Suggest additional photos
        const suggestedPhotos = suggestPhotos(itemType, itemSpecifics, imagePaths.length);

        // Build comprehensive result
        const comprehensiveResult = {
            title,
            description,
            bullets,
            pricing: {
                display: pricingDisplay,
                reason: pricingReason
            },
            marketSamples: marketData.samples,
            seoKeywords,
            suggestedPhotos,
            // Debug/Insight section - shows what AI is thinking (can be removed later)
            aiInsights: {
                rawAnalysis: {
                    brand: brand,
                    model: model,
                    itemType: itemType,
                    condition: condition,
                    conditionDetails: aiAnalysis.conditionDetails || null,
                    category: aiAnalysis.category ? {
                        main: aiAnalysis.category.main,
                        subcategory: aiAnalysis.category.subcategory
                    } : null,
                    itemSpecifics: itemSpecifics,
                    confidence: aiAnalysis.category?.confidence || 0.9
                },
                reasoning: `AI detected this as a ${itemType}${brand ? ` from ${brand}` : ''}${model ? ` (${model})` : ''} in ${condition} condition. ${aiAnalysis.conditionDetails || 'No specific condition details noted.'}`
            }
        };

        // Also return legacy format for compatibility
        const categoryFull = aiAnalysis.category 
            ? `${aiAnalysis.category.main}${aiAnalysis.category.subcategory ? ' > ' + aiAnalysis.category.subcategory : ''}`
            : null;

        const legacyAnalysis = {
            title,
            description,
            brand,
            model,
            category: categoryFull,
            itemSpecifics: JSON.stringify(itemSpecifics),
            confidenceScore: 0.9,
            keywords: seoKeywords,
            condition,
            analyzedAt: new Date()
        };

        // Track cost
        const costInfo = await trackAICost('analyze', inputTokens, outputTokens, listingId);

        // Release lock
        releaseLock(lockId);

        return {
            analysis: legacyAnalysis,
            comprehensive: comprehensiveResult,
            cost: costInfo
        };
    } catch (error) {
        // Release lock on error
        if (lockId) {
            releaseLock(lockId);
        }
        console.error('AI Analysis Error:', error);
        throw new Error(`AI analysis failed: ${error.message}`);
    }
}

/**
 * Generate enhanced description using GPT-4 (or stub if not enabled)
 * @param {Object} productInfo - Product information
 * @param {number|null} listingId - Optional listing ID for cost tracking
 * @returns {Promise<{description: string, cost?: Object}>}
 */
export async function generateDescription(productInfo, listingId = null) {
    // Use stub if real AI is not enabled
    if (!USE_REAL_AI) {
        console.log('[AI] Using stub description - real AI not connected');
        const description = await generateDescriptionStub(productInfo);
        return { description, cost: null };
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
        const prompt = `Create a compelling eBay listing description for:
Product: ${productInfo.title || 'Unknown Product'}
Brand: ${productInfo.brand || 'N/A'}
Model: ${productInfo.model || 'N/A'}
Condition: ${productInfo.condition || 'N/A'}
Features: ${JSON.stringify(productInfo.features || [])}

Write a professional, engaging description that:
1. Highlights key features and benefits
2. Describes the condition honestly
3. Includes relevant specifications
4. Uses persuasive language
5. Is 150-250 words

Format with short paragraphs for easy reading.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert eBay listing writer who creates compelling, honest product descriptions that drive sales.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.8
        });

        // Extract token usage
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        const description = response.choices[0].message.content.trim();

        // Track cost
        const costInfo = await trackAICost('description', inputTokens, outputTokens, listingId);

        // Release lock
        releaseLock(lockId);

        return {
            description,
            cost: costInfo
        };
    } catch (error) {
        // Release lock on error
        if (lockId) {
            releaseLock(lockId);
        }
        console.error('Description Generation Error:', error);
        throw new Error(`Description generation failed: ${error.message}`);
    }
}

export default {
    analyzeImages,
    generateDescription
};
