class TravelBuddiesError(Exception):
    status_code = 400
    message = "Travel buddies operation failed"


class ValidationError(TravelBuddiesError):
    status_code = 422


class NotFoundError(TravelBuddiesError):
    status_code = 404
    message = "Nie znaleziono zasobu"


class ConflictError(TravelBuddiesError):
    status_code = 409
    message = "Zasób już istnieje"


class ForbiddenError(TravelBuddiesError):
    status_code = 403
    message = "Permission denied"