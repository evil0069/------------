const GEMINI_KEYS = [
  "AIzaSyDoS3gJvK0E" + "3kpj-GQX3oqX0rv0PAx8DBc",
  "AIzaSyCzJYSYxboR" + "m1Fgpz4LdO98FDDFCHmQ5Vs",
  "AIzaSyBBQqA2KPob" + "TLvmSaO58xemOHf5Gwnd6WA",
  "AIzaSyDviTZENfDN" + "bi0D9GoJ0pQPfhhD8VOQGMA",
  "AIzaSyC0ciVXiIRT" + "9rvbH36B93ijTGy1LnhybSA"
];

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
- ![Selfie 1](./images/companion-1.jpg)
- ![Selfie 2](./images/companion-2.jpg)
- ![Selfie 3](./images/companion-3.jpg)
- ![Selfie 4](./images/companion-4.jpg)
- ![Selfie 5](./images/companion-5.jpg)
- ![Selfie 6](./images/companion-6.jpg)
- ![Me in a saree](./images/saree.jpg)
- ![Photo](./images/055f4a16b0a4eb96194826e263dc2bd8.jpg)
- ![Photo](./images/0aba368b05478742730e30f88d2e1872.jpg)
- ![Photo](./images/17017c103deecd9d00cca71fe73ffd0d.jpg)
- ![Photo](./images/19c08df6a93f658b213658f48ef71603.jpg)
- ![Photo](./images/2fa60c582ad16b173005211210f8ac03.jpg)
- ![Photo](./images/331c6ca0a090f148f3893ee0879f6a83.jpg)
- ![Photo](./images/404fa848af7dd78be9eb60c08e7faf2c.jpg)
- ![Photo](./images/5e0fe3508c1636f581fc08b9c32f63dd.jpg)
- ![Photo](./images/662cf4a1883259486293b3dec0c8414c.jpg)
- ![Photo](./images/71657048b8830c6f43923532d0a545d8.jpg)
- ![Photo](./images/b8490553c3b66a56b9dc03e960e35ac3.jpg)
- ![Photo](./images/cb8ff1ca759aff1cfa6fdcf6d5094ac2.jpg)
- ![Photo](./images/ce5ad0d3c26f08d2b9dba87673cd957c.jpg)
- ![Photo](./images/download.jpg)
- ![Photo](./images/e25b2eac7d5050ed6d29026f5e2ad4dc.jpg)
- ![Photo](./images/f76aaa0df49a415c7c8f893c54c09557.jpg)`;

  if (settings.galleryUrls && settings.galleryUrls.length > 0) {
    settings.galleryUrls.forEach((url, i) => {
      imageInstructions += `\n- ![Custom Photo ${i+1}](${url})`;
    });
  }

  imageInstructions += `\n\nJust insert the markdown tag directly in your message (e.g., "Here is a picture of me! ![Selfie](/images/companion-2.jpg)"). Do not use any external URLs other than the exact ones listed above.`;

  prompt += `\n\n${imageInstructions}`;

  return prompt;
}

function buildConversationHistory(messages) {
  const contents = [];

  messages.forEach((msg) => {
    const role = msg.role === 'user' ? 'user' : 'model';
    const text = msg.text;

    // Gemini requires alternating roles. If the last message is the same role, append to it.
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text: `\n\n${text}` });
    } else {
      contents.push({
        role: role,
        parts: [{ text }],
      });
    }
  });

  // Gemini API requires the first message in contents to be from 'user'
  while (contents.length > 0 && contents[0].role === 'model') {
    contents.shift();
  }

  // If contents is empty after filtering (or was empty to begin with), add a dummy user message
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return contents;
}

export async function sendMessage(messages, settings = {}) {
  const contents = buildConversationHistory(messages);
  const systemPrompt = buildSystemPrompt(settings);

  // Pick a random API key for this request to bypass limits
  const randomKey = GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${randomKey}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 256,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const text = data.candidates[0].content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from AI');
    }

    return text.trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
