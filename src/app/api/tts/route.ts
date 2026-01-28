import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'edge-tts-universal';

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'ar-EG-ShakirNeural', metadata = false } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        console.log(`[TTS API] Synthesizing: "${text.substring(0, 30)}..." with voice: ${voice}`);

        let tts;
        try {
            tts = new EdgeTTS(text, voice, {
                rate: '+0%',
                volume: '+0%',
                pitch: '+0Hz',
            });
        } catch (e) {
            console.warn('[TTS API] Primary voice failed, falling back to Salma');
            tts = new EdgeTTS(text, 'ar-EG-SalmaNeural');
        }

        const result = await tts.synthesize();

        if (!result || !result.audio) {
            throw new Error('TTS service returned empty result');
        }

        const audioBuffer = await result.audio.arrayBuffer();

        if (metadata) {
            return NextResponse.json({
                audio: Buffer.from(audioBuffer).toString('base64'),
                subtitles: result.subtitle || [],
                format: 'audio/mpeg'
            });
        }

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store, must-revalidate',
            },
        });
    } catch (error: any) {
        console.error('[TTS API ERROR]:', error);
        return NextResponse.json({
            error: error.message || 'TTS Synthesis failed',
            details: error.stack
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const text = searchParams.get('text');
        const voice = searchParams.get('voice') || 'ar-EG-ShakirNeural';

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        console.log(`[TTS GET Proxy] Streaming: "${text.substring(0, 20)}..."`);

        const tts = new EdgeTTS(text, voice);
        const result = await tts.synthesize();

        // Edge TTS synthesize() normally returns a buffer or a response
        // We return it as a streamable response
        return new Response(result.audio, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600'
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'TTS Failed' }, { status: 500 });
    }
}
