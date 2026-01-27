
const fs = require('fs');

// Read .env.local
let hfToken = '';
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const keyLine = envFile.split('\n').find(line => line.startsWith('HUGGING_FACE_TOKEN='));
    if (keyLine) hfToken = keyLine.split('=')[1].trim();
} catch (e) {
    console.error("Could not read .env.local");
}

if (!hfToken) {
    console.error("HUGGING_FACE_TOKEN not found");
    process.exit(1);
}

async function testHF() {
    console.log("Testing HF Router with Token:", hfToken.substring(0, 5) + "...");

    // New Router URL
    const url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ inputs: "cinematic futuristic city 4k" }),
        }
        );

        if (response.ok) {
            console.log("HF API Success!");
            const blob = await response.blob();
            console.log("Received Blob size:", blob.size);
            console.log("Type:", blob.type);
        } else {
            console.error("HF Error:", response.status, await response.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testHF();
