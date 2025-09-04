// Add constants at the top
const CLIENT_ID = '525952751708-n6u0mj16d7ihh7u2rv2a0m123k8ops9l.apps.googleusercontent.com';
const API_KEY = 'AIzaSyB5WTEIH4W88RCqA--P2XNVa2NKe-HuDrs';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile';

const TimeDistributionTool = ({ 
    isGoogleSignedIn: initialIsGoogleSignedIn, 
    gapiInited: initialGapiInited, 
    gisInited: initialGisInited, 
    user: initialUser, 
    calendarEvents: initialCalendarEvents 
}) => {
    // DEBUG: Log all props to see what's being passed
    console.log('🔍 TimeDistributionTool DEBUG - Props received:', {
        initialIsGoogleSignedIn,
        initialGapiInited,
        initialGisInited,
        initialUser,
        initialCalendarEvents
    });
    
    // Check for undefined values that might cause issues
    if (initialIsGoogleSignedIn === undefined) {
        console.warn('⚠️ initialIsGoogleSignedIn is undefined');
    }
    if (initialGapiInited === undefined) {
        console.warn('⚠️ initialGapiInited is undefined');
    }
    if (initialGisInited === undefined) {
        console.warn('⚠️ initialGisInited is undefined');
    }
    
    console.log('✅ TimeDistributionTool: Starting to render component');
    
    // Deep clone utility
    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
    
    // Safe initialization with empty array
    const originalEventsRef = React.useRef([]);
    const tableRef = React.useRef(null);
    
    // Debug logging with traditional null check
    React.useEffect(() => {
        console.log('Storage Box Status:', {
            exists: !!originalEventsRef.current,
            length: originalEventsRef.current && originalEventsRef.current.length || 0,
            data: originalEventsRef.current
        });
    }, [originalEventsRef.current]);

    // Add loading from localStorage on component mount
    React.useEffect(() => {
        const savedEvents = localStorage.getItem('calendar_events');
        if (savedEvents) {
            try {
                const parsedEvents = JSON.parse(savedEvents);
                // Convert date strings back to Date objects
                const eventsWithDates = parsedEvents.map(event => ({
                    ...event,
                    startTime: new Date(event.startTime),
                    endTime: new Date(event.endTime)
                }));
                originalEventsRef.current = eventsWithDates;
                console.log('Loaded events from localStorage:', originalEventsRef.current);
            } catch (error) {
                console.error('Error loading saved events:', error);
            }
        }
    }, []);

    const handleRevert = () => {
        console.log('Revert Triggered. Current State:', {
            hasOriginalEvents: originalEventsRef.current && originalEventsRef.current.length > 0,
            originalEvents: originalEventsRef.current
        });

        // Old way that computer understands better
        if (!originalEventsRef.current || !originalEventsRef.current.length) {
            console.warn('No original events available to revert to');
            return;
        }

        try {
            // Deep clone when reverting
            const restoredEvents = deepClone(originalEventsRef.current);
            
            // Convert string dates back to Date objects
            restoredEvents.forEach(event => {
                event.startTime = new Date(event.startTime);
                event.endTime = new Date(event.endTime);
            });

            setEvents(restoredEvents);
            
            const firstEvent = restoredEvents[0];
            const lastEvent = restoredEvents[restoredEvents.length - 1];
            
            setStartDateTime(firstEvent.startTime.toISOString().slice(0, 16));
            setEndDateTime(lastEvent.endTime.toISOString().slice(0, 16));
            
            setDeletedEvents([]);
            
            // Debug logging
            console.log('Reverted to original (deep cloned):', restoredEvents);
        } catch (error) {
            console.error('Error during revert:', error);
        }
    };

    // Get user's timezone info
    const getUserTimeZone = () => {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return timezone;
        } catch(error) {
            console.error('Error getting timezone:', error);
            return 'UTC';
        }
    };

    const userTimeZone = getUserTimeZone();
    const now = new Date();

    // 2. Conversion function with detailed steps
    const getLocalDateTime = (date) => {
        // Get UTC timestamp
        const utcTime = date.getTime();
        
        // Convert to local time
        const offsetInMs = date.getTimezoneOffset() * 60000;
        const localTime = new Date(utcTime - offsetInMs);
        
        // Format for input field
        const localISOString = localTime.toISOString();
        const inputFormat = localISOString.slice(0, 16); // YYYY-MM-DDTHH:mm

        return inputFormat;
    };

    // 3. Initialize states with current time
    const [startDateTime, setStartDateTime] = React.useState(() => getLocalDateTime(now));
    const [endDateTime, setEndDateTime] = React.useState(() => getLocalDateTime(now));

    // 4. Monitor changes
    React.useEffect(() => {
        console.log('5. DateTime Values:', {
            startDateTime,
            endDateTime,
            wallClock: new Date().toLocaleTimeString(),
            browserLocale: Intl.DateTimeFormat().resolvedOptions().locale
        });
    }, [startDateTime, endDateTime]);

    const [totalTime, setTotalTime] = React.useState({ days: 0, hours: 0, minutes: 0 });
    const [events, setEvents] = React.useState([
        { 
            name: 'Work',
            duration: 480,
            color: '#FF6B6B',
            lockState: 0,
            startTime: new Date(),
            endTime: new Date(),
            durationTime: '08:00',
            rawStartTime: new Date(),
            isTerminal: false
        },
        { name: 'Freshen up', duration: 60, color: '#4ECDC4' },    // 1 hour
        { name: 'Meditate', duration: 30, color: '#45B7D1' },      // 30 mins
        { name: 'Buffer', duration: 30, color: '#FFA07A' }         // 30 mins
    ]);
    const [newEventName, setNewEventName] = React.useState('');
    const [deletedEvents, setDeletedEvents] = React.useState([]);
    const [tubularInput, setTubularInput] = React.useState('');
    const [tooltipVisible, setTooltipVisible] = React.useState(Array(events.length).fill(false));
    const [editMode, setEditMode] = React.useState({ index: null, field: null, value: null });
    const [claudeInput, setClaudeInput] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [hoverIndex, setHoverIndex] = React.useState(null);
    const [syncing, setSyncing] = React.useState(false);

    React.useEffect(() => {
        console.log('State Initialization Check:', {
            originalGoogleEventsExists: !!originalEventsRef.current,
            length: originalEventsRef.current.length
        });
    }, [originalEventsRef.current]);

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
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    console.log("GAPI initialized successfully");
                } catch (err) {
                    console.error('Error initializing GAPI client:', err);
                }
            });
        };

        // Modern GIS is handled in WelcomeWrapper
        const gisLoaded = () => {
            console.log("GIS loaded - handled by WelcomeWrapper");
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
    }, []); // Empty dependency array means this runs once on mount

    React.useEffect(() => {
        // Calculate total minutes from events durations
        const totalEventMinutes = events.reduce((total, event) => total + event.duration, 0);
        
        // Set total time
        const days = Math.floor(totalEventMinutes / (24 * 60));
        const hours = Math.floor((totalEventMinutes % (24 * 60)) / 60);
        const minutes = Math.floor(totalEventMinutes % 60);
        
        setTotalTime({ days, hours, minutes });
        
        // Update chart with current events
        updateChart(events, totalEventMinutes);
    }, [events]); // Only depend on events changes

    const handleSubmit = () => {
        if (tubularInput) {
            parseTubularData(tubularInput);
        }
    };

    const parseTubularData = (data) => {
        const rows = data.trim().split('\n');
        const parsedEvents = rows.map((row) => {
            const [date, task, duration, startTime, endTime] = row.split('\t');
            
            // Convert DD/MM/YYYY to YYYY-MM-DD format for datetime-local input
            const convertDate = (dateTimeStr) => {
                const [datePart, timePart] = dateTimeStr.split(', ');
                const [day, month, year] = datePart.split('/');
                const date = new Date(`${year}-${month}-${day}T${timePart}`);
                return date.toISOString().slice(0, 16);
            };

            const startDateTime = convertDate(startTime);
            const endDateTime = convertDate(endTime);

            return {
                name: task,
                duration: parseDuration(duration),
                startTime: new Date(startDateTime),
                endTime: new Date(endDateTime),
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                lockState: 0,
                locked: false
            };
        });

        console.log('Parsed events with lock states:', parsedEvents);
        updateDateTimeRange(parsedEvents);
        setEvents(parsedEvents);
    };

    const parseDuration = (durationString) => {
        const parts = durationString.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        return hours * 60 + minutes;
    };

    const handleNowButton = (setter) => {
        const now = new Date();
        // Format date in YYYY-MM-DD format for datetime-local input
        const formattedNow = now.toISOString().slice(0, 16);
        setter(formattedNow);
    };

    const handleDurationChange = (index, newDuration) => {
        const newEvents = [...events];
        newEvents[index].duration = parseInt(newDuration);
        setEvents(newEvents);
    };

    const adjustOtherTasks = (newEvents, changedIndex) => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const totalCurrentDuration = newEvents.reduce((sum, event) => sum + event.duration, 0);
        const difference = totalMinutes - totalCurrentDuration;

        if (difference !== 0) {
            const otherEvents = newEvents.filter((_, i) => i !== changedIndex);
            const totalOtherDuration = otherEvents.reduce((sum, event) => sum + event.duration, 0);

            otherEvents.forEach((event, i) => {
                if (i !== changedIndex) {
                    const proportion = event.duration / totalOtherDuration;
                    event.duration += Math.round(difference * proportion);
                }
            });
        }

        const finalTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        if (finalTotal !== totalMinutes) {
            const diff = totalMinutes - finalTotal;
            newEvents[newEvents.length - 1].duration += diff;
        }
    };

    const distributeTimeEqually = () => {
        console.log('\n=== EQUAL DISTRIBUTION START ===');
        console.log('Before Distribution:');
        const timeTableBefore = generateTimeTable(events, startDateTime);
        events.forEach((event, idx) => {
            const timeRow = timeTableBefore[idx];
            console.log(`Task: ${event.name}
            Duration: ${Math.floor(event.duration / 60)}h ${event.duration % 60}m
            Start Time: ${timeRow.startTime}
            End Time: ${timeRow.endTime}
            Lock State: ${getLockStyles(event.lockState).text}`);
        });

        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const unlockedEvents = events.filter(event => !isDurationLocked(event));
        const lockedTime = events
            .filter(event => isDurationLocked(event))
            .reduce((sum, event) => sum + event.duration, 0);
        
        const remainingTime = totalMinutes - lockedTime;
        const equalShare = Math.floor(remainingTime / unlockedEvents.length);

        const newEvents = events.map(event => {
            if (isDurationLocked(event)) return event;
            return { ...event, duration: equalShare };
        });

        console.log('\nAfter Distribution:');
        const timeTableAfter = generateTimeTable(newEvents, startDateTime);
        newEvents.forEach((event, idx) => {
            const timeRow = timeTableAfter[idx];
            console.log(`Task: ${event.name}
            Duration: ${Math.floor(event.duration / 60)}h ${event.duration % 60}m
            Start Time: ${timeRow.startTime}
            End Time: ${timeRow.endTime}
            Lock State: ${getLockStyles(event.lockState).text}`);
        });
        console.log('=== EQUAL DISTRIBUTION END ===\n');

        setEvents(newEvents);
    };

    const distributeTimeProportionally = () => {
        console.log('\n=== PROPORTIONAL DISTRIBUTION START ===');
        
        // 1. Split events into sections based on Full Locks
        const sections = [];
        let currentSection = [];
        let sectionStartTime = new Date(startDateTime);
        
        events.forEach((event, idx) => {
            if (isFullyLocked(event)) {
                // Add current section if not empty
                if (currentSection.length > 0) {
                    sections.push({
                        startTime: sectionStartTime,
                        endTime: new Date(event.startTime),
                        events: currentSection
                    });
                }
                
                // Add full lock event as its own section
                sections.push({
                    startTime: new Date(event.startTime),
                    endTime: new Date(event.endTime),
                    events: [event],
                    isLocked: true
                });
                
                // Start new section
                currentSection = [];
                sectionStartTime = new Date(event.endTime);
            } else {
                currentSection.push(event);
            }
        });
        
        // Add final section if not empty
        if (currentSection.length > 0) {
            sections.push({
                startTime: sectionStartTime,
                endTime: new Date(endDateTime),
                events: currentSection
            });
        }

        // 2. Process each section independently
        const processedSections = sections.map(section => {
            if (section.isLocked) return section;

            const sectionMinutes = (section.endTime - section.startTime) / (1000 * 60);
            const unlockedEvents = section.events.filter(event => !isDurationLocked(event));
            const lockedEvents = section.events.filter(event => isDurationLocked(event));
            
            // Calculate remaining time for unlocked events
            const lockedTime = lockedEvents.reduce((sum, event) => sum + event.duration, 0);
            const remainingTime = sectionMinutes - lockedTime;
            
            if (remainingTime <= 0) return section;
            
            const totalUnlockedTime = unlockedEvents.reduce((sum, event) => sum + event.duration, 0);
            
            // Adjust unlocked events proportionally
            const adjustedEvents = section.events.map(event => {
                if (isDurationLocked(event)) return event;
                
                const proportion = event.duration / totalUnlockedTime;
                return {
                    ...event,
                    duration: Math.round(remainingTime * proportion)
                };
            });
            
            return {
                ...section,
                events: adjustedEvents
            };
        });

        // 3. Reconstruct timeline
        let currentTime = new Date(startDateTime);
        const newEvents = [];
        
        processedSections.forEach(section => {
            section.events.forEach(event => {
                newEvents.push({
                    ...event,
                    startTime: new Date(currentTime),
                    endTime: new Date(currentTime.getTime() + event.duration * 60000)
                });
                currentTime = new Date(currentTime.getTime() + event.duration * 60000);
            });
        });

        // 4. Debug logging
        console.log('\nBefore Distribution:');
        const timeTableBefore = generateTimeTable(events, startDateTime);
        events.forEach((event, idx) => {
            const timeRow = timeTableBefore[idx];
            console.log(`Task: ${event.name}
            Duration: ${Math.floor(event.duration / 60)}h ${event.duration % 60}m
            Start Time: ${timeRow.startTime}
            End Time: ${timeRow.endTime}
            Lock State: ${getLockStyles(event.lockState).text}`);
        });

        console.log('\nAfter Distribution:');
        const timeTableAfter = generateTimeTable(newEvents, startDateTime);
        newEvents.forEach((event, idx) => {
            const timeRow = timeTableAfter[idx];
            console.log(`Task: ${event.name}
            Duration: ${Math.floor(event.duration / 60)}h ${event.duration % 60}m
            Start Time: ${timeRow.startTime}
            End Time: ${timeRow.endTime}
            Lock State: ${getLockStyles(event.lockState).text}`);
        });
        
        setEvents(newEvents);
    };

    const areTasksEquallyDistributed = () => {
        const unlockedEvents = events.filter(event => !isDurationLocked(event));
        if (unlockedEvents.length <= 1) return true;
        const firstDuration = unlockedEvents[0].duration;
        return unlockedEvents.every(event => event.duration === firstDuration);
    };

    const toggleLock = (index) => {
        const newEvents = [...events];
        newEvents[index].locked = !newEvents[index].locked;
        setEvents(newEvents);
    };

    const addNewEvent = () => {
        if (newEventName) {
            const { name, duration } = parseDurationInput(newEventName);
            
            // Debug log
            console.log('Adding new event:', { name, duration });
            
            const newEvent = { 
                name, 
                duration,
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                lockState: 0
            };
            
            // Debug log
            console.log('New event object:', newEvent);
            
            setEvents(prevEvents => {
                const updatedEvents = [...prevEvents, newEvent];
                console.log('Updated events array:', updatedEvents);
                return updatedEvents;
            });
            
            setNewEventName('');
        }
    };

    const deleteEvent = (index) => {
        const eventToDelete = events[index];
        setDeletedEvents([...deletedEvents, eventToDelete]);
        const newEvents = events.filter((_, i) => i !== index);
        adjustOtherTasks(newEvents, -1);
        setEvents(newEvents);
    };

    const undoDelete = () => {
        const lastDeleted = deletedEvents.pop();
        if (lastDeleted) {
            const newEvents = [...events, lastDeleted];
            adjustOtherTasks(newEvents, newEvents.length - 1);
            setEvents(newEvents);
            setDeletedEvents([...deletedEvents]);
        }
    };

    const reorderEvents = (index, direction) => {
        const newEvents = [...events];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < events.length) {
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setEvents(newEvents);
        }
    };

    const copyTableToClipboard = () => {
        if (tableRef.current) {
            const timeTable = generateTimeTable(events, startDateTime);
            let clipboardText = '';

            timeTable.forEach((row) => {
                // Ensure duration is in HH:mm:ss format
                const durationParts = row.duration.split(':');
                const formattedDuration = durationParts.length === 2 
                    ? `${durationParts[0]}:${durationParts[1]}:00`
                    : row.duration;

                clipboardText += `${row.date}\t${row.task}\t${formattedDuration}\t${row.startTime}\t${row.endTime}\n`;
            });

            navigator.clipboard.writeText(clipboardText.trim())
                .then(() => alert('Table copied to clipboard!'))
                .catch((err) => console.error('Failed to copy table: ', err));
        }
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const handleDurationChangeInTable = (index, newDuration) => {
        const newEvents = [...events];
        const originalDuration = newEvents[index].duration;
        newDuration = parseInt(newDuration);

        // Add validation
        if (isNaN(newDuration) || newDuration < 0) {
            console.error('Invalid duration value:', newDuration);
            return;
        }

        // Update duration
        newEvents[index].duration = newDuration;
        
        // Debug logging
        console.log('Duration Change:', {
            index,
            originalDuration,
            newDuration,
            event: newEvents[index]
        });

        // Recalculate times immediately
        let currentTime = new Date(startDateTime);
        newEvents.forEach((event, i) => {
            event.startTime = new Date(currentTime);
            currentTime = new Date(currentTime.getTime() + event.duration * 60000);
            event.endTime = new Date(currentTime);
        });

        // Update state
        setEvents(newEvents);
    };

    const toggleLockInTable = (index) => {
        const newEvents = [...events];
        newEvents[index].locked = !newEvents[index].locked;
        setEvents(newEvents);
    };

    const reorderEventsInTable = (index, direction) => {
        // Check if event is fully locked (prevents position changes)
        if (isFullyLocked(events[index])) return;
        
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Check if target position is valid and target event isn't fully locked
        if (targetIndex >= 0 && 
            targetIndex < events.length && 
            !isFullyLocked(events[targetIndex])) {
            const newEvents = [...events];
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setEvents(newEvents);
        }
    };

    const deleteEventInTable = (index) => {
        const eventToDelete = events[index];
        const canModify = !isLocked(eventToDelete);
        
        console.log('🔍 Pre-Deletion Check:', {
            eventIndex: index,
            canModify,
            lockState: eventToDelete.lockState,
            isGoogleEvent: eventToDelete.lockState === undefined
        });

        if (!canModify) {
            console.log('❌ Deletion blocked: Event is locked');
            return;
        }

        // Proceed with deletion
        setDeletedEvents(prev => [...prev, eventToDelete]);
        const newEvents = events.filter((_, i) => i !== index);
        setEvents(newEvents);
    };

    const fullLock = (index) => {
        const newEvents = [...events];
        newEvents[index].fullLocked = !newEvents[index].fullLocked;
        setEvents(newEvents);
    };

    const lockDuration = (index) => {
        const newEvents = [...events];
        newEvents[index].durationLocked = !newEvents[index].durationLocked;
        setEvents(newEvents);
    };

    const cycleLock = (index) => {
        console.log(`Cycling lock for index ${index}`);
        console.log('Current lock state:', events[index].lockState);
        
        const newEvents = [...events];
        newEvents[index].lockState = (newEvents[index].lockState + 1) % 3;
        
        console.log('New lock state:', newEvents[index].lockState);
        setEvents(newEvents);
    };

    // Tooltip component
    const Tooltip = ({ children, isVisible }) => (
        <div 
            className={`
                absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2
                bg-gray-900 text-white text-sm rounded-lg shadow-lg
                py-2 px-3 min-w-[120px]
                transition-all duration-200 ease-in-out
                ${isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-1 pointer-events-none'}
            `}
        >
            {/* Arrow */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="border-solid border-4 border-transparent border-t-gray-900"/>
            </div>
            
            {/* Content */}
            <div className="space-y-1">
                {React.Children.map(children, child => (
                    React.cloneElement(child, {
                        className: `
                            w-full text-left px-2 py-1 rounded
                            hover:bg-gray-700 transition-colors
                            text-sm whitespace-nowrap
                        `
                    })
                ))}
            </div>
        </div>
    );

    // UPDATED: New sign-in method for modern GIS
    const handleSignIn = () => {
        try {
            // Redirect to Google for authentication
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', CLIENT_ID);
                         authUrl.searchParams.set('redirect_uri', window.location.origin);
            authUrl.searchParams.set('scope', SCOPES);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', 'calendar_auth');
            
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Error during sign-in:', error);
        }
    };

    // Add the unified update handler
    const updateDateTimeRange = (events) => {
        if (events && events.length > 0) {
            const firstEvent = events[0];
            const lastEvent = events[events.length - 1];
            
            if (firstEvent.startTime) {
                setStartDateTime(firstEvent.startTime.toISOString().slice(0, 16));
            }
            if (lastEvent.endTime) {
                setEndDateTime(lastEvent.endTime.toISOString().slice(0, 16));
            }
        }
    };

    // Modify listUpcomingEvents to use the unified handler
    const listUpcomingEvents = async () => {
        try {
            // Clear existing events first
            setEvents([]);
            originalEventsRef.current = [];

            const startDate = new Date(startDateTime);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(startDateTime);
            endDate.setHours(23, 59, 59, 999);

            const response = await window.gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': startDate.toISOString(),
                'timeMax': endDate.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            });

            const events = response.result.items;

            if (!events || events.length === 0) {
                // Keep empty state instead of setting default event
                return;
            }

            const convertedEvents = events.map(event => {
                const start = new Date(event.start.dateTime || event.start.date);
                const end = new Date(event.end.dateTime || event.end.date);
                
                return {
                    name: event.summary || 'Untitled Event',
                    duration: Math.round((end - start) / (1000 * 60)),
                    color: event.colorId ? getEventColor(event.colorId) : `#${Math.floor(Math.random()*16777215).toString(16)}`,
                    locked: false,
                    startTime: start,
                    endTime: end
                };
            });

            // Deep clone for both storage points
            originalEventsRef.current = deepClone(convertedEvents);
            setEvents(deepClone(convertedEvents));
            
            setStartDateTime(convertedEvents[0].startTime.toISOString().slice(0, 16));
            setEndDateTime(convertedEvents[convertedEvents.length - 1].endTime.toISOString().slice(0, 16));

        } catch (err) {
            console.error('Error:', err);
            // Keep empty state on error instead of setting default
            setEvents([]);
        }
    };

    // Add this helper function to map Google Calendar color IDs to hex colors
    const getEventColor = (colorId) => {
        const colorMap = {
            '1': '#7986cb', // Lavender
            '2': '#33b679', // Sage
            '3': '#8e24aa', // Grape
            '4': '#e67c73', // Flamingo
            '5': '#f6c026', // Banana
            '6': '#f5511d', // Tangerine
            '7': '#039be5', // Peacock
            '8': '#616161', // Graphite
            '9': '#3f51b5', // Blueberry
            '10': '#0b8043', // Basil
            '11': '#d60000', // Tomato
        };
        return colorMap[colorId] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
    };

    const generateTimeTable = (events, startDateTime) => {
        let currentTime = new Date(startDateTime);
        
        return events.map(event => {
            const eventStart = new Date(currentTime);
            currentTime = new Date(currentTime.getTime() + event.duration * 60000);
            
            // Format time as HH:mm
            const timeFormatter = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            return {
                startTime: timeFormatter.format(eventStart),
                task: event.name,
                duration: `${Math.floor(event.duration / 60)}:${(event.duration % 60).toString().padStart(2, '0')}`,
                endTime: timeFormatter.format(currentTime),
                rawStartTime: eventStart,
                rawEndTime: currentTime
            };
        });
    };

    const parseDurationInput = (input) => {
        try {
            const [name, duration] = input.split(',').map(s => s.trim());
            if (!duration) return { name: input, duration: 0 };

            const hoursMatch = duration.match(/(\d+)h/);
            const minutesMatch = duration.match(/(\d+)m/);
            
            let totalMinutes = 0;
            if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
            if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
            
            if (isNaN(totalMinutes)) {
                console.error('Invalid duration format');
                return { name: input, duration: 0 };
            }
            
            return { name, duration: totalMinutes };
        } catch (error) {
            console.error('Error parsing input:', error);
            return { name: input, duration: 0 };
        }
    };

    const [localUser, setLocalUser] = React.useState(initialUser);

    // Add useEffect for session persistence
    React.useEffect(() => {
        if (localUser) {
            localStorage.setItem('timeDistributionUser', JSON.stringify(localUser));
        }
    }, [localUser]);

    const handleSignOut = () => {
        // Clear localStorage
        localStorage.removeItem('timeDistributionUser');
        // Reset user state
        setLocalUser(null);
        // Optionally reset other state if needed
        setEvents([]);
        setStartDateTime(new Date());
    };

    React.useEffect(() => {
        const validateSession = async () => {
            const savedUser = localStorage.getItem('timeDistributionUser');
            if (savedUser) {
                try {
                    const userInfo = JSON.parse(savedUser);
                    // Optional: Add additional validation here
                    const lastLogin = new Date(userInfo.lastLogin);
                    const now = new Date();
                    const daysSinceLogin = (now - lastLogin) / (1000 * 60 * 60 * 24);
                    
                    if (daysSinceLogin > 30) {
                        // Session expired
                        handleSignOut();
                        return;
                    }
                    
                    setLocalUser(userInfo);
                } catch (error) {
                    console.error('Session validation error:', error);
                    handleSignOut();
                }
            }
        };

        validateSession();
    }, []);

    // Add this before any Google Calendar operation
    const validateAndRefreshToken = async () => {
        const token = window.gapi.client.getToken();
        if (!token) {
            console.log('No token found, initiating sign-in');
            await handleSignIn();
            return false;
        }

        // Check if token is expired
        const tokenData = JSON.parse(localStorage.getItem('googleAuthToken'));
        if (tokenData && tokenData.expiresAt < new Date().getTime()) {
            console.log('Token expired, refreshing...');
            await handleSignIn();
            return false;
        }

        return true;
    };

    // Modify deleteExistingEvents
    const deleteExistingEvents = async (startDate, endDate) => {
        try {
            // Validate token first
            const isValid = await validateAndRefreshToken();
            if (!isValid) {
                throw new Error('Authentication failed');
            }

            // Rest of your delete logic
            const response = await window.gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': startDate.toISOString(),
                'timeMax': endDate.toISOString(),
                'showDeleted': false,
                'singleEvents': true
            });

            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const events = response.result.items;
            if (!events || events.length === 0) {
                console.log('No existing events found');
                return true;
            }

            // Delete each event
            const deletePromises = events.map(event => 
                window.gapi.client.calendar.events.delete({
                    'calendarId': 'primary',
                    'eventId': event.id
                })
            );

            await Promise.all(deletePromises);
            console.log(`Deleted ${events.length} existing events`);
            return true;
        } catch (error) {
            console.error('Error deleting events:', error);
            return false;
        }
    };

    // Modify syncToCalendar function
    const syncToCalendar = async () => {
        if (!window.gapi.client) {
            alert('Please sign in with Google first');
            return;
        }

        try {
            setSyncing(true);
            
            // Set up time range for the day
            const startDate = new Date(startDateTime);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(startDateTime);
            endDate.setHours(23, 59, 59, 999);

            // Delete existing events first
            const deletionSuccess = await deleteExistingEvents(startDate, endDate);
            if (!deletionSuccess) {
                throw new Error('Failed to clear existing events');
            }

            // Continue with creating new events
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timeTable = generateTimeTable(events, startDateTime);

            const createPromises = timeTable.map(event => {
                const eventResource = {
                    'summary': event.task,
                    'start': {
                        'dateTime': event.rawStartTime.toISOString(),
                        'timeZone': timeZone
                    },
                    'end': {
                        'dateTime': event.rawEndTime.toISOString(),
                        'timeZone': timeZone
                    },
                    'description': `Duration: ${event.duration}`,
                    'reminders': {
                        'useDefault': true
                    }
                };

                return window.gapi.client.calendar.events.insert({
                    'calendarId': 'primary',
                    'resource': eventResource
                });
            });

            const results = await Promise.all(createPromises);
            console.log('All events created:', results);
            alert('Successfully synced to calendar!');

        } catch (error) {
            console.error('Sync error:', error);
            alert(`Error syncing to calendar: ${error.message || 'Unknown error'}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleAuthRevoke = async () => {
        try {
            // Clear GAPI token
            window.gapi.client.setToken('');
            localStorage.removeItem('googleAuthToken');
            
            // Redirect to sign out
            window.location.href = 'https://accounts.google.com/logout';
            
            console.log("Google sign-out successful");
        } catch (error) {
            console.error('Error revoking token:', error);
            localStorage.removeItem('googleAuthToken');
        }
    };

    const validateGoogleAuth = () => {
        const token = window.gapi.client.getToken();
        if (!token) {
            console.log('No token found, initiating sign-in');
            handleSignIn();
            return false;
        }
        return true;
    };

    // Add this with your other state declarations - with safety check
    const [localIsGoogleSignedIn, setLocalIsGoogleSignedIn] = React.useState(initialIsGoogleSignedIn || false);

    // Add this function to handle token storage
    const saveGoogleToken = (token) => {
        const tokenData = {
            ...token,
            timestamp: new Date().getTime(),
            expiresAt: new Date().getTime() + (token.expires_in * 1000)
        };
        localStorage.setItem('googleAuthToken', JSON.stringify(tokenData));
    };

    // Add token restoration on component mount
    React.useEffect(() => {
        const restoreGoogleAuth = async () => {
            try {
                const savedToken = localStorage.getItem('googleAuthToken');
                if (savedToken) {
                    const tokenData = JSON.parse(savedToken);
                    
                    // Check if token is expired
                    if (tokenData.expiresAt > new Date().getTime()) {
                        // Restore token to GAPI client
                        window.gapi.client.setToken(tokenData);
                        setLocalIsGoogleSignedIn(true);
                        await listUpcomingEvents();
                    } else {
                        // Token expired, remove it
                        localStorage.removeItem('googleAuthToken');
                    }
                }
            } catch (error) {
                console.error('Error restoring Google auth:', error);
                localStorage.removeItem('googleAuthToken');
            }
        };

        if (initialGapiInited && initialGisInited) {
            restoreGoogleAuth();
        }
    }, [initialGapiInited, initialGisInited]);

    // Add getLockStyles function
    const getLockStyles = (lockState) => {
        switch(lockState) {
            case 0:
                return {
                    bg: 'bg-gray-500 hover:bg-gray-600',
                    text: 'Lock'
                };
            case 1:
                return {
                    bg: 'bg-blue-500 hover:bg-blue-600',
                    text: 'Duration Lock'
                };
            case 2:
                return {
                    bg: 'bg-purple-500 hover:bg-purple-600',
                    text: 'Full Lock'
                };
            default:
                return {
                    bg: 'bg-gray-500 hover:bg-gray-600',
                    text: 'Lock'
                };
        }
    };

    // Add lock helper functions
    const isLocked = (event) => {
        if (event.lockState === undefined) return false;
        return event.lockState > 0;
    };

    const isFullyLocked = (event) => {
        return event.lockState === 2;
    };

    const isDurationLocked = (event) => {
        return event.lockState >= 1;
    };

    const canModifyDuration = (event) => event.lockState < 1;
    const canModifyEvent = (event) => event.lockState < 2;

    const updateEventDuration = (index, newDuration) => {
        if (!canModifyDuration(events[index])) return;
        // ... existing duration update logic
    };

    const handleDateChange = (index, newDate) => {
        if (!canModifyEvent(events[index])) return;
        
        const newEvents = [...events];
        const currentEvent = newEvents[index];
        
        // Preserve the time from the original date
        const originalDate = new Date(currentEvent.startTime);
        newDate.setHours(originalDate.getHours());
        newDate.setMinutes(originalDate.getMinutes());
        
        // Update current event
        currentEvent.startTime = newDate;
        currentEvent.rawStartTime = new Date(newDate);
        currentEvent.endTime = new Date(newDate.getTime() + currentEvent.duration * 60000);
        
        // Update subsequent events
        for (let i = index + 1; i < newEvents.length; i++) {
            if (newEvents[i].lockState === 2) continue;
            const event = newEvents[i];
            event.startTime = new Date(event.startTime.getTime() + timeDiff);
            event.rawStartTime = new Date(event.startTime);
            event.endTime = new Date(event.endTime.getTime() + 
                (newEvents[i].duration * 60000));
        }
        
        setEvents(newEvents);
    };

    const [isTimeInputActive, setIsTimeInputActive] = React.useState({});

    const toggleTimeInput = (index) => {
        setIsTimeInputActive(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleTimeInputChange = (index, timeString) => {
        if (!canModifyDuration(events[index])) return;
        
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;
        
        const totalMinutes = (hours * 60) + minutes;
        const maxDuration = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        
        if (totalMinutes > maxDuration) return;
        
        const newEvents = [...events];
        newEvents[index].duration = totalMinutes;
        setEvents(newEvents);
    };

    // Add validation function for terminal tags
    const validateTerminalTag = (value) => {
        const terminalPattern = /\[terminal\]/i;
        return terminalPattern.test(value);
    };

    const formatDateTimeForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    };

    const handleStartTimeChange = (index, newStartTime) => {
        if (!canModifyEvent(events[index])) return;
        
        const newEvents = [...events];
        const currentEvent = newEvents[index];
        
        // Convert input to Date object
        const newStartDate = new Date(newStartTime);
        const oldStartTime = new Date(currentEvent.startTime);
        
        // Calculate time difference in milliseconds
        const timeDiff = newStartDate.getTime() - oldStartTime.getTime();
        
        // Update current event
        currentEvent.startTime = newStartDate;
        currentEvent.duration = Math.floor((new Date(currentEvent.endTime).getTime() - newStartDate.getTime()) / 60000);
        
        // Update subsequent events
        for (let i = index + 1; i < newEvents.length; i++) {
            if (newEvents[i].lockState === 2) continue;
            
            const event = newEvents[i];
            const eventStartTime = new Date(event.startTime);
            event.startTime = new Date(eventStartTime.getTime() + timeDiff);
            event.endTime = new Date(event.startTime.getTime() + (event.duration * 60000));
        }
        
        setEvents(newEvents);
        
        // Update top-level state
        if (index === 0) {
            setStartDateTime(formatDateTimeForInput(newStartDate));
        }
    };

    const handleEndTimeChange = (index, newEndTime) => {
        if (!canModifyEvent(events[index])) return;
        
        const newEvents = [...events];
        const currentEvent = newEvents[index];
        
        // Convert to Date objects
        const newEndDate = new Date(newEndTime);
        const startDate = new Date(currentEvent.startTime);
        
        // Calculate new duration
        const newDuration = Math.floor((newEndDate.getTime() - startDate.getTime()) / 60000);
        if (newDuration <= 0) {
            console.error('End time must be after start time');
            return;
        }
        
        // Update current event
        currentEvent.duration = newDuration;
        currentEvent.endTime = newEndDate;
        
        // Update subsequent events
        let nextStartTime = new Date(newEndDate);
        for (let i = index + 1; i < newEvents.length; i++) {
            if (newEvents[i].lockState === 2) continue;
            
            const event = newEvents[i];
            event.startTime = nextStartTime;
            nextStartTime = new Date(nextStartTime.getTime() + (event.duration * 60000));
            event.endTime = nextStartTime;
        }
        
        setEvents(newEvents);
        
        // Update top-level state if it's the last event
        if (index === events.length - 1) {
            setEndDateTime(formatDateTimeForInput(newEndDate));
        }
    };

    // Add Claude schedule generation function
    const generateClaudeSchedule = async () => {
        if (!claudeInput) return;
        
        try {
            setIsGenerating(true);
            const schedule = await window.claudeService.generateSchedule(claudeInput);
            setTubularInput(schedule); // Set the schedule in the tubular input field
            setClaudeInput(''); // Clear the Claude input field
        } catch (error) {
            console.error('Error generating schedule with Claude:', error);
            alert('Failed to generate schedule. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Process calendar events when they change
    React.useEffect(() => {
        if (initialCalendarEvents && initialCalendarEvents.length > 0) {
            const processedEvents = initialCalendarEvents.map(event => ({
                name: event.summary || 'Untitled Event',
                duration: calculateDurationInMinutes(event.start.dateTime, event.end.dateTime),
                color: event.colorId ? getEventColor(event.colorId) : '#4ECDC4',
                lockState: 2, // Fully locked as it's from Google Calendar
                startTime: new Date(event.start.dateTime),
                endTime: new Date(event.end.dateTime),
                durationTime: formatDuration(calculateDurationInMinutes(event.start.dateTime, event.end.dateTime)),
                rawStartTime: new Date(event.start.dateTime),
                isTerminal: false
            }));

            // Store original events for potential revert
            originalEventsRef.current = deepClone(processedEvents);
            
            // Update events state
            setEvents(processedEvents);
            
            // Update date range based on calendar events
            if (processedEvents.length > 0) {
                const firstEvent = processedEvents[0];
                const lastEvent = processedEvents[processedEvents.length - 1];
                setStartDateTime(getLocalDateTime(firstEvent.startTime));
                setEndDateTime(getLocalDateTime(lastEvent.endTime));
            }
        }
    }, [initialCalendarEvents]);

    const calculateDurationInMinutes = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.round((endDate - startDate) / (1000 * 60));
    };

    // Add EditModal component
    const EditModal = ({ isOpen, onClose, field, value, onSave, event }) => {
        const [editValue, setEditValue] = React.useState(value);
        
        if (!isOpen) return null;

        const handleSave = () => {
            onSave(editValue);
            onClose();
        };

        const renderInput = () => {
            switch (field) {
                case 'date':
                    return (
                        <input
                            type="date"
                            value={editValue.split('T')[0]}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    );
                case 'task':
                    return (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    );
                case 'duration':
                    return (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Format: 1h 30m"
                            className="w-full p-2 border rounded"
                        />
                    );
                case 'startTime':
                case 'endTime':
                    return (
                        <input
                            type="datetime-local"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    );
                default:
                    return null;
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-medium mb-4">Edit {field}</h3>
                    {renderInput()}
                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Add handleSave function
    const handleSave = (value) => {
        const index = editMode.index;
        const field = editMode.field;
        const newEvents = [...events];

        switch (field) {
            case 'date':
                const newDate = new Date(value);
                handleDateChange(index, newDate);
                break;
            case 'task':
                newEvents[index].name = value;
                setEvents(newEvents);
                break;
            case 'duration':
                const durationMatch = value.match(/(\d+)h\s*(\d+)m/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const totalMinutes = (hours * 60) + minutes;
                    handleDurationChangeInTable(index, totalMinutes);
                }
                break;
            case 'startTime':
                const newStartTime = new Date(value);
                handleStartTimeChange(index, newStartTime);
                break;
            case 'endTime':
                const newEndTime = new Date(value);
                handleEndTimeChange(index, newEndTime);
                break;
        }

        setEditMode({ index: null, field: null, value: null });
    };

    const handleInsertTask = (index) => {
        const newEvent = {
            name: "New Task",
            duration: 30,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            lockState: 0,
            startTime: new Date(),
            endTime: new Date(),
            isTerminal: false
        };
        
        const newEvents = [...events];
        newEvents.splice(index, 0, newEvent);
        setEvents(newEvents);
        
        // Reference existing time recalculation
        handleTimeRecalculation(newEvents);
    };

    const handleQuickInsert = (index, duration) => {
        const newEvent = {
            name: `${duration}min Task`,
            duration: duration,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            lockState: 0,
            startTime: new Date(),
            endTime: new Date(),
            isTerminal: false
        };
        
        const newEvents = [...events];
        newEvents.splice(index, 0, newEvent);
        
        // Recalculate times for all events
        handleTimeRecalculation(newEvents);
        setEvents(newEvents);
    };

    // Add handleTimeRecalculation function
    const handleTimeRecalculation = (newEvents) => {
        let currentTime = new Date(startDateTime);
        
        newEvents.forEach((event, index) => {
            event.startTime = new Date(currentTime);
            currentTime = new Date(currentTime.getTime() + event.duration * 60000);
            event.endTime = new Date(currentTime);
            event.rawStartTime = new Date(event.startTime);
        });

        setEvents(newEvents);
        
        // Update end time if needed
        if (newEvents.length > 0) {
            const lastEvent = newEvents[newEvents.length - 1];
            setEndDateTime(formatDateTimeForInput(lastEvent.endTime));
        }
    };

    // Add handleEdit function
    const handleEdit = (index, field) => {
        if (events[index].lockState === 2) return; // Don't allow editing if fully locked
        
        let value;
        switch (field) {
            case 'date':
                value = events[index].startTime.toISOString().split('T')[0];
                break;
            case 'task':
                value = events[index].name;
                break;
            case 'duration':
                value = `${Math.floor(events[index].duration / 60)}h ${events[index].duration % 60}m`;
                break;
            case 'startTime':
                value = events[index].startTime.toISOString().slice(0, 16);
                break;
            case 'endTime':
                value = events[index].endTime.toISOString().slice(0, 16);
                break;
        }
        
        setEditMode({ index, field, value });
    };

    // Add control toggle state
    const [showControls, setShowControls] = React.useState(false);

    // Add AI modal state
    const [showAIModal, setShowAIModal] = React.useState(false);
    const [selectedDuration, setSelectedDuration] = React.useState(null);
    const [aiTaskPrompt, setAiTaskPrompt] = React.useState('');
    const [isAIGenerating, setIsAIGenerating] = React.useState(false);

    // Add selected intersection state
    const [selectedIntersection, setSelectedIntersection] = React.useState({ index: null, duration: null });
    const [showCustomDurationModal, setShowCustomDurationModal] = React.useState(false);
    const [customDuration, setCustomDuration] = React.useState(30);

    // Modify handleQuickInsert to work with two-step process
    const handleIntersectionDurationSelect = (index, duration) => {
        setSelectedIntersection({ index, duration });
    };

    // Add custom duration modal handler
    const handleCustomDurationSelect = () => {
        setShowCustomDurationModal(true);
    };

    // Modify AI task generation to use selected duration
    const handleAITaskGeneration = (index) => {
        // Set default duration if none selected
        const duration = selectedIntersection.duration || 30;
        setSelectedDuration(duration);
        setSelectedIntersection(prev => ({ ...prev, index: index }));
        setShowAIModal(true);
    };

    // Modify AI task insertion to use tubular data parsing
    const handleAITaskInsert = async (index) => {
        if (!aiTaskPrompt || index === null) return;
        
        setIsAIGenerating(true);
        try {
            const duration = selectedIntersection.duration || selectedDuration;
            
            // Format the prompt for Claude to generate schedule in our required format
            const claudePrompt = `Generate a detailed schedule breakdown for: "${aiTaskPrompt}".
            Total duration must be exactly ${duration} minutes.
            Format your response exactly like this example, with tabs between columns:
            26/11/2024\tTask Name\t0:30:00\t26/11/2024, 17:45:00\t26/11/2024, 18:15:00

            Requirements:
            - Use exactly this format with tabs between columns
            - Date should be DD/MM/YYYY
            - Duration should be in HH:mm:ss format
            - Times should include date and time with comma: DD/MM/YYYY, HH:mm:ss
            - Total duration must equal ${duration} minutes`;

            // Get schedule from Claude
            const response = await window.claudeService.generateSchedule(claudePrompt);
            
            if (!response || response.error) {
                throw new Error(response?.error || 'Failed to generate schedule');
            }

            console.log('Claude Response:', response);

            // Parse the response into tasks without using parseTubularData
            const rows = response.trim().split('\n');
            const parsedTasks = rows.map((row) => {
                const [date, task, duration] = row.split('\t');
                
                // Convert HH:mm:ss to minutes
                const [hours, minutes] = duration.split(':').map(Number);
                const durationInMinutes = (hours * 60) + minutes;

                return {
                    name: task,
                    duration: durationInMinutes,
                    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                    lockState: 0,
                    isTerminal: false
                };
            });
            
            if (!parsedTasks || parsedTasks.length === 0) {
                throw new Error('No valid tasks found in Claude\'s response');
            }

            // Calculate total duration of parsed tasks
            const totalGeneratedDuration = parsedTasks.reduce((sum, task) => sum + task.duration, 0);
            if (totalGeneratedDuration !== duration) {
                throw new Error(`Generated schedule duration (${totalGeneratedDuration}m) does not match requested duration (${duration}m)`);
            }

            // Insert the parsed tasks at the intersection point
            const newEvents = [...events];
            parsedTasks.forEach((task, i) => {
                newEvents.splice(selectedIntersection.index + i, 0, task);
            });
            
            // Recalculate times for all events
            handleTimeRecalculation(newEvents);
            setEvents(newEvents);
            
            // Reset states
            setShowAIModal(false);
            setAiTaskPrompt('');
            setSelectedDuration(null);
            setSelectedIntersection({ index: null, duration: null });
            
        } catch (error) {
            console.error('Error generating AI tasks:', error);
            alert(`Failed to generate tasks: ${error.message}`);
        } finally {
            setIsAIGenerating(false);
        }
    };

    // Modify AI task generation to use Claude
    const generateAITasks = async (prompt, totalDuration) => {
        try {
            // Format the prompt for Claude to understand the duration constraint
            const claudePrompt = `Generate a detailed schedule breakdown for the following task: "${prompt}". 
            The total duration must be exactly ${totalDuration} minutes.
            Format each task as: "Task Name | Duration in minutes"
            Make sure the durations sum up to exactly ${totalDuration} minutes.`;

            // Call Claude service (assuming it's available through window.claudeService)
            const response = await window.claudeService.generateSchedule(claudePrompt);
            
            // Parse Claude's response into tasks
            // Expected format from Claude: "Task Name | Duration"
            const tasks = response.split('\n')
                .filter(line => line.includes('|'))
                .map(line => {
                    const [name, duration] = line.split('|').map(s => s.trim());
                    return {
                        name: name,
                        duration: parseInt(duration)
                    };
                });

            // Validate total duration
            const totalGeneratedDuration = tasks.reduce((sum, task) => sum + task.duration, 0);
            if (totalGeneratedDuration !== totalDuration) {
                throw new Error('Generated schedule duration does not match requested duration');
            }

            return tasks;
        } catch (error) {
            console.error('Error generating tasks with Claude:', error);
            // Fallback to a single task if Claude fails
            return [{
                name: prompt,
                duration: totalDuration
            }];
        }
    };

    return (
        <div className="container mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Enhanced Time Distribution Tool</h1>
            
            {/* Add Google Calendar Integration Button */}
            <div className="mb-6 flex flex-col items-center">
                <button
                    onClick={localIsGoogleSignedIn ? handleAuthRevoke : handleSignIn}
                    disabled={!(initialGapiInited || false) || !(initialGisInited || false)}
                    className={`px-4 py-2 rounded-lg 
                        ${(!(initialGapiInited || false) || !(initialGisInited || false)) 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : localIsGoogleSignedIn
                                ? 'bg-gray-700 hover:bg-gray-800 text-white'  // Dark grey for signed in state
                                : 'bg-blue-500 hover:bg-blue-600 text-white'  // Original blue for signed out state
                        }`}
                >
                    {localIsGoogleSignedIn ? 'Sign Out from Google Calendar' : 'Sign in with Google Calendar'}
                </button>
            </div>

            {/* Show calendar events if any */}
            {(initialCalendarEvents || []).length > 0 && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow">
                    <h3 className="font-medium mb-2">Imported Calendar Events</h3>
                    <div className="max-h-40 overflow-y-auto">
                        {(initialCalendarEvents || []).map((event, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded mb-2">
                                <div className="font-medium">{event.summary}</div>
                                <div className="text-sm text-gray-600">
                                    {new Date(event.start.dateTime).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Enter Tubular Data:</label>
                <textarea
                    value={tubularInput}
                    onChange={(e) => setTubularInput(e.target.value)}
                    placeholder="Paste tubular data here..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-32"
                />
                <button
                    onClick={handleSubmit}
                    className="mt-2 bg-blue-500 text-white p-2 rounded"
                >
                    Submit Tubular Data
                </button>
            </div>
    
            <div className="mb-4 flex justify-between">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date/Time:</label>
                    <div className="flex items-center">
                        <input 
                            type="datetime-local" 
                            value={startDateTime} 
                            onChange={(e) => setStartDateTime(e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setStartDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date/Time:</label>
                    <div className="flex items-center">
                        <input 
                            type="datetime-local" 
                            value={endDateTime} 
                            onChange={(e) => setEndDateTime(e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setEndDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                </div>
            </div>
    
            <div className="flex justify-center mb-8">
                <svg id="chart"></svg>
            </div>
    
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <input 
                        type="text" 
                        value={newEventName} 
                        onChange={(e) => setNewEventName(e.target.value)} 
                        placeholder="New event name" 
                        className="mr-2 p-2 border rounded"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addNewEvent();
                            }
                        }}
                    />
                    <button onClick={addNewEvent} className="bg-blue-500 text-white p-2 rounded">
                        Add Event
                    </button>
                    <button onClick={undoDelete} className="bg-gray-500 text-white p-2 rounded ml-2">
                        Undo Delete
                    </button>
                    
                    <button 
                        onClick={handleRevert} 
                        disabled={!originalEventsRef.current.length}
                        className="bg-purple-500 text-white p-2 rounded ml-2"
                    >
                        Revert to Original
                    </button>
                </div>
                <div>
                    <button 
                        onClick={distributeTimeEqually} 
                        className="bg-green-500 text-white p-2 rounded mr-2"
                        disabled={areTasksEquallyDistributed()}
                    >
                        Distribute Equally
                    </button>
                    <button 
                        onClick={distributeTimeProportionally} 
                        className="bg-yellow-500 text-white p-2 rounded"
                    >
                        Distribute Proportionally
                    </button>
                </div>
            </div>
    
            <p className="mt-8 text-center text-lg font-semibold text-gray-700">
                Total time: {totalTime.days} days, {totalTime.hours} hours, {totalTime.minutes} minutes
            </p>
    
            <div className="mt-8 relative">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Schedule</span>
                    <button 
                        onClick={() => setShowControls(!showControls)}
                        className={`flex items-center space-x-1 text-sm ${showControls ? 'text-blue-600' : 'text-gray-600'} hover:text-gray-800`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Control</span>
                    </button>
                </div>
                <table className="min-w-full bg-white" ref={tableRef}>
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Time</th>
                            <th className="py-2 px-4 border-b">Task</th>
                            <th className="py-2 px-4 border-b">Duration</th>
                            <th className="py-2 px-4 border-b">End Time</th>
                            <th className="py-2 px-4 border-b">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {generateTimeTable(events, startDateTime).map((row, index) => (
                            <React.Fragment key={index}>
                                <tr 
                                    className="group relative transition-all duration-200 ease-in-out hover:bg-gray-50"
                                    onMouseEnter={() => setHoverIndex(index)}
                                    onMouseLeave={() => setHoverIndex(null)}
                                >
                                    <td className="py-2 px-4 border-b">
                                        <div className="flex items-center justify-between">
                                            <span>{row.startTime}</span>
                                                    <button
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleEdit(index, 'startTime')}
                                            >
                                                <svg className="w-4 h-4 text-gray-500 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                    </button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <div className="flex items-center justify-between">
                                            <span className={events[index].isTerminal ? 'font-mono' : ''}>{row.task}</span>
                                                        <button
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleEdit(index, 'task')}
                                            >
                                                <svg className="w-4 h-4 text-gray-500 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                        </button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <div className="flex flex-col items-center justify-between">
                                            <span className={showControls ? "text-[13px] mb-1" : ""}>{Math.floor(events[index].duration / 60)}h {events[index].duration % 60}m</span>
                                            {showControls && (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="range"
                                                        min="5"
                                                        max="480"
                                                        step="5"
                                                        value={events[index].duration}
                                                        onChange={(e) => handleDurationChangeInTable(index, parseInt(e.target.value))}
                                                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                        disabled={events[index].lockState >= 1}
                                                    />
                                                </div>
                                            )}
                                            <button 
                                                className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                                                onClick={() => handleEdit(index, 'duration')}
                                            >
                                                <svg className="w-4 h-4 text-gray-500 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <div className="flex items-center justify-between">
                                            <span>{row.endTime}</span>
                                            <button 
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleEdit(index, 'endTime')}
                                            >
                                                <svg className="w-4 h-4 text-gray-500 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <div className="flex space-x-2">
                                            {showControls && (
                                                <>
                                            <div className="relative">
                                                <button
                                                    onClick={() => cycleLock(index)}
                                                    className={`
                                                        p-1.5 rounded text-white text-xs font-medium
                                                        transition-colors duration-200
                                                        ${getLockStyles(events[index].lockState).bg}
                                                    `}
                                                >
                                                    {getLockStyles(events[index].lockState).text}
                                                </button>
                                            </div>
                                                    <button
                                                        onClick={() => deleteEventInTable(index)}
                                                        className="bg-red-500 text-white p-1 rounded text-xs"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => reorderEventsInTable(index, 'up')}
                                                className="bg-green-500 text-white p-1 rounded text-xs"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => reorderEventsInTable(index, 'down')}
                                                className="bg-yellow-500 text-white p-1 rounded text-xs"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {/* Add intersection row */}
                                <tr 
                                    className={`h-2 group/intersection relative transition-all duration-200 ease-in-out
                                        ${hoverIndex === index ? 'bg-gray-100' : 'hover:bg-gray-100'}
                                        ${selectedIntersection.index === index + 1 ? 'bg-blue-50' : ''}`}
                                >
                                    <td colSpan="5" className="relative p-0">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/intersection:opacity-100 transition-opacity">
                                            <div className="flex space-x-2">
                                            <button
                                                    onClick={() => handleQuickInsert(index + 1, 15)}
                                                    className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                                                >
                                                    +15m
                                                </button>
                                                <button
                                                    onClick={() => handleQuickInsert(index + 1, 30)}
                                                    className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                                                >
                                                    +30m
                                                </button>
                                                <button
                                                    onClick={() => handleQuickInsert(index + 1, 60)}
                                                    className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-600"
                                                >
                                                    +1h
                                                </button>
                                                <button
                                                    onClick={() => handleCustomDurationSelect()}
                                                    className="bg-purple-500 text-white text-xs px-2 py-1 rounded hover:bg-purple-600"
                                                >
                                                    Custom
                                                </button>
                                                <button
                                                    onClick={() => handleAITaskGeneration(index)}
                                                    className={`bg-indigo-500 text-white text-xs px-2 py-1 rounded hover:bg-indigo-600 flex items-center`}
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    AI
                                            </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={copyTableToClipboard}
                className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded shadow-lg hover:bg-blue-600 transition-colors"
            >
                Copy Table
            </button>

            {localUser && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        Signed in as {localUser.name}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 
                                 transition-colors text-sm"
                    >
                        Sign Out
                    </button>
                </div>
            )}

            <button
                onClick={syncToCalendar}
                disabled={syncing || !initialGapiInited || !initialGisInited}
                className={`fixed bottom-4 left-4 p-2 rounded shadow-lg 
                            transition-colors flex items-center gap-2
                            ${syncing 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500 hover:bg-green-600'} 
                            text-white`}
            >
                <div className="flex items-center">
                    {syncing ? (
                        <div className="flex items-center">
                            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Syncing...
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Sync to Calendar
                        </div>
                    )}
                </div>
            </button>

            {/* Add Claude input UI in the return statement after the Google Calendar integration button */}
            <div className="mb-6 flex flex-col items-center">
                <div className="w-full max-w-2xl">
                    <textarea
                        value={claudeInput}
                        onChange={(e) => setClaudeInput(e.target.value)}
                        placeholder="Describe your schedule needs..."
                        className="w-full p-4 border rounded-lg shadow-sm focus:border-blue-500 focus:outline-none"
                        rows={4}
                    />
                    <button
                        onClick={generateClaudeSchedule}
                        disabled={!claudeInput || isGenerating}
                        className={`mt-2 px-4 py-2 rounded-lg w-full
                            ${!claudeInput || isGenerating
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {isGenerating ? 'Generating Schedule...' : 'Generate Schedule with Claude'}
                    </button>
                </div>
            </div>

            {/* Add EditModal component */}
            <EditModal
                isOpen={editMode.index !== null}
                onClose={() => setEditMode({ index: null, field: null, value: null })}
                field={editMode.field}
                value={editMode.value}
                onSave={handleSave}
                event={events[editMode.index]}
            />

            {/* Add AI Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium mb-4">Generate AI Task ({selectedDuration}min)</h3>
                        <textarea
                            value={aiTaskPrompt}
                            onChange={(e) => setAiTaskPrompt(e.target.value)}
                            placeholder="Describe the task you want to generate..."
                            className="w-full p-2 border rounded mb-4 h-32"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowAIModal(false);
                                    setAiTaskPrompt('');
                                    setSelectedDuration(null);
                                    setSelectedIntersection({ index: null, duration: null });
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAITaskInsert(selectedIntersection.index)}
                                disabled={!aiTaskPrompt}
                                className={`px-4 py-2 rounded text-white
                                    ${!aiTaskPrompt
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                {isAIGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Custom Duration Modal */}
            {showCustomDurationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium mb-4">Set Custom Duration</h3>
                        <div className="flex items-center space-x-2 mb-4">
                            <input
                                type="number"
                                min="5"
                                max="480"
                                value={customDuration}
                                onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                                className="w-20 p-2 border rounded"
                            />
                            <span>minutes</span>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowCustomDurationModal(false);
                                    setCustomDuration(30);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleIntersectionDurationSelect(selectedIntersection.index, customDuration);
                                    setShowCustomDurationModal(false);
                                    setCustomDuration(30);
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Set Duration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
