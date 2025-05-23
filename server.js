const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const process = require("process");
const { log } = require("console");
const { XMLParser } = require("fast-xml-parser");

const TO_PREPROCESS = false;

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

// ----------------------------------------- UTILITY ---------------------------------------------

function logHead() {
	const date = new Date();
	const dateStr = date.toISOString().replace(/T/, " ").replace(/\..+/, "");
	return `[${dateStr}] `;
}

async function concurrentMap(items, limit, fn) {
	let index = 0;
	let inFlight = 0;
	const results = [];
	let itemsDone = 0;
	let itemsTotal = items.length;

	return new Promise((resolve, reject) => {
		function updateProgressBar() {
			const percent = Math.floor((itemsDone / itemsTotal) * 100);
			const bar = "#".repeat(percent / 2) + "-".repeat(50 - percent / 2);
			process.stdout.write(`\rProgress: [${bar}] ${percent}% (${itemsDone}/${itemsTotal})`);
		}

        // Launches as many requests as possible up to the limit
        // When one finishes it retriggers launchMore()
        // When the last one finishes it resolves the main promise
		function launchMore() {
			while (inFlight < limit && index < items.length) {
				const i = index++;
				inFlight++;

				fn(items[i], i)
					.then((res) => (results[i] = res))
					.catch((err) => (results[i] = null))
					.finally(() => {
						inFlight--;
						itemsDone++;
						updateProgressBar();
						if (itemsDone === items.length) {
							process.stdout.write("\n");
							resolve(results);
						} else {
							launchMore();
						}
					});
			}
		}

		launchMore();
	});
}

async function retry(fn, retries = 3, delay = 300) {
	let attempt = 0;
	while (attempt < retries) {
		try {
			return await fn();
		} catch (err) {
			if (++attempt >= retries) throw err;
			await new Promise((res) => setTimeout(res, delay * attempt));
		}
	}
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

// ----------------------------------------- MAIN ---------------------------------------------

async function preprocessStationsData() {
	// Ensure the data directory exists
	try {
		await fs.mkdir(DATA_DIR, { recursive: true });
	} catch (err) {
		console.error(`${logHead()}Error creating data directory: ${err.message}`);
		return;
	}

	// Check if the station info file already exists
	const stationsInfoPath = path.join(DATA_DIR, "stationsInfo.json");
	let stationsInfo = {};
	try {
		const fileData = await fs.readFile(stationsInfoPath);
		stationsInfo = JSON.parse(fileData);
	} catch {
		console.log(`${logHead()}No existing stations data at '${stationsInfoPath}'`);
	}

	// Fetch station list if not already present in the station info
	if (!stationsInfo["list"]) {
        const listRes = await retry(() =>
            niceFetch("ref station list", URL_REF_STATION_LIST, process.env.RAILVIEW_APIKEY_REF)
        );
		if (!listRes || listRes.status !== 200) {
			console.error(`${logHead()}Could not fetch station list, exiting...`);
			return;
		}
		const listJSON = await listRes.json();
		stationsInfo["list"] = listJSON.StationList.map((station) => station.crs);
		console.log(`${logHead()}Found ${stationsInfo["list"].length} stations`);
	} else {
		console.log(`${logHead()}Cached station list found with ${stationsInfo["list"].length} stations`);
	}

	if (!stationsInfo["info"]) stationsInfo["info"] = {};
	const parser = new XMLParser();
	let fetched = 0,
		failed = 0;
        
    // Concurrently fetch all the station data
    const toProcess = stationsInfo["list"].filter((crs) => !stationsInfo["info"][crs]);
    console.log(`${logHead()}Fetching ${toProcess.length} / ${stationsInfo["list"].length} stations...`);

	await concurrentMap(toProcess, 4, async (crs) => {
		try {
			const stationRes = await retry(() =>
				niceFetch(`kb-stations/station-${crs}`, `${URL_KB_STATIONS}station-${crs}.xml`, process.env.RAILVIEW_APIKEY_KB_STATIONS, true)
			);
			if (!stationRes || stationRes.status !== 200) {
				failed++;
				return;
			}
			const stationText = await stationRes.text();
			const stationParsed = parser.parse(stationText);
			stationsInfo["info"][crs] = stationParsed["StationV4.0"];
			fetched++;
		} catch (e) {
			failed++;
		}
	});

	console.log(`${logHead()}Finished: ${fetched} fetched, ${failed} failed.`);
	console.log(`${logHead()}Saving station data...`);
	try {
		await fs.writeFile(stationsInfoPath, JSON.stringify(stationsInfo, null, 2));
		console.log(`${logHead()}Saved successfully.`);
	} catch (err) {
		console.error(`${logHead()}Error writing JSON: ${err.message}`);
	}
}

async function preprocess() {
	console.log(`${logHead()}Preprocessing rail data...`);

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
    if (TO_PREPROCESS) await preprocess();

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
