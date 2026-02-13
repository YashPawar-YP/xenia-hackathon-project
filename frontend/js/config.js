// API Configuration
const API_BASE_URL = "http://127.0.0.1:8000";

// Cache for the working URL
let cachedApiUrl = null;

// Simple function to get API URL
async function getWorkingApiUrl() {
    // Return cached URL if available
    if (cachedApiUrl) {
        return cachedApiUrl;
    }

    const urlsToTry = [
        "http://127.0.0.1:8000",
        "http://localhost:8000", 
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ];
    
    for (const url of urlsToTry) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(`${url}/clubs`, {
                method: "GET",
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // If we got any response, the server is reachable
            cachedApiUrl = url;
            console.log("✓ Backend found at:", url);
            return url;
        } catch (e) {
            console.log("✗ Failed:", url, "-", e.message);
        }
    }
    
    // If nothing worked, return the primary URL (will fail with clear error)
    console.warn("No backend server found. Tried:", urlsToTry.join(", "));
    console.warn("Make sure backend is running with: uvicorn main:app --reload");
    return urlsToTry[0];
}
