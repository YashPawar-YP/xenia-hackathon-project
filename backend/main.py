from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime
import bcrypt

# Bcrypt compatibility fix
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": "4.1.0"})()

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
    admin_id = Column(Integer)
    members = Column(String, default="")
    pending = Column(String, default="")
    social_links = Column(String, default="")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer)
    title = Column(String)
    description = Column(String)
    event_date = Column(String)
    location = Column(String)
    capacity = Column(Integer)
    registered_users = Column(String, default="")
    attended_users = Column(String, default="")
    social_promo_text = Column(String, default="")

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer)
    user_id = Column(Integer)
    rating = Column(Integer)
    comment = Column(String)
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
# Create super admin
# ---------------------------
def create_super_admin():
    db = SessionLocal()
    try:
        super_admins = db.query(User).filter(User.role == "super_admin").all()
        
        if len(super_admins) > 1:
            for admin in super_admins[1:]:
                db.delete(admin)
            db.commit()
        
        super_admin = db.query(User).filter(User.role == "super_admin").first()
        
        if not super_admin:
            super_admin = User(
                name="Super Admin",
                email="admin@college.edu",
                password_hash=hash_password("admin123"),
                role="super_admin"
            )
            db.add(super_admin)
            db.commit()
            db.refresh(super_admin)
            print(f"✓ Super admin created: admin@college.edu / admin123")
        else:
            super_admin.email = "admin@college.edu"
            super_admin.name = "Super Admin"
            super_admin.password_hash = hash_password("admin123")
            super_admin.role = "super_admin"
            db.commit()
            print(f"✓ Super admin verified: admin@college.edu / admin123")
    except Exception as e:
        print(f"Error creating super admin: {e}")
        db.rollback()
    finally:
        db.close()

create_super_admin()

# ---------------------------
# Schemas
# ---------------------------
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ClubCreate(BaseModel):
    name: str
    description: str
    objectives: Optional[str] = ""
    activities: Optional[str] = ""
    admin_id: int

class EventCreate(BaseModel):
    club_id: int
    title: str
    description: str
    event_date: str
    location: str
    capacity: int
    social_promo_text: Optional[str] = ""

class FeedbackCreate(BaseModel):
    event_id: int
    user_id: int
    rating: int
    comment: Optional[str] = ""

class PromoteToAdminRequest(BaseModel):
    user_id: int

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
def is_super_admin(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

def is_club_admin(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ["club_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

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
        role="student"
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
    
    managed_clubs = []
    if db_user.role == "club_admin":
        clubs = db.query(Club).filter(Club.admin_id == db_user.id).all()
        managed_clubs = [{"id": c.id, "name": c.name} for c in clubs]
    
    return {
        "message": "Login successful", 
        "user_id": db_user.id, 
        "role": db_user.role, 
        "name": db_user.name,
        "managed_clubs": managed_clubs
    }

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

@app.get("/users/{user_id}/events")
def get_user_events(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    all_events = db.query(Event).all()
    registered_events = []
    attended_events = []
    
    user_id_str = str(user_id)
    for event in all_events:
        registered = event.registered_users.split(",") if event.registered_users else []
        attended = event.attended_users.split(",") if event.attended_users else []
        
        if user_id_str in registered:
            club = db.query(Club).filter(Club.id == event.club_id).first()
            registered_events.append({
                "id": event.id,
                "club_id": event.club_id,
                "club_name": club.name if club else "Unknown",
                "title": event.title,
                "description": event.description,
                "event_date": event.event_date,
                "location": event.location,
                "capacity": event.capacity
            })
        
        if user_id_str in attended:
            club = db.query(Club).filter(Club.id == event.club_id).first()
            attended_events.append({
                "id": event.id,
                "club_id": event.club_id,
                "club_name": club.name if club else "Unknown",
                "title": event.title,
                "description": event.description,
                "event_date": event.event_date,
                "location": event.location,
                "capacity": event.capacity
            })
    
    return {
        "registered_events": registered_events,
        "attended_events": attended_events
    }

# ---------------------------
# Super Admin Routes
# ---------------------------
@app.get("/superadmin/users")
def list_all_users(super_admin_id: int, db: Session = Depends(get_db)):
    is_super_admin(super_admin_id, db)
    
    users = db.query(User).all()
    result = []
    for user in users:
        clubs_managed = db.query(Club).filter(Club.admin_id == user.id).count()
        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "clubs_managed": clubs_managed
        })
    
    return result

@app.post("/superadmin/promote-to-club-admin")
def promote_to_club_admin(request: PromoteToAdminRequest, super_admin_id: int, db: Session = Depends(get_db)):
    is_super_admin(super_admin_id, db)
    
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify super admin")
    
    if user.role == "club_admin":
        return {"message": "User is already a club admin"}
    
    user.role = "club_admin"
    db.commit()
    return {"message": f"{user.name} promoted to club admin"}

@app.post("/superadmin/demote-from-club-admin")
def demote_from_club_admin(request: PromoteToAdminRequest, super_admin_id: int, db: Session = Depends(get_db)):
    is_super_admin(super_admin_id, db)
    
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot modify super admin")
    
    if user.role == "student":
        return {"message": "User is already a student"}
    
    clubs_managed = db.query(Club).filter(Club.admin_id == user.id).count()
    if clubs_managed > 0:
        raise HTTPException(status_code=400, detail=f"User manages {clubs_managed} club(s). Reassign clubs first.")
    
    user.role = "student"
    db.commit()
    return {"message": f"{user.name} demoted to student"}

@app.get("/superadmin/dashboard")
def super_admin_dashboard(super_admin_id: int, db: Session = Depends(get_db)):
    is_super_admin(super_admin_id, db)
    
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_club_admins = db.query(User).filter(User.role == "club_admin").count()
    
    recent_users = db.query(User).order_by(User.id.desc()).limit(10).all()
    recent_list = [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in recent_users]
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_admins": total_club_admins,
        "recent_users": recent_list
    }

# ---------------------------
# Club Routes
# ---------------------------
@app.post("/clubs")
def create_club(club: ClubCreate, admin_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == admin_id).first()
    if not user or user.role not in ["club_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create clubs")
    
    if db.query(Club).filter(Club.name == club.name).first():
        raise HTTPException(status_code=409, detail="Club already exists")
    
    admin_user = db.query(User).filter(User.id == club.admin_id).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    if admin_user.role == "student":
        admin_user.role = "club_admin"
    
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
def list_clubs(admin_id: int = None, db: Session = Depends(get_db)):
    if admin_id:
        clubs = db.query(Club).filter(Club.admin_id == int(admin_id)).all()
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
            "member_count": member_count
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
        "social_links": club.social_links,
        "pending": club.pending or ""
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
    return {"message": "Join request sent"}

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

@app.get("/events/calendar/{year}/{month}")
def event_calendar(year: int, month: int, db: Session = Depends(get_db)):
    events = db.query(Event).all()
    month_events = []
    
    for event in events:
        try:
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
        except:
            continue
    
    return {"year": year, "month": month, "events": month_events}

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
        "registered_users": event.registered_users,
        "social_promo_text": event.social_promo_text
    }

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
    
    return {"message": "Attendance marked and certificate generated"}

@app.delete("/events/{event_id}")
def delete_event(event_id: int, admin_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    admin_user = db.query(User).filter(User.id == admin_id).first()
    if not admin_user:
        raise HTTPException(status_code=403, detail="Admin user not found")
    
    if admin_user.role not in ["club_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete events")
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    if club.admin_id != int(admin_id):
        raise HTTPException(status_code=403, detail="Only the club admin can delete this event")
    
    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully"}

# ---------------------------
# Certificates
# ---------------------------
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
# Feedback
# ---------------------------
@app.post("/events/{event_id}/feedback")
def add_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == feedback.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    registered = event.registered_users.split(",") if event.registered_users else []
    if str(feedback.user_id) not in registered:
        raise HTTPException(status_code=403, detail="Only registered users can give feedback")
    
    existing_feedback = db.query(Feedback).filter(
        Feedback.event_id == feedback.event_id,
        Feedback.user_id == feedback.user_id
    ).first()
    
    if existing_feedback:
        raise HTTPException(status_code=400, detail="You have already submitted feedback for this event")
    
    new_feedback = Feedback(
        event_id=feedback.event_id,
        user_id=feedback.user_id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=datetime.now().isoformat()
    )
    db.add(new_feedback)
    db.commit()
    return {"message": "Feedback submitted successfully"}

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
    
    average_rating = (total_rating / len(feedbacks)) if feedbacks else 0
    
    return {
        "feedbacks": result,
        "total_feedbacks": len(feedbacks),
        "average_rating": round(average_rating, 2)
    }

@app.get("/admin/events/{event_id}/feedback-stats")
def get_event_feedback_stats(event_id: int, admin_id: int, db: Session = Depends(get_db)):
    is_club_admin(admin_id, db)
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    club = db.query(Club).filter(Club.id == event.club_id).first()
    if club and club.admin_id != int(admin_id):
        raise HTTPException(status_code=403, detail="You don't have permission to view this event's feedback")
    
    feedbacks = db.query(Feedback).filter(Feedback.event_id == event_id).all()
    
    if not feedbacks:
        return {
            "event_id": event_id,
            "total_feedbacks": 0,
            "average_rating": 0,
            "ratings_breakdown": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "feedbacks": []
        }
    
    ratings_breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    total_rating = 0
    feedbacks_list = []
    
    for fb in feedbacks:
        user = db.query(User).filter(User.id == fb.user_id).first()
        ratings_breakdown[fb.rating] += 1
        total_rating += fb.rating
        feedbacks_list.append({
            "user_name": user.name if user else "Anonymous",
            "rating": fb.rating,
            "comment": fb.comment,
            "created_at": fb.created_at
        })
    
    average_rating = total_rating / len(feedbacks) if feedbacks else 0
    
    return {
        "event_id": event_id,
        "total_feedbacks": len(feedbacks),
        "average_rating": round(average_rating, 2),
        "ratings_breakdown": ratings_breakdown,
        "feedbacks": feedbacks_list
    }

# ---------------------------
# Social Media
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
# Admin Dashboard
# ---------------------------
@app.get("/admin/dashboard")
def admin_dashboard(admin_id: int, db: Session = Depends(get_db)):
    is_club_admin(admin_id, db)
    
    clubs = db.query(Club).filter(Club.admin_id == admin_id).all()
    
    my_clubs = []
    total_members = 0
    total_events = 0
    
    for club in clubs:
        members = club.members.split(",") if club.members else []
        member_count = len([m for m in members if m])
        total_members += member_count
        
        club_events = db.query(Event).filter(Event.club_id == club.id).count()
        total_events += club_events
        
        my_clubs.append({
            "id": club.id,
            "name": club.name,
            "member_count": member_count,
            "events_count": club_events
        })
    
    return {
        "total_clubs": len(my_clubs),
        "total_events": total_events,
        "total_members": total_members,
        "my_clubs": my_clubs
    }

# ---------------------------
# Cleanup Routes
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
# Run: uvicorn main:app --reload
# Super admin: admin@college.edu / admin123
# ---------------------------
