"""
Synthetic Dataset Generator for WMS:
Civic Water Infrastructure & Municipal Supply constrained by Meteorological Variables
(Greater Hyderabad Municipal Corporation / HMWS&SB Jurisdiction)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

# Set random seed for reproducibility
np.random.seed(42)

WARDS = [
    {"id": 1, "name": "Banjara Hills", "zone": "Khairatabad", "lat": 17.4156, "lng": 78.4350, "elev": 540, "base_cap_mld": 4.2, "pipe_age": 18},
    {"id": 2, "name": "Jubilee Hills", "zone": "Khairatabad", "lat": 17.4319, "lng": 78.4073, "elev": 555, "base_cap_mld": 3.8, "pipe_age": 14},
    {"id": 3, "name": "Kondapur", "zone": "Serilingampally", "lat": 17.4699, "lng": 78.3578, "elev": 560, "base_cap_mld": 5.1, "pipe_age": 9},
    {"id": 4, "name": "Madhapur (Hitec City)", "zone": "Serilingampally", "lat": 17.4483, "lng": 78.3915, "elev": 550, "base_cap_mld": 6.5, "pipe_age": 11},
    {"id": 5, "name": "Gachibowli", "zone": "Serilingampally", "lat": 17.4401, "lng": 78.3489, "elev": 565, "base_cap_mld": 4.9, "pipe_age": 8},
    {"id": 6, "name": "Kukatpally", "zone": "Kukatpally", "lat": 17.4947, "lng": 78.3996, "elev": 535, "base_cap_mld": 7.2, "pipe_age": 22},
    {"id": 7, "name": "Secunderabad (Clock Tower)", "zone": "Secunderabad", "lat": 17.4399, "lng": 78.4983, "elev": 520, "base_cap_mld": 5.8, "pipe_age": 35},
    {"id": 8, "name": "Begumpet", "zone": "Begumpet", "lat": 17.4440, "lng": 78.4682, "elev": 515, "base_cap_mld": 4.4, "pipe_age": 28},
    {"id": 9, "name": "Charminar (Old City)", "zone": "Charminar", "lat": 17.3616, "lng": 78.4747, "elev": 505, "base_cap_mld": 6.1, "pipe_age": 42},
    {"id": 10, "name": "Dilsukhnagar", "zone": "L.B. Nagar", "lat": 17.3688, "lng": 78.5247, "elev": 510, "base_cap_mld": 5.0, "pipe_age": 25},
    {"id": 11, "name": "L.B. Nagar", "zone": "L.B. Nagar", "lat": 17.3524, "lng": 78.5522, "elev": 508, "base_cap_mld": 4.8, "pipe_age": 20},
    {"id": 12, "name": "Ameerpet", "zone": "Khairatabad", "lat": 17.4375, "lng": 78.4482, "elev": 530, "base_cap_mld": 5.2, "pipe_age": 26},
    {"id": 13, "name": "Mehdipatnam", "zone": "Charminar", "lat": 17.3916, "lng": 78.4400, "elev": 525, "base_cap_mld": 4.6, "pipe_age": 21},
    {"id": 14, "name": "Uppal", "zone": "Uppal", "lat": 17.4018, "lng": 78.5602, "elev": 495, "base_cap_mld": 5.5, "pipe_age": 16},
    {"id": 15, "name": "Miyapur", "zone": "Serilingampally", "lat": 17.4968, "lng": 78.3547, "elev": 558, "base_cap_mld": 5.0, "pipe_age": 10},
    {"id": 16, "name": "Manikonda", "zone": "Rajendranagar", "lat": 17.3984, "lng": 78.3892, "elev": 545, "base_cap_mld": 4.0, "pipe_age": 7},
]

def generate_water_weather_dataset(n_days=365):
    """
    Generates realistic daily time series across 16 major Hyderabad municipal wards
    incorporating seasonal meteorological cycles:
    - Summer (March - May): Extreme temperatures (36-43C), 0 rainfall, high consecutive dry days, high stress.
    - Monsoon (June - September): Heavy rainfall (10-120mm), high humidity (70-95%), aquifer recharge, lower stress.
    - Post-Monsoon/Winter (October - February): Moderate temp (16-29C), low rainfall, stable reservoir buffers.
    """
    start_date = datetime(2025, 1, 1)
    records = []

    for day_idx in range(n_days):
        curr_date = start_date + timedelta(days=day_idx)
        month = curr_date.month
        day_of_year = curr_date.timetuple().tm_yday

        # Meteorological Season Classification
        if month in [3, 4, 5]:
            season = "Summer"
            base_temp = 37.0 + 3.5 * np.sin((day_of_year - 60) / 90 * np.pi)
            base_hum = 35.0 - 10.0 * np.sin((day_of_year - 60) / 90 * np.pi)
            rain_prob = 0.08
            avg_rain = 3.0
        elif month in [6, 7, 8, 9]:
            season = "Monsoon"
            base_temp = 29.5 - 2.0 * np.sin((day_of_year - 150) / 120 * np.pi)
            base_hum = 78.0 + 12.0 * np.sin((day_of_year - 150) / 120 * np.pi)
            rain_prob = 0.65
            avg_rain = 22.0
        else:
            season = "Winter"
            base_temp = 25.0 - 5.0 * np.cos((day_of_year) / 365 * 2 * np.pi)
            base_hum = 55.0 + 8.0 * np.cos((day_of_year) / 365 * 2 * np.pi)
            rain_prob = 0.12
            avg_rain = 4.0

        for ward in WARDS:
            # Ward micro-climate perturbations
            elev_adj = (ward["elev"] - 530) * -0.01
            temp = float(np.clip(base_temp + elev_adj + np.random.normal(0, 1.8), 14.0, 44.5))
            hum = float(np.clip(base_hum + np.random.normal(0, 4.5), 18.0, 98.0))
            
            # Rainfall simulation
            if np.random.rand() < rain_prob:
                rainfall_mm = float(np.round(np.random.exponential(avg_rain), 1))
            else:
                rainfall_mm = 0.0

            # Cumulative weather constraints
            wind_speed_kmh = float(np.clip(np.random.normal(12.0, 4.0), 3.0, 38.0))
            heat_wave_flag = int(temp >= 39.5)
            evapotranspiration_mm = float(np.round(0.0023 * (temp + 17.8) * np.sqrt(max(0, temp - 12)) * (100 - hum) / 50, 2))
            
            # Weather impacts on water infrastructure:
            # 1. High temp & heat wave spike consumer demand (+25% to +50%)
            # 2. Rainfall replenishes surface reservoirs and eases localized aquifer drawdown
            # 3. Old pipe infrastructure has higher friction and burst rate under heat expansion
            pipe_degradation = min(1.0, ward["pipe_age"] / 45.0)
            heat_stress = max(0.0, (temp - 32.0) / 12.0) * 0.45
            rain_relief = min(0.40, rainfall_mm / 45.0)
            
            # Synthetic Water Stress Index (0.0 to 1.0)
            raw_stress = (
                0.35
                + heat_stress
                - rain_relief
                + (pipe_degradation * 0.25)
                + (0.15 if heat_wave_flag else 0.0)
                + np.random.normal(0, 0.05)
            )
            stress_index = float(np.clip(np.round(raw_stress, 3), 0.05, 0.98))

            # Reliability Score (inverse relation with stress, decaying with heat stress & infrastructure age)
            reliability_score = float(np.clip(np.round(1.0 - (stress_index * 0.85) + np.random.normal(0, 0.04), 3), 0.08, 0.98))

            # Emergency Tanker Demand (units requested in ward)
            base_tankers = int(np.round(ward["base_cap_mld"] * 2.8 * (1.0 + stress_index * 2.2)))
            if heat_wave_flag:
                base_tankers += int(np.random.randint(4, 12))

            records.append({
                "date": curr_date.strftime("%Y-%m-%d"),
                "ward_id": ward["id"],
                "ward_name": ward["name"],
                "zone": ward["zone"],
                "latitude": ward["lat"],
                "longitude": ward["lng"],
                "elevation_m": ward["elev"],
                "pipeline_age_years": ward["pipe_age"],
                "base_capacity_mld": ward["base_cap_mld"],
                "season": season,
                "temperature_c": round(temp, 1),
                "humidity_pct": round(hum, 1),
                "rainfall_mm": rainfall_mm,
                "wind_speed_kmh": round(wind_speed_kmh, 1),
                "evapotranspiration_mm": evapotranspiration_mm,
                "heat_wave_flag": heat_wave_flag,
                # Targets
                "water_stress_index": stress_index,
                "supply_reliability_score": reliability_score,
                "tanker_demand_units": base_tankers
            })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "synthetic_water_weather_dataset.csv")
    print("Generating 365-day synthetic hydrological-weather dataset...")
    df = generate_water_weather_dataset(365)
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} records for {len(WARDS)} wards.")
    print(f"Dataset successfully saved to: {csv_path}")
    print(df.head(3))
