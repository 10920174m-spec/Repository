import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export async function POST(req: Request) {
  const { title, language = 'ar', aspectRatio = '16:9' } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const prompt = `
            Task: Generate a video production script in JSON format.
            Topic: "${title}"
            Language: ${language === 'ar' ? 'Arabic' : 'English'}
            
            Strict JSON Schema:
            {
              "scenes": [
                {
                  "script": "Narration text in ${language === 'ar' ? 'Arabic' : 'English'}",
                  "imagePrompt": "Detailed English image prompt",
                  "pexelsQuery": "3-5 English search keywords",
                  "cameraAngle": "Shot type",
                  "mood": "Emotional tone"
                }
              ]
            }
            Exactly 5 scenes. Output RAW JSON ONLY. No extra text.
        `;

  // --- PHASE 1: TRY GROQ (Super Fast & Reliable Primary) ---
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('🚀 Routing to Groq AI as Primary...');
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const content = data.choices[0].message.content;
        console.log('✅ Success via Groq');
        return NextResponse.json(JSON.parse(content));
      }
      const errorText = await groqResponse.text();
      console.warn('⚠️ Groq attempted but failed, status:', groqResponse.status, 'Body:', errorText);
    } catch (e) {
      console.error('❌ Groq Exception:', e);
    }
  }

  // --- PHASE 2: TRY GEMINI (Secondary) ---
  try {
    console.log('✨ Routing to Gemini AI...');
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const responseText = result.response.text();
    console.log('✅ Success via Gemini');
    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error('⚠️ Main AI Chain Failed:', error.message);

    // --- PHASE 3: MULTI-MODEL HF FALLBACK CHAIN ---
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('limit')) {
      console.log('🔄 Starting Emergency Fallback Chain...');

      const fallbackModels = [
        "Qwen/Qwen2.5-72B-Instruct",
        "meta-llama/Llama-3.1-8B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3"
      ];

      for (const modelName of fallbackModels) {
        try {
          console.log(`Fallback: Trying ${modelName}`);
          const hfResponse = await fetch(
            `https://api-inference.huggingface.co/models/${modelName}/v1/chat/completions`,
            {
              headers: {
                Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({
                model: modelName,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
                response_format: { type: "json_object" }
              }),
            }
          );

          if (hfResponse.ok) {
            const hfData = await hfResponse.json();
            console.log(`✅ Success via ${modelName}`);
            return NextResponse.json(JSON.parse(hfData.choices[0].message.content));
          }
        } catch (mE) {
          console.error(`❌ ${modelName} failed`);
        }
      }
    }

    return NextResponse.json({
      error: 'عذراً، جميع الأنظمة وصلت للحد الأقصى. يرجى المحاولة بعد قليل أو التأكد من مفتاح Groq.'
    }, { status: 429 });
  }
}
