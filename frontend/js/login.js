document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();
        if (response.ok) {
            // Store user info in localStorage
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('user_name', data.name);
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('user_email', data.email || '');
            
            // Login successful, redirect based on role
            if (data.role === "student") {
                window.location.href = "student.html";
            } else if (data.role === "admin" || data.role === "club_admin" || data.role === "super_admin") {
                window.location.href = "admin.html";
            } else {
                alert("Login successful, but unknown role: " + data.role);
            }
        } else {
            // Login failed, show error
            alert(data.detail || "Login failed. Please check your credentials.");
        }
    } catch (error) {
        alert("An error occurred. Please try again later.");
        console.error(error);
    }
});



