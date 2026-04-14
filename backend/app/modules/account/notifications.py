class ConsoleNotificationService:
    def send_email_verification(self, email: str, code: str) -> None:
        print(f"[account] email verification for {email}: {code}")

    def send_phone_verification(self, phone: str, code: str) -> None:
        print(f"[account] phone verification for {phone}: {code}")

    def send_password_reset(self, email: str, token: str) -> None:
        print(f"[account] password reset for {email}: {token}")
