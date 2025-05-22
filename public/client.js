const CAM_ZOOM_FACTOR = 1.1;
const CAM_ZOOM_SMOOTHING = 0.2;
const CAM_ZOOM_THRESHOLD = 0.01;
const CAM_ZOOM_MIN = 0.5;
const CAM_ZOOM_MAX = 50;
const MAP_TARGET_HEIGHT = 1000;
const WORLD_IMAGE_SCALE = 8;

const windowDPR = window.devicePixelRatio || 1;
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
let data = null;
let mapAsset = { image: null, outputScale: 1, outputW: 0, outputH: 0, centreX: 0, centreY: 0 };
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

function convertSVGToImage(svg, scale) {
	const w = svg.width * windowDPR * scale;
	const h = svg.height * windowDPR * scale;
	const offscreenCanvas = new OffscreenCanvas(w, h);
	const offscreenCtx = offscreenCanvas.getContext("2d");
	offscreenCtx.imageSmoothingEnabled = false;
	offscreenCtx.drawImage(svg, 0, 0, w, h);
	return offscreenCanvas.transferToImageBitmap();
}

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

async function setup() {
	// Load the map SVG, convert it to an image, and calculate scaling
	mapAsset.image = new Image();
	mapAsset.image.src = "assets/map_4x.png";
	await new Promise((resolve) => {
		mapAsset.image.onload = () => resolve();
	});

	mapAsset.outputScale = MAP_TARGET_HEIGHT / mapAsset.image.height;
	mapAsset.outputW = mapAsset.image.width * mapAsset.outputScale;
	mapAsset.outputH = mapAsset.image.height * mapAsset.outputScale;
	mapAsset.centreX = -mapAsset.outputW * 0.5;
	mapAsset.centreY = -mapAsset.outputH * 0.55;

	const response = await fetch("/api/trains");
	data = await response.json();

	setupCamera();
}

function update() {
	updateAndApplyCamera();

	ctx.fillStyle = "#1a1a1e";
	ctx.fillRect(-camera.translate.x / camera.scale, -camera.translate.y / camera.scale, canvas.width / camera.scale, canvas.height / camera.scale);

	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(mapAsset.image, mapAsset.centreX, mapAsset.centreY, mapAsset.outputW, mapAsset.outputH);
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
