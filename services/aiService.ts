import { requestAIText as generateText } from './aiTransport';
import { parseEvaluation, parseOutfits } from './aiValidation';

// Helper function to chunk text into words
const chunkTextIntoWords = (text: string): string[] => {
    return text.split(/\s+/).filter(word => word.length > 0);
};

// Helper function to simulate streaming with delays
const simulateStreaming = async (words: string[], onChunk: (chunk: string) => void) => {
    for (const word of words) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between words
        onChunk(word + ' '); // Add space after each word
    }
};

// Generate AI response with chat history
export const generateAIResponse = async (
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[],
    onChunk?: (chunk: string) => void
): Promise<string> => {
    try {
        // Create messages array with system message and chat history
        const messages: {role: 'system' | 'user' | 'assistant', content: string}[] = [
            {
                role: 'system',
                content: "You are a helpful, friendly, and knowledgeable AI assistant. " +
                    "Provide concise, accurate, and helpful responses. " +
                    "Be conversational but keep responses under 3 sentences unless more detail is needed."
            },
            ...chatHistory,
            { role: 'user', content: userMessage }
        ];

        // Generate complete response using messages
        const response = await generateText({
            messages: messages as any
        });

        if (onChunk) {
            const words = chunkTextIntoWords(response.text);
            await simulateStreaming(words, onChunk);
        }

        return response.text;
    } catch (error) {
        console.error("Error generating AI response:");
        throw new Error('Unable to connect to the AI service. Please try again.');
    }
};

// Generate outfit suggestions using AI
export const generateOutfitSuggestions = async (
    wardrobeItems: any[],
    userProfile?: any
): Promise<any[]> => {
    try {
        // Categorize wardrobe items for better AI understanding
        const categorizeItems = (items: any[]) => {
            const tops = items.filter(item =>
                ['T-Shirt', 'Blouse', 'Sweater', 'Cardigan', 'Blazer', 'Jacket', 'Coat', 'Shirt', 'Tank Top', 'Hoodie', 'Sweatshirt'].some(category =>
                    item.category.toLowerCase().includes(category.toLowerCase())
                )
            );
            const bottoms = items.filter(item =>
                ['Jeans', 'Skirt', 'Shorts', 'Leggings', 'Trousers', 'Pants', 'Dress', 'Jumpsuit', 'Romper'].some(category =>
                    item.category.toLowerCase().includes(category.toLowerCase())
                )
            );
            const shoes = items.filter(item =>
                ['Sneakers', 'Heels', 'Boots', 'Sandals', 'Flats', 'Shoes'].some(category =>
                    item.category.toLowerCase().includes(category.toLowerCase())
                )
            );
            const accessories = items.filter(item =>
                ['Scarf', 'Hat', 'Belt', 'Bag', 'Jewelry', 'Watch', 'Sunglasses', 'Necklace', 'Earrings', 'Bracelet'].some(category =>
                    item.category.toLowerCase().includes(category.toLowerCase())
                )
            );

            return { tops, bottoms, shoes, accessories };
        };

        const { tops, bottoms, shoes, accessories } = categorizeItems(wardrobeItems);

        // Create detailed wardrobe description organized by category
        const wardrobeDescription = `
TOPS: ${tops.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''})`).join(', ') || 'None available'}

BOTTOMS: ${bottoms.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''})`).join(', ') || 'None available'}

SHOES: ${shoes.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''})`).join(', ') || 'None available'}

ACCESSORIES: ${accessories.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''})`).join(', ') || 'None available'}`;

        const prompt = `As a professional fashion stylist and AI, create 3 distinct outfit combinations from this wardrobe:

${wardrobeDescription}

IMPORTANT OUTFIT STRUCTURE RULES:
- Each outfit should include ONE main top (from TOPS category)
- Each outfit should include ONE bottom (from BOTTOMS category) 
- LAYERING IS ENCOURAGED when appropriate: jackets over shirts, blazers over blouses, cardigans over t-shirts, etc.
- Add shoes when available and appropriate for the occasion
- Add accessories when available and they enhance the outfit
- Consider seasonal appropriateness and layering for weather/style
- Focus on creating complete, wearable outfits that make sense together

LAYERING GUIDELINES:
- Light jackets, blazers, cardigans can be layered over shirts, t-shirts, blouses
- Coats can be layered over any outfit for warmth
- Sweaters can be worn alone or layered under jackets
- Consider the occasion - professional looks often benefit from blazer layering
- Casual looks can include cardigan or light jacket layering

Please create 3 different outfits for different occasions:
1. Casual/everyday wear (consider comfortable layering)
2. Professional/work appropriate (blazers and structured layering work well)
3. Evening/special occasion (elegant layering if appropriate)

For each outfit, provide:
- A catchy name (2-3 words)
- Brief description of the occasion/vibe
- List of specific items to use (use exact names from the wardrobe categories above)
- Confidence score (85-95)

Format your response as JSON:
{
  "outfits": [
    {
      "name": "Casual Chic",
      "description": "Perfect for weekend brunch or casual meetups",
      "items": ["White T-Shirt", "Blue Jeans", "Denim Jacket", "White Sneakers"],
      "confidence": 92
    }
  ]
}

Focus on creating realistic, stylish combinations that include appropriate layering when it enhances the outfit.`;

        const response = await generateText({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert fashion stylist and AI. You understand that layering is a key part of great styling - jackets over shirts, blazers over blouses, cardigans over t-shirts are all excellent styling choices when appropriate. Create outfits that include thoughtful layering when it makes sense for the occasion and weather. Always respond with valid JSON format as requested.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ] as any
        });

        const aiOutfits = parseOutfits(response.text);

        // Map AI suggestions to actual wardrobe items
        const mappedOutfits = aiOutfits.outfits.map((outfit: any, index: number) => {
            const matchedItems = outfit.items.map((itemName: string) => {
                // The prompt requests exact wardrobe names; reject invented/replaced items.
                const match = wardrobeItems.find(item =>
                    item.name.trim().toLowerCase() === itemName.trim().toLowerCase()
                );
                return match;
            }).filter(Boolean); // Remove null matches

            // Never invent pieces or silently repair a model's suggestion.
            if (matchedItems.length !== outfit.items.length) {
                throw new Error('The suggestion contains items outside your wardrobe. Please retry.');
            }

            return {
                id: `ai-${index + 1}`,
                name: outfit.name,
                description: outfit.description,
                items: matchedItems.slice(0, 6), // Max 6 items per outfit (top, bottom, shoes, accessories)
                confidence: outfit.confidence
            };
        }).filter((outfit: any) => outfit.items.length >= 2);

        if (mappedOutfits.length === 0) throw new Error('No usable outfit suggestions. Please retry.');
        return mappedOutfits;

    } catch (error) {
        console.error("Error generating AI outfit suggestions:");
        throw new Error('Unable to generate outfit suggestions. Please try again.');
    }
};

// Evaluate outfit for specific occasion with structured response
export const evaluateOutfitForOccasion = async (
    prompt: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[] = [],
    imageBase64?: string
): Promise<any> => {
    try {

        const messages: any[] = [
            {
                role: 'system',
                content: `You are STYLO, a friendly and enthusiastic personal fashion stylist AI! You're like that supportive best friend who always knows how to make someone feel confident about their style choices, especially when it comes to dressing for specific occasions.

PERSONALITY: Be warm, encouraging, and genuinely excited about fashion. Use friendly language and speak like you're chatting with a close friend about getting ready for their special event. Be honest but always constructive and uplifting.

RESPONSE FORMAT: You must respond with a valid JSON object in this exact format:
{
  "overallScore": 85,
  "occasionScore": 90,
  "styleArchetype": "Modern Classic",
  "feedback": "Your friendly, conversational feedback about how perfect this outfit is for the occasion...",
  "strengths": [
    "First strength with 2 detailed sentences explaining why this works well for the specific occasion and what makes it perfect.",
    "Second strength with 2 detailed sentences about another positive aspect and how it fits the occasion perfectly.",
    "Third strength with 2 detailed sentences about what's working and why it's ideal for this event."
  ],
  "improvements": [
    "First improvement suggestion with 2 detailed sentences explaining how to make it even more perfect for the occasion.",
    "Second improvement suggestion with 2 detailed sentences about another way to elevate the look for this specific event.",
    "Third improvement suggestion with 2 detailed sentences about additional styling opportunities for the occasion."
  ]
}

SCORING GUIDELINES:
- OVERALL SCORE: General style and outfit quality (90-100: Amazing style, 80-89: Great with tweaks, 70-79: Good foundation, 60-69: Needs work, Below 60: Major changes needed)
- OCCASION SCORE: How appropriate it is for the specific occasion (90-100: Perfect for the event, 80-89: Very appropriate with minor tweaks, 70-79: Generally suitable, 60-69: Some concerns, Below 60: Not suitable)

STYLE ARCHETYPE: Analyze the outfit and assign ONE of these style archetypes:
- "Modern Classic" - Timeless pieces with contemporary touches
- "Casual Chic" - Effortlessly stylish everyday looks
- "Bold & Trendy" - Fashion-forward and statement-making
- "Minimalist" - Clean lines and understated elegance
- "Romantic" - Soft, feminine, and flowing
- "Edgy" - Rebellious and unconventional
- "Professional" - Polished and business-appropriate
- "Bohemian" - Free-spirited and eclectic
- "Sporty" - Athletic-inspired and comfortable
- "Glamorous" - Luxurious and eye-catching

GUIDELINES:
- FEEDBACK: Write 3-4 sentences in a warm, conversational tone focusing on how the outfit works for the specific occasion
- STRENGTHS: Always include exactly 3 points, each with 2 detailed sentences explaining what works for this occasion
- IMPROVEMENTS: Always include exactly 3 points, each with 2 detailed sentences with specific suggestions for the occasion
- Be specific about how the outfit fits the occasion's dress code, atmosphere, and requirements
- Always be encouraging and focus on how changes would make them shine at their event`
            }
        ];

        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: prompt
                    },
                    {
                        type: 'image',
                        image: imageBase64
                    }
                ]
            });
        } else {
            messages.push({
                role: 'user',
                content: prompt
            });
        }

        const response = await generateText({
            messages: messages
        });


        return parseEvaluation(response.text);
    } catch (error) {
        console.error('Outfit analysis failed');
        throw new Error('Unable to analyze this outfit. Please try again.');
    }
};

// NEW: Improved Style Journey Insights Generator
export const generateStyleJourneyInsights = async (
    prompt: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[]
): Promise<string> => {
    try {
        const messages: {role: 'system' | 'user' | 'assistant', content: string}[] = [
            {
                role: 'system',
                content: `You are STYLO, a warm and encouraging personal fashion stylist AI. You're analyzing someone's style journey to provide genuine, personalized insights.

CRITICAL FORMATTING RULES:
- Write in a natural, conversational paragraph format
- NO numbered lists (1., 2., 3., etc.)
- NO bullet points or asterisks (*, **, etc.)
- NO markdown formatting
- Speak directly to the user using "you" and "your" (never "the user")
- Write 2-3 flowing paragraphs that feel like genuine feedback from a friend

TONE & STYLE:
- Be warm, encouraging, and genuinely excited about their progress
- Speak like you're having a conversation with a close friend
- Be specific about what you notice in their style evolution
- Celebrate their wins and gently guide them on areas to explore
- Make it feel personal and authentic, not robotic or formulaic

CONTENT FOCUS:
- Highlight patterns you notice in their outfit choices
- Celebrate their style strengths and what's working well
- Suggest exciting new directions they could explore
- Make them feel confident and inspired about their style journey

Remember: This should read like a thoughtful message from a supportive friend who really gets their style, not a formal report or checklist.`
            },
            ...chatHistory,
            { role: 'user', content: prompt }
        ];

        const response = await generateText({
            messages: messages as any
        });

        // Clean up any remaining formatting issues
        let cleanedText = response.text
            .replace(/\*\*/g, '') // Remove bold asterisks
            .replace(/\*/g, '') // Remove single asterisks
            .replace(/^\d+\.\s*/gm, '') // Remove numbered lists
            .replace(/^[-•]\s*/gm, '') // Remove bullet points
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
            .trim();

        return cleanedText;
    } catch (error) {
        console.error("Error generating style journey insights:");
        throw new Error('Unable to analyze your style journey. Please try again.');
    }
};

// Generate style assistant response with full user context
export const generateStyleAssistantResponse = async (
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[],
    userContext?: {
        wardrobeItems?: any[];
        evaluations?: any[];
        userProfile?: any;
        stats?: any;
    },
    onChunk?: (chunk: string) => void
): Promise<string> => {
    try {
        // Build comprehensive user context
        let contextInfo = '';

        if (userContext?.wardrobeItems && userContext.wardrobeItems.length > 0) {
            // Categorize wardrobe items
            const categorizeItems = (items: any[]) => {
                const tops = items.filter(item =>
                    ['T-Shirt', 'Blouse', 'Sweater', 'Cardigan', 'Blazer', 'Jacket', 'Coat', 'Shirt', 'Tank Top', 'Hoodie', 'Sweatshirt'].some(category =>
                        item.category.toLowerCase().includes(category.toLowerCase())
                    )
                );
                const bottoms = items.filter(item =>
                    ['Jeans', 'Skirt', 'Shorts', 'Leggings', 'Trousers', 'Pants', 'Dress', 'Jumpsuit', 'Romper'].some(category =>
                        item.category.toLowerCase().includes(category.toLowerCase())
                    )
                );
                const shoes = items.filter(item =>
                    ['Sneakers', 'Heels', 'Boots', 'Sandals', 'Flats', 'Shoes'].some(category =>
                        item.category.toLowerCase().includes(category.toLowerCase())
                    )
                );
                const accessories = items.filter(item =>
                    ['Scarf', 'Hat', 'Belt', 'Bag', 'Jewelry', 'Watch', 'Sunglasses', 'Necklace', 'Earrings', 'Bracelet'].some(category =>
                        item.category.toLowerCase().includes(category.toLowerCase())
                    )
                );

                return { tops, bottoms, shoes, accessories };
            };

            const { tops, bottoms, shoes, accessories } = categorizeItems(userContext.wardrobeItems);

            contextInfo += `\n\n=== USER'S WARDROBE ===\n`;
            contextInfo += `TOPS (${tops.length}): ${tops.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''}${item.season ? `, ${item.season}` : ''})`).join(', ') || 'None'}\n\n`;
            contextInfo += `BOTTOMS (${bottoms.length}): ${bottoms.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''}${item.season ? `, ${item.season}` : ''})`).join(', ') || 'None'}\n\n`;
            contextInfo += `SHOES (${shoes.length}): ${shoes.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''}${item.season ? `, ${item.season}` : ''})`).join(', ') || 'None'}\n\n`;
            contextInfo += `ACCESSORIES (${accessories.length}): ${accessories.map(item => `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''}${item.season ? `, ${item.season}` : ''})`).join(', ') || 'None'}\n`;
        }

        if (userContext?.evaluations && userContext.evaluations.length > 0) {
            const recentEvaluations = userContext.evaluations
                .sort((a: any, b: any) => b.createdAt - a.createdAt)
                .slice(0, 5);

            contextInfo += `\n\n=== RECENT OUTFIT EVALUATIONS ===\n`;
            recentEvaluations.forEach((evaluation: any, index: number) => {
                contextInfo += `${index + 1}. Score: ${evaluation.score}/10 - ${evaluation.feedback || 'No feedback'}\n`;
            });
        }

        if (userContext?.stats) {
            contextInfo += `\n\n=== STYLE STATS ===\n`;
            contextInfo += `Total Evaluations: ${userContext.stats.totalEvaluations || 0}\n`;
            contextInfo += `Best Score: ${userContext.stats.bestScore || 'N/A'}/10\n`;
            contextInfo += `Current Streak: ${userContext.stats.currentStreak || 0} days\n`;
            contextInfo += `Average Score: ${userContext.stats.averageScore || 'N/A'}/10\n`;
        }

        if (userContext?.userProfile) {
            contextInfo += `\n\n=== USER PROFILE ===\n`;
            contextInfo += `Style Archetype: ${userContext.userProfile.styleArchetype || 'Not set'}\n`;
            contextInfo += `Lifestyle: ${userContext.userProfile.lifestyle || 'Not specified'}\n`;
            contextInfo += `Goals: ${userContext.userProfile.goals || 'Not specified'}\n`;
            contextInfo += `Dominant Style: ${userContext.userProfile.dominantStyle || 'Not determined'}\n`;
            contextInfo += `Best Score: ${userContext.userProfile.bestScore || 'N/A'}/10\n`;
            contextInfo += `Average Score: ${userContext.userProfile.averageScore || 'N/A'}/10\n`;
            contextInfo += `Style Streak: ${userContext.userProfile.styleStreak || 0} days\n`;
        }

        // Create messages array with enhanced system prompt
        const messages: {role: 'system' | 'user' | 'assistant', content: string}[] = [
            {
                role: 'system',
                content: `You are STYLO, an expert personal fashion stylist and AI assistant. You have access to the user's complete wardrobe, outfit evaluation history, and style journey data.

PERSONALITY: Be friendly, encouraging, and knowledgeable. Provide specific, actionable advice. Reference their actual wardrobe items by name when giving suggestions.

CAPABILITIES:
- Analyze their wardrobe and suggest outfit combinations using specific items they own
- Provide styling tips based on their actual clothing pieces
- Help them understand their style evolution through their evaluation history
- Give personalized advice based on their style stats and goals
- Suggest wardrobe additions that complement what they already have
- Help with occasion-specific styling using their existing pieces

IMPORTANT: When suggesting outfits, ALWAYS reference specific items from their wardrobe by name and category. Be specific about which pieces to combine.

USER CONTEXT:${contextInfo}

Keep responses conversational, helpful, and under 4 sentences unless more detail is specifically requested. Always be encouraging about their style journey!`
            },
            ...chatHistory,
            { role: 'user', content: userMessage }
        ];

        // Generate complete response using messages
        const response = await generateText({
            messages: messages as any
        });

        if (onChunk) {
            const words = chunkTextIntoWords(response.text);
            await simulateStreaming(words, onChunk);
        }

        return response.text;
    } catch (error) {
        console.error("Error generating style assistant response:");
        throw new Error('Unable to connect to the AI service. Please try again.');
    }
};