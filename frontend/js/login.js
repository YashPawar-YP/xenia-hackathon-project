document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill in all fields");
        return;
    }

    try {
        // Get the working API URL
        console.log("Detecting API URL...");
        const apiUrl = await getWorkingApiUrl();
        console.log("Using API URL:", apiUrl);
        
        const loginUrl = `${apiUrl}/login`;
        console.log("Attempting to login at:", loginUrl);
        
        const response = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log("Response status:", response.status);
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (response.ok) {
            // Determine storage mode based on role
            // Admins use localStorage (persistent across tabs)
            // Students use sessionStorage (isolated per tab)
            const isAdmin = data.role === "admin" || data.role === "club_admin" || data.role === "super_admin";
            const storage = isAdmin ? localStorage : sessionStorage;
            
            // Store user info
            storage.setItem('user_id', data.user_id);
            storage.setItem('user_name', data.name);
            storage.setItem('user_role', data.role);
            storage.setItem('user_email', data.email || '');
            
            // Login successful, redirect based on role
            if (data.role === "student") {
                window.location.href = "student.html";
            } else if (isAdmin) {
                window.location.href = "admin.html";
            } else {
                alert("Login successful, but unknown role: " + data.role);
            }
        } else {
            // Login failed, show error
            alert(data.detail || "Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("Full error:", error);
        console.error("Error stack:", error.stack);
        
        const errorMsg = `Backend connection failed!\n\nError: ${error.message}\n\nTo diagnose the issue:\n1. Open frontend/api_test.html in your browser\n2. Click "Run All Tests" to see which URLs are working\n3. Make sure backend is running:\n   uvicorn main:app --reload`;
        
        alert(errorMsg);
    }
});



