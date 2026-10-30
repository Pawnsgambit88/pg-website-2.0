"""Password policy, same rules as the frontend mock/signup form (length 8-128, common list, repeated char, equals email)."""
from core.errors import WeakPassword

MIN_LENGTH = 8
MAX_LENGTH = 128

COMMON_PASSWORDS = frozenset({
    'password', 'password1', 'password12', 'password123', 'passw0rd', '12345678', '123456789', '1234567890',
    '11111111', '00000000', 'qwertyui', 'qwerty123', 'qwertyuiop', 'iloveyou', 'chess123', 'chessmaster',
    'letmein1', 'welcome1', 'admin123', 'abc12345', 'abcd1234', '87654321', 'pg-demo-0000', 'pawnsgambit',
})


def is_weak(password: str, email: str) -> bool:
    lower = password.lower()
    return lower in COMMON_PASSWORDS or len(set(lower)) <= 1 or lower == email.strip().lower()


def check_length(password) -> str | None:
    """Returns a field message or None. Mirrors the 8..128 bound in the request schemas."""
    if not isinstance(password, str) or password == '':
        return 'This is required.'
    if len(password) < MIN_LENGTH:
        return f'Use at least {MIN_LENGTH} characters.'
    if len(password) > MAX_LENGTH:
        return f'Use at most {MAX_LENGTH} characters.'
    return None


def assert_strong(password: str, email: str) -> None:
    if is_weak(password, email):
        raise WeakPassword()
