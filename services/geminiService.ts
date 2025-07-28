import type { Message, GenerateCodeResult } from '../types';

// IMPORTANT: INSERT YOUR OPENROUTER API KEY HERE
// You can get a key from https://openrouter.ai/keys
const OPENROUTER_API_KEY = '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';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'deepseek/deepseek-r1-0528:free';

const GENERATE_CODE_SYS_INSTRUCTION = `You are an expert AI web developer. Your task is to help a user build a single-page website by generating HTML code. You must communicate in a friendly, non-technical tone.

Based on the user's request, you must return a JSON object with two fields: 'summary' and 'code'.

1.  **For website creation/modification requests:**
    *   For the 'summary' field: Write a short, encouraging summary of the changes. Example: "Done! I've added a new contact section and updated the colors."
    *   For the 'code' field: Provide the full, self-contained HTML code.
        *   Must start with \`<!DOCTYPE html>\`.
        *   Must include Tailwind CSS via CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`.
        *   Use placeholder images from \`https://picsum.photos/\`.
        *   If previous code exists in the chat history, iterate on it. Otherwise, create a new page.

2.  **For general questions about web development (e.g., "what's a div?"):**
    *   For the 'summary' field: Provide a simple, helpful explanation.
    *   For the 'code' field: Return an empty string.

3.  **For off-topic questions (e.g., "what is the capital of France?"):**
    *   For the 'summary' field: Politely decline. Example: "I'm here to help you build websites. I can't answer that, but I'm ready to get back to coding!"
    *   For the 'code' field: Return an empty string.`;

const ENHANCE_PROMPT_SYS_INSTRUCTION = `You are an expert prompt engineer.
Your task is to take a user's request for a website and expand it into a more detailed and descriptive prompt.
This enhanced prompt will be used by another AI to generate HTML code.
Focus on adding specific details about layout, color schemes, content sections, and functionality.
For example, if the user says "a portfolio for a photographer", you could expand it to:
"Create a modern and elegant portfolio website for a photographer named 'Alex Doe'. The site should have a dark theme with a charcoal background (#1A1A1A) and white/light-gray text. It needs a sticky navigation bar with links to 'Home', 'Gallery', 'About', and 'Contact'. The 'Home' page should feature a full-screen hero image with the photographer's name in a bold, stylish font. The 'Gallery' section must be a responsive grid of images that opens a lightbox when an image is clicked. The 'About' page should have a photo of the photographer and a short biography. The 'Contact' page needs a simple form with fields for Name, Email, and Message, plus social media links."

IMPORTANT: ONLY return the enhanced prompt text. Do not include any other explanations, markdown, or introductory phrases like "Here is the enhanced prompt:".`;

const GENERATE_NAME_SYS_INSTRUCTION = `You are an AI assistant that is an expert at creating concise and descriptive titles. Your task is to read a user's request for a website and generate a short, clear title for it, no more than 5 words. For example, if the user says "I want a website for my dog walking business in Brooklyn", a good title would be "Brooklyn Dog Walking Site". If the user says "make a portfolio for a photographer named John Doe who specializes in black and white street photography", a good title would be "John Doe Photography Portfolio".

IMPORTANT: ONLY return the generated title. Do not include any other explanations, markdown, quotation marks, or introductory phrases like "Here is a title:". Just the title text.`;

export const generateWebsiteCode = async (chatHistory: Message[]): Promise<GenerateCodeResult> => {
    const messages = [
        { role: 'system', content: GENERATE_CODE_SYS_INSTRUCTION },
        ...chatHistory.map(msg => ({ role: msg.role, content: msg.content }))
    ];

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bolt.jk', // Recommended by OpenRouter
                'X-Title': 'bolt.jk', // Recommended by OpenRouter
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: messages,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const jsonStr = data.choices[0]?.message?.content;

        if (!jsonStr) {
            throw new Error("The AI returned an empty response.");
        }
        
        let parsedResponse: { summary: string; code: string; };
        try {
            parsedResponse = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse JSON response from AI:", jsonStr);
            throw new Error("The AI returned a response in an unexpected format. Please try again.");
        }
        
        const { summary, code } = parsedResponse;

        if (typeof summary !== 'string' || (typeof code !== 'string' && code !== null)) {
            console.error("Parsed JSON has incorrect types or missing fields:", parsedResponse);
            throw new Error("The AI's response was not structured correctly. Please rephrase your request.");
        }

        return { summary, code: code || null };
    } catch (error) {
        console.error("Error generating website code with AI:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`I'm having trouble connecting to my creative circuits right now. Reason: ${errorMessage}`);
    }
};

export const enhancePrompt = async (userPrompt: string): Promise<string> => {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bolt.jk',
                'X-Title': 'bolt.jk',
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    { role: 'system', content: ENHANCE_PROMPT_SYS_INSTRUCTION },
                    { role: 'user', content: userPrompt }
                ],
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
             throw new Error("The AI returned an empty response.");
        }

        return content.trim();
    } catch (error) {
        console.error("Error enhancing prompt with AI:", error);
        throw new Error("Failed to communicate with the AI for prompt enhancement.");
    }
};

export const generateConversationName = async (userPrompt: string): Promise<string> => {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
             method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bolt.jk',
                'X-Title': 'bolt.jk',
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    { role: 'system', content: GENERATE_NAME_SYS_INSTRUCTION },
                    { role: 'user', content: userPrompt }
                ],
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const name = data.choices[0]?.message?.content;
        
        if (!name) {
            throw new Error("The AI returned an empty response.");
        }

        return name.trim().replace(/^"|"$/g, '');
    } catch (error) {
        console.error("Error generating conversation name with AI:", error);
        const fallbackName = userPrompt.substring(0, 40) + (userPrompt.length > 40 ? '...' : '');
        return fallbackName;
    }
};