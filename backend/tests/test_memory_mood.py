from routers.memory import normalize_mood, mood_score


def test_normalize_mood_converts_string_labels_to_emoji():
    assert normalize_mood("great") == "🤩"
    assert normalize_mood("terrible") == "😔"


def test_normalize_mood_passes_through_emoji_and_unknown():
    assert normalize_mood("🤩") == "🤩"
    assert normalize_mood("sideways") == "sideways"
    assert normalize_mood(None) is None


def test_mood_score_handles_both_formats():
    assert mood_score("great") == mood_score("🤩") == 5
    assert mood_score("terrible") == mood_score("😔") == 1
    assert mood_score(None) is None


def test_create_memory_normalizes_string_mood_to_emoji(client):
    res = client.post("/memory/", json={
        "content": "Had a great day",
        "date": "2026-08-10",
        "mood": "great",
    })
    assert res.status_code == 200
    assert res.json()["mood"] == "🤩"


def test_update_memory_normalizes_string_mood_to_emoji(client):
    entry = client.post("/memory/", json={
        "content": "Rough one",
        "date": "2026-08-10",
        "mood": "hard",
    }).json()

    res = client.patch(f"/memory/{entry['id']}", json={"mood": "good"})
    assert res.status_code == 200
    assert res.json()["mood"] == "😊"


def test_mood_summary_averages_across_formats(client):
    # One entry written pre-normalization style (raw emoji), one via the API
    # (normalized) — both should score identically in the aggregate.
    client.post("/memory/", json={"content": "day 1", "date": "2026-08-08", "mood": "great"})
    client.post("/memory/", json={"content": "day 2", "date": "2026-08-09", "mood": "terrible"})

    res = client.get("/memory/mood-summary?days=7")
    assert res.status_code == 200
    body = res.json()
    assert body["entry_count"] == 2
    assert body["average_score"] == 3.0  # (5 + 1) / 2
    assert all(e["mood"] in ("🤩", "😔") for e in body["entries"])
