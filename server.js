const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const process = require("process");
const { log } = require("console");
const { XMLParser } = require("fast-xml-parser");

const URL_REF_STATION_LIST = "https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetStationList/1";
const URL_KB_STATIONS = "https://api1.raildata.org.uk/1010-knowlegebase-stations-xml-feed1_1/4.0/";
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const MIME_TYPES = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    svg: "image/svg+xml",
};

let stationsData;

// ----------------------------------------- MAIN ---------------------------------------------

function logHead() {
    const date = new Date();
    const dateStr = date.toISOString().replace(/T/, " ").replace(/\..+/, "");
    return `[${dateStr}] `;
}

async function niceFetch(label, url, apiKey, silent = false) {
    if (!silent) console.log(`${logHead()}Fetching '${label}' from '${url}'...`);
    const start = Date.now();
    let res;
    try {
        res = await fetch(url, { headers: { "x-apikey": apiKey } });
    } catch (e) {
        if (!silent) console.log(`${logHead()}Fetch failed!`);
        return;
    }
    const end = Date.now();
    const sizeBytes = res.headers.get("content-length");
    if (!silent)
        console.log(`${logHead()}Fetch successful, response: ${sizeBytes ? sizeBytes + " bytes in " : ""}${end - start}ms (${res.status} ${res.statusText})`);
    return res;
}

async function preprocessStationsData() {
    // Check if we already have some a stations.json
    const stationsDataPath = path.join(DATA_DIR, "stations.json");
    let stationsData = {};
    try {
        const data = await fs.readFile(stationsDataPath);
        stationsData = JSON.parse(data);
    } catch (err) {
        console.log(`${logHead()}No existing stations data: ${stationsDataPath}`);
    }

    // Fetch the reference data stations list if we don't already have it
    if (stationsData["list"]) {
        console.log(`${logHead()}Using existing station list...`);
    } else {
        const stationsListRes = await niceFetch("ref station list", URL_REF_STATION_LIST, process.env.RAILVIEW_APIKEY_REF);
        if (stationsListRes && stationsListRes.status !== 200) {
            console.error(`${logHead()}Could not fetch Reference data 'station-list', exiting...`);
            return;
        }
        stationsData["list"] = await stationsListRes.json();
        stationsData["list"] = stationsData["list"].StationList;
        stationsData["list"] = stationsData["list"].map((station) => station.crs);
        console.log(`${logHead()}Found ${stationsData["list"].length} stations`);
    }

    // Fetch each stations knowledge base data
    if (!stationsData["info"]) stationsData["info"] = {};
    let parser = new XMLParser();
    let stationsSkippedCount = 0;
    let stationsErrorCount = 0;
    let stationsFetchedCount = 0;
    let count = 0;

    async function logAndSave() {
        console.log(
            `${logHead()}Processed [${count}/${
                stationsData["list"].length
            }] stations (${stationsFetchedCount} fetched, ${stationsSkippedCount} skipped, ${stationsErrorCount} errors)`
        );
        console.log(`${logHead()}Saving stations data to '${stationsDataPath}'...`);
        try {
            await fs.writeFile(stationsDataPath, JSON.stringify(stationsData, null, 2));
            console.log(`${logHead()}Saved stations data successfully!`);
        } catch (err) {
            console.error(`${logHead()}Error saving stations data: ${err.message}`);
        }
    }

    for (const crs of stationsData["list"]) {
        count++;
        if (count % 50 === 0) await logAndSave();

        // Check if the station data already exists
        if (stationsData["info"][crs]) {
            console.log(`${logHead()}Station '${crs}' already exists, skipping...`);
            stationsSkippedCount++;
            continue;
        }

        // Fetch the knowledge base station data
        const stationDataURL = `${URL_KB_STATIONS}station-${crs}.xml`;
        const stationDataRes = await niceFetch(`kb-stations/station-${crs}`, stationDataURL, process.env.RAILVIEW_APIKEY_KB_STATIONS, (silent = true));
        if (stationDataRes && stationDataRes.status !== 200) {
            console.error(`${logHead()}Could not fetch KnowledgeBase data for station-${crs}'`);
            stationsErrorCount++;
            continue;
        }

        // Parse the XML data into the stations data
        const stationDataText = await stationDataRes.text();
        const stationDataParsed = parser.parse(stationDataText);
        stationsData["info"][crs] = stationDataParsed["StationV4.0"];
        console.log(`${logHead()}Fetched and parsed station data for '${crs}'`);
        stationsFetchedCount++;
    }

    await logAndSave();
}

async function preprocess() {
    console.log(`${logHead()}Preprocessing...`);

    await preprocessStationsData();

    console.log(`${logHead()}Preprocessing complete!`);
}

// ----------------------------------------- ENDPOINTS ---------------------------------------------

async function handleEndpointStatic(req, res) {
    const filePath = req.url === "/" ? "/index.html" : req.url;
    const fullPath = path.join(PUBLIC_DIR, filePath);

    try {
        const data = await fs.readFile(fullPath);
        const ext = path.extname(fullPath).slice(1);
        const mime = MIME_TYPES[ext] || "text/plain";
        res.writeHead(200, { "Content-Type": mime });
        res.end(data);
    } catch (err) {
        res.writeHead(404);
        res.end("404 Not Found");
    }
}

function handleEndpointTrains(req, res) {
    const data = JSON.stringify([
        { id: "train1", x: 100, y: 150 },
        { id: "train2", x: 300, y: 200 },
    ]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data);
}

// ----------------------------------------- DRIVER ---------------------------------------------

(async () => {
    await preprocess();

    return;

    const server = http.createServer((req, res) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from '${req.socket.remoteAddress}'`);

        if (req.url === "/api/trains") {
            handleEndpointTrains(req, res);
        } else {
            handleEndpointStatic(req, res);
        }
    });

    server.listen(PORT, () => {
        console.log(`${logHead()}Server running at http://localhost:${PORT}`);
    });
})();
