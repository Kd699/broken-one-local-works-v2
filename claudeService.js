// Claude API service for schedule generation
window.claudeService = {
    generateSchedule: async (userInput) => {
        try {
            const response = await fetch('https://us-central1-spacetime-dist.cloudfunctions.net/api/generate-schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userInput })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`Failed to generate schedule: ${errorData.error}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            return data.schedule;
        } catch (error) {
            console.error('Error generating schedule:', error);
            throw error;
        }
    }
}; 