// Feedback Form Handler
let currentFeedbackEventId = null;
let currentEventTitle = null;
let currentEventDate = null;

// Function to open feedback modal
async function openFeedbackModal(eventId, eventTitle, eventDate) {
    currentFeedbackEventId = eventId;
    currentEventTitle = eventTitle;
    currentEventDate = eventDate;
    
    // Check if event has passed
    const eventDateTime = new Date(eventDate);
    const now = new Date();
    
    if (eventDateTime > now) {
        alert('Feedback can only be given after the event has ended.');
        return;
    }
    
    // Check if user is registered for this event
    const userId = localStorage.getItem('user_id');
    try {
        const apiUrl = await getWorkingApiUrl();
        const eventResponse = await fetch(`${apiUrl}/events/${eventId}`);
        if (!eventResponse.ok) {
            alert('Event not found');
            return;
        }
        
        const event = await eventResponse.json();
        console.log("Event data:", event);
        
        const registeredUsers = event.registered_users 
            ? event.registered_users.split(",").map(id => id.trim()).filter(id => id) 
            : [];
        
        const userIdString = String(userId).trim();
        
        console.log("User ID from localStorage:", userIdString);
        console.log("Registered users string:", event.registered_users);
        console.log("Parsed registered users array:", registeredUsers);
        console.log("Is user registered?", registeredUsers.includes(userIdString));
        
        if (!registeredUsers.includes(userIdString)) {
            console.error("Registration check failed", {
                userIdString,
                registeredUsers,
                eventId
            });
            alert('You must be registered for this event to provide feedback.');
            return;
        }
    } catch (error) {
        console.error('Error checking event registration:', error);
        alert('Error verifying registration');
        return;
    }
    
    document.getElementById('feedbackEventTitle').textContent = eventTitle;
    document.getElementById('feedbackModal').classList.add('show');
    // Reset rating
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
    document.getElementById('feedbackForm').reset();
}

// Function to close feedback modal
function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('show');
    currentFeedbackEventId = null;
    currentEventTitle = null;
}

// Star rating functionality
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    let currentRating = 0;

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            document.getElementById('ratingValue').value = currentRating;
            
            // Update star display
            stars.forEach((s, i) => {
                if (i < currentRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });

        // Hover effect
        star.addEventListener('mouseenter', () => {
            stars.forEach((s, i) => {
                if (i < index + 1) {
                    s.style.color = '#ffc107';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });

    // Reset hover effect
    document.getElementById('starContainer').addEventListener('mouseleave', () => {
        stars.forEach((star, index) => {
            if (index < currentRating) {
                star.style.color = '#ffc107';
            } else {
                star.style.color = '#ddd';
            }
        });
    });
}

// Submit feedback
async function submitFeedback(e) {
    e.preventDefault();

    const userId = localStorage.getItem('user_id');
    const rating = document.getElementById('ratingValue').value;

    if (!rating) {
        alert('Please select a rating');
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events/${currentFeedbackEventId}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_id: currentFeedbackEventId,
                user_id: parseInt(userId),
                rating: parseInt(rating),
                comment: ""
            })
        });

        if (response.ok) {
            alert('Thank you for your feedback!');
            closeFeedbackModal();
        } else {
            const data = await response.json();
            alert(data.detail || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback: ' + error.message);
    }
}

// Initialize feedback modal when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupStarRating();
    
    // Close modal when clicking outside
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        window.onclick = function(event) {
            if (event.target === modal) {
                closeFeedbackModal();
            }
        };
    }

    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', submitFeedback);
    }

    // Load events for feedback dropdown in admin panel (with a small delay to ensure everything is ready)
    setTimeout(() => {
        loadAdminEventsForFeedback();
    }, 500);
});

// ============= ADMIN FEEDBACK SECTION =============

// Load events for admin feedback dropdown
async function loadAdminEventsForFeedback() {
    const selectElement = document.getElementById('feedbackEventSelect');
    if (!selectElement) {
        console.log('feedbackEventSelect not found - not on admin page');
        return; // Not on admin page
    }

    const adminId = localStorage.getItem('user_id');
    console.log('Admin ID:', adminId);
    if (!adminId) {
        console.warn('No admin ID found in localStorage');
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        console.log('Using API URL:', apiUrl);
        
        const response = await fetch(`${apiUrl}/events`);
        console.log('Events fetch response status:', response.status);

        if (response.ok) {
            const events = await response.json();
            console.log('All events:', events);
            
            // Filter events where the admin is the club admin
            const adminEvents = [];
            
            for (const event of events) {
                const clubResponse = await fetch(`${apiUrl}/clubs/${event.club_id}`);
                if (clubResponse.ok) {
                    const club = await clubResponse.json();
                    console.log(`Club ${event.club_id}:`, club);
                    
                    // Compare as integers
                    if (parseInt(club.admin_id) === parseInt(adminId)) {
                        adminEvents.push(event);
                        console.log('Added event to admin events:', event.title);
                    }
                }
            }

            console.log('Admin events found:', adminEvents.length);

            // Populate dropdown
            if (adminEvents.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No events found for your clubs';
                selectElement.appendChild(option);
            } else {
                adminEvents.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = `${event.title} (${event.club_name})`;
                    selectElement.appendChild(option);
                    console.log('Added option:', option.textContent);
                });
            }
        } else {
            console.error('Failed to fetch events:', response.status);
        }
    } catch (error) {
        console.error('Error loading events for feedback:', error);
        const selectElement = document.getElementById('feedbackEventSelect');
        if (selectElement) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error loading events';
            selectElement.appendChild(option);
        }
    }
}

// Reload event dropdown
async function reloadEventDropdown() {
    const selectElement = document.getElementById('feedbackEventSelect');
    if (!selectElement) return;
    
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    console.log('Reloading event dropdown...');
    await loadAdminEventsForFeedback();
}

// Load selected event feedback
async function loadSelectedEventFeedback() {
    const selectElement = document.getElementById('feedbackEventSelect');
    const selectedEventId = selectElement.value;

    if (!selectedEventId) {
        alert('Please select an event');
        return;
    }

    // Find the event title from the option
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const eventTitle = selectedOption.text.split(' (')[0];

    loadEventFeedback(selectedEventId, eventTitle);
}

// ============= ADMIN FEEDBACK VIEW =============

// Load and display feedback for an event
async function loadEventFeedback(eventId, eventTitle) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    feedbackContainer.innerHTML = '<p>Loading feedback...</p>';

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events/${eventId}/feedback`);

        if (response.ok) {
            const data = await response.json();
            displayEventFeedback(data, eventTitle);
        } else {
            feedbackContainer.innerHTML = '<p>No feedback available yet.</p>';
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbackContainer.innerHTML = '<p>Error loading feedback.</p>';
    }
}

// Display feedback in a formatted way
function displayEventFeedback(data, eventTitle) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    const { feedback, average_rating, total_feedback } = data;

    let html = `
        <div class="feedback-summary">
            <h3>${eventTitle}</h3>
            <div class="rating-summary">
                <div class="average-rating">
                    <div class="rating-value">${average_rating.toFixed(1)}</div>
                    <div class="rating-stars">${'⭐'.repeat(Math.round(average_rating))}</div>
                    <div class="rating-count">(${total_feedback} ${total_feedback === 1 ? 'review' : 'reviews'})</div>
                </div>
            </div>
        </div>
    `;

    if (feedback.length === 0) {
        html += '<p>No feedback yet.</p>';
    } else {
        html += '<div class="feedback-list">';
        feedback.forEach(fb => {
            html += `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <span class="user-name">${fb.user_name}</span>
                        <span class="feedback-rating">${'⭐'.repeat(fb.rating)}</span>
                    </div>
                    <small class="feedback-date">${new Date(fb.created_at).toLocaleDateString()}</small>
                </div>
            `;
        });
        html += '</div>';
    }

    feedbackContainer.innerHTML = html;
}

// Load feedback for all club events
async function loadClubEventsFeedback(clubId) {
    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(`${apiUrl}/events`);

        if (response.ok) {
            const allEvents = await response.json();
            const clubEvents = allEvents.filter(e => e.club_id === clubId);

            if (clubEvents.length === 0) {
                document.getElementById('feedbackContainer').innerHTML = '<p>No events for this club.</p>';
                return;
            }

            let allFeedback = [];
            let totalRating = 0;
            let feedbackCount = 0;

            // Fetch feedback for each event
            for (const event of clubEvents) {
                const feedbackResponse = await fetch(`${apiUrl}/events/${event.id}/feedback`);
                if (feedbackResponse.ok) {
                    const feedbackData = await feedbackResponse.json();
                    feedbackData.feedback.forEach(fb => {
                        allFeedback.push({
                            ...fb,
                            eventTitle: event.title
                        });
                        totalRating += fb.rating;
                        feedbackCount += 1;
                    });
                }
            }

            displayClubFeedback(allFeedback, totalRating, feedbackCount);
        }
    } catch (error) {
        console.error('Error loading club feedback:', error);
        document.getElementById('feedbackContainer').innerHTML = '<p>Error loading feedback.</p>';
    }
}

// Display club feedback
function displayClubFeedback(feedback, totalRating, feedbackCount) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    const avgRating = feedbackCount > 0 ? (totalRating / feedbackCount).toFixed(1) : 0;

    let html = `
        <div class="club-feedback-summary">
            <h3>Club Feedback Summary</h3>
            <div class="rating-summary">
                <div class="average-rating">
                    <div class="rating-value">${avgRating}</div>
                    <div class="rating-stars">${'⭐'.repeat(Math.round(avgRating))}</div>
                    <div class="rating-count">(${feedbackCount} ${feedbackCount === 1 ? 'review' : 'reviews'})</div>
                </div>
            </div>
        </div>
    `;

    if (feedback.length === 0) {
        html += '<p>No feedback yet.</p>';
    } else {
        html += '<div class="feedback-list">';
        feedback.forEach(fb => {
            html += `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <span class="user-name">${fb.user_name}</span>
                        <span class="feedback-rating">${'⭐'.repeat(fb.rating)}</span>
                    </div>
                    <p class="event-name">Event: ${fb.eventTitle}</p>
                    <small class="feedback-date">${new Date(fb.created_at).toLocaleDateString()}</small>
                </div>
            `;
        });
        html += '</div>';
    }

    feedbackContainer.innerHTML = html;
}
