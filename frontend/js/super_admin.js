// Super Admin Dashboard JavaScript

let superAdminId = null;
let currentAction = null;
let currentUserId = null;

window.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".fade-in")?.classList.add("show");
    
    // Get and convert superAdminId to integer
    const storedId = localStorage.getItem('user_id');
    superAdminId = storedId ? parseInt(storedId) : null;
    
    const userName = localStorage.getItem('user_name') || "Super Admin";
    
    if (!superAdminId) {
        window.location.href = "super_admin_login.html";
        return;
    }

    // Set greeting
    const hour = new Date().getHours();
    let greeting = "Welcome";
    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }
    
    document.getElementById("greeting").innerText = greeting + ", " + userName;
    document.getElementById("user-info").innerText = userName + " (Super Admin) - ID: " + superAdminId;

    loadDashboardData();
});

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} show`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="border: none; background: none; cursor: pointer; font-size: 18px; color: inherit;">&times;</button>
    `;
    alertContainer.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        const apiUrl = await getWorkingApiUrl();
        
        console.log("Loading dashboard for super admin ID:", superAdminId, "Type:", typeof superAdminId);
        
        // Fetch dashboard statistics
        const dashResponse = await fetch(
            `${apiUrl}/superadmin/dashboard?super_admin_id=${superAdminId}`
        );
        
        if (!dashResponse.ok) {
            const errorText = await dashResponse.text();
            console.error("Dashboard response not ok:", dashResponse.status, errorText);
            throw new Error('Failed to load dashboard: ' + dashResponse.status);
        }

        const dashData = await dashResponse.json();
        console.log("Dashboard data:", dashData);
        
        // Update statistics
        document.getElementById('total-users').textContent = dashData.total_users;
        document.getElementById('total-students').textContent = dashData.total_students;
        document.getElementById('total-admins').textContent = dashData.total_club_admins;
        document.getElementById('total-clubs').textContent = dashData.total_clubs;

        // Load users
        await loadAllUsers();
    } catch (error) {
        console.error("Error loading dashboard:", error);
        showAlert('Error loading dashboard data: ' + error.message, 'error');
    }
}

// Load all users
async function loadAllUsers() {
    try {
        const apiUrl = await getWorkingApiUrl();
        
        console.log("Loading users for super admin ID:", superAdminId, "Type:", typeof superAdminId);
        
        const url = `${apiUrl}/superadmin/users?super_admin_id=${superAdminId}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);

        console.log("Users response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error('Failed to load users: ' + response.status + ' - ' + errorText);
        }

        const users = await response.json();
        console.log("Users loaded:", users);
        
        const tbody = document.getElementById('usersTableBody');
        const emptyMessage = document.getElementById('empty-users-message');

        if (!users || users.length === 0) {
            tbody.innerHTML = '';
            emptyMessage.style.display = 'block';
            return;
        }

        emptyMessage.style.display = 'none';
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Determine role badge class
            let roleBadgeClass = 'role-student';
            if (user.role === 'club_admin') {
                roleBadgeClass = 'role-club-admin';
            } else if (user.role === 'super_admin') {
                roleBadgeClass = 'role-super-admin';
            }

            // Create action buttons
            let actionButtons = '';
            if (user.role === 'super_admin') {
                actionButtons = '<span style="color: #999; font-size: 12px;">Super Admin</span>';
            } else if (user.role === 'student') {
                actionButtons = `
                    <button class="btn-small btn-promote" onclick="promoteToAdmin(${user.id}, '${user.name.replace(/'/g, "\\'")}')">
                        Promote to Admin
                    </button>
                `;
            } else if (user.role === 'club_admin') {
                if (user.clubs_managed > 0) {
                    actionButtons = `
                        <button class="btn-small btn-demote" disabled title="Has ${user.clubs_managed} club(s)">
                            Demote (Has Clubs)
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button class="btn-small btn-demote" onclick="demoteToStudent(${user.id}, '${user.name.replace(/'/g, "\\'")}', ${user.clubs_managed})">
                            Demote to Student
                        </button>
                    `;
                }
            }

            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <div class="user-info">
                        <div class="user-name">${escapeHtml(user.name)}</div>
                        <div class="user-email">${escapeHtml(user.email)}</div>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge ${roleBadgeClass}">
                        ${user.role === 'club_admin' ? 'Club Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                </td>
                <td style="text-align: center;">${user.clubs_managed}</td>
                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading users:", error);
        showAlert('Error loading users: ' + error.message, 'error');
    }
}

// Promote user to admin (club_admin, not super_admin)
function promoteToAdmin(userId, userName) {
    currentUserId = userId;
    currentAction = 'promote';
    showConfirmModal(
        `Promote ${userName}?`,
        `Are you sure you want to promote ${userName} to Club Admin?`
    );
}

// Demote user to student
function demoteToStudent(userId, userName, clubsManaged) {
    if (clubsManaged > 0) {
        showAlert(
            `Cannot demote ${userName}. They manage ${clubsManaged} club(s). Reassign clubs first.`,
            'error'
        );
        return;
    }

    currentUserId = userId;
    currentAction = 'demote';
    showConfirmModal(
        `Demote ${userName}?`,
        `Are you sure you want to demote ${userName} to Student?`
    );
}

// Show confirmation modal
function showConfirmModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    currentAction = null;
    currentUserId = null;
}

// Confirm action
async function confirmAction() {
    if (!currentAction || !currentUserId) {
        closeModal();
        return;
    }

    try {
        const apiUrl = await getWorkingApiUrl();
        let endpoint = '';
        
        if (currentAction === 'promote') {
            endpoint = `${apiUrl}/superadmin/promote-to-club-admin?super_admin_id=${superAdminId}`;
        } else if (currentAction === 'demote') {
            endpoint = `${apiUrl}/superadmin/demote-from-club-admin?super_admin_id=${superAdminId}`;
        }

        console.log("Calling endpoint:", endpoint);
        console.log("Sending user_id:", currentUserId, "Type:", typeof currentUserId);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUserId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Action failed');
        }

        const result = await response.json();
        closeModal();
        
        // Show success message
        showAlert(result.message, 'success');
        
        // Reload users after a short delay
        setTimeout(() => {
            loadAllUsers();
            loadDashboardData();
        }, 500);
    } catch (error) {
        console.error("Error performing action:", error);
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Logout function
function logout() {
    // Clear local storage
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    
    // Redirect to login
    window.location.href = 'Student_admin.html';
}