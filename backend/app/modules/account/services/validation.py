from app.modules.account.errors import ValidationError


def validate_password_strength(password: str) -> None:
    digit_count = sum(character.isdigit() for character in password)
    special_count = sum(not character.isalnum() for character in password)
    if len(password) < 8 or digit_count < 2 or special_count < 1:
        raise ValidationError(
            "Hasło musi składać z min. 8 znaków w tym przynajmniej dwie cyfry i jeden znak specjalny"
        )


def validate_password_confirmation(password: str, password_confirmation: str) -> None:
    if password != password_confirmation:
        raise ValidationError("Password confirmation does not match")
    validate_password_strength(password)
