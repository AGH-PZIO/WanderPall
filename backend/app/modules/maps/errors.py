class MapsError(Exception):
    status_code = 400
    message = "Maps operation failed"


class ValidationError(MapsError):
    status_code = 422


class NotFoundError(MapsError):
    status_code = 404
    message = "Resource not found"


class ForbiddenError(MapsError):
    status_code = 403
    message = "Forbidden"
