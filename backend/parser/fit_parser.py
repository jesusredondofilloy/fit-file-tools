import io
from typing import Any
import fitparse


def parse_fit_messages(data: bytes) -> list[dict[str, Any]]:
    """Return all messages from a .fit file as a list of dicts."""
    fit = fitparse.FitFile(io.BytesIO(data))
    messages = []
    for msg in fit.get_messages():
        messages.append({
            "type": msg.name,
            "fields": {f.name: _serialize(f.value) for f in msg.fields if f.value is not None},
        })
    return messages


def parse_fit_summary(data: bytes) -> dict[str, Any]:
    """Return a high-level summary of a .fit file: sessions, laps, record count."""
    fit = fitparse.FitFile(io.BytesIO(data))

    sessions: list[dict] = []
    laps: list[dict] = []
    record_count = 0

    for msg in fit.get_messages():
        fields = {f.name: _serialize(f.value) for f in msg.fields if f.value is not None}
        if msg.name == "session":
            sessions.append(fields)
        elif msg.name == "lap":
            laps.append(fields)
        elif msg.name == "record":
            record_count += 1

    return {
        "sessions": sessions,
        "laps": laps,
        "record_count": record_count,
    }


def _serialize(value: Any) -> Any:
    """Convert non-JSON-serializable fitparse types to plain Python types."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value
