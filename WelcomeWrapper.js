const WelcomeWrapper = () => {
    console.log('🏁 WelcomeWrapper: Component Mounted');
    
    const [showWelcome, setShowWelcome] = React.useState(true);
    const [isGoogleSignedIn, setIsGoogleSignedIn] = React.useState(false);
    const [gapiInited, setGapiInited] = React.useState(false);
    const [gisInited, setGisInited] = React.useState(false);
    const [user, setUser] = React.useState(null);
    const [calendarEvents, setCalendarEvents] = React.useState([]);

    console.log('📱 WelcomeWrapper State:', { showWelcome, isGoogleSignedIn, gapiInited, gisInited });

    const CLIENT_ID = '525952751708-n6u0mj16d7ihh7u2rv2a0m123k8ops9l.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyB5WTEIH4W88RCqA--P2XNVa2NKe-HuDrs';
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile';

    React.useEffect(() => {
        // Load the Google API script
        const loadGapiScript = () => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => gapiLoaded();
            script.onerror = (err) => console.error("Error loading GAPI script:", err);
            document.head.appendChild(script);
        };

        // Load the Google Identity Services script
        const loadGisScript = () => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => gisLoaded();
            script.onerror = (err) => console.error("Error loading GIS script:", err);
            document.head.appendChild(script);
        };

        // Initialize GAPI
        const gapiLoaded = () => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [
                            DISCOVERY_DOC,
                            'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'
                        ],
                    });
                    setGapiInited(true);
                    console.log("GAPI initialized successfully");
                } catch (err) {
                    console.error('Error initializing GAPI client:', err);
                }
            });
        };

        // Initialize Google Identity Services - NEW APPROACH
        const gisLoaded = () => {
            try {
                // Initialize the new Google Identity Services
                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                
                setGisInited(true);
                console.log("✅ GIS initialized successfully with new redirect flow");
            } catch (err) {
                console.error('Error initializing GIS:', err);
            }
        };

        loadGapiScript();
        loadGisScript();

        return () => {
            // Cleanup scripts on unmount
            const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
            const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (gapiScript) gapiScript.remove();
            if (gisScript) gisScript.remove();
        };
    }, []);

    // NEW: Handle credential response from Google
    const handleCredentialResponse = async (response) => {
        try {
            console.log("🔐 Google credential received");
            
            // Decode the JWT credential
            const credential = response.credential;
            const payload = JSON.parse(atob(credential.split('.')[1]));
            
            console.log("👤 User payload:", payload);
            
            // Set user info
            setUser({
                name: payload.name,
                email: payload.email,
                picture: payload.picture
            });
            
            setIsGoogleSignedIn(true);
            
            // Now request calendar access separately
            await requestCalendarAccess();
            
        } catch (error) {
            console.error('Error handling credential response:', error);
        }
    };

    // NEW: Request calendar access using OAuth2 redirect
    const requestCalendarAccess = async () => {
        try {
            // Create OAuth2 URL for calendar access
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', window.location.origin);
            authUrl.searchParams.set('scope', SCOPES);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', 'calendar_auth');
            
            // Redirect to Google for calendar permissions
            window.location.href = authUrl.toString();
            
        } catch (error) {
            console.error('Error requesting calendar access:', error);
        }
    };

    // NEW: Handle OAuth redirect callback
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state === 'calendar_auth') {
            console.log("📅 Calendar authorization code received");
            handleCalendarCallback(code);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // NEW: Handle calendar authorization callback
    const handleCalendarCallback = async (code) => {
        try {
            // Exchange code for access token via your backend
            const apiUrl = window.location.hostname === 'localhost' 
                ? '/api/exchange-token' 
                : 'https://us-central1-spacetime-dist.cloudfunctions.net/api/exchange-token';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, redirect_uri: window.location.origin })
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                
                // Set the access token for GAPI
                window.gapi.client.setToken({
                    access_token: tokenData.access_token
                });
                
                // Fetch calendar events
                await listUpcomingEvents();
                
                // Hide welcome screen
                setShowWelcome(false);
                
                console.log("✅ Calendar access granted successfully");
            } else {
                console.error('Failed to exchange authorization code');
                // Still proceed without calendar access
                setShowWelcome(false);
            }
        } catch (error) {
            console.error('Error handling calendar callback:', error);
            // Still proceed without calendar access
            setShowWelcome(false);
        }
    };

    // UPDATED: New sign-in method
    const handleSignIn = async () => {
        if (!gisInited) {
            console.error('GIS not initialized');
            return;
        }

        try {
            console.log('🔐 Starting Google sign-in process...');
            
            const currentOrigin = window.location.origin;
            console.log('🌐 Current window.location.origin:', currentOrigin);
            console.log('🌐 Current window.location.href:', window.location.href);
            
            // Use direct redirect to Google OAuth
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', currentOrigin);
            authUrl.searchParams.set('scope', SCOPES);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', 'calendar_auth');
            
            console.log('🔗 Redirect URI being sent to Google:', currentOrigin);
            console.log('🔗 Full auth URL:', authUrl.toString());
            
            // Redirect to Google for authentication
            window.location.href = authUrl.toString();
            
        } catch (error) {
            console.error('Error during sign-in:', error);
            alert('Authentication error: ' + error.message);
        }
    };

    const listUpcomingEvents = async () => {
        let response;
        try {
            const timeMin = new Date();
            timeMin.setHours(0, 0, 0, 0);
            const timeMax = new Date(timeMin);
            timeMax.setDate(timeMax.getDate() + 7);

            response = await window.gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': timeMin.toISOString(),
                'timeMax': timeMax.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            });

            const events = response.result.items;
            setCalendarEvents(events);
            console.log('Calendar events loaded:', events);

        } catch (err) {
            console.error('Error fetching calendar events:', err);
            return [];
        }
    };

    if (!showWelcome) {
        console.log('↪️ WelcomeWrapper: Switching to TimeDistributionTool');
        return <TimeDistributionTool 
            isGoogleSignedIn={isGoogleSignedIn}
            gapiInited={gapiInited}
            gisInited={gisInited}
            user={user}
            calendarEvents={calendarEvents}
        />;
    }

    console.log('🎨 WelcomeWrapper: Rendering Welcome Screen');
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
                    Welcome to Time Distribution Tool
                </h1>
                <p className="text-gray-600 mb-6 text-center">
                    Plan and manage your time efficiently with our intuitive tool.
                </p>
                
                <button
                    onClick={handleSignIn}
                    disabled={!gapiInited || !gisInited}
                    className={`w-full p-3 rounded-lg transition-colors duration-200 mb-3
                        ${(!gapiInited || !gisInited) 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : isGoogleSignedIn
                                ? 'bg-gray-700 hover:bg-gray-800 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                >
                    {isGoogleSignedIn ? 'Sign Out from Google Calendar' : 'Sign in with Google Calendar'}
                </button>
                
                <button
                    onClick={() => setShowWelcome(false)}
                    className="w-full p-3 rounded-lg transition-colors duration-200 
                        text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                    Continue without Sign In
                </button>
            </div>
        </div>
    );
}; 