"""Tests for fit_merger."""
from __future__ import annotations

from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def _make_synthetic_fit(start_ts_ms: int, count: int) -> bytes:
    from fit_tool.fit_file_builder import FitFileBuilder
    from fit_tool.profile.messages.file_id_message import FileIdMessage
    from fit_tool.profile.messages.record_message import RecordMessage
    from fit_tool.profile.profile_type import FileType, Manufacturer

    builder = FitFileBuilder(auto_define=True)

    file_id = FileIdMessage()
    file_id.type = FileType.ACTIVITY
    file_id.manufacturer = Manufacturer.DEVELOPMENT.value
    file_id.product = 0
    file_id.time_created = start_ts_ms
    file_id.serial_number = 0x12345678
    builder.add(file_id)

    for i in range(count):
        record = RecordMessage()
        record.timestamp = start_ts_ms + i * 1000
        record.heart_rate = 120 + i
        record.distance = float(i) * 10.0
        builder.add(record)

    return bytes(builder.build().to_bytes())


def test_merge_requires_at_least_two_files():
    from merger.fit_merger import merge_fit_files

    with pytest.raises(ValueError, match="at least 2"):
        merge_fit_files([b"dummy"])


def test_merge_two_synthetic_files_combines_records():
    from fit_tool.fit_file import FitFile
    from merger.fit_merger import merge_fit_files

    a = _make_synthetic_fit(1_700_000_000_000, 10)
    b = _make_synthetic_fit(1_700_000_010_000, 10)

    merged = merge_fit_files([a, b])

    assert isinstance(merged, bytes)
    assert len(merged) > 0

    decoded = FitFile.from_bytes(merged, check_crc=True)
    record_count = sum(
        1
        for r in decoded.records
        if not r.is_definition and r.message.name == "record"
    )
    assert record_count == 20


def test_merge_two_synthetic_files_sorts_by_timestamp():
    from fit_tool.fit_file import FitFile
    from merger.fit_merger import merge_fit_files

    later = _make_synthetic_fit(1_700_000_010_000, 5)
    earlier = _make_synthetic_fit(1_700_000_000_000, 5)

    merged = merge_fit_files([later, earlier])
    decoded = FitFile.from_bytes(merged, check_crc=True)

    timestamps: list[int] = []
    for record in decoded.records:
        if record.is_definition or record.message.name != "record":
            continue
        ts_field = record.message.get_field_by_name("timestamp")
        if ts_field is not None:
            timestamps.append(ts_field.get_value())

    assert timestamps == sorted(timestamps)


def test_merge_real_fixtures_if_present():
    """Optional: run against real .fit files if placed in tests/fixtures/."""
    from merger.fit_merger import merge_fit_files

    a_path = FIXTURES / "activity_a.fit"
    b_path = FIXTURES / "activity_b.fit"
    if not (a_path.exists() and b_path.exists()):
        pytest.skip("Add real .fit files to tests/fixtures/ to enable this test")

    result = merge_fit_files([a_path.read_bytes(), b_path.read_bytes()])
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_merge_real_examples_if_present():
    """Regression test for the local-id collision bug: ensures decoded source
    DataMessages don't keep stale definition pointers when re-encoded."""
    import logging

    from fit_tool.fit_file import FitFile

    from merger.fit_merger import merge_fit_files

    examples = Path(__file__).resolve().parent.parent.parent / "examples"
    a = examples / "22959185626_ACTIVITY.fit"
    b = examples / "22959541591_ACTIVITY.fit"
    if not (a.exists() and b.exists()):
        pytest.skip("Real example files not available")

    logging.disable(logging.CRITICAL)
    merged = merge_fit_files([a.read_bytes(), b.read_bytes()])
    decoded = FitFile.from_bytes(merged, check_crc=True)

    def count(name: str) -> int:
        return sum(
            1
            for r in decoded.records
            if not r.is_definition and r.message.name == name
        )

    source_a = FitFile.from_bytes(a.read_bytes(), check_crc=False)
    source_b = FitFile.from_bytes(b.read_bytes(), check_crc=False)
    expected_records = sum(
        1
        for r in (*source_a.records, *source_b.records)
        if not r.is_definition and r.message.name == "record"
    )
    assert count("record") == expected_records
