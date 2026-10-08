from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ContactCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    phone: str = Field(
        ...,
        min_length=10,
        max_length=20,
    )

    email: EmailStr | None = None

    relationship: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )


class ContactResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: EmailStr | None = None
    relationship: str

    model_config = ConfigDict(
        from_attributes=True,
    )


# Backward-compatible name used by the existing API router.
EmergencyContactRequest = ContactCreate