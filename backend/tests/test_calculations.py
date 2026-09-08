from datetime import date

import pytest
from fastapi import HTTPException

from app.services.calculations import calculate_bazi, localized_birth_datetime


def test_historical_timezone_uses_birth_date_offset():
    winter = localized_birth_datetime(date(1990, 1, 15), "12:00", "America/New_York")
    summer = localized_birth_datetime(date(1990, 7, 15), "12:00", "America/New_York")
    assert winter.utcoffset().total_seconds() / 3600 == -5
    assert summer.utcoffset().total_seconds() / 3600 == -4


def test_ambiguous_fall_back_time_is_rejected():
    with pytest.raises(HTTPException) as error:
        localized_birth_datetime(date(2024, 11, 3), "01:30", "America/New_York")
    assert error.value.detail == "AMBIGUOUS_LOCAL_TIME"


def test_nonexistent_spring_forward_time_is_rejected():
    with pytest.raises(HTTPException) as error:
        localized_birth_datetime(date(2024, 3, 10), "02:30", "America/New_York")
    assert error.value.detail == "NONEXISTENT_LOCAL_TIME"


@pytest.mark.parametrize(
    ("birth_date", "birth_time"),
    [
        (date(2005, 2, 3), "23:15"),
        (date(2005, 2, 4), "01:15"),
        (date(2000, 2, 29), "12:00"),
        (date(1986, 5, 29), "00:00"),
    ],
)
def test_bazi_returns_four_complete_pillars(birth_date, birth_time):
    result = calculate_bazi(birth_date, birth_time, "Asia/Shanghai", "female")
    assert result["version"] == 1
    assert set(result["pillars"]) == {"year", "month", "day", "hour"}
    assert all(len(pillar["characters"]) == 2 for pillar in result["pillars"].values())
    assert all(
        pillar["stem_yin_yang"] in {"yin", "yang"}
        and pillar["branch_yin_yang"] in {"yin", "yang"}
        and isinstance(pillar["hidden_stems"], list)
        and pillar["ten_god_stem"]
        for pillar in result["pillars"].values()
    )
    assert result["luck_cycles_available"] is True
    assert result["luck_cycles"]["direction"] in {"forward", "reverse"}
    assert len(result["luck_cycles"]["cycles"]) == 8


def test_bazi_omits_directional_luck_cycles_without_gender():
    result = calculate_bazi(date(1990, 1, 15), "12:00", "Asia/Kolkata", None)
    assert result["luck_cycles_available"] is False
    assert "luck_cycles" not in result
