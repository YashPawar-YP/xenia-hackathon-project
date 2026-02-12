let allEvents = [];
let registeredEventIds = [];
const userId = localStorage.getItem('user_id');

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
        const response = await fetch("http://127.0.0.1:8000/events");
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

// Load user's registered events
async function loadRegisteredEvents() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/users/${userId}/events`);
        if (response.ok) {
            const data = await response.json();
            // Handle both response formats
            const userEvents = data.registered_events || data || [];
            registeredEventIds = userEvents.map(event => event.id);
            console.log("Registered events:", registeredEventIds);
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
        const spotsLeft = event.capacity - event.registered_count;

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
                    ${isFull && !isRegistered ? `<div class="full-badge">Event Full</div>` : ''}

                    <div class="event-actions">
                        ${isRegistered 
                            ? `<button class="cancel-btn" onclick="cancelRegistration(${event.id}, '${event.title}')">Cancel</button>`
                            : `<button class="register-btn" onclick="registerForEvent(${event.id}, '${event.title}')" ${isFull ? 'disabled' : ''}>Register</button>`
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
        const response = await fetch(`http://127.0.0.1:8000/events/${eventId}/register?user_id=${userId}`, {
            method: "POST"
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Successfully registered for "${eventTitle}"!`);
            registeredEventIds.push(eventId);
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
        const response = await fetch(`http://127.0.0.1:8000/events/${eventId}/register/${userId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration cancelled!");
            registeredEventIds = registeredEventIds.filter(id => id !== eventId);
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
