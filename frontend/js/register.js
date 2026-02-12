document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: "student"
            })
        });

        const data = await response.json();
        console.log("Response status:", response.status);
        console.log("Response data:", data);
        
        if (response.ok) {
            // Registration successful
            alert("Registration successful! Please log in with your credentials.");
            // Redirect to login page
            window.location.href = "login_student.html";
        } else {
            // Registration failed, show error
            if (data.detail) {
                alert(data.detail);
            } else {
                alert("Registration failed. Please try again.");
            }
        }
    } catch (error) {
        console.error("Full error:", error);
        alert("Error: " + error.message + "\n\nMake sure the backend server is running on http://127.0.0.1:8000");
    }
});
