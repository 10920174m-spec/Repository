
const fs = require('fs');

// Read .env.local
let pexelsKey = '';
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const keyLine = envFile.split('\n').find(line => line.startsWith('PEXELS_API_KEY='));
    if (keyLine) pexelsKey = keyLine.split('=')[1].trim();
} catch (e) {
    console.error("Could not read .env.local");
}

if (!pexelsKey) {
    console.error("PEXELS_API_KEY not found");
    process.exit(1);
}

async function search(query, type) {
    const baseUrl = type === 'photo'
        ? 'https://api.pexels.com/v1/search'
        : 'https://api.pexels.com/videos/search';

    // Mocking the query that might be generated
    // "cinematic foggy forest 4k"
    // "futuristic city night drone shot"

    const url = `${baseUrl}?query=${encodeURIComponent(query)}&per_page=1`;

    console.log(`Testing [${type}] with query: "${query}"`);

    try {
        const res = await fetch(url, { headers: { Authorization: pexelsKey } });
        if (!res.ok) {
            console.error(`Error ${res.status}: ${res.statusText}`);
            return;
        }

        const data = await res.json();
        if (type === 'video') {
            console.log(`Found ${data.total_results} videos.`);
            if (data.videos.length > 0) console.log("First match:", data.videos[0].link);
        } else {
            console.log(`Found ${data.total_results} photos.`);
            if (data.photos.length > 0) console.log("First match:", data.photos[0].src.original);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

async function run() {
    await search("cinematic foggy forest 4k", "video");
    await search("cinematic foggy forest 4k", "photo");

    // Test a harder one
    await search("futuristic city night drone shot cinematic 4k", "video");
    await search("futuristic city night drone shot cinematic 4k", "photo");

    // Test nonsense
    await search("askdjhasdjkhasdkjh", "photo");
}

run();
