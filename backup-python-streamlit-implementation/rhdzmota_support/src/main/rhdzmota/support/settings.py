import os
import enum


class Environ(enum.Enum):
    SUPPORT_PASSCODES = os.environ.get(
        "SUPPORT_PASSCODES",
        default="",
    )
    SUPPORT_DOMAINS = os.environ.get(
        "SUPPORT_DOMAINS",
        default="rhdzmota.com",
    )
