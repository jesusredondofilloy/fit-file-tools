"""
Merge two or more Garmin .fit files into a single valid .fit binary.

Strategy
--------
1. Decode each input file with fit-tool.
2. Take file_id / file_creator from the first file (only one allowed per .fit).
3. Collect ``record`` and ``lap`` messages from every file and sort by timestamp.
4. Keep ``event`` and ``device_info`` from all files (deduplicated by (name, timestamp)).
5. Use the first file's ``session`` and ``activity`` messages; if missing, fall back
   to the first session/activity encountered.
6. Re-encode through ``FitFileBuilder`` which rebuilds definition messages and CRC.
"""
from __future__ import annotations

import logging
from typing import Iterable

from fit_tool.data_message import DataMessage
from fit_tool.fit_file import FitFile
from fit_tool.fit_file_builder import FitFileBuilder

logger = logging.getLogger(__name__)


_RECORD_LIKE = {"record"}
_LAP_LIKE = {"lap"}
_HEADER_ONCE = {"file_id", "file_creator"}
_FOOTER_FROM_FIRST = {"session", "activity"}


def merge_fit_files(files: list[bytes]) -> bytes:
    if len(files) < 2:
        raise ValueError("merge requires at least 2 files")

    decoded: list[FitFile] = [FitFile.from_bytes(buf, check_crc=False) for buf in files]

    header_msgs: list[DataMessage] = []
    records: list[DataMessage] = []
    laps: list[DataMessage] = []
    events: list[DataMessage] = []
    device_info: list[DataMessage] = []
    other_first: list[DataMessage] = []
    footer_msgs: list[DataMessage] = []

    seen_event_keys: set[tuple] = set()
    seen_device_keys: set[tuple] = set()

    for idx, fit in enumerate(decoded):
        for data_msg in _iter_data_messages(fit):
            name = data_msg.name

            if name in _HEADER_ONCE:
                if idx == 0:
                    header_msgs.append(data_msg)
                continue

            if name in _RECORD_LIKE:
                records.append(data_msg)
                continue

            if name in _LAP_LIKE:
                laps.append(data_msg)
                continue

            if name == "event":
                key = (name, _field_value(data_msg, "timestamp"), _field_value(data_msg, "event"))
                if key not in seen_event_keys:
                    seen_event_keys.add(key)
                    events.append(data_msg)
                continue

            if name == "device_info":
                key = (
                    name,
                    _field_value(data_msg, "timestamp"),
                    _field_value(data_msg, "device_index"),
                )
                if key not in seen_device_keys:
                    seen_device_keys.add(key)
                    device_info.append(data_msg)
                continue

            if name in _FOOTER_FROM_FIRST:
                if idx == 0:
                    footer_msgs.append(data_msg)
                continue

            if idx == 0:
                other_first.append(data_msg)

    records.sort(key=lambda m: _field_value(m, "timestamp") or 0)
    laps.sort(key=lambda m: _field_value(m, "start_time") or _field_value(m, "timestamp") or 0)

    builder = FitFileBuilder(auto_define=True)

    for msg in header_msgs:
        builder.add(msg)
    for msg in other_first:
        builder.add(msg)
    for msg in device_info:
        builder.add(msg)
    for msg in events:
        builder.add(msg)
    for msg in records:
        builder.add(msg)
    for msg in laps:
        builder.add(msg)
    for msg in footer_msgs:
        builder.add(msg)

    return bytes(builder.build().to_bytes())


def _iter_data_messages(fit: FitFile) -> Iterable[DataMessage]:
    for record in fit.records:
        if record.is_definition:
            continue
        message = record.message
        if isinstance(message, DataMessage):
            # Detach the source-file definition so FitFileBuilder reattaches a fresh
            # one. Without this, the message would still encode against the stale
            # definition (wrong field sizes / order) while the builder emits a new
            # definition record — producing a structurally-broken merged file.
            message.definition_message = None
            yield message


def _field_value(msg: DataMessage, field_name: str):
    field = msg.get_field_by_name(field_name)
    if field is None:
        return None
    try:
        return field.get_value()
    except Exception:
        return None
