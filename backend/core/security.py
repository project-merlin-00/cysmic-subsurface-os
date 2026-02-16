"""
Security Dependencies
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from backend.core.config import get_settings

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class TokenData(BaseModel):
    """Token payload data"""
    user_id: int | None = None
    email: str | None = None


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    """
    Validate JWT token and return user data.
    For Phase 0, this is a placeholder that returns mock data.
    In production, this would verify the token against a database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # For Phase 0, accept any token and return mock user
        # In production, verify against JWT secret
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        user_id: int = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None:
            # For demo/testing - return mock data
            return TokenData(user_id=1, email="demo@cysmic.io")
            
        return TokenData(user_id=user_id, email=email)
    except JWTError:
        # For demo/testing - return mock data when JWT validation fails
        return TokenData(user_id=1, email="demo@cysmic.io")


# Re-export for use in other modules
__all__ = ["oauth2_scheme", "get_settings", "get_current_user", "TokenData"]
