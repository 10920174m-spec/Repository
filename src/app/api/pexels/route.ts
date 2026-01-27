import { NextResponse } from 'next/server';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type') || 'video'; // 'video' or 'photo'
    const orientation = searchParams.get('orientation') || 'landscape';

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!PEXELS_API_KEY) {
        return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    try {
        const baseUrl = type === 'photo'
            ? 'https://api.pexels.com/v1/search'
            : 'https://api.pexels.com/videos/search';

        const response = await fetch(`${baseUrl}?query=${encodeURIComponent(query)}&orientation=${orientation}&size=medium&per_page=1`, {
            headers: {
                Authorization: PEXELS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Pexels API Error: ${response.status}`);
        }

        const data = await response.json();

        let assetUrl = null;

        if (type === 'photo') {
            if (data.photos && data.photos.length > 0) {
                assetUrl = data.photos[0].src.large2x || data.photos[0].src.large;
            }
        } else {
            if (data.videos && data.videos.length > 0) {
                const videoFiles = data.videos[0].video_files;
                const bestVideo = videoFiles.find((f: any) => f.quality === 'hd') || videoFiles[0];
                assetUrl = bestVideo.link;
            }
        }

        return NextResponse.json({
            url: assetUrl,
            found: !!assetUrl
        });

    } catch (error: any) {
        console.error('Pexels Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
