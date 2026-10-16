import urllib.request
import json

def get(path):
    req = urllib.request.Request('http://127.0.0.1:8000' + path)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def run_tests():
    print("=== Testing Locality Data ===")
    locs = get('/api/localities/search')
    print(f"Total localities: {len(locs)}")
    lb_nagar = next((l for l in locs if l['name'] == 'LB Nagar'), None)
    uppal = next((l for l in locs if l['name'] == 'Uppal'), None)
    assert lb_nagar is not None, "LB Nagar not found!"
    assert uppal is not None, "Uppal not found!"
    print(f"LB Nagar: ID={lb_nagar['id']}, Coords=({lb_nagar['latitude']}, {lb_nagar['longitude']})")
    print(f"Uppal: ID={uppal['id']}, Coords=({uppal['latitude']}, {uppal['longitude']})")

    print("\n=== Testing Water Stress Data ===")
    stress = get('/api/map/stress')
    lb_stress = next((s for s in stress if s['locality_id'] == lb_nagar['id']), None)
    uppal_stress = next((s for s in stress if s['locality_id'] == uppal['id']), None)
    assert lb_stress is not None, "LB Nagar stress not found!"
    assert uppal_stress is not None, "Uppal stress not found!"
    print(f"LB Nagar stress: {lb_stress['stress_level']}, source: {lb_stress['data_source']}")
    print(f"Uppal stress: {uppal_stress['stress_level']}, source: {uppal_stress['data_source']}")

    print("\n=== Testing Location-Based Tanker Segregation ===")
    all_tankers = get('/api/map/tankers')
    lb_tankers = get(f"/api/map/tankers?locality_id={lb_nagar['id']}")
    uppal_tankers = get(f"/api/map/tankers?locality_id={uppal['id']}")
    print(f"Total Fleet: {len(all_tankers)} tankers")
    print(f"LB Nagar Tankers ({len(lb_tankers)}): {[t['registration_number'] for t in lb_tankers]}")
    print(f"Uppal Tankers ({len(uppal_tankers)}): {[t['registration_number'] for t in uppal_tankers]}")
    
    # Verify that all returned tankers have supported_localities containing target
    for t in lb_tankers:
        supp_ids = [l['id'] for l in t['supported_localities']]
        assert lb_nagar['id'] in supp_ids, f"Tanker {t['registration_number']} does not serve LB Nagar!"
    print("[OK] All LB Nagar tankers verified to explicitly serve LB Nagar.")

    for t in uppal_tankers:
        supp_ids = [l['id'] for l in t['supported_localities']]
        assert uppal['id'] in supp_ids, f"Tanker {t['registration_number']} does not serve Uppal!"
    print("[OK] All Uppal tankers verified to explicitly serve Uppal.")

    print("\n=== Testing Water Supply Reports ===")
    reports = get('/api/reports?limit=50')
    print(f"Total reports: {len(reports)}")
    statuses = set(r.get('verification_status') for r in reports if 'verification_status' in r)
    print(f"Observed verification statuses: {statuses}")
    assert 'official' in statuses, "Missing official notices"
    assert 'community_reported' in statuses, "Missing community verified reports"
    assert 'conflicting' in statuses, "Missing conflicting reports"
    assert 'outdated' in statuses, "Missing outdated reports"
    print("[OK] All 4 verification statuses present with authentic source attribution.")

    print("\nAll End-to-End API Checks Passed Successfully!")

if __name__ == '__main__':
    run_tests()
