from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext

# at the top of main.py
import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": "4.1.0"})()


# ---------------------------
# Database setup
# ---------------------------
DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
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


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    members = Column(String, default="")  # comma-separated user IDs
    pending = Column(String, default="")  # comma-separated user IDs


Base.metadata.create_all(bind=engine)

# ---------------------------
# Password helper (72-byte safe)
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

class UserLogin(BaseModel):
    email: str
    password: str

class ClubCreate(BaseModel):
    name: str
    description: str

# ---------------------------
# App & DB dependency
# ---------------------------
app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# User routes
# ---------------------------
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered", "user_id": new_user.id}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=403, detail="Invalid credentials")

    return {"message": "Login successful", "user_id": db_user.id}

# ---------------------------
# Club routes
# ---------------------------
@app.post("/clubs")
def create_club(club: ClubCreate, db: Session = Depends(get_db)):
    if db.query(Club).filter(Club.name == club.name).first():
        raise HTTPException(status_code=409, detail="Club already exists")

    new_club = Club(name=club.name, description=club.description)
    db.add(new_club)
    db.commit()
    db.refresh(new_club)

    return {"message": "Club created", "club_id": new_club.id}

@app.get("/clubs")
def list_clubs(db: Session = Depends(get_db)):
    clubs = db.query(Club).all()
    return clubs

# ---------------------------
# Club membership
# ---------------------------
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

@app.get("/clubs/{club_id}/members")
def club_members(club_id: int, db: Session = Depends(get_db)):
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    members = club.members.split(",") if club.members else []
    pending = club.pending.split(",") if club.pending else []

    return {"members": members, "pending": pending}

# ---------------------------
# Run with:
# uvicorn main:app --reload
# ---------------------------