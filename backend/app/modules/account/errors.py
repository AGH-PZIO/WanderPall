class AccountError(Exception):
    status_code = 400
    message = "Account operation failed"


class ValidationError(AccountError):
    status_code = 422


class NotFoundError(AccountError):
    status_code = 404
    message = "Resource not found"


class AuthenticationError(AccountError):
    status_code = 401
    message = "Invalid authentication credentials"


class ConflictError(AccountError):
    status_code = 409
    message = "Resource already exists"
