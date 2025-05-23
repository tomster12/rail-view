const CAM_ZOOM_FACTOR = 1.1;
const CAM_ZOOM_SMOOTHING = 0.2;
const CAM_ZOOM_THRESHOLD = 0.04;
const CAM_ZOOM_MIN = 0.5;
const CAM_ZOOM_MAX = 50;
const MAP_TARGET_HEIGHT = 750;

// Hardcoded based on the map image
const MAP_WIDTH_LON = 10.3;
const MAP_HEIGHT_LAT = 10.8;
const MAP_CENTRE_LON = -3.5;
const MAP_CENTRE_LAT = 55.8;

const mapContainer = document.getElementById("map-container");
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");

let windowDPR = 1;
let mapAsset = {
	svg: null,
	width: 0,
	height: 0,
	targetHeightScale: 1,
};
let lonWorldUnit = 0;
let latWorldUnit = 0;
let trainsData = null;

let camera = {
	scale: 1,
	translate: { x: 0, y: 0 },
	translateCentre: { x: 0, y: 0 },
	translateUser: { x: 0, y: 0 },
	isDragging: false,
	dragStartWorld: { x: 0, y: 0 },
	scaleTarget: 1,
	scaleRefScreen: { x: 0, y: 0 },
};

// ----------------------------------------- UTILITY ---------------------------------------------

function setCursorType(type) {
	if (type === "grab") {
		canvas.style.cursor = "grab";
	} else if (type === "grabbing") {
		canvas.style.cursor = "grabbing";
	} else {
		canvas.style.cursor = "default";
	}
}

// ----------------------------------------- CAMERA ---------------------------------------------

function convertScreenToWorld(pos) {
	return {
		x: (pos.x - camera.translate.x) / camera.scale,
		y: (pos.y - camera.translate.y) / camera.scale,
	};
}

function convertWorldToScreen(pos) {
	return {
		x: pos.x * camera.scale + camera.translate.x,
		y: pos.y * camera.scale + camera.translate.y,
	};
}

function convertLonLatToWorld(lon, lat) {
	return {
		x: (lon - MAP_CENTRE_LON) * lonWorldUnit,
		y: -(lat - MAP_CENTRE_LAT) * latWorldUnit,
	};
}

function setCameraScale(newScale) {
	// Move the camera to keep the scale screen reference point in the same screen position
	const scaleRefWorldBefore = convertScreenToWorld(camera.scaleRefScreen);
	camera.scale = newScale;
	const scaleRefScreenAfter = convertWorldToScreen(scaleRefWorldBefore);
	camera.translateUser.x += camera.scaleRefScreen.x - scaleRefScreenAfter.x;
	camera.translateUser.y += camera.scaleRefScreen.y - scaleRefScreenAfter.y;
}

function setupCamera() {
	canvas.addEventListener("mousedown", (e) => {
		setCursorType("grabbing");
		camera.isDragging = true;
		camera.dragStartWorld = convertScreenToWorld({ x: e.clientX, y: e.clientY });
	});

	canvas.addEventListener("mousemove", (e) => {
		if (camera.isDragging) {
			// Move the camera so that the dragging mouse screen point stays in the same world position
			const mouseWorld = convertScreenToWorld({ x: e.clientX, y: e.clientY });
			camera.translateUser.x += (mouseWorld.x - camera.dragStartWorld.x) * camera.scale;
			camera.translateUser.y += (mouseWorld.y - camera.dragStartWorld.y) * camera.scale;
		}
	});

	canvas.addEventListener("mouseup", () => {
		camera.isDragging = false;
		setCursorType("default");
	});

	canvas.addEventListener("mouseleave", () => {
		camera.isDragging = false;
		setCursorType("default");
	});

	canvas.addEventListener(
		"wheel",
		(e) => {
			// Update target scale based on scroll, if changed direction then reset target scale
			camera.scaleRefScreen = { x: e.clientX, y: e.clientY };

			if (e.deltaY < 0) {
				if (camera.scaleTarget < camera.scale) {
					camera.scaleTarget = camera.scale;
				}
				camera.scaleTarget *= CAM_ZOOM_FACTOR;
			} else {
				if (camera.scaleTarget > camera.scale) {
					camera.scaleTarget = camera.scale;
				}
				camera.scaleTarget /= CAM_ZOOM_FACTOR;
			}

			e.preventDefault();
		},
		{ passive: false }
	);
}

function updateAndApplyCamera() {
	// Move scale towards target scale and clamp to min / max
	if (camera.scaleTarget < CAM_ZOOM_MIN) camera.scaleTarget = CAM_ZOOM_MIN;
	else if (camera.scaleTarget > CAM_ZOOM_MAX) camera.scaleTarget = CAM_ZOOM_MAX;

	if (camera.scaleTarget !== camera.scale) {
		const diff = camera.scaleTarget - camera.scale;
		if (Math.abs(diff) < CAM_ZOOM_THRESHOLD) {
			setCameraScale(camera.scaleTarget);
		} else {
			setCameraScale(camera.scale + diff * CAM_ZOOM_SMOOTHING);
		}
	}

	// Apply camera transforms
	canvas.width = canvas.clientWidth * windowDPR;
	canvas.height = canvas.clientHeight * windowDPR;
	camera.translateCentre.x = canvas.width * 0.5;
	camera.translateCentre.y = canvas.height * 0.5;
	camera.translate.x = camera.translateCentre.x + camera.translateUser.x;
	camera.translate.y = camera.translateCentre.y + camera.translateUser.y;
	ctx.setTransform(camera.scale * windowDPR, 0, 0, camera.scale * windowDPR, camera.translate.x, camera.translate.y);
}

// ----------------------------------------- MAIN ---------------------------------------------

async function loadMapSVG() {
	const mapData = await fetch("assets/map.svg");
	const mapText = await mapData.text();
	const parser = new DOMParser();
	const mapDoc = parser.parseFromString(mapText, "image/svg+xml");

	mapContainer.style.backgroundColor = "#1a1a20";

	// Grab the newly created SVG element
	mapAsset.svg = mapDoc.documentElement;
	mapAsset.svg.setAttribute("id", "map-svg");
	mapAsset.svg.style.position = "absolute";
	mapAsset.svg.style.top = "0";
	mapAsset.svg.style.left = "0";
	
	mapAsset.width = mapAsset.svg.width.baseVal.value;
	mapAsset.height = mapAsset.svg.height.baseVal.value;
	mapAsset.targetHeightScale = MAP_TARGET_HEIGHT / mapAsset.height;
	console.log(mapAsset.width, mapAsset.height, mapAsset.targetHeightScale);

	// Put the final SVG into the DOM
	mapContainer.prepend(mapAsset.svg);
}

async function setup() {
	windowDPR = window.devicePixelRatio || 1;

	const trainsRes = await fetch("/api/trains");
	trainsData = await trainsRes.json();

	await loadMapSVG();

	// lonWorldUnit = mapAsset.outputW / MAP_WIDTH_LON;
	// latWorldUnit = mapAsset.outputH / MAP_HEIGHT_LAT;

	setupCamera();
}

function update() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	updateAndApplyCamera();

	mapAsset.svg.style.transform = `translate(${-mapAsset.width / 2}px, ${-mapAsset.height / 2}px) translate(${camera.translate.x}px, ${camera.translate.y}px) scale(${camera.scale * mapAsset.targetHeightScale})`;
	
	// ctx.beginPath();
	// ctx.arc(0, 0, 2, 0, Math.PI * 2);
	// ctx.fillStyle = "white";
	// ctx.fill();
	// ctx.closePath();

	// const habroughWorldPos = convertLonLatToWorld(-0.267975846, 53.60553503);
	// ctx.beginPath();
	// ctx.arc(habroughWorldPos.x, habroughWorldPos.y, 2, 0, Math.PI * 2);
	// ctx.fillStyle = "red";
	// ctx.fill();
	// ctx.closePath();
}

// ----------------------------------------- DRIVER ---------------------------------------------

function updateLoop() {
	update();
	requestAnimationFrame(updateLoop);
}

(async () => {
	await setup();
	updateLoop();
})();
