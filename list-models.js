
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hack to read .env.local because we are running with node, not next
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyLine = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].trim() : null;

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels on genAI instance in some versions, 
        // but usually it's not exposed in the high-level client easily without digging.
        // Actually, the SDK *does* have a ModelManager or similar? 
        // Wait, the error message said "Call ListModels".
        // For the node SDK, it might be different.
        // Let's try to just hit a known model like 'embedding-001' which usually exists, 
        // or just try to invoke the API directly if SDK doesn't support listing easily.

        // Actually, let's just try to infer from the error.
        // But wait, allow me to use a raw fetch to 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models returned or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
