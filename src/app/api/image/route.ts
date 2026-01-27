
import { NextResponse } from 'next/server';

const HF_TOKEN = process.env.HUGGING_FACE_TOKEN;
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');

    if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!HF_TOKEN) {
        return NextResponse.json({ error: 'HF Token missing' }, { status: 500 });
    }

    try {
        const response = await fetch(HF_API_URL, {
            headers: {
                Authorization: `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
        });

        if (!response.ok) {
            throw new Error(`HF API Error: ${response.status}`);
        }

        const blob = await response.blob();

        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });

    } catch (error: any) {
        console.error('Image Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
