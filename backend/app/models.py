from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key = True, index = True)
    username = Column(String(25), unique = True, nullable = False)
    email = Column(String, unique = True, nullable = False)
    password_hash = Column(String, nullable = False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable = False)
    is_active = Column(Boolean, default = True)

    role = relationship("Role", back_populates = "users")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key = True, index = True)
    name = Column(String, nullable = False, unique = True)

    users = relationship("User", back_populates = "role")


