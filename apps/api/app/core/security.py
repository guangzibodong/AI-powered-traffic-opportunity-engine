from dataclasses import dataclass


@dataclass(frozen=True)
class SecretPreview:
    label: str
    masked_value: str


def mask_secret(value: str | None, visible_suffix: int = 4) -> str:
    if not value:
        return ""
    if len(value) <= visible_suffix:
        return "*" * len(value)
    return f"{'*' * (len(value) - visible_suffix)}{value[-visible_suffix:]}"


class TokenVault:
    """Interface for envelope encryption of integration credentials."""

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            raise ValueError("Cannot encrypt an empty token")
        raise NotImplementedError("Wire this method to KMS or an encrypted secrets provider")

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext:
            raise ValueError("Cannot decrypt an empty token")
        raise NotImplementedError("Wire this method to KMS or an encrypted secrets provider")
