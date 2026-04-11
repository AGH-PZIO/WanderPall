from pydantic import BaseModel


class TestResponse(BaseModel):
    status: str
    message: str
