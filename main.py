
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel
from scipy.stats import linregress
import numpy as np
import sqlite3
from typing import List
from datetime import datetime

DB_PATH = "/content/ChemRate/chemrate.db"

app = FastAPI(title="ChemRate API")


def calculate_reaction_rate(time, concentration):
    time = np.array(time, dtype=float)
    concentration = np.array(concentration, dtype=float)

    if len(time) < 2:
        raise ValueError("ต้องมีข้อมูลอย่างน้อย 2 จุด")

    dt = np.diff(time)
    dc = np.diff(concentration)

    if np.any(dt == 0):
        raise ValueError("ค่า Time ห้ามซ้ำกัน")

    rates = -dc / dt
    average_rate = float(np.mean(rates))

    return rates.tolist(), average_rate


def calculate_reaction_order(concentration_exp, rate_exp):
    concentration_exp = np.array(concentration_exp, dtype=float)
    rate_exp = np.array(rate_exp, dtype=float)

    if len(concentration_exp) != len(rate_exp):
        raise ValueError("จำนวนข้อมูลไม่เท่ากัน")

    if len(concentration_exp) < 2:
        raise ValueError("ต้องมีข้อมูลอย่างน้อย 2 จุด")

    if np.any(concentration_exp <= 0) or np.any(rate_exp <= 0):
        raise ValueError("ค่าต้องมากกว่า 0")

    log_c = np.log(concentration_exp)
    log_r = np.log(rate_exp)

    result = linregress(log_c, log_r)

    n = float(result.slope)
    k = float(np.exp(result.intercept))
    r_squared = float(result.rvalue ** 2)

    return n, k, r_squared


class ExperimentData(BaseModel):
    time: List[float]
    concentration: List[float]
    concentration_exp: List[float]
    rate_exp: List[float]
    substance: str
    concentration_unit: str
    time_unit: str
    temperature: float



# ------------------------------------------------------------
# Frontend Static Files
# ------------------------------------------------------------

app.mount(
    "/app",
    StaticFiles(directory="."),
    name="app"
)

@app.get("/")
def root():
    return FileResponse("index.html")


@app.post("/api/analyze")
def analyze(data: ExperimentData):

    reaction_rate, average_rate = calculate_reaction_rate(
        data.time,
        data.concentration
    )

    n, k, r_squared = calculate_reaction_order(
        data.concentration_exp,
        data.rate_exp
    )

    return {
        "status": "success",
        "metadata": {
            "substance": data.substance,
            "concentration_unit": data.concentration_unit,
            "time_unit": data.time_unit,
            "temperature": data.temperature
        },
        "reaction_rate": reaction_rate,
        "average_rate": average_rate,
        "reaction_order": n,
        "rate_constant": k,
        "r_squared": r_squared,
        "graph": {
            "time": data.time,
            "concentration": data.concentration
        }
    }


@app.post("/api/analyze-save")
def analyze_save(data: ExperimentData):

    reaction_rate, average_rate = calculate_reaction_rate(
        data.time,
        data.concentration
    )

    n, k, r_squared = calculate_reaction_order(
        data.concentration_exp,
        data.rate_exp
    )

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO experiments
        (
            substance,
            concentration_unit,
            time_unit,
            temperature,
            average_rate,
            reaction_order,
            rate_constant,
            r_squared,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.substance,
        data.concentration_unit,
        data.time_unit,
        data.temperature,
        average_rate,
        n,
        k,
        r_squared,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    experiment_id = cursor.lastrowid

    for t, c in zip(data.time, data.concentration):
        cursor.execute("""
            INSERT INTO experiment_data
            (experiment_id, time, concentration)
            VALUES (?, ?, ?)
        """, (experiment_id, t, c))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "experiment_id": experiment_id,
        "metadata": {
            "substance": data.substance,
            "concentration_unit": data.concentration_unit,
            "time_unit": data.time_unit,
            "temperature": data.temperature
        },
        "reaction_rate": reaction_rate,
        "average_rate": average_rate,
        "reaction_order": n,
        "rate_constant": k,
        "r_squared": r_squared
    }


@app.get("/api/experiments")
def get_experiments():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT
            id,
            substance,
            concentration_unit,
            time_unit,
            temperature,
            average_rate,
            reaction_order,
            rate_constant,
            r_squared,
            created_at
        FROM experiments
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    experiments = [dict(row) for row in rows]

    return {
        "status": "success",
        "count": len(experiments),
        "experiments": experiments
    }


@app.delete("/api/experiments")
def delete_experiments():

    conn = sqlite3.connect(DB_PATH)

    conn.execute("DELETE FROM experiment_data")
    conn.execute("DELETE FROM experiments")

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": "Experiment history cleared"
    }


@app.get("/api/dashboard")
def dashboard():

    conn = sqlite3.connect(DB_PATH)

    row = conn.execute("""
        SELECT
            COUNT(*),
            AVG(average_rate),
            AVG(reaction_order),
            AVG(r_squared)
        FROM experiments
    """).fetchone()

    conn.close()

    return {
        "status": "success",
        "total_experiments": row[0] or 0,
        "average_rate": row[1] or 0,
        "average_reaction_order": row[2] or 0,
        "average_r_squared": row[3] or 0
    }


@app.post("/api/graph-data")
def graph_data(data: ExperimentData):

    reaction_rate, _ = calculate_reaction_rate(
        data.time,
        data.concentration
    )

    concentration = np.array(
        data.concentration,
        dtype=float
    )

    return {
        "status": "success",
        "graphs": {
            "concentration": {
                "time": data.time,
                "concentration": data.concentration
            },
            "reaction_rate": {
                "time": data.time[1:],
                "rate": reaction_rate
            },
            "ln_concentration": {
                "time": data.time,
                "ln_concentration": np.log(concentration).tolist()
            },
            "inverse_concentration": {
                "time": data.time,
                "inverse_concentration": (1 / concentration).tolist()
            }
        }
    }


# ------------------------------------------------------------
# Frontend
# ------------------------------------------------------------

@app.get("/", include_in_schema=False)
def home():
    return FileResponse("index.html")
