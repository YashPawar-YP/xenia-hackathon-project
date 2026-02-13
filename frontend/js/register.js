document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("Please fill in all fields");
        return;
    }

    try {
        // Get the working API URL
        console.log("Detecting API URL...");
        const apiUrl = await getWorkingApiUrl();
        console.log("Using API URL:", apiUrl);
        
        const registerUrl = `${apiUrl}/register`;
        console.log("Attempting to register at:", registerUrl);
        
        const response = await fetch(registerUrl, {
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

        console.log("Response status:", response.status);
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (response.ok) {
            // Registration successful
            alert("Registration successful! Please log in with your credentials.");
            // Clear form
            document.getElementById("registerForm").reset();
            // Redirect to login page
            window.location.href = "login_student.html";
        } else {
            // Registration failed, show error
            if (data.detail) {
                alert("Registration failed: " + data.detail);
            } else {
                alert("Registration failed. Please try again.");
            }
        }
    } catch (error) {
        console.error("Full error:", error);
        console.error("Error stack:", error.stack);
        
        const errorMsg = `Backend connection failed!\n\nError: ${error.message}\n\nTo diagnose the issue:\n1. Open frontend/api_test.html in your browser\n2. Click "Run All Tests" to see which URLs are working\n3. Make sure backend is running:\n   uvicorn main:app --reload`;
        
        alert(errorMsg);
    }
});
