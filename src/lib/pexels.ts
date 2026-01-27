const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export async function getPexelsVideo(query: string, orientation: 'landscape' | 'portrait' = 'landscape') {
    if (!PEXELS_API_KEY) {
        console.warn("PEXELS_API_KEY is not set.");
        return null;
    }

    try {
        const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&size=medium&per_page=1`, {
            headers: {
                Authorization: PEXELS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Pexels API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.videos && data.videos.length > 0) {
            const video = data.videos[0];
            // Prefer HD quality
            const videoFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
            return videoFile.link;
        }

        return null;
    } catch (error) {
        console.error("Error fetching Pexels video:", error);
        return null;
    }
}
