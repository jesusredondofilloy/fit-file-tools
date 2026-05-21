"""
Tests for fit_parser. Place real .fit files in tests/fixtures/ to run against live data.
Fixtures are gitignored — do not commit personal activity files.
"""
import pytest
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_summary_returns_expected_keys(tmp_path):
    pytest.skip("Add a real .fit file to tests/fixtures/ to enable this test")
    from parser.fit_parser import parse_fit_summary
    data = (FIXTURES / "sample.fit").read_bytes()
    result = parse_fit_summary(data)
    assert "sessions" in result
    assert "laps" in result
    assert "record_count" in result
    assert isinstance(result["record_count"], int)
