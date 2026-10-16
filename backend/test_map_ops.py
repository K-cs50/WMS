import asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from auth import create_access_token

async def test_map_and_tanker_ops():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        print("\n--- Testing Map & Tanker Operations ---")

        # 1. Admin login token
        admin_token = create_access_token({"sub": "1"})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Test /api/map/stress
        stress_res = await ac.get("/api/map/stress")
        assert stress_res.status_code == 200, f"Expected 200, got {stress_res.status_code}"
        stress_data = stress_res.json()
        print(f"[PASS] Map Stress loaded: {len(stress_data)} localities monitored")
        lb_stress = next((s for s in stress_data if s["locality_name"] == "LB Nagar"), None)
        assert lb_stress is not None, "LB Nagar not found in stress data"
        assert lb_stress["stress_level"] == "high", f"Expected high, got {lb_stress['stress_level']}"
        print(f"[PASS] LB Nagar stress verified: {lb_stress['stress_level']} stress, groundwater {lb_stress['groundwater_level_m']} m bgl")

        uppal_stress = next((s for s in stress_data if s["locality_name"] == "Uppal"), None)
        assert uppal_stress is not None, "Uppal not found in stress data"
        assert uppal_stress["stress_level"] == "critical", f"Expected critical, got {uppal_stress['stress_level']}"
        print(f"[PASS] Uppal stress verified: {uppal_stress['stress_level']} stress, groundwater {uppal_stress['groundwater_level_m']} m bgl")

        # 3. Test Localities search
        loc_res = await ac.get("/api/localities/search")
        assert loc_res.status_code == 200
        locs = loc_res.json()
        lb_loc = next((l for l in locs if l["name"] == "LB Nagar"), None)
        uppal_loc = next((l for l in locs if l["name"] == "Uppal"), None)
        kukat_loc = next((l for l in locs if l["name"] == "Kukatpally"), None)
        assert lb_loc is not None and uppal_loc is not None and kukat_loc is not None
        print(f"[PASS] Locality search returned LB Nagar (ID: {lb_loc['id']}), Uppal (ID: {uppal_loc['id']})")

        # 4. Test Tankers filtered by LB Nagar
        tankers_lb_res = await ac.get(f"/api/providers/tankers?locality_id={lb_loc['id']}")
        assert tankers_lb_res.status_code == 200
        lb_tankers = tankers_lb_res.json()
        print(f"[PASS] Tankers serving LB Nagar: {len(lb_tankers)} tankers found")
        for t in lb_tankers:
            serves_lb = any(l["id"] == lb_loc["id"] for l in t["supported_localities"])
            assert serves_lb, f"Tanker {t['registration_number']} does not serve LB Nagar!"
        print("[PASS] All LB Nagar tankers verified to explicitly support LB Nagar service area")

        # 5. Test Tankers filtered by Uppal
        tankers_up_res = await ac.get(f"/api/providers/tankers?locality_id={uppal_loc['id']}")
        assert tankers_up_res.status_code == 200
        up_tankers = tankers_up_res.json()
        print(f"[PASS] Tankers serving Uppal: {len(up_tankers)} tankers found")
        for t in up_tankers:
            serves_up = any(l["id"] == uppal_loc["id"] for l in t["supported_localities"])
            assert serves_up, f"Tanker {t['registration_number']} does not serve Uppal!"

        # Ensure Uppal list is distinct from Kukatpally list
        tankers_kukat_res = await ac.get(f"/api/providers/tankers?locality_id={kukat_loc['id']}")
        kukat_tankers = tankers_kukat_res.json()
        kukat_regs = set(t["registration_number"] for t in kukat_tankers)
        up_regs = set(t["registration_number"] for t in up_tankers)
        assert kukat_regs != up_regs, "Tanker lists should be distinct by locality!"
        print("[PASS] Locality-based tanker segregation verified (Uppal vs Kukatpally)")

        # 6. Test Tanker Dispatch validation:
        # Pick an available tanker serving LB Nagar
        avail_lb_tanker = next((t for t in lb_tankers if t["is_available"]), None)
        assert avail_lb_tanker is not None, "No available tanker found for LB Nagar"

        # Try to dispatch this tanker to Kukatpally (which it DOES NOT serve) -> Expect 400
        invalid_dispatch_res = await ac.post(
            f"/api/providers/tankers/{avail_lb_tanker['id']}/dispatch",
            headers=headers,
            json={
                "locality_id": kukat_loc["id"],
                "delivery_address": "Kukatpally Housing Board",
                "consumer_notes": "Testing unauthorized service area"
            }
        )
        assert invalid_dispatch_res.status_code == 400, f"Expected 400, got {invalid_dispatch_res.status_code}"
        print(f"[PASS] Confirmed: Dispatch to unsupported locality blocked with 400: '{invalid_dispatch_res.json()['detail']}'")

        # Now dispatch to valid locality (LB Nagar) -> Expect 200
        valid_dispatch_res = await ac.post(
            f"/api/providers/tankers/{avail_lb_tanker['id']}/dispatch",
            headers=headers,
            json={
                "locality_id": lb_loc["id"],
                "delivery_address": "LB Nagar Ring Road Ward 10",
                "consumer_notes": "Emergency stress dispatch"
            }
        )
        assert valid_dispatch_res.status_code == 200, f"Expected 200, got {valid_dispatch_res.status_code}: {valid_dispatch_res.text}"
        dispatch_data = valid_dispatch_res.json()
        print(f"[PASS] Confirmed: Dispatch succeeded! Ref: {dispatch_data['booking_reference']}, Tanker ID: {dispatch_data['tanker_id']}")

        # Try to double-dispatch the same tanker -> Expect 409 Conflict
        conflict_res = await ac.post(
            f"/api/providers/tankers/{avail_lb_tanker['id']}/dispatch",
            headers=headers,
            json={"locality_id": lb_loc["id"]}
        )
        assert conflict_res.status_code == 409, f"Expected 409, got {conflict_res.status_code}"
        print(f"[PASS] Confirmed: Conflicting double-dispatch blocked with 409 Conflict: '{conflict_res.json()['detail']}'")

        # Now return/release the tanker -> Expect 200
        return_res = await ac.post(f"/api/providers/tankers/{avail_lb_tanker['id']}/return", headers=headers)
        assert return_res.status_code == 200
        print(f"[PASS] Confirmed: Tanker returned and marked available again")

        # 7. Test Broadcast Locality Report
        broadcast_res = await ac.post(
            "/api/reports/broadcast",
            headers=headers,
            json={
                "locality_id": lb_loc["id"],
                "affected_locality_ids": [lb_loc["id"]],
                "report_type": "supply_delayed",
                "water_availability_status": "Valve Overhaul",
                "description": "Statutory advisory: Piped line valve overhaul scheduled near LB Nagar junction.",
                "source": "HMWSSB South-East Zone Emergency Operations",
                "is_official": True,
                "observed_at": "2026-10-16T18:00:00Z"
            }
        )
        assert broadcast_res.status_code in [200, 201], f"Expected 200/201, got {broadcast_res.status_code}: {broadcast_res.text}"
        print(f"[PASS] Confirmed: Locality broadcast published successfully for LB Nagar")

        print("\n============================================================")
        print("ALL MAP, TANKER, DISPATCH & BROADCAST TESTS PASSED PERFECTLY!")
        print("============================================================\n")

if __name__ == "__main__":
    asyncio.run(test_map_and_tanker_ops())
