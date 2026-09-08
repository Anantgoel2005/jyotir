"""Birth-time validation and normalized astrology calculations."""

from collections import Counter
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException
from lunar_python import Solar

from app.services.astro_api import calculate_chart

GAN_PINYIN = {
    "甲": "Jia", "乙": "Yi", "丙": "Bing", "丁": "Ding", "戊": "Wu",
    "己": "Ji", "庚": "Geng", "辛": "Xin", "壬": "Ren", "癸": "Gui",
}
ZHI_PINYIN = {
    "子": "Zi", "丑": "Chou", "寅": "Yin", "卯": "Mao", "辰": "Chen", "巳": "Si",
    "午": "Wu", "未": "Wei", "申": "Shen", "酉": "You", "戌": "Xu", "亥": "Hai",
}
ELEMENT_NAMES = {"木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water"}
GAN_YIN_YANG = {
    character: ("yang" if index % 2 == 0 else "yin")
    for index, character in enumerate("甲乙丙丁戊己庚辛壬癸")
}
ZHI_YIN_YANG = {
    character: ("yang" if index % 2 == 0 else "yin")
    for index, character in enumerate("子丑寅卯辰巳午未申酉戌亥")
}


def localized_birth_datetime(birth_date, birth_time: str, timezone_name: str) -> datetime:
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status_code=422, detail="INVALID_TIMEZONE") from exc
    hour, minute = map(int, birth_time.split(":"))
    naive = datetime.combine(birth_date, datetime.min.time()).replace(hour=hour, minute=minute)
    candidates = [naive.replace(tzinfo=zone, fold=fold) for fold in (0, 1)]
    valid = [
        value for value in candidates
        if value.astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None) == naive
    ]
    if not valid:
        raise HTTPException(status_code=422, detail="NONEXISTENT_LOCAL_TIME")
    if len(valid) == 2 and valid[0].utcoffset() != valid[1].utcoffset():
        raise HTTPException(status_code=422, detail="AMBIGUOUS_LOCAL_TIME")
    return valid[0]


def _pillar(eight, prefix: str) -> dict:
    gan = getattr(eight, f"get{prefix}Gan")()
    zhi = getattr(eight, f"get{prefix}Zhi")()
    wuxing = getattr(eight, f"get{prefix}WuXing")()
    elements = [ELEMENT_NAMES.get(char, char) for char in wuxing if char in ELEMENT_NAMES]
    hidden = list(getattr(eight, f"get{prefix}HideGan")())
    return {
        "characters": f"{gan}{zhi}",
        "transliteration": f"{GAN_PINYIN.get(gan, gan)} {ZHI_PINYIN.get(zhi, zhi)}",
        "stem": gan,
        "branch": zhi,
        "stem_yin_yang": GAN_YIN_YANG[gan],
        "branch_yin_yang": ZHI_YIN_YANG[zhi],
        "elements": elements,
        "hidden_stems": [
            {"character": character, "transliteration": GAN_PINYIN.get(character, character)}
            for character in hidden
        ],
        "ten_god_stem": getattr(eight, f"get{prefix}ShiShenGan")(),
        "ten_god_branches": list(getattr(eight, f"get{prefix}ShiShenZhi")()),
        "nayin": getattr(eight, f"get{prefix}NaYin")(),
    }


def calculate_bazi(birth_date, birth_time: str, timezone_name: str, gender: str | None) -> dict:
    local = localized_birth_datetime(birth_date, birth_time, timezone_name)
    solar = Solar.fromYmdHms(
        local.year, local.month, local.day, local.hour, local.minute, local.second
    )
    eight = solar.getLunar().getEightChar()
    pillars = {
        key: _pillar(eight, prefix)
        for key, prefix in (("year", "Year"), ("month", "Month"), ("day", "Day"), ("hour", "Time"))
    }
    balance = Counter(
        element for pillar in pillars.values() for element in pillar["elements"]
    )
    day_stem = pillars["day"]["stem"]
    result = {
        "version": 1,
        "system": "bazi",
        "provider": "lunar-python",
        "convention": "local_civil_time",
        "timezone": timezone_name,
        "utc_offset_hours": local.utcoffset().total_seconds() / 3600,
        "pillars": pillars,
        "day_master": {
            "character": day_stem,
            "transliteration": GAN_PINYIN.get(day_stem, day_stem),
            "element": pillars["day"]["elements"][0] if pillars["day"]["elements"] else None,
        },
        "element_balance": dict(balance),
        "luck_cycles_available": gender in {"male", "female"},
    }
    if gender in {"male", "female"}:
        numeric_gender = 1 if gender == "male" else 0
        yun = eight.getYun(numeric_gender)
        year_is_yang = pillars["year"]["stem_yin_yang"] == "yang"
        forward = (gender == "male" and year_is_yang) or (
            gender == "female" and not year_is_yang
        )
        result["luck_cycles"] = {
            "direction": "forward" if forward else "reverse",
            "starts_after": {
                "years": yun.getStartYear(),
                "months": yun.getStartMonth(),
                "days": yun.getStartDay(),
                "hours": yun.getStartHour(),
            },
            "cycles": [
                {
                    "characters": cycle.getGanZhi(),
                    "start_age": cycle.getStartAge(),
                    "end_age": cycle.getEndAge(),
                    "start_year": cycle.getStartYear(),
                    "end_year": cycle.getEndYear(),
                }
                for cycle in yun.getDaYun()[1:9]
            ],
        }
    return result


async def calculate_normalized(request) -> dict:
    local = localized_birth_datetime(
        request.birth_date, request.birth_time, request.birth_timezone
    )
    if request.system == "bazi":
        return calculate_bazi(
            request.birth_date, request.birth_time, request.birth_timezone, request.gender
        )
    raw = await calculate_chart(
        system=request.system,
        name=request.person_name,
        birth_date=request.birth_date.isoformat(),
        birth_time=request.birth_time,
        lat=request.birth_latitude,
        lng=request.birth_longitude,
        tz_offset=local.utcoffset().total_seconds() / 3600,
        gender=request.gender,
    )
    return {
        "version": 1,
        "system": request.system,
        "provider": "astrologyapi",
        "timezone": request.birth_timezone,
        "utc_offset_hours": local.utcoffset().total_seconds() / 3600,
        "data": raw,
    }
