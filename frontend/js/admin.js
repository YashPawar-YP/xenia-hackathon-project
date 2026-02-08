    window.addEventListener("DOMContentLoaded" , () => {
        document.querySelector(".fade-in")?.classList.add("show");
        loadClubs();
    });

    console.log("Admin dashboard loaded");

    // Dynamic greeting
    const adminName = "Nilesh";
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

    const response = await 
    fetch("http://127.0.0.1:8000/clubs");

    const clubs = await response.json();
   
    container.innerHTML = "";
    
    if (clubs.lenght === 0){
        container.innerHTML = "<p>No clubs added yet</p>";
        return;
    }
    clubs.forEach(club => {
        const div = document.createElement("div");
        div.className = "class-card";
        div.innerHTML= `<h4>${club.name}</h4><p>${club.description}</p>`;
        container.appendChild(div);
    });
}



 