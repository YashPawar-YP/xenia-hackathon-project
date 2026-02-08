document.addEventListener("DOMContentLoaded", () => {
    
    const addClubForm = document.getElementById("addClubForm");

    if (!addClubForm) { return; }

      addClubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
    
    
    const name = document.getElementById("clubName").value.trim();
    const description = document.getElementById("clubDescription").value.trim();


    if(!name || !description){
        alert("Fill all fields");
        return;
    }

    const response = await 
    fetch("http://127.0.0.1:8000/clubs" , {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    });


    const data = await response.json();
    if (response.ok){
        alert("Club added");
        loadClubs();

        document.getElementById("addClubForm").reset();
    }
    
});
});

