# AI Integration Setup (OpenAI)

Everything is already configured! Just add your API key and enable it.

## Quick Setup (2 Steps)

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you'll only see it once!)

### Step 2: Add to Your .env File

Add these 2 lines to your `backend/.env` file:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
ENABLE_REAL_AI=true
```

That's it! The AI will now work automatically.

## Cost Controls (Already Set Up)

The system has built-in cost controls to prevent runaway spending:

- **Daily Token Limit**: 100,000 tokens (default)
- **Daily Cost Limit**: $5.00 (default)
- **One Operation at a Time**: Prevents concurrent API calls

You can adjust these in your `.env` file:
```env
AI_DAILY_TOKEN_LIMIT=100000
AI_DAILY_COST_LIMIT=5.00
AI_MAX_CONCURRENT=1
```

## How It Works

1. **Image Analysis**: When you upload images, AI automatically analyzes them to detect:
   - Brand and model
   - Category
   - Condition
   - Item specifics (color, material, features)
   - Generates title and description

2. **Description Generation**: AI creates compelling eBay listing descriptions

3. **Cost Tracking**: Every operation is tracked and costs are logged

## Check Usage

You can check your AI usage anytime:
- **API Endpoint**: `GET http://192.168.10.70:5000/api/ai/usage`
- Shows daily tokens used, daily cost, and recent operations

## Pricing

Using GPT-4o:
- **Input**: $2.50 per 1M tokens
- **Output**: $10.00 per 1M tokens

Typical costs:
- Image analysis (4 images): ~$0.01-0.02
- Description generation: ~$0.005-0.01

## Troubleshooting

**"Daily limit exceeded" Error**
- Your daily limit was reached
- Limits reset at midnight
- Adjust `AI_DAILY_COST_LIMIT` or `AI_DAILY_TOKEN_LIMIT` in `.env` if needed

**"AI operation in progress" Error**
- Another AI operation is running
- Wait for it to complete (usually 5-30 seconds)

**"OpenAI API key not found" Error**
- Make sure `OPENAI_API_KEY` is set in your `.env` file
- Make sure `ENABLE_REAL_AI=true` is set
- Restart your backend server after adding the key

