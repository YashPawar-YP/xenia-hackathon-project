document.addEventListener("DOMContentLoaded", () => {
    
    const addClubForm = document.getElementById("addClubForm");

    if (!addClubForm) { return; }

    addClubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const adminId = localStorage.getItem('user_id');
        if (!adminId) {
            alert("You must be logged in as an admin to create a club");
            return;
        }
    
        const name = document.getElementById("clubName").value.trim();
        const description = document.getElementById("clubDescription").value.trim();
        const objectives = document.getElementById("clubObjectives").value.trim();
        const activities = document.getElementById("clubActivities").value.trim();

        if(!name || !description){
            alert("Please fill in at least Club Name and Description");
            return;
        }

        try {
            const response = await fetch("http://127.0.0.1:8000/clubs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    description: description,
                    objectives: objectives,
                    activities: activities,
                    admin_id: parseInt(adminId)
                })
            });

            const data = await response.json();
            if (response.ok){
                alert("Club added successfully!");
                // Redirect back to admin dashboard
                window.location.href = "admin.html";
            } else {
                alert("Failed to add club: " + (data.detail || "Unknown error"));
            }
        } catch (err) {
            alert("Error: " + err.message);
            console.error(err);
        }
    });
});

