
console.log("container", clubsContainer);
console.log("emptyState", emptyState);

// Create ripple effect on click
document.addEventListener('click', function(event) {
    // Check if click is not on a button or interactive element
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A' || 
        event.target.closest('button') || event.target.closest('a')) {
        return;
    }
    
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    ripple.style.left = event.clientX + 'px';
    ripple.style.top = event.clientY + 'px';
    document.body.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
        ripple.remove();
    }, 700);
});

function joinClub(clubId) {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        alert('Please log in first to join a club');
        window.location.href = 'login_student.html';
        return;
    }
    
    // Redirect to join request form
    window.location.href = `join_request.html?club_id=${clubId}`;
}

function viewClubEvents(clubName) {
    // Navigate to events page with club name as parameter
    window.location.href = 'events.html?club=' + encodeURIComponent(clubName);
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        modal.classList.remove('show');
    }
}

document.addEventListener("DOMContentLoaded", loadClubs);

async function loadClubs() {
    const container = document.getElementById("clubsContainer");
    console.log("container element:",container);
    const emptyState = document.getElementById("emptyState");

    console.log("Loading clubs...");

    try {
        const res = await fetch("http://127.0.0.1:8000/clubs");
        const clubs = await res.json();

        console.log("RAW clubs:", clubs);
        console.log("Is array:", Array.isArray(clubs));

        // Clear previous cards
        container.innerHTML = "";

        if (!Array.isArray(clubs) || clubs.length === 0) {
            emptyState.style.display = "block";
            return;
        }

        emptyState.style.display = "none";
        container.style.display = "grid"; // IMPORTANT

        clubs.forEach((club) => {
            console.log("Rendering:", club);

            const clubCard = document.createElement("div");
            clubCard.className = "club-card";

            clubCard.innerHTML = `
                <h3>${club.name}</h3>
                <p>${club.description}</p>
                <button onclick="joinClub(${club.id})">Join</button>
            `;

            container.appendChild(clubCard);
        });

        console.log("Final DOM:", container.innerHTML);

    } catch (error) {
        console.error("Error loading clubs:", error);
    }
}

console.log("Student.js loaded");

document.addEventListener("DOMContentLoaded", ()=>{
    console.log("DOM fully loaded and parsed");
    loadClubs();
});


