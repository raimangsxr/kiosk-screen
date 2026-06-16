from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, user: User) -> User:
        self.session.add(user)
        return user

    def get_by_email(self, organization_id: str, email: str) -> User | None:
        statement = select(User).where(User.organization_id == organization_id, User.email == email)
        return self.session.scalar(statement)

    def list_roles(self, user_id: str) -> list[str]:
        statement = select(RoleAssignment.role).where(RoleAssignment.user_id == user_id)
        return list(self.session.scalars(statement))

