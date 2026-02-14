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
    console.log("[LOAD EVENTS] adminId from localStorage:", adminId, "type:", typeof adminId);
    
    if (!adminId) {
        container.innerHTML = "<p style='text-align: center; color: #999;'>Please log in</p>";
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        console.log("[LOAD EVENTS] apiUrl:", apiUrl);
        
        // Get all clubs for this admin
        const clubsResponse = await fetch(`${apiUrl}/clubs?admin_id=${adminId}`);
        console.log("[LOAD EVENTS] Clubs response status:", clubsResponse.status);
        
        if (!clubsResponse.ok) {
            console.error("[LOAD EVENTS] Failed to fetch clubs");
            container.innerHTML = "<p style='text-align: center; color: #999;'>No events yet</p>";
            return;
        }

        const clubs = await clubsResponse.json();
        console.log("[LOAD EVENTS] Clubs retrieved:", clubs);
        const adminClubIds = clubs.map(club => club.id);
        console.log("[LOAD EVENTS] Admin club IDs:", adminClubIds);

        if (adminClubIds.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #999;'>Create a club first to add events</p>";
            return;
        }

        // Get all events
        const eventsResponse = await fetch(`${apiUrl}/events`);
        if (!eventsResponse.ok) {
            console.error("[LOAD EVENTS] Failed to fetch events");
            container.innerHTML = "<p style='text-align: center; color: #999;'>No events yet</p>";
            return;
        }

        const allEvents = await eventsResponse.json();
        console.log("[LOAD EVENTS] All events retrieved:", allEvents);

        // Filter events that belong to admin's clubs
        const adminEvents = allEvents.filter(event => adminClubIds.includes(event.club_id));
        console.log("[LOAD EVENTS] Filtered admin events:", adminEvents);

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
            
            // Check if event has passed
            const hasEventPassed = eventDate < new Date();
            
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
                ${hasEventPassed ? `<div style="padding: 12px; background-color: #f5f5f5; border-radius: 6px; margin: 10px 0;">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">📊 Feedback Stats</p>
                    <div id="feedback-stats-${event.id}" style="color: #666; font-size: 13px;">Loading feedback...</div>
                </div>` : '<p style="color: #999; font-size: 13px; margin: 10px 0;">💬 Feedback will be available after event</p>'}
                <button class="btn-delete-event" onclick="deleteEvent(${event.id}, '${event.title}')">Delete Event</button>
            `;
            container.appendChild(div);
            
            // Load feedback stats if event has passed
            if (hasEventPassed) {
                loadFeedbackStats(event.id, adminId, apiUrl);
            }
        });
    } catch (err) {
        console.error("Error loading events:", err);
        container.innerHTML = "<p style='color: red;'>Error loading events</p>";
    }
}

// Load feedback stats for an event
async function loadFeedbackStats(eventId, adminId, apiUrl) {
    try {
        const url = `${apiUrl}/admin/events/${eventId}/feedback-stats?admin_id=${adminId}`;
        console.log("Loading feedback stats from:", url, "adminId:", adminId);
        
        const response = await fetch(url);
        console.log("Feedback stats response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error("Feedback stats error:", response.status, errorData);
            const statsDiv = document.getElementById(`feedback-stats-${eventId}`);
            if (statsDiv) {
                statsDiv.innerHTML = `<span style="color: red;">Error: ${errorData.detail || 'Failed to load'}</span>`;
            }
            return;
        }
        
        const stats = await response.json();
        console.log("Feedback stats data:", stats);
        
        const statsDiv = document.getElementById(`feedback-stats-${eventId}`);
        if (!statsDiv) {
            console.error(`Element with id 'feedback-stats-${eventId}' not found in DOM`);
            return;
        }
        
        if (!stats || stats.total_feedbacks === 0) {
            statsDiv.innerHTML = '<em>No feedback yet</em>';
            return;
        }
        
        // Safely access ratings breakdown (keys are strings in JSON)
        const breakdown = stats.ratings_breakdown || {};
        let breakdownHtml = `
            <strong>⭐ Average: ${stats.average_rating || 0}/5</strong> (${stats.total_feedbacks || 0} responses)<br>
            <div style="margin-top: 8px; font-size: 12px;">
                5⭐: ${breakdown["5"] || breakdown[5] || 0} | 
                4⭐: ${breakdown["4"] || breakdown[4] || 0} | 
                3⭐: ${breakdown["3"] || breakdown[3] || 0} | 
                2⭐: ${breakdown["2"] || breakdown[2] || 0} | 
                1⭐: ${breakdown["1"] || breakdown[1] || 0}
            </div>
        `;
        
        console.log("Setting HTML for feedback stats");
        statsDiv.innerHTML = breakdownHtml;
    } catch (error) {
        console.error("Error loading feedback stats:", error);
        const statsDiv = document.getElementById(`feedback-stats-${eventId}`);
        if (statsDiv) {
            statsDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
        }
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