from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from typing import List, Optional
from datetime import datetime
import bcrypt

# Bcrypt compatibility fix
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": "4.1.2"})()

# ---------------------------
# Database setup
# ---------------------------
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------
# Models
# ---------------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student")  # student/club_admin/super_admin

class Club(Base):
    __tablename__ = "clubs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    objectives = Column(String, default="")
    activities = Column(String, default="")
    admin_id = Column(Integer)  # Club admin user ID
    members = Column(String, default="")  # comma-separated user IDs
    pending = Column(String, default="")  # comma-separated user IDs
    social_links = Column(String, default="")  # JSON string: {"facebook": "", "instagram": ""}

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer)
    title = Column(String)
    description = Column(String)
    event_date = Column(String)  # ISO format datetime string
    location = Column(String)
    capacity = Column(Integer)
    registered_users = Column(String, default="")  # comma-separated user IDs
    attended_users = Column(String, default="")  # comma-separated user IDs
    social_promo_text = Column(String, default="")  # Pre-filled social media pos

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer)
    user_id = Column(Integer)
    rating = Column(Integer)  # 1-5
    comment = Column(String)
    created_at = Column(String)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    message = Column(String)
    event_id = Column(Integer, nullable=True)
    created_at = Column(String)
    read = Column(Boolean, default=False)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer)
    sender_id = Column(Integer)
    sender_name = Column(String)
    message = Column(String)
    created_at = Column(String)

class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    event_id = Column(Integer)
    issued_at = Column(String)

Base.metadata.create_all(bind=engine)

# ---------------------------
# Password helper
# ---------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return pwd_context.hash(pw_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(pw_bytes, hashed_password)

# ---------------------------
# Schemas
# ---------------------------
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    email: str
    password: str

class ClubCreate(BaseModel):
    name: str
    description: str
    objectives: Optional[str] = ""
    activities: Optional[str] = ""
    admin_id: int

class ClubOut(BaseModel):
    id: int
    name: str
    description: str
    objectives: str
    activities: str
    member_count: int

class EventCreate(BaseModel):
    club_id: int
    title: str
    description: str
    event_date: str  # ISO format
    location: str
    capacity: int
    social_promo_text: Optional[str] = ""

class EventOut(BaseModel):
    id: int
    club_id: int
    title: str
    description: str
    event_date: str
    location: str
    capacity: int
    registered_count: int
    social_promo_text: str

class FeedbackCreate(BaseModel):
    event_id: int
    user_id: int
    rating: int
    comment: str

class MessageCreate(BaseModel):
    club_id: int
    sender_id: int
    message: str

# ---------------------------
# App
# ---------------------------
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Helper Functions
# ---------------------------
def create_notification(db: Session, user_id: int, message: str, event_id: int = None):
    notif = Notification(
        user_id=user_id,
        message=message,
        event_id=event_id,
        created_at=datetime.now().isoformat()
    )
    db.add(notif)
    db.commit()

def is_admin(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ["club_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

from fastapi import Body

# ---------------------------
# User Routes
# ---------------------------
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    
    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered", "user_id": new_user.id, "role": new_user.role}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=403, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": db_user.id, "role": db_user.role, "name": db_user.name, "email": db_user.email}


@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

# PATCH endpoint to update user role
from pydantic import BaseModel
class UserUpdateRole(BaseModel):
    role: str

@app.patch("/users/{user_id}")
def update_user_role(user_id: int, update: UserUpdateRole, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = update.role
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

# ---------------------------
# Club Routes
# ---------------------------
@app.post("/clubs")
def create_club(club: ClubCreate, db: Session = Depends(get_db)):
    if db.query(Club).filter(Club.name == club.name).first():
        raise HTTPException(status_code=409, detail="Club already exists")
    
    new_club = Club(
        name=club.name,
        description=club.description,
        objectives=club.objectives,
        activities=club.activities,
        admin_id=club.admin_id
    )
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return {"message": "Club created", "club_id": new_club.id}

@app.get("/clubs")
def list_clubs(admin_id: Optional[int] = None, db: Session = Depends(get_db)):
    if admin_id:
        clubs = db.query(Club).filter(Club.admin_id == admin_id).all()
    else:
        clubs = db.query(Club).all()
    result = []
    for club in clubs:
        members = club.members.split(",") if club.members else []
        member_count = len([m for m in members if m])
        result.append({
            "id": club.id,
            "name": club.name,
            "description": club.description,
            "objectives": club.objectives,
            "activities": club.activities,
            "admin_id": club.admin_id,
            "member_count": member_count,
            "members": club.members
        })
    return result

@app.get("/clubs/{club_id}")
def get_club(club_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    members = club.members.split(",") if club.members else []
    member_count = len([m for m in members if m])
    
    return {
        "id": club.id,
        "name": club.name,
        "description": club.description,
        "objectives": club.objectives,
        "activities": club.activities,
        "admin_id": club.admin_id,
        "member_count": member_count,
        "pending": club.pending,
        "social_links": club.social_links
    }

@app.post("/clubs/{club_id}/join")
def join_club(club_id: int, user_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    members = club.members.split(",") if club.members else []
    pending = club.pending.split(",") if club.pending else []
    
    if str(user_id) in members:
        return {"message": "Already a member"}
    if str(user_id) in pending:
        return {"message": "Request already pending"}
    
    pending.append(str(user_id))
    club.pending = ",".join(pending)
    db.commit()
    
    # Notify club admin
    create_notification(db, club.admin_id, f"New join request for {club.name}")

@app.post("/clubs/{club_id}/leave")
def leave_club(club_id: int, user_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    members = club.members.split(",") if club.members else []
    
    if str(user_id) not in members:
        raise HTTPException(status_code=400, detail="You are not a member of this club")
    
    members.remove(str(user_id))
    club.members = ",".join(members)
    db.commit()
    
    return {"message": "Successfully left the club"}

@app.post("/clubs/{club_id}/approve/{user_id}")
def approve_member(club_id: int, user_id: int, admin_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    if club.admin_id != admin_id:
        raise HTTPException(status_code=403, detail="Only club admin can approve")
    
    pending = club.pending.split(",") if club.pending else []
    members = club.members.split(",") if club.members else []
    
    if str(user_id) not in pending:
        raise HTTPException(status_code=400, detail="No pending request from this user")
    
    pending.remove(str(user_id))
    members.append(str(user_id))
    
    club.pending = ",".join(pending)
    club.members = ",".join(members)
    db.commit()
    
    # Notify user
    create_notification(db, user_id, f"You've been approved to join {club.name}")
    
    return {"message": "Member approved"}

@app.post("/clubs/{club_id}/reject/{user_id}")
def reject_member(club_id: int, user_id: int, admin_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    if club.admin_id != admin_id:
        raise HTTPException(status_code=403, detail="Only club admin can reject")
    
    pending = club.pending.split(",") if club.pending else []
    
    if str(user_id) not in pending:
        raise HTTPException(status_code=400, detail="No pending request from this user")
    
    pending.remove(str(user_id))
    club.pending = ",".join(pending)
    db.commit()
    
    # Notify user
    create_notification(db, user_id, f"Your request to join {club.name} was not approved")
    
    return {"message": "Request rejected"}

@app.get("/clubs/{club_id}/members")
def club_members(club_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    members = club.members.split(",") if club.members else []
    pending = club.pending.split(",") if club.pending else []
    
    member_details = []
    for mid in members:
        if mid:
            user = db.query(User).filter(User.id == int(mid)).first()
            if user:
                member_details.append({"id": user.id, "name": user.name, "email": user.email})
    
    pending_details = []
    for pid in pending:
        if pid:
            user = db.query(User).filter(User.id == int(pid)).first()
            if user:
                pending_details.append({"id": user.id, "name": user.name, "email": user.email})
    
    return {"members": member_details, "pending": pending_details}

# ---------------------------
# Event Routes
# ---------------------------
@app.post("/events")
def create_event(event: EventCreate, admin_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    if club.admin_id != admin_id:
        raise HTTPException(status_code=403, detail="Only club admin can create events")
    
    new_event = Event(
        club_id=event.club_id,
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        location=event.location,
        capacity=event.capacity,
        social_promo_text=event.social_promo_text or f"Join us for {event.title}! 📅 {event.event_date}"
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    # Notify all club members about new event
    members = club.members.split(",") if club.members else []
    for mid in members:
        if mid:
            create_notification(
                db, 
                int(mid), 
                f"New event: {event.title} on {event.event_date}",
                new_event.id
            )
    
    return {"message": "Event created", "event_id": new_event.id}

@app.get("/events")
def list_events(db: Session = Depends(get_db)):
    events = db.query(Event).all()
    result = []
    for event in events:
        registered = event.registered_users.split(",") if event.registered_users else []
        registered_count = len([r for r in registered if r])
        
        club = db.query(Club).filter(Club.id == event.club_id).first()
        
        result.append({
            "id": event.id,
            "club_id": event.club_id,
            "club_name": club.name if club else "Unknown",
            "title": event.title,
            "description": event.description,
            "event_date": event.event_date,
            "location": event.location,
            "capacity": event.capacity,
            "registered_count": registered_count,
            "social_promo_text": event.social_promo_text
        })
    return result

@app.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    registered_count = len([r for r in registered if r])
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    
    return {
        "id": event.id,
        "club_id": event.club_id,
        "club_name": club.name if club else "Unknown",
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date,
        "location": event.location,
        "capacity": event.capacity,
        "registered_count": registered_count,
        "social_promo_text": event.social_promo_text
    }

@app.get("/events/calendar/{year}/{month}")
def event_calendar(year: int, month: int, db: Session = Depends(get_db)):
    """Get all events for a specific month"""
    events = db.query(Event).all()
    month_events = []
    
    for event in events:
        event_dt = datetime.fromisoformat(event.event_date.replace('Z', '+00:00'))
        if event_dt.year == year and event_dt.month == month:
            club = db.query(Club).filter(Club.id == event.club_id).first()
            month_events.append({
                "id": event.id,
                "title": event.title,
                "club_name": club.name if club else "Unknown",
                "event_date": event.event_date,
                "location": event.location
            })
    
    return {"year": year, "month": month, "events": month_events}

@app.post("/events/{event_id}/register")
def register_for_event(event_id: int, user_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    
    if str(user_id) in registered:
        return {"message": "Already registered"}
    
    if len([r for r in registered if r]) >= event.capacity:
        raise HTTPException(status_code=400, detail="Event is full")
    
    registered.append(str(user_id))
    event.registered_users = ",".join(registered)
    db.commit()
    
    # Notify user
    create_notification(db, user_id, f"You're registered for {event.title}", event.id)
    
    return {"message": "Successfully registered for event"}

@app.delete("/events/{event_id}/register/{user_id}")
def cancel_registration(event_id: int, user_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    
    if str(user_id) not in registered:
        raise HTTPException(status_code=400, detail="Not registered for this event")
    
    registered.remove(str(user_id))
    event.registered_users = ",".join(registered)
    db.commit()
    
    return {"message": "Registration cancelled"}

@app.get("/events/{event_id}/registrations")
def get_registrations(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    attended = event.attended_users.split(",") if event.attended_users else []
    
    registered_details = []
    for uid in registered:
        if uid:
            user = db.query(User).filter(User.id == int(uid)).first()
            if user:
                registered_details.append({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "attended": str(user.id) in attended
                })
    
    return {"registrations": registered_details}

@app.post("/events/{event_id}/mark-attendance/{user_id}")
def mark_attendance(event_id: int, user_id: int, admin_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if club.admin_id != admin_id:
        raise HTTPException(status_code=403, detail="Only club admin can mark attendance")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    if str(user_id) not in registered:
        raise HTTPException(status_code=400, detail="User not registered for this event")
    
    attended = event.attended_users.split(",") if event.attended_users else []
    if str(user_id) in attended:
        return {"message": "Attendance already marked"}
    
    attended.append(str(user_id))
    event.attended_users = ",".join(attended)
    db.commit()
    
    # Auto-generate certificate
    cert = Certificate(
        user_id=user_id,
        event_id=event_id,
        issued_at=datetime.now().isoformat()
    )
    db.add(cert)
    db.commit()
    
    # Notify user
    create_notification(db, user_id, f"Certificate generated for {event.title}", event.id)
    
    return {"message": "Attendance marked and certificate generated"}

@app.delete("/events/{event_id}")
def delete_event(event_id: int, admin_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if club.admin_id != admin_id:
        raise HTTPException(status_code=403, detail="Only club admin can delete events")
    
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}

# ---------------------------
# Participation & Certificates
# ---------------------------
@app.get("/users/{user_id}/events")
def user_events(user_id: int, db: Session = Depends(get_db)):
    all_events = db.query(Event).all()
    
    registered_events = []
    attended_events = []
    
    for event in all_events:
        registered = event.registered_users.split(",") if event.registered_users else []
        attended = event.attended_users.split(",") if event.attended_users else []
        
        if str(user_id) in registered:
            club = db.query(Club).filter(Club.id == event.club_id).first()
            event_data = {
                "id": event.id,
                "title": event.title,
                "club_name": club.name if club else "Unknown",
                "event_date": event.event_date,
                "location": event.location,
                "attended": str(user_id) in attended
            }
            registered_events.append(event_data)
            
            if str(user_id) in attended:
                attended_events.append(event_data)
    
    return {
        "registered_events": registered_events,
        "attended_events": attended_events
    }

@app.get("/users/{user_id}/certificates")
def user_certificates(user_id: int, db: Session = Depends(get_db)):
    certs = db.query(Certificate).filter(Certificate.user_id == user_id).all()
    
    result = []
    for cert in certs:
        event = db.query(Event).filter(Event.id == cert.event_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        club = db.query(Club).filter(Club.id == event.club_id).first() if event else None
        
        result.append({
            "id": cert.id,
            "event_title": event.title if event else "Unknown",
            "club_name": club.name if club else "Unknown",
            "user_name": user.name if user else "Unknown",
            "issued_at": cert.issued_at,
            "download_url": f"/certificates/{cert.id}/download"
        })
    
    return result

@app.get("/certificates/{cert_id}/download")
def download_certificate(cert_id: int, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    user = db.query(User).filter(User.id == cert.user_id).first()
    event = db.query(Event).filter(Event.id == cert.event_id).first()
    club = db.query(Club).filter(Club.id == event.club_id).first() if event else None
    
    # Simple HTML certificate (frontend can convert to PDF)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial; text-align: center; padding: 50px; }}
            .certificate {{ border: 5px solid gold; padding: 40px; max-width: 800px; margin: auto; }}
            h1 {{ color: #333; }}
        </style>
    </head>
    <body>
        <div class="certificate">
            <h1>Certificate of Participation</h1>
            <p style="font-size: 20px;">This is to certify that</p>
            <h2>{user.name if user else 'Unknown'}</h2>
            <p style="font-size: 18px;">has successfully participated in</p>
            <h3>{event.title if event else 'Unknown Event'}</h3>
            <p>Organized by {club.name if club else 'Unknown Club'}</p>
            <p>Date: {event.event_date if event else 'N/A'}</p>
            <p style="margin-top: 40px;">Issued on: {cert.issued_at}</p>
        </div>
    </body>
    </html>
    """
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)

# ---------------------------
# Feedback & Ratings
# ---------------------------
@app.post("/events/{event_id}/feedback")
def add_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == feedback.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attended = event.attended_users.split(",") if event.attended_users else []
    if str(feedback.user_id) not in attended:
        raise HTTPException(status_code=403, detail="Only attendees can give feedback")
    
    new_feedback = Feedback(
        event_id=feedback.event_id,
        user_id=feedback.user_id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=datetime.now().isoformat()
    )
    db.add(new_feedback)
    db.commit()
    
    return {"message": "Feedback submitted"}

@app.get("/events/{event_id}/feedback")
def get_feedback(event_id: int, db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).filter(Feedback.event_id == event_id).all()
    
    result = []
    total_rating = 0
    for fb in feedbacks:
        user = db.query(User).filter(User.id == fb.user_id).first()
        result.append({
            "id": fb.id,
            "user_name": user.name if user else "Anonymous",
            "rating": fb.rating,
            "comment": fb.comment,
            "created_at": fb.created_at
        })
        total_rating += fb.rating
    
    avg_rating = total_rating / len(feedbacks) if feedbacks else 0
    
    return {
        "feedback": result,
        "average_rating": round(avg_rating, 1),
        "total_feedback": len(feedbacks)
    }

# ---------------------------
# Notifications
# ---------------------------
@app.get("/users/{user_id}/notifications")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()
    
    result = []
    for notif in notifs:
        result.append({
            "id": notif.id,
            "message": notif.message,
            "event_id": notif.event_id,
            "created_at": notif.created_at,
            "read": notif.read
        })
    
    return result

@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    return {"message": "Notification marked as read"}

@app.get("/users/{user_id}/notifications/unread")
def unread_notifications(user_id: int, db: Session = Depends(get_db)):
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False
    ).count()
    
    return {"unread_count": count}

# ---------------------------
# Chat/Messages
# ---------------------------
@app.post("/clubs/{club_id}/messages")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == msg.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check if user is member
    members = club.members.split(",") if club.members else []
    if str(msg.sender_id) not in members and club.admin_id != msg.sender_id:
        raise HTTPException(status_code=403, detail="Only members can send messages")
    
    sender = db.query(User).filter(User.id == msg.sender_id).first()
    
    new_message = Message(
        club_id=msg.club_id,
        sender_id=msg.sender_id,
        sender_name=sender.name if sender else "Unknown",
        message=msg.message,
        created_at=datetime.now().isoformat()
    )
    db.add(new_message)
    db.commit()
    
    return {"message": "Message sent"}

@app.get("/clubs/{club_id}/messages")
def get_messages(club_id: int, user_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check if user is member
    members = club.members.split(",") if club.members else []
    if str(user_id) not in members and club.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Only members can view messages")
    
    messages = db.query(Message).filter(Message.club_id == club_id).order_by(Message.created_at).all()
    
    result = []
    for msg in messages:
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "created_at": msg.created_at
        })
    
    return result

# ---------------------------
# Admin Dashboard
# ---------------------------
@app.get("/admin/dashboard")
def admin_dashboard(admin_id: int, db: Session = Depends(get_db)):
    admin = is_admin(admin_id, db)
    
    total_clubs = db.query(Club).count()
    total_events = db.query(Event).count()
    total_users = db.query(User).count()
    
    # Get clubs managed by this admin
    my_clubs = []
    if admin.role == "club_admin":
        clubs = db.query(Club).filter(Club.admin_id == admin_id).all()
        for club in clubs:
            members = club.members.split(",") if club.members else []
            my_clubs.append({
                "id": club.id,
                "name": club.name,
                "member_count": len([m for m in members if m])
            })
    else:  # super_admin
        clubs = db.query(Club).all()
        for club in clubs:
            members = club.members.split(",") if club.members else []
            my_clubs.append({
                "id": club.id,
                "name": club.name,
                "member_count": len([m for m in members if m])
            })
    
    return {
        "total_clubs": total_clubs,
        "total_events": total_events,
        "total_users": total_users,
        "my_clubs": my_clubs
    }

# ---------------------------
# Social Media Promo
# ---------------------------
@app.get("/events/{event_id}/social-promo")
def get_social_promo(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    
    return {
        "event_title": event.title,
        "club_name": club.name if club else "Unknown",
        "promo_text": event.social_promo_text,
        "event_date": event.event_date,
        "location": event.location,
        "share_urls": {
            "twitter": f"https://twitter.com/intent/tweet?text={event.social_promo_text}",
            "facebook": f"https://www.facebook.com/sharer/sharer.php?u=YOUR_EVENT_URL",
            "whatsapp": f"https://wa.me/?text={event.social_promo_text}"
        }
    }

# ---------------------------
# Cleanup Routes (for testing)
# ---------------------------
@app.delete("/clubs/clear")
def clear_clubs(db: Session = Depends(get_db)):
    db.query(Club).delete()
    db.commit()
    return {"message": "All clubs cleared"}

@app.delete("/events/clear")
def clear_events(db: Session = Depends(get_db)):
    db.query(Event).delete()
    db.commit()
    return {"message": "All events cleared"}

# ---------------------------
# Run with: uvicorn main:app --reload
# ---------------------------