"""Firebase Admin SDK initialisation for the Classification Service.

Reads credentials from environment variables:
  FIREBASE_PROJECT_ID    — GCP project id
  FIREBASE_CLIENT_EMAIL  — service account email
  FIREBASE_PRIVATE_KEY   — PEM private key (newlines may be escaped as \\n)

Exports:
  db  — google.cloud.firestore.AsyncClient (via firebase_admin.firestore)
"""

import os

import firebase_admin
from firebase_admin import credentials, firestore

_REQUIRED_ENV_VARS = ("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY")


def _build_credentials() -> credentials.Certificate:
    missing = [v for v in _REQUIRED_ENV_VARS if not os.environ.get(v)]
    if missing:
        raise EnvironmentError(
            f"Missing required Firebase environment variables: {', '.join(missing)}"
        )

    private_key = os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n")

    cert_dict = {
        "type": "service_account",
        "project_id": os.environ["FIREBASE_PROJECT_ID"],
        "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
        "private_key": private_key,
        # Fields below are not used by the Admin SDK for Firestore but are
        # required by the Certificate constructor schema.
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    return credentials.Certificate(cert_dict)


def _init_app() -> firebase_admin.App:
    """Initialise the default Firebase app (idempotent)."""
    if not firebase_admin._apps:  # noqa: SLF001
        cred = _build_credentials()
        return firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


_init_app()

# Firestore client — available for import throughout the service
db: firestore.firestore.Client = firestore.client()
