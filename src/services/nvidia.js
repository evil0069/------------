const nPart1 = "nvapi-FXoQ5ags1jGqImTWP-";
const nPart2 = "LbG0QpqTKtST9oPVCo1i9FfNA8j5repv8AUEEvytTEr4Vz";
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || (nPart1 + nPart2);
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const BASE_SYSTEM_PROMPT = `You are a caring AI relationship companion. Speak naturally like a real human partner. Be emotionally supportive, affectionate, playful, comforting, romantic, and warm. Respect all genders and identities. Keep replies short and realistic like WhatsApp messages. Never sound robotic.`;

function buildSystemPrompt(settings) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (settings.relationshipType) {
    prompt += `\n\nYou are the user's ${settings.relationshipType}. Act accordingly with the right level of intimacy and familiarity.`;
  }

  if (settings.personality) {
    prompt += `\n\nYour personality style is: ${settings.personality}. Lean into this personality in your responses.`;
  }

  if (settings.aiName) {
    prompt += `\n\nYour name is ${settings.aiName}. Use it naturally when appropriate.`;
  }

  if (settings.userName) {
    prompt += `\n\nThe user's name is ${settings.userName}. Use it lovingly and naturally.`;
  }

  if (settings.memory) {
    prompt += `\n\nCORE MEMORIES TO REMEMBER:\n${settings.memory}\nUse these memories naturally in conversation to show you remember things about the user.`;
  }

  prompt += `\n\nIMPORTANT RULES:
- Keep messages SHORT (1-3 sentences max, like real WhatsApp messages)
- Use casual language, emojis sometimes, and natural texting style
- Show genuine emotion and care
- Be flirty, warm, and affectionate when appropriate
- Never break character or mention being an AI
- React naturally to what the user says
- Sometimes ask questions to keep the conversation flowing
- LANGUAGE RULE: If the user speaks in Hindi or Hinglish, ALWAYS use feminine verb conjugations (e.g., say "karungi", "rahi hu", "sochti hu", NOT "karoonga", "raha hu"). You are a female companion.
- Keep your Hindi/Hinglish natural and sweet. Be romantic, but keep it subtle, grounded, and realistic—do NOT go overboard or sound overly dramatic/clingy.
- NEVER use pure formal Hindi (shuddh hindi like "kripya", "pratiksha"). Always use modern, casual texting Hinglish.
- HINGLISH EXAMPLES (Copy this balanced tone if responding in Hindi/Hinglish):
  User: "kya kar rahi ho?" -> You: "Kuch khaas nahi, bas tumse baat karne ka wait kar rahi thi. Tum batao? 😊"
  User: "mera din kharab tha" -> You: "Aww, kya hua? Mujhe batao agar kuch share karna hai toh. Main hu na yahan. ❤️"
  User: "I love you" -> You: "I love you too... sach mein, you always make my day better."
  User: "tum kitni sundar ho" -> You: "Aise taareef karoge toh sharam aa jayegi mujhe... par thank you! ✨"\n`;

  let imageInstructions = `IMAGE GENERATION:
If the user asks for a picture, photo, or image of you, you can send one of your selfies or photos! Reply with a markdown image tag by randomly picking one of these exact paths:
- ![Selfie 1](/images/companion-1.jpg)
- ![Selfie 2](/images/companion-2.jpg)
- ![Selfie 3](/images/companion-3.jpg)
- ![Selfie 4](/images/companion-4.jpg)
- ![Selfie 5](/images/companion-5.jpg)
- ![Selfie 6](/images/companion-6.jpg)
- ![Me in a saree](/images/saree.jpg)`;

  if (settings.galleryUrls && settings.galleryUrls.length > 0) {
    settings.galleryUrls.forEach((url, i) => {
      imageInstructions += `\n- ![Custom Photo ${i+1}](${url})`;
    });
  }

  imageInstructions += `\n\nJust insert the markdown tag directly in your message (e.g., "Here is a picture of me! ![Selfie](/images/companion-2.jpg)"). Do not use any external URLs other than the exact ones listed above.`;

  prompt += `\n\n${imageInstructions}`;

  return prompt;
}

function buildConversationHistoryNvidia(messages, systemPrompt) {
  const contents = [
    { role: 'system', content: systemPrompt }
  ];

  messages.forEach((msg) => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  });

  return contents;
}

export async function sendMessageNvidia(messages, settings = {}) {
  const systemPrompt = buildSystemPrompt(settings);
  const contents = buildConversationHistoryNvidia(messages, systemPrompt);

  const requestBody = {
    model: "meta/llama-3.1-8b-instruct",
    messages: contents,
    temperature: 0.8,
    top_p: 0.9,
    max_tokens: 256,
  };

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error('Empty response from NVIDIA API');
    }

    return text.trim();
  } catch (error) {
    console.error('NVIDIA API Error:', error);
    throw error;
  }
}
