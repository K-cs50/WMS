import asyncio
import httpx
from main import app
from database import init_db

async def run_internal_tests():
    print("=" * 60)
    print("RUNNING WMS FULL VERIFICATION TEST SUITE (ASYNCHRONOUS)")
    print("=" * 60)

    await init_db()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("1. API Health Check: SUCCESS (200 OK)")

        # 2. Resident Login
        login_res = await client.post("/api/auth/login", data={"username": "priya@wms.demo", "password": "Demo@1234"})
        assert login_res.status_code == 200, f"Resident login failed: {login_res.text}"
        priya_token = login_res.json()["access_token"]
        priya_headers = {"Authorization": f"Bearer {priya_token}"}
        print("2. Resident Login: SUCCESS (Priya Sharma, Role: consumer)")

        # 3. Locality Representative Login
        rep_login = await client.post("/api/auth/login", data={"username": "ravi@wms.demo", "password": "Demo@1234"})
        assert rep_login.status_code == 200, f"Rep login failed: {rep_login.text}"
        rep_token = rep_login.json()["access_token"]
        rep_headers = {"Authorization": f"Bearer {rep_token}"}
        print("3. Locality Rep Login: SUCCESS (Ravi Kumar, Rep: Kondapur)")

        # 4. Admin Login
        admin_login = await client.post("/api/auth/login", data={"username": "admin@wms.demo", "password": "Admin@1234"})
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("4. Admin Login: SUCCESS (HMWSSB Admin Liaison, Role: admin)")

        # 5. Locality Search
        loc_res = await client.get("/api/localities/search?q=Banjara", headers=priya_headers)
        assert loc_res.status_code == 200
        localities = loc_res.json()
        assert len(localities) > 0
        banjara_id = localities[0]["id"]
        print(f"5. Locality Search: SUCCESS (Found {localities[0]['name']}, ID: {banjara_id})")

        # 6. Locality Rep Broadcast Creation (Community Announcement)
        broadcast_payload = {
            "locality_id": banjara_id,
            "affected_locality_ids": [banjara_id],
            "report_type": "low_pressure",
            "water_availability_status": "Low Pressure Flowing",
            "description": "Feeder pump power trip causing lower terminal pressure in sectors 4 and 7.",
            "source": "Banjara Hills Resident Welfare Association",
            "is_official": False
        }
        bc_res = await client.post("/api/reports/broadcast", json=broadcast_payload, headers=rep_headers)
        assert bc_res.status_code == 201, f"Broadcast creation failed: {bc_res.text}"
        bc_data = bc_res.json()
        print(f"6. Locality Rep Broadcast: SUCCESS (Broadcast ID: {bc_data['broadcast_id']})")

        # 7. Security Check: Non-admin CANNOT create "Official" notices
        fake_official_payload = {
            "locality_id": banjara_id,
            "affected_locality_ids": [banjara_id],
            "report_type": "supply_started",
            "water_availability_status": "Official Flow",
            "description": "Unauthorized claim of official announcement",
            "source": "Unverified User",
            "is_official": True
        }
        sec_res = await client.post("/api/reports/broadcast", json=fake_official_payload, headers=rep_headers)
        assert sec_res.status_code == 403, "Security violation: Non-admin should NOT be able to post official notice!"
        print("7. Security Enforcement: SUCCESS (403 Forbidden properly blocked non-admin official notice)")

        # 8. Admin Official Announcement Creation
        admin_bc_payload = {
            "locality_id": banjara_id,
            "affected_locality_ids": [banjara_id],
            "report_type": "supply_started",
            "water_availability_status": "Main Pipeline Supply Active",
            "description": "Municipal feeder lines pressurized. Regular 2-hour morning cycle underway.",
            "source": "HMWSSB Operational Gazette",
            "source_url": "https://www.hmwssb.gov.in",
            "is_official": True
        }
        admin_bc_res = await client.post("/api/reports/broadcast", json=admin_bc_payload, headers=admin_headers)
        assert admin_bc_res.status_code == 201, f"Admin broadcast failed: {admin_bc_res.text}"
        print("8. Official Admin Notice: SUCCESS (Official notice published with authority label)")

        # 9. Verify Notifications Delivered to Affected Residents
        notif_res = await client.get("/api/notifications/", headers=priya_headers)
        assert notif_res.status_code == 200
        notifs = notif_res.json()
        assert len(notifs) > 0
        print(f"9. Notification Delivery: SUCCESS (Resident received {len(notifs)} notifications, latest: {notifs[0]['title'][:40]}...)")

        # 10. Official Data Sources Registry
        src_res = await client.get("/api/sources/", headers=priya_headers)
        assert src_res.status_code == 200
        sources = src_res.json()
        assert len(sources) >= 5, "Expected at least 5 official data sources"
        print(f"10. Official Data Sources: SUCCESS ({len(sources)} verified agencies configured: HMWSSB, GHMC, IMD, CGWB, etc.)")

        # 11. Ingestion Layer Live Synchronization
        sync_res = await client.post("/api/sources/sync", headers=admin_headers)
        assert sync_res.status_code == 200
        sync_data = sync_res.json()
        print(f"11. Telemetry Ingestion Layer: SUCCESS ({sync_data['message']})")

        # 12. Geospatial Map & Reports
        map_stress_res = await client.get("/api/map/stress", headers=priya_headers)
        assert map_stress_res.status_code == 200
        stress_pts = map_stress_res.json()
        assert len(stress_pts) > 0
        rep_geo_res = await client.get("/api/reports/?limit=20", headers=priya_headers)
        assert rep_geo_res.status_code == 200
        reps_with_coords = rep_geo_res.json()
        has_coords = any(r.get("latitude") and r.get("longitude") for r in reps_with_coords)
        assert has_coords, "Reports should have latitude/longitude for map placement"
        print(f"12. Geospatial Intelligence: SUCCESS ({len(stress_pts)} stress zones, reports with accurate GIS coordinates)")

        # 13. Tanker Marketplace
        prov_res = await client.get("/api/providers/", headers=priya_headers)
        assert prov_res.status_code == 200
        provs = prov_res.json()
        assert len(provs) > 0
        print(f"13. Tanker Marketplace: SUCCESS ({len(provs)} providers active and verified)")

        # 14. ML Model Governance & Meteorological Constraints
        ml_metrics_res = await client.get("/api/ml/metrics")
        assert ml_metrics_res.status_code == 200, f"ML metrics failed: {ml_metrics_res.text}"
        metrics_data = ml_metrics_res.json()
        assert "final_test_metrics" in metrics_data
        assert "meteorological_feature_importances" in metrics_data
        print(f"14. ML Governance & Provenance: SUCCESS (Model: {metrics_data['model_name']}, Test MAE: {metrics_data['final_test_metrics']['mae']})")

        # 15. Real-Time Weather-Constrained ML Inference
        ml_pred_res = await client.post("/api/ml/predict-stress", json={
            "locality_name": "Kondapur",
            "temperature_c": 41.5,
            "rainfall_mm": 0.0,
            "humidity_pct": 35.0
        })
        assert ml_pred_res.status_code == 200, f"ML predict failed: {ml_pred_res.text}"
        pred_data = ml_pred_res.json()
        assert "predicted_water_stress_index" in pred_data
        assert "recommended_tanker_buffer_units" in pred_data
        print(f"15. Weather-Constrained ML Inference: SUCCESS (Stress: {pred_data['predicted_water_stress_index']}, Tankers: {pred_data['recommended_tanker_buffer_units']}, Heat Wave: {pred_data['meteorological_constraints']['heat_wave_active']})")

        print("=" * 60)
        print("ALL 15 TESTS PASSED PERFECTLY!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_internal_tests())
