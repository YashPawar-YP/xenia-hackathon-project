let allRequests = [];
let adminId = null;
let adminClubs = [];

document.addEventListener('DOMContentLoaded', function() {
    adminId = localStorage.getItem('user_id');
    
    if (!adminId) {
        showError("Not logged in", "Please log in as an admin first.");
        setTimeout(() => window.location.href = 'admin.html', 2000);
        return;
    }

    loadPendingRequests();
});

// Reload data when user returns to the tab
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        console.log("User returned to tab, reloading requests...");
        loadPendingRequests();
    }
});

async function loadPendingRequests() {
    try {
        const apiUrl = await getWorkingApiUrl();
        
        // First, get all clubs for this admin
        const clubsResponse = await fetch(`${apiUrl}/clubs?admin_id=${adminId}`);
        if (!clubsResponse.ok) throw new Error("Failed to load clubs");
        
        adminClubs = await clubsResponse.json();

        // Build club dropdown
        const clubFilter = document.getElementById('clubFilter');
        clubFilter.innerHTML = '<option value="">All Clubs</option>';
        adminClubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club.id;
            option.textContent = club.name;
            clubFilter.appendChild(option);
        });

        // Now get pending requests for each club
        allRequests = [];
        for (const club of adminClubs) {
            try {
                const response = await fetch(`${apiUrl}/clubs/${club.id}`);
                if (!response.ok) continue;

                const clubData = await response.json();
                const pending = clubData.pending ? clubData.pending.split(',') : [];

                // Get user details for each pending request
                for (const userId of pending) {
                    if (!userId.trim()) continue;

                    try {
                        const userResponse = await fetch(`${apiUrl}/users/${userId.trim()}`);
                        if (userResponse.ok) {
                            const user = await userResponse.json();
                            allRequests.push({
                                clubId: club.id,
                                clubName: club.name,
                                userId: user.id,
                                userName: user.name,
                                userEmail: user.email,
                                requestDate: new Date().toLocaleDateString()
                            });
                        }
                    } catch (e) {
                        console.error("Error fetching user:", e);
                    }
                }
            } catch (e) {
                console.error("Error fetching club:", e);
            }
        }

        displayRequests();
        updateStats();

    } catch (error) {
        console.error("Error loading pending requests:", error);
        showError("Error", "Failed to load join requests. Please try again.");
    }
}

function displayRequests() {
    const requestsList = document.getElementById('requestsList');
    
    if (allRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h2>No Pending Requests</h2>
                <p>All join requests have been processed or there are no new requests.</p>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = '';

    const filteredRequests = getFilteredRequests();
    
    filteredRequests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h3>${request.userName}</h3>
                    <span class="badge badge-club">${request.clubName}</span>
                </div>
                <span class="badge badge-pending">Pending</span>
            </div>

            <div class="request-details">
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${request.userEmail}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">User ID</span>
                    <span class="detail-value">#${request.userId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Request Date</span>
                    <span class="detail-value">${request.requestDate}</span>
                </div>
            </div>

            <div class="request-actions">
                <button class="btn-approve" onclick="approveRequest(${request.clubId}, ${request.userId}, '${request.userName}')">
                    ✓ Approve
                </button>
                <button class="btn-reject" onclick="rejectRequest(${request.clubId}, ${request.userId}, '${request.userName}')">
                    ✕ Reject
                </button>
            </div>
        `;
        requestsList.appendChild(requestElement);
    });
}

function getFilteredRequests() {
    const clubFilter = document.getElementById('clubFilter').value;
    
    if (!clubFilter) {
        return allRequests;
    }

    return allRequests.filter(request => request.clubId == clubFilter);
}

function filterRequests() {
    displayRequests();
}

async function approveRequest(clubId, userId, userName) {
    if (!confirm(`Approve ${userName}'s request to join this club?`)) {
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(
            `${apiUrl}/clubs/${clubId}/approve/${userId}?admin_id=${adminId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            // Remove from the list
            allRequests = allRequests.filter(
                r => !(r.clubId === clubId && r.userId === userId)
            );

            displayRequests();
            updateStats();
            showSuccess("Request Approved", `${userName} has been approved to join the club.`);
        } else {
            showError("Approval Failed", data.detail || "Failed to approve request.");
        }
    } catch (error) {
        console.error("Error approving request:", error);
        showError("Error", "Failed to process approval. Please try again.");
    }
}

async function rejectRequest(clubId, userId, userName) {
    if (!confirm(`Reject ${userName}'s request to join this club?`)) {
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        const response = await fetch(
            `${apiUrl}/clubs/${clubId}/reject/${userId}?admin_id=${adminId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            // Remove from the list
            allRequests = allRequests.filter(
                r => !(r.clubId === clubId && r.userId === userId)
            );

            displayRequests();
            updateStats();
            showSuccess("Request Rejected", `${userName}'s request has been rejected.`);
        } else {
            showError("Rejection Failed", data.detail || "Failed to reject request.");
        }
    } catch (error) {
        console.error("Error rejecting request:", error);
        showError("Error", "Failed to process rejection. Please try again.");
    }
}

function updateStats() {
    const filteredRequests = getFilteredRequests();
    
    document.getElementById('totalRequests').textContent = allRequests.length;
    document.getElementById('totalPending').textContent = filteredRequests.length;
}

function showSuccess(title, message) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').classList.add('show');

    setTimeout(() => {
        closeModal('successModal');
    }, 3000);
}

function showError(title, message) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').classList.add('show');

    setTimeout(() => {
        closeModal('errorModal');
    }, 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    
    if (event.target === successModal) {
        successModal.classList.remove('show');
    }
    if (event.target === errorModal) {
        errorModal.classList.remove('show');
    }
}
