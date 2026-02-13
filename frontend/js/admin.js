    window.addEventListener("DOMContentLoaded" , () => {
        document.querySelector(".fade-in")?.classList.add("show");
        loadClubs();
        loadPendingRequests();
        loadEvents();
    });

    console.log("Admin dashboard loaded");

    // Dynamic greeting
    const adminId = localStorage.getItem('user_id');
    const adminName = localStorage.getItem('user_name') || "Admin";
    const hour = new Date().getHours();

    let greeting = "Welcome";
    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }

    document.getElementById("greeting").innerText =
        greeting + ", " + adminName;



   
async function loadClubs(){
    const container = document.getElementById("myClubs");
    if (!container) return;

    const adminId = localStorage.getItem('user_id');
    
    try {
        const apiUrl = await getWorkingApiUrl();
        const url = adminId 
            ? `${apiUrl}/clubs?admin_id=${adminId}`
            : `${apiUrl}/clubs`;
        
        const response = await fetch(url);
        const clubs = await response.json();
       
        container.innerHTML = "";
        
        if (clubs.length === 0){
            container.innerHTML = "<p style='text-align: center; color: #999;'>No clubs added yet</p>";
            return;
        }

        clubs.forEach(club => {
            const div = document.createElement("div");
            div.className = "class-card";
            const objectivesText = club.objectives ? `<strong>Objectives:</strong> ${club.objectives}<br>` : "";
            const activitiesText = club.activities ? `<strong>Activities:</strong> ${club.activities}<br>` : "";
            div.innerHTML = `
                <h4 style='color: #1976d2; margin-bottom: 10px;'>${club.name}</h4>
                <p><strong>Description:</strong> ${club.description}</p>
                ${objectivesText}
                ${activitiesText}
                <div style='margin-top: 12px; font-size: 13px; color: #666;'>Members: ${club.member_count || 0}</div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading clubs:", err);
        container.innerHTML = "<p style='color: red;'>Error loading clubs</p>";
    }
}

async function loadPendingRequests() {
    const container = document.getElementById("pendingRequests");
    if (!container) return;

    const adminId = localStorage.getItem('user_id');
    console.log("Loading pending requests for admin ID:", adminId);

    try {
        const apiUrl = await getWorkingApiUrl();
        
        // Get all clubs for this admin
        const clubsResponse = await fetch(`${apiUrl}/clubs?admin_id=${adminId}`);
        console.log("Clubs response status:", clubsResponse.status);
        
        if (!clubsResponse.ok) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>No clubs found</p>";
            return;
        }

        const clubs = await clubsResponse.json();
        console.log("Admin clubs:", clubs);
        let allPendingRequests = [];

        // Fetch pending requests for each club
        for (const club of clubs) {
            console.log("Processing club:", club.name, "ID:", club.id);
            
            try {
                const clubResponse = await fetch(`${apiUrl}/clubs/${club.id}`);
                console.log("Club response status:", clubResponse.status);
                
                if (!clubResponse.ok) continue;

                const clubData = await clubResponse.json();
                console.log("Club data:", clubData);
                console.log("Pending field:", clubData.pending);
                
                const pendingIds = clubData.pending ? clubData.pending.split(',').filter(id => id.trim()) : [];
                console.log("Pending IDs:", pendingIds);

                // Get user details for each pending request
                for (const userId of pendingIds) {
                    try {
                        console.log("Fetching user:", userId.trim());
                        const userResponse = await fetch(`${apiUrl}/users/${userId.trim()}`);
                        console.log("User response status:", userResponse.status);
                        
                        if (userResponse.ok) {
                            const user = await userResponse.json();
                            console.log("User data:", user);
                            
                            allPendingRequests.push({
                                clubId: club.id,
                                clubName: club.name,
                                userId: user.id,
                                userName: user.name,
                                userEmail: user.email
                            });
                        }
                    } catch (e) {
                        console.error("Error fetching user:", userId, e);
                    }
                }
            } catch (e) {
                console.error("Error fetching club:", club.id, e);
            }
        }

        console.log("All pending requests:", allPendingRequests);

        // Display pending requests
        container.innerHTML = "";

        if (allPendingRequests.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>No pending requests</p>";
            return;
        }

        allPendingRequests.forEach(request => {
            const div = document.createElement("div");
            div.className = "request-card";
            div.innerHTML = `
                <h4>${request.userName}</h4>
                <div class="request-info">
                    <div><strong>Club:</strong> ${request.clubName}</div>
                    <div><strong>Email:</strong> ${request.userEmail}</div>
                    <div><strong>User ID:</strong> #${request.userId}</div>
                </div>
                <div class="request-actions">
                    <button class="btn-approve" onclick="approveRequest(${request.clubId}, ${request.userId}, '${request.userName}')">Approve</button>
                    <button class="btn-reject" onclick="rejectRequest(${request.clubId}, ${request.userId}, '${request.userName}')">Reject</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading pending requests:", err);
        container.innerHTML = "<p style='color: red;'>Error loading pending requests</p>";
    }
}

async function approveRequest(clubId, userId, userName) {
    if (!confirm(`Approve ${userName}'s request to join this club?`)) {
        return;
    }

    const adminId = localStorage.getItem('user_id');

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(
            `${apiUrl}/clubs/${clubId}/approve/${userId}?admin_id=${adminId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            alert(`${userName} has been approved!`);
            loadPendingRequests(); // Reload the list
        } else {
            alert("Failed to approve request: " + (data.detail || "Unknown error"));
        }
    } catch (error) {
        console.error("Error approving request:", error);
        alert("Error approving request");
    }
}

async function rejectRequest(clubId, userId, userName) {
    if (!confirm(`Reject ${userName}'s request to join this club?`)) {
        return;
    }

    const adminId = localStorage.getItem('user_id');

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(
            `${apiUrl}/clubs/${clubId}/reject/${userId}?admin_id=${adminId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            alert(`${userName}'s request has been rejected!`);
            loadPendingRequests(); // Reload the list
        } else {
            alert("Failed to reject request: " + (data.detail || "Unknown error"));
        }
    } catch (error) {
        console.error("Error rejecting request:", error);
        alert("Error rejecting request");
    }
}

// Load and display events for admin's clubs
async function loadEvents() {
    const container = document.getElementById("myEvents");
    if (!container) return;

    const adminId = localStorage.getItem('user_id');
    
    if (!adminId) {
        container.innerHTML = "<p style='text-align: center; color: #999;'>Please log in</p>";
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        
        // Get all clubs for this admin
        const clubsResponse = await fetch(`${apiUrl}/clubs?admin_id=${adminId}`);
        
        if (!clubsResponse.ok) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>No events yet</p>";
            return;
        }

        const clubs = await clubsResponse.json();
        const adminClubIds = clubs.map(club => club.id);

        if (adminClubIds.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>Create a club first to add events</p>";
            return;
        }

        // Get all events
        const eventsResponse = await fetch(`${apiUrl}/events`);
        if (!eventsResponse.ok) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>No events yet</p>";
            return;
        }

        const allEvents = await eventsResponse.json();

        // Filter events that belong to admin's clubs
        const adminEvents = allEvents.filter(event => adminClubIds.includes(event.club_id));

        container.innerHTML = "";

        if (adminEvents.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>No events created yet</p>";
            return;
        }

        // Display events
        adminEvents.forEach(event => {
            const div = document.createElement("div");
            div.className = "event-card";
            
            // Format the event date
            const eventDate = new Date(event.event_date);
            const formattedDate = eventDate.toLocaleString();
            
            div.innerHTML = `
                <h4>${event.title}</h4>
                <div class="event-details">
                    <p><strong>Club:</strong> ${event.club_name}</p>
                    <p><strong>Description:</strong> ${event.description}</p>
                </div>
                <div class="event-meta">
                    <span>📅 ${formattedDate}</span>
                    <span>📍 ${event.location}</span>
                    <span>👥 ${event.registered_count}/${event.capacity}</span>
                </div>
                <button class="btn-delete-event" onclick="deleteEvent(${event.id}, '${event.title}')">Delete Event</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading events:", err);
        container.innerHTML = "<p style='color: red;'>Error loading events</p>";
    }
}

// Delete event function
async function deleteEvent(eventId, eventTitle) {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
        return;
    }

    const adminId = localStorage.getItem('user_id');

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(
            `${apiUrl}/events/${eventId}?admin_id=${adminId}`,
            { method: 'DELETE' }
        );

        if (response.ok) {
            alert("Event deleted successfully!");
            loadEvents(); // Reload the list
        } else {
            const data = await response.json();
            alert("Failed to delete event: " + (data.detail || "Unknown error"));
        }
    } catch (error) {
        console.error("Error deleting event:", error);
        alert("Error deleting event");
    }
}

// Populate feedback event dropdown
async function populateEventDropdown() {
    const adminId = localStorage.getItem('user_id');
    const select = document.getElementById('feedbackEventSelect');
    
    if (!select || !adminId) return;
    
    try {
        const apiUrl = await getWorkingApiUrl();
        
        // Get admin's clubs
        const clubsResponse = await fetch(`${apiUrl}/clubs?admin_id=${adminId}`);
        const clubs = await clubsResponse.json();
        const adminClubIds = clubs.map(c => c.id);
        
        // Get all events
        const eventsResponse = await fetch(`${apiUrl}/events`);
        const allEvents = await eventsResponse.json();
        
        // Filter to show only events from admin's clubs
        const adminEvents = allEvents.filter(e => adminClubIds.includes(e.club_id));
        
        // Clear and populate dropdown
        select.innerHTML = '<option value="">Select an event...</option>';
        
        adminEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.title} (${event.club_name})`;
            select.appendChild(option);
        });
        
        console.log("Populated event dropdown with", adminEvents.length, "events");
    } catch (error) {
        console.error("Error populating event dropdown:", error);
        select.innerHTML = '<option value="">Error loading events</option>';
    }
}

// Load and display feedback for selected event
async function loadSelectedEventFeedback() {
    const select = document.getElementById('feedbackEventSelect');
    const eventId = select.value;
    const container = document.getElementById('feedbackContainer');
    
    if (!eventId) {
        alert('Please select an event first');
        return;
    }
    
    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events/${eventId}/feedback`);
        
        if (!response.ok) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No feedback yet for this event</p>';
            return;
        }
        
        const feedbacks = await response.json();
        
        if (!feedbacks || feedbacks.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No feedback yet for this event</p>';
            return;
        }
        
        // Calculate summary
        const avgRating = (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
        
        // Display summary
        let html = `
            <div class="feedback-summary">
                <h3>Feedback Summary</h3>
                <p><strong>Average Rating:</strong> ${avgRating} / 5 ⭐</p>
                <p><strong>Total Feedback:</strong> ${feedbacks.length}</p>
            </div>
            <div class="feedback-list">
        `;
        
        // Display individual feedbacks
        feedbacks.forEach(feedback => {
            const stars = '⭐'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
            html += `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <strong>${feedback.user_name}</strong>
                        <span class="feedback-rating">${stars} (${feedback.rating}/5)</span>
                    </div>
                    <div class="feedback-comment">${feedback.comment}</div>
                    <small style="color: #999;">${new Date(feedback.created_at).toLocaleString()}</small>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error("Error loading feedback:", error);
        container.innerHTML = '<p style="color: red;">Error loading feedback</p>';
    }
}

// Reload event dropdown
async function reloadEventDropdown() {
    await populateEventDropdown();
    document.getElementById('feedbackEventSelect').value = '';
    document.getElementById('feedbackContainer').innerHTML = '';
}

// Initialize feedback dropdown on page load
window.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        populateEventDropdown();
    }, 1000); // Wait for other things to load first
});