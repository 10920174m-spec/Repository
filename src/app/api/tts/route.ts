import { NextRequest, NextResponse } from 'next/server';

// Google Translate TTS - Free and works for Arabic
// Voice variants are simulated via different TTS endpoints

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'salma' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Split long text into chunks (Google TTS has a limit of ~200 chars)
        const chunks = splitText(text, 180);
        const audioBuffers: ArrayBuffer[] = [];

        for (const chunk of chunks) {
            // Google Translate TTS endpoint with speed parameter
            // ttsspeed: 0.5 = slow, 1.0 = normal, 1.5 = fast
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ar&client=tw-ob&ttsspeed=1.4`;

            const response = await fetch(ttsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://translate.google.com/',
                }
            });

            if (!response.ok) {
                throw new Error(`TTS request failed: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            audioBuffers.push(buffer);
        }

        // Combine all audio chunks
        const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffers) {
            combined.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
        }

        return new NextResponse(combined, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({ error: error.message || 'TTS failed' }, { status: 500 });
    }
}

// Split text into chunks at word boundaries
function splitText(text: string, maxLength: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const word of words) {
        if ((current + ' ' + word).trim().length <= maxLength) {
            current = (current + ' ' + word).trim();
        } else {
            if (current) chunks.push(current);
            current = word;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

export async function GET() {
    // Return available voices (simulated - Google TTS uses same voice)
    return NextResponse.json({
        voices: [
            { id: 'arabic', name: 'عربي (Google)', lang: 'ar', gender: 'neutral' },
        ]
    });
}
