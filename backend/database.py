import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_assistant.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True)
    username      = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)
    chat_history  = relationship("ChatHistory",  back_populates="user", cascade="all, delete")
    saved_content = relationship("SavedContent", back_populates="user", cascade="all, delete")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String)
    title      = Column(String, default="Untitled Chat")
    messages   = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user       = relationship("User", back_populates="chat_history")

class SavedContent(Base):
    __tablename__ = "saved_content"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    type       = Column(String)
    title      = Column(String)
    content    = Column(Text)
    session_id = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user       = relationship("User", back_populates="saved_content")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()