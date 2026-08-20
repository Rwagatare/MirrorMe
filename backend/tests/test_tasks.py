def test_create_and_get_task(client):
    res = client.post("/tasks/", json={"title": "Write onboarding doc"})
    assert res.status_code == 200
    task = res.json()
    assert task["title"] == "Write onboarding doc"
    assert task["status"] == "todo"

    res = client.get(f"/tasks/{task['id']}")
    assert res.status_code == 200
    assert res.json()["title"] == "Write onboarding doc"


def test_get_task_404(client):
    res = client.get("/tasks/999")
    assert res.status_code == 404


def test_update_task_marks_done_sets_completion_date(client):
    task = client.post("/tasks/", json={"title": "Ship feature"}).json()

    res = client.patch(f"/tasks/{task['id']}", json={"status": "done"})
    assert res.status_code == 200
    updated = res.json()
    assert updated["status"] == "done"
    assert updated["last_completed_date"] is not None


def test_delete_task(client):
    task = client.post("/tasks/", json={"title": "Temp task"}).json()

    res = client.delete(f"/tasks/{task['id']}")
    assert res.status_code == 200

    res = client.get(f"/tasks/{task['id']}")
    assert res.status_code == 404


def test_today_includes_daily_recurring_task(client):
    client.post("/tasks/", json={"title": "Meditate", "recurrence": "daily"})

    res = client.get("/tasks/today")
    assert res.status_code == 200
    titles = [t["title"] for t in res.json()]
    assert "Meditate" in titles
