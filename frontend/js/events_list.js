let allEvents = [];
let registeredEventIds = [];
let attendedEventIds = [];
const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');

// Load all events and registered events on page load
window.addEventListener("DOMContentLoaded", async function() {
    if (!userId) {
        document.getElementById("eventsGrid").innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔐</div>
                <h2>Please log in</h2>
                <p>You need to log in to view and register for events.</p>
                <a href="login_student.html" style="color: #667eea; text-decoration: none; font-weight: 600;">Go to Login</a>
            </div>
        `;
        return;
    }

    await loadEvents();
    await loadRegisteredEvents();
    setupSearch();
    displayEvents(allEvents);
});

// Load all available events
async function loadEvents() {
    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events`);
        if (response.ok) {
            allEvents = await response.json();
            console.log("Loaded events:", allEvents);
        }
    } catch (error) {
        console.error("Error loading events:", error);
        document.getElementById("eventsGrid").innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h2>Error loading events</h2>
                <p>Could not connect to the server. Please try again later.</p>
            </div>
        `;
    }
}

// Load user's registered and attended events
async function loadRegisteredEvents() {
    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/users/${userId}/events`);
        if (response.ok) {
            const data = await response.json();
            // Handle both response formats
            const registeredEvents = data.registered_events || [];
            const attendedEvents = data.attended_events || [];
            
            registeredEventIds = registeredEvents.map(event => event.id);
            attendedEventIds = attendedEvents.map(event => event.id);
            
            console.log("Registered events:", registeredEventIds);
            console.log("Attended events:", attendedEventIds);
        }
    } catch (error) {
        console.error("Error loading registered events:", error);
    }
}

// Display events in grid
function displayEvents(eventsToDisplay) {
    const grid = document.getElementById("eventsGrid");

    if (eventsToDisplay.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📭</div>
                <h2>No events found</h2>
                <p>There are currently no events available.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = eventsToDisplay.map(event => {
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleString();
        const isFull = event.registered_count >= event.capacity;
        const isRegistered = registeredEventIds.includes(event.id);
        const isAttended = attendedEventIds.includes(event.id);
        const spotsLeft = event.capacity - event.registered_count;
        
        // Check if event has passed
        const now = new Date();
        const eventHasPassed = eventDate < now;
        
        // Allow feedback if registered AND event has passed
        const canGiveFeedback = isRegistered && eventHasPassed;

        return `
            <div class="event-card">
                <div class="event-header">
                    <h3>${event.title}</h3>
                    <div class="club-name">📍 ${event.club_name}</div>
                </div>
                <div class="event-body">
                    <p class="event-description">${event.description}</p>
                    
                    <div class="event-meta">
                        <div class="meta-item">
                            <span>📅</span>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="meta-item">
                            <span>📍</span>
                            <span>${event.location}</span>
                        </div>
                        <div class="meta-item">
                            <span>👥</span>
                            <span>${event.registered_count}/${event.capacity} registered</span>
                        </div>
                    </div>

                    <div class="capacity-bar">
                        <div class="capacity-fill" style="width: ${(event.registered_count / event.capacity) * 100}%"></div>
                    </div>
                    <div class="capacity-text">${spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event is full'}</div>

                    ${isRegistered ? `<div class="registered-badge">✓ You're registered</div>` : ''}
                    ${isAttended ? `<div class="attended-badge">✓ You attended</div>` : ''}
                    ${eventHasPassed && isRegistered ? `<div class="past-badge">📅 Event Passed</div>` : ''}
                    ${isFull && !isRegistered ? `<div class="full-badge">Event Full</div>` : ''}

                    <div class="event-actions">
                        ${canGiveFeedback
                            ? `<button class="feedback-btn" onclick="openFeedbackModal(${event.id}, '${event.title.replace(/'/g, "\\'")}'${event.event_date ? `, '${event.event_date.replace(/'/g, "\\'")}'` : ''})" title="Share your feedback">⭐ Leave Feedback</button>`
                            : ''
                        }
                        ${isRegistered && !canGiveFeedback
                            ? `<button class="cancel-btn" onclick="cancelRegistration(${event.id}, '${event.title}')">Cancel Registration</button>`
                            : !isRegistered ? `<button class="register-btn" onclick="registerForEvent(${event.id}, '${event.title}')" ${isFull ? 'disabled' : ''}>Register</button>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// Register for an event
async function registerForEvent(eventId, eventTitle) {
    if (!userId) {
        alert("Please log in first");
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events/${eventId}/register?user_id=${userId}`, {
            method: "POST"
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Successfully registered for "${eventTitle}"!`);
            // Reload registered events to ensure cache is fresh
            await loadRegisteredEvents();
            displayEvents(allEvents);
        } else {
            alert(data.detail || "Error registering for event");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error registering for event");
    }
}

// Cancel event registration
async function cancelRegistration(eventId, eventTitle) {
    if (!confirm(`Are you sure you want to cancel registration for "${eventTitle}"?`)) {
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events/${eventId}/register/${userId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration cancelled!");
            // Reload registered events to ensure cache is fresh
            await loadRegisteredEvents();
            displayEvents(allEvents);
        } else {
            alert(data.detail || "Error cancelling registration");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error cancelling registration");
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", function() {
        const query = this.value.toLowerCase();
        const filtered = allEvents.filter(event => 
            event.title.toLowerCase().includes(query) ||
            event.description.toLowerCase().includes(query) ||
            event.club_name.toLowerCase().includes(query)
        );
        displayEvents(filtered);
    });
}
