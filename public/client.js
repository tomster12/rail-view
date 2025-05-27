const CAM_ZOOM_FACTOR = 1.1;
const CAM_ZOOM_SMOOTHING = 0.2;
const CAM_ZOOM_THRESHOLD = 0.04;
const CAM_ZOOM_MIN = 0.5;
const CAM_ZOOM_MAX = 50;
const MAP_TARGET_HEIGHT = 700;
let MAP_GEO_BOUNDS = { left: -8.7, right: 1.8, top: 60.83, bottom: 49.93 };
const MAP_CONTAINER = document.getElementById("map-container");
const CANVAS = document.getElementById("map");
const CTX = CANVAS.getContext("2d");

let stationsInfo = null;
let mapAsset = {
	svg: null,
	baseWidth: 0,
	baseHeight: 0,
	targetScale: 1,
};
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
		CANVAS.style.cursor = "grab";
	} else if (type === "grabbing") {
		CANVAS.style.cursor = "grabbing";
	} else {
		CANVAS.style.cursor = "default";
	}
}

// ----------------------------------------- CAMERA ---------------------------------------------

// The map-container element and the canvas element both scale to the screen
// By default the SVG is loaded into the DOM at its original size
//
// Translate (0, 0) and scale (1) makes screen coordinates == world coordinates
// - The canvas is translated so (0, 0) is at the centre of the screen
// - The SVG is translated so (0, 0) is at the centre of the SVG and scaled so height is MAP_TARGET_HEIGHT
// The camera user translate and scale are then applied to the canvas and the SVG ontop of this
//
// "World" coordinates are effectively screen coordinates translated and scaled by the camera

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
	const bounds = MAP_GEO_BOUNDS;

	// Normalize longitude to (0 - 1) on the map bounds
	let normX = (lon - bounds.left) / (bounds.right - bounds.left);
	normX = Math.max(Math.min(normX, 1), 0);

	// Convert latitude to radians, perform Mercator projection, then normalize to (0 - 1) on the map bounds
	const radLat = (lat * Math.PI) / 180;
	const radTop = (bounds.top * Math.PI) / 180;
	const radBottom = (bounds.bottom * Math.PI) / 180;
	const mercLat = Math.log(Math.tan(Math.PI / 4 + radLat / 2));
	const mercTop = Math.log(Math.tan(Math.PI / 4 + radTop / 2));
	const mercBottom = Math.log(Math.tan(Math.PI / 4 + radBottom / 2));
	const normY = (mercTop - mercLat) / (mercTop - mercBottom);

	// Map the normalized coordinates to world coordinates
	// - The maps centre is world (0, 0)
	// - The maps world bounds are (-width / 2, -height / 2) to (width / 2, height / 2) but scaled by the target scale
	const worldWidth = mapAsset.baseWidth * mapAsset.targetScale;
	const worldHeight = mapAsset.baseHeight * mapAsset.targetScale;
	return {
		x: worldWidth * (normX - 0.5),
		y: worldHeight * (normY - 0.5),
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
	CANVAS.addEventListener("mousedown", (e) => {
		setCursorType("grabbing");
		camera.isDragging = true;
		camera.dragStartWorld = convertScreenToWorld({ x: e.clientX, y: e.clientY });
	});

	CANVAS.addEventListener("mousemove", (e) => {
		if (camera.isDragging) {
			// Move the camera so that the dragging mouse screen point stays in the same world position
			const mouseWorld = convertScreenToWorld({ x: e.clientX, y: e.clientY });
			camera.translateUser.x += (mouseWorld.x - camera.dragStartWorld.x) * camera.scale;
			camera.translateUser.y += (mouseWorld.y - camera.dragStartWorld.y) * camera.scale;
		}
	});

	CANVAS.addEventListener("mouseup", () => {
		camera.isDragging = false;
		setCursorType("default");
	});

	CANVAS.addEventListener("mouseleave", () => {
		camera.isDragging = false;
		setCursorType("default");
	});

	CANVAS.addEventListener(
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

function applyCameraTransforms() {
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

	// Apply the camera transforms
	CANVAS.width = CANVAS.clientWidth;
	CANVAS.height = CANVAS.clientHeight;
	camera.translateCentre.x = CANVAS.width * 0.5;
	camera.translateCentre.y = CANVAS.height * 0.5;
	camera.translate.x = camera.translateCentre.x + camera.translateUser.x;
	camera.translate.y = camera.translateCentre.y + camera.translateUser.y;
	CTX.setTransform(camera.scale, 0, 0, camera.scale, camera.translate.x, camera.translate.y);

	// Apply the SVG transforms
	mapAsset.svg.style.transform = `
		translate(${-mapAsset.baseWidth / 2}px, ${-mapAsset.baseHeight / 2}px)
		translate(${camera.translate.x}px, ${camera.translate.y}px)
		scale(${camera.scale * mapAsset.targetScale})`;
}

// ----------------------------------------- MAIN ---------------------------------------------

async function loadMapSVG() {
	MAP_CONTAINER.style.backgroundColor = "#1a1a20";

	const mapData = await fetch("assets/map.svg");
	const mapText = await mapData.text();
	const parser = new DOMParser();
	const mapDoc = parser.parseFromString(mapText, "image/svg+xml");

	// The SVG is loaded at some arbitrary original size
	// 1 method to achieve a target size is to set width / height then viewBox it to original
	// Instead I leave it at the original size and then scale it with transform
	// This allows the SVG to be scaled more without losing quality (aiming for 1x scale to be most zoomed in)
	mapAsset.svg = mapDoc.documentElement;
	mapAsset.svg.setAttribute("id", "map-svg");
	mapAsset.svg.style.position = "absolute";
	mapAsset.svg.style.top = "0";
	mapAsset.svg.style.left = "0";
	mapAsset.baseWidth = mapAsset.svg.width.baseVal.value;
	mapAsset.baseHeight = mapAsset.svg.height.baseVal.value;
	mapAsset.targetScale = MAP_TARGET_HEIGHT / mapAsset.baseHeight;

	MAP_CONTAINER.prepend(mapAsset.svg);
}

async function setup() {
	await loadMapSVG();

	setupCamera();

	const stationsInfoRes = await fetch("/api/stationsInfo");
	stationsInfo = (await stationsInfoRes.json()).info;
}

function update() {
	CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
	applyCameraTransforms();

	// Draw a circle at world (0, 0)
	// CTX.beginPath();
	// CTX.arc(0, 0, 2, 0, Math.PI * 2);
	// CTX.fillStyle = "white";
	// CTX.fill();
	// CTX.closePath();

	// Draw each station as a circle into the world
	CTX.fillStyle = "#b8bbd5";
	CTX.beginPath();
	for (const crs in stationsInfo) {
		const station = stationsInfo[crs];
		const worldPos = convertLonLatToWorld(station.longitude, station.latitude);
		CTX.moveTo(worldPos.x + 0.2, worldPos.y);
		CTX.arc(worldPos.x, worldPos.y, 0.2, 0, Math.PI * 2);
	}
	CTX.fill();
	CTX.closePath();
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
