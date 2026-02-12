// Handles role change for user from Student_admin.html

function setRoleAndRedirect(role, redirectUrl) {
    // Get user id from localStorage/sessionStorage or prompt (for demo)
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        userId = prompt('Enter your user ID:');
        if (!userId) return;
        localStorage.setItem('user_id', userId);
    }

    fetch('http://127.0.0.1:8000/users/' + userId, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: role })
    })
    .then(response => response.json())
    .then(data => {
        if (data.role === role) {
            window.location.href = redirectUrl;
        } else {
            alert('Failed to update role.');
        }
    })
    .catch(err => {
        alert('Error updating role.');
        console.error(err);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const studentBtn = document.querySelector('.btn-student');
    const adminBtn = document.querySelector('.btn-admin');
    if (studentBtn) {
        studentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Just redirect to login_student.html, do not update role
            window.location.href = 'login_student.html';
        });
    }
    if (adminBtn) {
        adminBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Always prompt for admin ID
            let userId = prompt('Enter your Admin ID:');
            if (!userId) return;
            localStorage.setItem('user_id', userId);
            fetch('http://127.0.0.1:8000/users/' + userId, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: 'admin' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.role === 'admin' || data.role === 'club_admin' || data.role === 'super_admin') {
                    window.location.href = 'admin.html';
                } else {
                    alert('Failed to update role.');
                }
            })
            .catch(err => {
                alert('Error updating role.');
                console.error(err);
            });
        });
    }
});
