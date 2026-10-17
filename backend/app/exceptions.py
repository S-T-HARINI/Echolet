class EchoLetException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class WorkshopNotFoundError(EchoLetException):
    def __init__(self, workshop_id: str):
        super().__init__(f"Workshop with ID '{workshop_id}' not found", status_code=404)


class WorkshopCancelledError(EchoLetException):
    def __init__(self, message: str = "Workshop is cancelled. Registrations are not allowed."):
        super().__init__(message, status_code=400)


class DuplicateRegistrationError(EchoLetException):
    def __init__(self, message: str = "Member is already registered for this workshop"):
        super().__init__(message, status_code=409)


class WorkshopCapacityExceededError(EchoLetException):
    def __init__(self, message: str = "Workshop capacity has been reached"):
        super().__init__(message, status_code=409)


class NotificationNotFoundError(EchoLetException):
    def __init__(self, notification_id: str):
        super().__init__(f"Notification with ID '{notification_id}' not found", status_code=404)
