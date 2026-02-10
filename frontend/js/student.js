
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

function joinClub(clubName) {
    const button = event.target;
    
    // Check if already joined
    if (button.classList.contains('joined')) {
        alert('You have already joined this club!');
        return;
    }
    
    // Show success modal
    const modal = document.getElementById('successModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = `You have successfully joined ${clubName}!`;
    modal.classList.add('show');
    
    // Update button
    button.textContent = '✓ Joined';
    button.classList.add('joined');
    
    // Close modal after 2 seconds
    setTimeout(() => {
        modal.classList.remove('show');
    }, 2000);
}

function viewClubEvents(clubName) {
    // Navigate to events page with club name as parameter
    // You can modify this based on your events page structure
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

async function joinClub(clubId) {
    try {
        const res = await fetch(`http://127.0.0.1:8000/clubs/${clubId}/join?user_id=1`,{method: POST}); 
    
    const data = await res.json();
    alert(data.message || "Request sent");
    } catch (error) {
        console.error("Error joining club:", error);

}
        }

    console.log("Student.js loaded");

document.addEventListener("DOMContentLoaded", ()=>{
    console.log("DOM fully loaded and parsed");
    loadClubs();
});

