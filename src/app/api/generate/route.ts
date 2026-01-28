import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export async function POST(req: Request) {
  const { title, language = 'ar', aspectRatio = '16:9' } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const prompt = `Create a high-quality 5-scene cinematic video script about "${title}". 
  Language: ${language === 'ar' ? 'Arabic' : 'English'}.
  Return RAW JSON: {"scenes":[{"script":"25-30 words of engaging narration","imagePrompt":"detailed visual description in English","pexelsQuery":"2-3 broad, high-quality keywords for video search","cameraAngle":"cinematic angle","mood":"emotional tone"}]}.
  CRITICAL: Every scene must be deeply relevant to the topic. Scripts should be descriptive and meaningful.`;

  // --- PHASE 1: TRY GROQ (Super Fast & Reliable Primary) ---
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('🚀 Routing to Groq AI (Streaming Optimized)...');
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt + " Output JSON. No preamble." }],
          response_format: { type: "json_object" },
          stream: true
        })
      });

      if (groqResponse.ok) {
        // Pass the stream directly to the client
        return new Response(groqResponse.body, {
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }
    } catch (e) {
      console.error('❌ Groq Stream Exception:', e);
    }
  }

  // Fallback to non-streaming Gemini if Groq fails
  try {
    console.log('✨ Routing to Gemini AI...');
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const responseText = result.response.text();
    return new Response(responseText, { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return NextResponse.json({ error: 'System overload' }, { status: 500 });
  }
}
