const axios = require('axios');
const pool = require('./db-connection');
require('dotenv').config({ path: './.env' });

const interval_minutes = process.env.INTERVAL_MINUTES;

const gatherPidData = async () => {
    try {
        const response = await axios.get('https://mapa.pid.cz/getData.php/');
        return response.data["trips"];
    } catch (error) {
        console.log("Failed to fetch data from PID API", error);
        return null;
    }
}

const filterMetroData = (data) => {
    if (!data) {
        console.error("No data received");
        return [];
    }

    const dataArray = Object.values(data);
    const amountPerLines = {
        "A": 0,
        "B": 0,
        "C": 0
    };

    const allMetroTrains = dataArray.filter((trip) =>
        ["A", "B", "C"].includes(trip["route"]) &&
        ["on_track", "at_stop"].includes(trip["statePosition"])
    );

    for (const trip of allMetroTrains) {
        amountPerLines[trip["route"]] += 1;
    }

    return amountPerLines;
}

const writeToDatabase = async (data) => {
    const [rows] = await pool.default.query(
        'INSERT INTO metro (c_trains, b_trains, a_trains, fetch_datetime) VALUES (?, ?, ?, UTC_TIMESTAMP)',
        [data["C"], data["B"], data["A"]]
    );

    console.log("Inserted", rows.affectedRows, "rows");
}

setInterval(async () => {
    const pidData = await gatherPidData();
    const metroData = filterMetroData(pidData);

    await writeToDatabase(metroData);
}, 60000 * interval_minutes);
