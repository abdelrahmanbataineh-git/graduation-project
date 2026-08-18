import os
import random
import string
import requests
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    """
    Converts a plain-text password into a secure, one-way hash using Bcrypt.
    """
    safe_password = password.encode('utf-8')[:72]
    return pwd_context.hash(safe_password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def generate_reset_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_resend_email(to_email: str, subject: str, html_body: str):
    api_key = os.getenv("resend_api")
    if not api_key:
        print("Resend API key missing in .env")
        return False
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "from": "Smarteal <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_body
    }
    
    try:
        response = requests.post("https://api.resend.com/emails", json=data, headers=headers)
        if response.status_code in [200, 201]:
            return True
        else:
            print(f"Resend Error: {response.text}")
            return False
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
        return False

def send_reset_email(to_email: str, code: str):
    subject = "Smarteal Password Reset Code"
    body = f"<p>Your password reset code is: <strong>{code}</strong></p><p>This code will expire in 10 minutes.</p>"
    return send_resend_email(to_email, subject, body)

def send_verification_email(to_email: str, code: str):
    subject = "Verify your Smarteal Account"
    body = f"<p>Welcome to Smarteal!</p><p>Your email verification code is: <strong>{code}</strong></p><p>Enter this code in the app to activate your account.</p>"
    return send_resend_email(to_email, subject, body)
