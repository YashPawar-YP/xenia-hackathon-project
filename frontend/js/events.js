// Load clubs for the logged-in admin
async function loadAdminClubs() {
    const clubSelect = document.getElementById("club");
    const adminId = localStorage.getItem('user_id');

    if (!adminId) {
        clubSelect.innerHTML = '<option value="">Please log in first</option>';
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/clubs?admin_id=${adminId}`);
        const clubs = await response.json();

        clubSelect.innerHTML = '<option value="">Select a club...</option>';

        if (clubs.length === 0) {
            clubSelect.innerHTML = '<option value="">No clubs found. Create a club first!</option>';
            return;
        }

        clubs.forEach(club => {
            const option = document.createElement("option");
            option.value = club.id;
            option.textContent = club.name;
            clubSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading clubs:", error);
        clubSelect.innerHTML = '<option value="">Error loading clubs</option>';
    }
}

// Handle form submission
document.getElementById("eventForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const clubId = document.getElementById("club").value;
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const eventDate = document.getElementById("eventDate").value;
    const location = document.getElementById("location").value;
    const capacity = document.getElementById("capacity").value;
    const socialPromo = document.getElementById("socialPromo").value;
    const adminId = localStorage.getItem('user_id');

    // Clear previous errors
    document.getElementById("clubError").textContent = "";
    document.getElementById("titleError").textContent = "";
    document.getElementById("descriptionError").textContent = "";
    document.getElementById("eventDateError").textContent = "";
    document.getElementById("locationError").textContent = "";
    document.getElementById("capacityError").textContent = "";

    // Validation
    if (!clubId) {
        document.getElementById("clubError").textContent = "Please select a club";
        return;
    }

    if (!title || title.trim() === "") {
        document.getElementById("titleError").textContent = "Title is required";
        return;
    }

    if (!description || description.trim() === "") {
        document.getElementById("descriptionError").textContent = "Description is required";
        return;
    }

    if (!eventDate) {
        document.getElementById("eventDateError").textContent = "Date and time are required";
        return;
    }

    if (!location || location.trim() === "") {
        document.getElementById("locationError").textContent = "Location is required";
        return;
    }

    if (!capacity || capacity < 1) {
        document.getElementById("capacityError").textContent = "Capacity must be at least 1";
        return;
    }

    // Convert datetime-local to ISO format
    const isoDateTime = new Date(eventDate).toISOString();

    try {
        const response = await fetch(`http://127.0.0.1:8000/events?admin_id=${adminId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                club_id: parseInt(clubId),
                title: title,
                description: description,
                event_date: isoDateTime,
                location: location,
                capacity: parseInt(capacity),
                social_promo_text: socialPromo || null
            })
        });

        const data = await response.json();
        console.log("Response:", data);

        if (response.ok) {
            // Show success message
            document.getElementById("successMessage").style.display = "block";
            document.getElementById("eventForm").reset();
            loadAdminClubs();

            // Reset form after showing success
            setTimeout(() => {
                document.getElementById("successMessage").style.display = "none";
                window.location.href = "admin.html";
            }, 2000);
        } else {
            alert(data.detail || "Error creating event");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error creating event. Please try again.");
    }
});

// Load clubs when page loads
window.addEventListener("DOMContentLoaded", function() {
    loadAdminClubs();
});
