



// ============================================================
// CHEMRATE FRONTEND
// ============================================================

const API_URL = "/api/analyze-save";
const GRAPH_API_URL = "/api/graph-data";

let concentrationChart = null;
let rateChart = null;
let lnChart = null;
let inverseChart = null;

let latestExperimentData = null;


// ============================================================
// UTILITIES
// ============================================================

function parseNumbers(value) {
    if (!value) return [];

    return value
        .split(/[\s,]+/)
        .map(Number)
        .filter(Number.isFinite);
}


function setStatus(message) {
    const element = document.getElementById("statusMessage");

    if (element) {
        element.textContent = message;
    }
}


// ============================================================
// DESTROY CHART
// ============================================================

function destroyChart(chart) {
    if (chart) {
        try {
            chart.stop();
            chart.destroy();
        } catch (e) {}
    }

    return null;
}


// ============================================================
// GRAPH 1 - CONCENTRATION
// ============================================================

function drawConcentrationGraph(time, concentration) {

    const canvas = document.getElementById("concentrationChart");

    if (!canvas) return;

    concentrationChart = destroyChart(concentrationChart);

    concentrationChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: time,

            datasets: [{
                label: "Concentration",
                data: concentration,
                borderWidth: 2,
                pointRadius: 3,
                tension: 0,
                fill: false
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: false,
            animations: false,
            transitions: false,
            animations: false,
            transitions: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Concentration"
                    }
                }
            }
        }
    });
}


// ============================================================
// GRAPH 2 - REACTION RATE
// ============================================================

function drawRateGraph(time, rate) {

    const canvas = document.getElementById("rateChart");

    if (!canvas) return;

    rateChart = destroyChart(rateChart);

    rateChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: time,

            datasets: [{
                label: "Reaction Rate",
                data: rate,
                borderWidth: 2,
                pointRadius: 3,
                tension: 0,
                fill: false
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: false,
            animations: false,
            transitions: false,
            animations: false,
            transitions: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Reaction Rate"
                    }
                }
            }
        }
    });
}


// ============================================================
// GRAPH 3 - ln[A]
// ============================================================

function drawLnGraph(time, values) {

    const canvas = document.getElementById("lnChart");

    if (!canvas) return;

    lnChart = destroyChart(lnChart);

    lnChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: time,

            datasets: [{
                label: "ln[A]",
                data: values,
                borderWidth: 2,
                pointRadius: 3,
                tension: 0,
                fill: false
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: false,
            animations: false,
            transitions: false,
            animations: false,
            transitions: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "ln[A]"
                    }
                }
            }
        }
    });
}


// ============================================================
// GRAPH 4 - 1/[A]
// ============================================================

function drawInverseGraph(time, values) {

    const canvas = document.getElementById("inverseChart");

    if (!canvas) return;

    inverseChart = destroyChart(inverseChart);

    inverseChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: time,

            datasets: [{
                label: "1/[A]",
                data: values,
                borderWidth: 2,
                pointRadius: 3,
                tension: 0,
                fill: false
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: false,
            animations: false,
            transitions: false,
            animations: false,
            transitions: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "1/[A]"
                    }
                }
            }
        }
    });
}


// ============================================================
// DRAW ALL GRAPHS
// ============================================================

function drawAllGraphs(graphs) {

    if (!graphs) return;

    // Concentration graph
    const concentrationData =
        graphs.concentration || {};

    drawConcentrationGraph(
        concentrationData.time || [],
        concentrationData.concentration || []
    );

    // Reaction rate graph
    const rateData =
        graphs.reaction_rate || {};

    drawRateGraph(
        rateData.time || [],
        rateData.rate || []
    );

    // ln[A] graph
    const lnData =
        graphs.ln_concentration || {};

    drawLnGraph(
        lnData.time || [],
        lnData.ln_concentration || []
    );

    // 1/[A] graph
    const inverseData =
        graphs.inverse_concentration || {};

    drawInverseGraph(
        inverseData.time || [],
        inverseData.inverse_concentration || []
    );
}


// ============================================================
// LOAD GRAPH DATA
// ============================================================

async function loadGraphData(requestData) {

    const response = await fetch(
        GRAPH_API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(requestData)
        }
    );

    if (!response.ok) {
        throw new Error("Graph API error");
    }

    const result = await response.json();

    return result.graphs;
}


// ============================================================
// SCIENTIFIC SUMMARY
// ============================================================

function getFitQuality(r2) {

    if (!Number.isFinite(r2)) {
        return "-";
    }

    if (r2 >= 0.99) return "Excellent";
    if (r2 >= 0.95) return "Very Good";
    if (r2 >= 0.90) return "Good";

    return "Needs improvement";
}


function updateScientificSummary(result) {

    const order = result.reaction_order;
    const k = result.rate_constant;
    const r2 = result.r_squared;

    const equation = document.getElementById("rateEquation");
    const summaryOrder = document.getElementById("summaryOrder");
    const summaryK = document.getElementById("summaryK");
    const summaryR2 = document.getElementById("summaryR2");
    const fitQuality = document.getElementById("fitQuality");

    if (equation) {
        if (Number.isFinite(order)) {
            equation.textContent =
                `Rate = k[A]^${Number(order).toFixed(2)}`;
        } else {
            equation.textContent = "-";
        }
    }

    if (summaryOrder) {
        summaryOrder.textContent =
            Number.isFinite(order)
                ? Number(order).toFixed(4)
                : "-";
    }

    if (summaryK) {
        summaryK.textContent =
            Number.isFinite(k)
                ? Number(k).toFixed(4)
                : "-";
    }

    if (summaryR2) {
        summaryR2.textContent =
            Number.isFinite(r2)
                ? Number(r2).toFixed(4)
                : "-";
    }

    if (fitQuality) {
        fitQuality.textContent = getFitQuality(r2);
    }
}


// ============================================================
// DATA TABLE
// ============================================================

function updateDataTable(time, concentration, reactionRate) {

    const tableBody =
        document.getElementById("dataTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    for (let i = 0; i < time.length; i++) {

        const row = document.createElement("tr");

        const point = document.createElement("td");
        const timeCell = document.createElement("td");
        const concentrationCell = document.createElement("td");
        const rateCell = document.createElement("td");

        point.textContent = i + 1;

        timeCell.textContent =
            Number(time[i]).toFixed(4);

        concentrationCell.textContent =
            Number(concentration[i]).toFixed(4);

        if (i < reactionRate.length) {
            rateCell.textContent =
                Number(reactionRate[i]).toFixed(6);
        } else {
            rateCell.textContent = "-";
        }

        row.appendChild(point);
        row.appendChild(timeCell);
        row.appendChild(concentrationCell);
        row.appendChild(rateCell);

        tableBody.appendChild(row);
    }
}


// ============================================================
// ANALYZE
// ============================================================

async function analyzeExperiment() {

    try {

        setStatus("กำลังวิเคราะห์...");

        const time = parseNumbers(
            document.getElementById("time")?.value || ""
        );

        const concentration = parseNumbers(
            document.getElementById("concentration")?.value || ""
        );

        const concentrationExp = parseNumbers(
            document.getElementById("concentrationExp")?.value || ""
        );

        const rateExp = parseNumbers(
            document.getElementById("rateExp")?.value || ""
        );

        if (time.length < 2) {
            throw new Error("กรุณาใส่ Time อย่างน้อย 2 ค่า");
        }

        if (time.length !== concentration.length) {
            throw new Error(
                "จำนวน Time และ Concentration ต้องเท่ากัน"
            );
        }

        const requestData = {

            time: time,

            concentration: concentration,

            concentration_exp: concentrationExp,

            rate_exp: rateExp,

            substance:
                document.getElementById("substance")?.value || "A",

            concentration_unit:
                document.getElementById("concentrationUnit")?.value
                || "mol/L",

            time_unit:
                document.getElementById("timeUnit")?.value
                || "s",

            temperature:
                Number(
                    document.getElementById("temperature")?.value
                ) || 25
        };


        // ====================================================
        // 1. ANALYZE API
        // ====================================================

        const response = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(requestData)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Analyze API Error: ${response.status}`
            );
        }

        const result = await response.json();


        // ====================================================
        // 2. SAVE RESULT
        // ====================================================

        latestExperimentData = {

            time: time,

            concentration: concentration,

            reactionRate:
                result.reaction_rate || [],

            averageRate:
                result.average_rate,

            reactionOrder:
                result.reaction_order,

            rateConstant:
                result.rate_constant,

            rSquared:
                result.r_squared
        };


        // ====================================================
        // 3. RESULT CARDS
        // ====================================================

        const averageRate =
            document.getElementById("averageRate");

        const reactionOrder =
            document.getElementById("reactionOrder");

        const rateConstant =
            document.getElementById("rateConstant");

        const rSquared =
            document.getElementById("rSquared");


        if (averageRate) {
            averageRate.textContent =
                Number(result.average_rate).toFixed(6);
        }

        if (reactionOrder) {
            reactionOrder.textContent =
                Number(result.reaction_order).toFixed(4);
        }

        if (rateConstant) {
            rateConstant.textContent =
                Number(result.rate_constant).toFixed(4);
        }

        if (rSquared) {
            rSquared.textContent =
                Number(result.r_squared).toFixed(4);
        }


        // ====================================================
        // 4. SCIENTIFIC SUMMARY
        // ====================================================

        try {

            updateScientificSummary(result);

        } catch (error) {

            console.error(
                "Scientific Summary Error:",
                error
            );

        }


        // ====================================================
        // 5. DATA TABLE
        // ====================================================

        try {

            updateDataTable(
                time,
                concentration,
                result.reaction_rate || []
            );

        } catch (error) {

            console.error(
                "Data Table Error:",
                error
            );

        }


        // ====================================================
        // 6. GRAPHS
        // ====================================================
        // ถ้ากราฟมีปัญหา จะไม่ทำให้ค่าผลลัพธ์หาย

        try {

            const graphData =
                await loadGraphData(requestData);

            if (graphData) {

                drawAllGraphs(graphData);

            }

        } catch (error) {

            console.error(
                "Graph Error:",
                error
            );

        }


        // ====================================================
        // 7. DASHBOARD + HISTORY
        // ====================================================

        try {

            await loadDashboard();

        } catch (error) {

            console.error(
                "Dashboard Error:",
                error
            );

        }

        try {

            await loadHistory();

        } catch (error) {

            console.error(
                "History Error:",
                error
            );

        }


        // ====================================================
        // 8. SUCCESS
        // ====================================================

        setStatus("✓ Analyze สำเร็จ");

    } catch (error) {

        console.error(error);

        setStatus(
            "❌ " + error.message
        );

    }
}


async function loadDashboard() {

    try {

        const response =
            await fetch("/api/dashboard");

        if (!response.ok) return;

        const data =
            await response.json();

        const total =
            document.getElementById("totalExperiments");

        if (total) {
            total.textContent =
                data.total_experiments ?? 0;
        }

    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// HISTORY
// ============================================================

async function loadHistory() {

    try {

        const response =
            await fetch("/api/experiments");

        if (!response.ok) return;

        const data =
            await response.json();

        const body =
            document.getElementById("historyBody");

        if (!body) return;

        body.innerHTML = "";

        const experiments =
            data.experiments || [];

        experiments.forEach(exp => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${exp.id}</td>
                <td>${exp.substance ?? "-"}</td>
                <td>${Number(exp.average_rate ?? 0).toFixed(6)}</td>
                <td>${Number(exp.reaction_order ?? 0).toFixed(4)}</td>
                <td>${Number(exp.rate_constant ?? 0).toFixed(4)}</td>
                <td>${Number(exp.r_squared ?? 0).toFixed(4)}</td>
            `;

            body.appendChild(row);
        });

    } catch (error) {
        console.error(error);
    }
}


// ============================================================
// CLEAR HISTORY
// ============================================================

async function clearHistory() {

    try {

        const response =
            await fetch(
                "/api/experiments",
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {
            throw new Error("ลบ History ไม่สำเร็จ");
        }

        setStatus("✓ ล้าง History แล้ว");

        loadHistory();
        loadDashboard();

    } catch (error) {

        setStatus(
            "❌ " + error.message
        );
    }
}


// ============================================================
// RESET
// ============================================================

function resetForm() {

    const fields = [
        "time",
        "concentration",
        "concentrationExp",
        "rateExp"
    ];

    fields.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });


    const resultIds = [
        "averageRate",
        "reactionOrder",
        "rateConstant",
        "rSquared",
        "rateEquation",
        "summaryOrder",
        "summaryK",
        "summaryR2",
        "fitQuality"
    ];

    resultIds.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = "-";
        }
    });


    concentrationChart = destroyChart(
        concentrationChart
    );

    rateChart = destroyChart(
        rateChart
    );

    lnChart = destroyChart(
        lnChart
    );

    inverseChart = destroyChart(
        inverseChart
    );


    const tableBody =
        document.getElementById("dataTableBody");

    if (tableBody) {
        tableBody.innerHTML = "";
    }

    latestExperimentData = null;

    setStatus("✓ Reset สำเร็จ");
}


// ============================================================
// EXPORT CSV
// ============================================================

function exportCSV() {

    if (!latestExperimentData) {

        setStatus(
            "❌ กรุณา Analyze ข้อมูลก่อน Export CSV"
        );

        return;
    }


    const time =
        latestExperimentData.time || [];

    const concentration =
        latestExperimentData.concentration || [];

    const reactionRate =
        latestExperimentData.reactionRate || [];


    let csv =
        "Point,Time,Concentration,Reaction Rate\n";


    for (let i = 0; i < time.length; i++) {

        const rate =
            i < reactionRate.length
                ? reactionRate[i]
                : "";

        csv +=
            `${i + 1},${time[i]},${concentration[i]},${rate}\n`;
    }


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "chemrate_experiment.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setStatus("✓ Export CSV สำเร็จ");
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const analyzeBtn =
            document.getElementById("analyzeBtn");

        if (analyzeBtn) {
            analyzeBtn.addEventListener(
                "click",
                analyzeExperiment
            );
        }


        const resetBtn =
            document.getElementById("resetBtn");

        if (resetBtn) {
            resetBtn.addEventListener(
                "click",
                resetForm
            );
        }


        const exportBtn =
            document.getElementById("exportBtn");

        if (exportBtn) {
            exportBtn.addEventListener(
                "click",
                exportCSV
            );
        }


        const historyBtn =
            document.getElementById("historyBtn");

        if (historyBtn) {
            historyBtn.addEventListener(
                "click",
                loadHistory
            );
        }


        const clearHistoryBtn =
            document.getElementById("clearHistoryBtn");

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener(
                "click",
                clearHistory
            );
        }


        loadDashboard();
        loadHistory();

        console.log(
            "ChemRate Frontend Ready"
        );
    }
);
