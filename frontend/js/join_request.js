document.addEventListener("DOMContentLoaded", function() {
    // Get club_id from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const clubId = urlParams.get('club_id');

    if (!clubId) {
        showError("No club selected. Please go back and try again.");
        return;
    }

    // Populate user data from sessionStorage or localStorage
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    const userName = sessionStorage.getItem('user_name') || localStorage.getItem('user_name');
    const userEmail = sessionStorage.getItem('user_email') || localStorage.getItem('user_email');

    if (!userId || !userName) {
        showError("You must be logged in to request membership.");
        setTimeout(() => {
            window.location.href = "login_student.html";
        }, 2000);
        return;
    }

    // Pre-fill form fields
    document.getElementById('fullName').value = userName;
    document.getElementById('userId').value = userId;
    document.getElementById('email').value = userEmail;

    // Fetch club details
    fetchClubDetails(clubId);

    // Handle form submission
    document.getElementById('joinRequestForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await submitJoinRequest(clubId);
    });
});

async function fetchClubDetails(clubId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/clubs/${clubId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch club details");
        }
        const club = await response.json();
        document.getElementById('clubName').textContent = club.name;
    } catch (error) {
        console.error("Error fetching club:", error);
        showError("Could not load club details. Please try again.");
    }
}

async function submitJoinRequest(clubId) {
    const userId = document.getElementById('userId').value;
    const fullName = document.getElementById('fullName').value.trim();

    console.log("Submitting join request - Club ID:", clubId, "User ID:", userId, "Name:", fullName);

    if (!fullName) {
        showError("Please enter your full name");
        return;
    }

    // Show loading state
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';

    try {
        const url = `http://127.0.0.1:8000/clubs/${clubId}/join?user_id=${userId}`;
        console.log("Fetching:", url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        const data = await response.json();
        console.log("Response data:", data);

        if (response.ok) {
            showSuccess("Your request has been sent! The club admin will review it shortly.");
            document.getElementById('joinRequestForm').reset();
            const storedUserName = sessionStorage.getItem('user_name') || localStorage.getItem('user_name');
            const storedUserEmail = sessionStorage.getItem('user_email') || localStorage.getItem('user_email');
            document.getElementById('fullName').value = storedUserName;
            document.getElementById('userId').value = userId;
            document.getElementById('email').value = storedUserEmail;
            
            // Redirect back to student dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'student.html';
            }, 2000);
        } else {
            const errorMsg = data.detail || data.message || "Failed to send request. Please try again.";
            console.error("Request failed:", errorMsg);
            showError(errorMsg);
        }
    } catch (error) {
        console.error("Error submitting join request:", error);
        showError("An error occurred. Please check your connection and try again.");
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function goBack() {
    window.location.href = 'student.html';
}
