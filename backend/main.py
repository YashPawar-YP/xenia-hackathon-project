from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime
import bcrypt

if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": "4.1.0"})()

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student")

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

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return pwd_context.hash(pw_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(pw_bytes, hashed_password)

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

# Request Schemas
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

# User Routes
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
