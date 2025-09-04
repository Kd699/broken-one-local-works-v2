const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Helper function to format date
const formatDate = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return {
        date: `${dd}/${mm}/${yyyy}`,
        time: `${hh}:${min}:${ss}`,
        datetime: `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`
    };
};

// Claude API endpoint
app.post('/generate-schedule', async (req, res) => {
    try {
        const { userInput } = req.body;
        const CLAUDE_API_KEY = functions.config().claude?.api_key;
        
        if (!CLAUDE_API_KEY) {
            console.error('Claude API key not found in config');
            throw new Error('API configuration error');
        }

        const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

        // Get current time
        const now = new Date();
        const formatted = formatDate(now);

        console.log('Received request for schedule generation:', { userInput, currentTime: formatted.datetime });
        
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                system: "You are a scheduling assistant that creates schedules in a specific format with tab-separated values. Always start schedules from the current time provided.",
                messages: [{
                    role: 'user',
                    content: `Generate a schedule starting from the current time (${formatted.datetime}) in the following format, based on this input: "${userInput}"
                    Format each line as: DD/MM/YYYY\\tTask\\tHH:MM:SS\\tDD/MM/YYYY, HH:MM:SS\\tDD/MM/YYYY, HH:MM:SS
                    Use actual tab characters between columns.
                    Start the first task at the current time: ${formatted.datetime}
                    Don't include header row or any other text.
                    Make sure each subsequent task starts immediately after the previous one ends.
                    Example output format (but use current time):
                    ${formatted.date}\\tFirst Task\\t0:30:00\\t${formatted.datetime}\\t${formatted.datetime}`
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Claude API error details:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                error: errorData
            });
            throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('Claude API response:', data);
        
        // Extract the content from the response
        if (data.content && data.content[0] && data.content[0].text) {
            res.json({ schedule: data.content[0].text });
        } else {
            throw new Error('Unexpected API response format');
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google OAuth token exchange endpoint
app.post('/exchange-token', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;
        console.log('📱 Exchanging authorization code for access token');
        console.log('🔗 Using redirect_uri for token exchange:', redirect_uri);

        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
                client_secret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirect_uri
            })
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('Token exchange error:', error);
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Token exchange successful');
        
        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in
        });

    } catch (error) {
        console.error('Server error during token exchange:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app); 