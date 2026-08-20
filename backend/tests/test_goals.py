def test_create_and_list_goal(client):
    res = client.post("/goals/", json={"title": "Learn Rust"})
    assert res.status_code == 200

    res = client.get("/goals/")
    assert res.status_code == 200
    titles = [g["title"] for g in res.json()]
    assert "Learn Rust" in titles


def test_goal_404(client):
    res = client.get("/goals/999")
    assert res.status_code == 404


def test_progress_computed_from_subtasks(client):
    goal = client.post("/goals/", json={"title": "Ship v2"}).json()
    goal_id = goal["id"]

    t1 = client.post(f"/goals/{goal_id}/tasks/", json={"title": "Design"}).json()
    client.post(f"/goals/{goal_id}/tasks/", json={"title": "Build"})

    # No sub-tasks done yet
    res = client.get(f"/goals/{goal_id}")
    assert res.json()["progress"] == 0.0

    # Complete one of two sub-tasks -> 50%
    client.patch(f"/goals/{goal_id}/tasks/{t1['id']}")

    res = client.get(f"/goals/{goal_id}")
    assert res.json()["progress"] == 50.0


def test_progress_falls_back_to_stored_value_with_no_subtasks(client):
    goal = client.post("/goals/", json={"title": "No subtasks", "progress": 30.0}).json()

    res = client.get(f"/goals/{goal['id']}")
    assert res.json()["progress"] == 30.0


def test_delete_goal_cascades_subtasks(client):
    goal = client.post("/goals/", json={"title": "Delete me"}).json()
    client.post(f"/goals/{goal['id']}/tasks/", json={"title": "sub"})

    res = client.delete(f"/goals/{goal['id']}")
    assert res.status_code == 200

    res = client.get(f"/goals/{goal['id']}")
    assert res.status_code == 404
