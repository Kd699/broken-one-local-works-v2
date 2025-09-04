function calculateTotalTime(startDateTime, endDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMilliseconds = end - start;
    const totalMinutes = diffMilliseconds / 60000;

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return {
        totalMinutes,
        formattedTime: { days, hours, minutes }
    };
}

function updateChart(events, totalMinutes) {
    // Clear existing chart
    d3.select('#chart').selectAll('*').remove();

    // Set dimensions
    const width = 800;
    const height = 60;

    // Create SVG container
    const svg = d3.select('#chart')
        .attr('width', width)
        .attr('height', height);

    // Ensure we have valid events and totalMinutes
    if (!events || events.length === 0 || !totalMinutes) {
        console.warn('No events or total minutes to display');
        return;
    }

    // Calculate cumulative positions with validation
    let currentX = 0;
    const segments = events
        .filter(event => event && typeof event.duration === 'number') // Validate events
        .map(event => {
            const percentage = (event.duration / totalMinutes);
            const segmentWidth = width * percentage;
            const segment = {
                x: currentX,
                width: segmentWidth,
                event: event
            };
            currentX += segmentWidth;
            return segment;
        });

    // Create segments
    segments.forEach(segment => {
        svg.append('rect')
            .attr('x', segment.x)
            .attr('y', 0)
            .attr('width', Math.max(1, segment.width)) // Ensure minimum width
            .attr('height', height)
            .attr('fill', segment.event.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseover', function(e) {
                const percentage = ((segment.event.duration / totalMinutes) * 100).toFixed(1);
                const hours = Math.floor(segment.event.duration / 60);
                const minutes = segment.event.duration % 60;
                
                d3.select(this).attr('opacity', 0.8);
                
                const tooltip = d3.select('body')
                    .append('div')
                    .attr('class', 'task-tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.8)')
                    .style('color', 'white')
                    .style('padding', '8px 12px')
                    .style('border-radius', '4px')
                    .style('font-size', '14px')
                    .style('pointer-events', 'none')
                    .style('z-index', 1000)
                    .html(`
                        <strong>${segment.event.name}</strong><br>
                        Duration: ${hours}h ${minutes}m<br>
                        ${percentage}% of total time
                    `)
                    .style('left', `${e.pageX + 10}px`)
                    .style('top', `${e.pageY - 10}px`);
            })
            .on('mousemove', function(e) {
                d3.select('.task-tooltip')
                    .style('left', `${e.pageX + 10}px`)
                    .style('top', `${e.pageY - 10}px`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 1);
                d3.select('.task-tooltip').remove();
            });
    });
}

function formatDateTime(dateTimeString) {
    const dateTime = new Date(dateTimeString);
    
    // Format with specific options
    const formattedDateTime = dateTime.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'  // Explicitly handle UTC times
    });

    return formattedDateTime;
}


function generateTimeTable(events, startDateTime) {
    let currentTime = new Date(startDateTime);
    return events.map(event => {
        const startTimeStr = formatDateTime(currentTime);
        const rawStartTime = new Date(currentTime);
        currentTime = new Date(currentTime.getTime() + event.duration * 60000);
        const endTimeStr = formatDateTime(currentTime);
        
        return {
            date: rawStartTime.toLocaleDateString(),
            task: event.name,
            duration: `${Math.floor(event.duration / 60)}:${(event.duration % 60).toString().padStart(2, '0')}`,
            startTime: startTimeStr,
            endTime: endTimeStr,
            rawStartTime: rawStartTime,
            rawEndTime: new Date(currentTime)
        };
    });
}
