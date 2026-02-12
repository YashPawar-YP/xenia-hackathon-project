import requests
import json

BASE_URL = "http://localhost:8001"

# Test Register
print("Testing Register...")
register_data = {
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
}

try:
    response = requests.post(f"{BASE_URL}/register", json=register_data)
    print(f"Register Status: {response.status_code}")
    print(f"Register Response Text: {response.text}")
    if response.status_code == 200:
        print(f"Response JSON: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test Login
print("\nTesting Login...")
login_data = {
    "email": "test@example.com",
    "password": "test123"
}

try:
    response = requests.post(f"{BASE_URL}/login", json=login_data)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response Text: {response.text}")
    if response.status_code == 200:
        print(f"Response JSON: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
