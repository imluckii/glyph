const GRID = 16;

let zoomWindow = null;
let updateTimer = null;
let zoomEnabled = false;
const isDarkMode = true;

function showCopyNotification(element) {
	const notification = element.querySelector('.copy-notification');
	notification.style.opacity = '1';
	setTimeout(() => {
		notification.style.opacity = '0';
	}, 1000);
}

function getUploadElements() {
	return {
		glyphUpload: document.getElementById('glyphUpload'),
		uploadDropzone: document.getElementById('uploadDropzone'),
		glyphSuccessMsg: document.getElementById('glyphSuccessMsg'),
		glyphErrorMsg: document.getElementById('glyphErrorMsg'),
		uploadMeta: document.getElementById('uploadMeta')
	};
}

function setUploadError(message) {
	const { glyphSuccessMsg, glyphErrorMsg, uploadMeta } = getUploadElements();
	if (!glyphSuccessMsg || !glyphErrorMsg) return;
	glyphSuccessMsg.classList.add('d-none');
	glyphErrorMsg.textContent = message;
	glyphErrorMsg.classList.remove('d-none');
	if (uploadMeta) {
		uploadMeta.textContent = '';
		uploadMeta.classList.add('d-none');
	}
}

function clearUploadMessages() {
	const { glyphSuccessMsg, glyphErrorMsg, uploadMeta } = getUploadElements();
	if (!glyphSuccessMsg || !glyphErrorMsg) return;
	glyphSuccessMsg.classList.add('d-none');
	glyphErrorMsg.classList.add('d-none');
	if (uploadMeta) {
		uploadMeta.textContent = '';
		uploadMeta.classList.add('d-none');
	}
}

function formatFileSize(bytes) {
	const units = ['B', 'KB', 'MB', 'GB'];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	const display = size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1);
	return `${display} ${units[unitIndex]}`;
}

function isPngFile(file) {
	if (!file) return false;
	const isMimePng = file.type === 'image/png';
	const hasPngExt = file.name.toLowerCase().endsWith('.png');
	return isMimePng || hasPngExt;
}

function getThemeValue(variable) {
	return getComputedStyle(document.body).getPropertyValue(variable).trim();
}

function applyTheme() {
	const body = document.body;
	body.classList.add('dark-mode');

	const glyphCard = document.querySelector('.card:has(#glyph-output)');
	if (glyphCard) {
		const glyphCardHeader = glyphCard.querySelector('.card-header');
		glyphCard.classList.add('dark-mode');
		if (glyphCardHeader) {
			glyphCardHeader.classList.add('dark-mode');
		}
	}

	if (zoomWindow) {
		zoomWindow.style.background = getThemeValue('--zoom-bg');
		zoomWindow.style.border = `1px solid ${getThemeValue('--zoom-border')}`;
		zoomWindow.style.boxShadow = `0 0 10px ${getThemeValue('--shadow-color')}`;
	}
}

function toggleShortcutsHint(forceState = null) {
	const hint = document.getElementById('shortcutsHint');
	if (!hint) return;
	const shouldShow = forceState !== null ? forceState : hint.classList.contains('d-none');
	hint.classList.toggle('d-none', !shouldShow);
}

function Glyph(glyph = "E0") {
	const filename = `glyph_${glyph}`;
	const startChar = parseInt(filename.split("_").pop() + "00", 16);

	const fragment = document.createDocumentFragment();
	const container = document.getElementById('glyph-output');

	for (let i = 0; i < GRID * GRID; i++) {
		const row = Math.floor(i / GRID) + 1;
		const col = (i % GRID) + 1;
		const charCode = startChar + i;
		const char = String.fromCodePoint(charCode);
		const hexCode = charCode.toString(16).toUpperCase().padStart(4, '0');

		const div = document.createElement('div');
		div.setAttribute('data-hex', `0x${hexCode}`);
		div.setAttribute('data-char', char);
		div.setAttribute('data-position', `(${col};${row})`);
		div.style.color = getThemeValue('--glyph-text-color');
		div.textContent = char;

		const tooltip = document.createElement('span');
		tooltip.className = 'tooltip';
		tooltip.textContent = `Position: (${col};${row}) - Hex: 0x${hexCode}`;
		div.appendChild(tooltip);

		const copyNotif = document.createElement('span');
		copyNotif.className = 'copy-notification';
		copyNotif.textContent = 'Copied';
		div.appendChild(copyNotif);

		fragment.appendChild(div);
	}

	container.innerHTML = '';
	container.appendChild(fragment);
	addClickEventToGlyphs();
}

function renderEmptyGrid() {
	const fragment = document.createDocumentFragment();
	const container = document.getElementById('glyph-output');

	for (let i = 0; i < GRID * GRID; i++) {
		const div = document.createElement('div');
		div.classList.add('empty-cell');
		fragment.appendChild(div);
	}

	container.innerHTML = '';
	container.appendChild(fragment);
}

function initializeGlyph() {
	const glyphOutput = document.getElementById('glyph-output');
	if (glyphOutput.innerHTML.trim() === '') {
		renderEmptyGrid();
	}
}

function addClickEventToGlyphs() {
	const glyphOutput = document.getElementById('glyph-output');

	glyphOutput.removeEventListener('click', handleGlyphClick);
	glyphOutput.addEventListener('click', handleGlyphClick);
}

function handleGlyphClick(e) {
	const div = e.target.closest('div[data-char]');
	if (div) {
		const char = div.getAttribute('data-char');
		navigator.clipboard.writeText(char).then(() => {
			showCopyNotification(div);
		}).catch(() => {
			showCopyNotification(div);
		});
	}
}

function renderGlyphs() {
	const glyphOutput = document.getElementById('glyph-output');
	const glyphs = glyphOutput.querySelectorAll('div[data-hex]');
	const glyphBg = getThemeValue('--glyph-cell-bg');
	const glyphText = getThemeValue('--glyph-text-color');
	const glyphTransparent = getThemeValue('--glyph-cell-transparent');
	const tooltipBg = getThemeValue('--tooltip-bg');
	const tooltipText = getThemeValue('--tooltip-text');
	const copyBg = getThemeValue('--copy-bg');
	const copyText = getThemeValue('--copy-text');

	glyphs.forEach(glyph => {
		glyph.style.backgroundColor = glyphBg;
		glyph.style.color = glyphText;

		const backgroundImage = glyph.style.backgroundImage;
		if (backgroundImage && backgroundImage !== 'none') {
			const img = new Image();
			img.onload = function () {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				canvas.width = img.width;
				canvas.height = img.height;

				ctx.drawImage(img, 0, 0);
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const data = imageData.data;

				for (let i = 0; i < data.length; i += 4) {
					if (data[i + 3] === 0) {
						if (isDarkMode) {
							data[i] = 65;
							data[i + 1] = 72;
							data[i + 2] = 90;
							data[i + 3] = 160;
						} else {
							data[i] = 200;
							data[i + 1] = 200;
							data[i + 2] = 200;
							data[i + 3] = 64;
						}
					}
				}

				ctx.putImageData(imageData, 0, 0);
				glyph.style.backgroundImage = `url(${canvas.toDataURL()})`;
			};
			img.src = backgroundImage.slice(5, -2);
		}

		if (glyph.classList.contains('transparent')) {
			glyph.style.backgroundColor = glyphTransparent;
		}

		const tooltip = glyph.querySelector('.tooltip');
		if (tooltip) {
			tooltip.style.backgroundColor = tooltipBg;
			tooltip.style.color = tooltipText;
		}

		const copyNotification = glyph.querySelector('.copy-notification');
		if (copyNotification) {
			copyNotification.style.backgroundColor = copyBg;
			copyNotification.style.color = copyText;
		}
	});
}

function processGlyph(img, hexValue) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	const unicodeSize = Math.floor(Math.min(img.width, img.height) / 16);
	canvas.width = unicodeSize * 16;
	canvas.height = unicodeSize * 16;

	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	const fragment = document.createDocumentFragment();
	const startChar = parseInt(hexValue + "00", 16);

	for (let i = 0; i < 256; i++) {
		const row = Math.floor(i / 16) + 1;
		const col = (i % 16) + 1;
		const charCode = startChar + i;
		const char = String.fromCodePoint(charCode);
		const hexCode = charCode.toString(16).toUpperCase().padStart(4, '0');

		const x = (i % 16) * unicodeSize;
		const y = Math.floor(i / 16) * unicodeSize;
		const unicodeCanvas = document.createElement('canvas');
		unicodeCanvas.width = unicodeSize;
		unicodeCanvas.height = unicodeSize;
		const unicodeCtx = unicodeCanvas.getContext('2d');
		unicodeCtx.imageSmoothingEnabled = false;
		unicodeCtx.drawImage(canvas, x, y, unicodeSize, unicodeSize, 0, 0, unicodeSize, unicodeSize);

		const imageData = unicodeCtx.getImageData(0, 0, unicodeSize, unicodeSize);
		const isTransparent = imageData.data.every((value, index) => (index + 1) % 4 === 0 || value === 0);

		const div = document.createElement('div');
		if (isTransparent) div.classList.add('transparent');
		div.setAttribute('data-hex', `0x${hexCode}`);
		div.setAttribute('data-char', char);
		div.setAttribute('data-position', `(${col};${row})`);
		div.style.backgroundImage = `url(${unicodeCanvas.toDataURL()})`;
		div.style.backgroundSize = '100% 100%';

		const tooltip = document.createElement('span');
		tooltip.className = 'tooltip';
		tooltip.textContent = `Position: (${col};${row}) - Hex: 0x${hexCode}`;
		div.appendChild(tooltip);

		const copyNotif = document.createElement('span');
		copyNotif.className = 'copy-notification';
		copyNotif.textContent = 'Copied';
		div.appendChild(copyNotif);

		fragment.appendChild(div);
	}

	const glyphOutput = document.getElementById('glyph-output');
	glyphOutput.innerHTML = '';
	glyphOutput.appendChild(fragment);
	addClickEventToGlyphs();

	removeZoomEvents();
	zoomEnabled = false;

	if (img.width > 0 || img.height > 0) {
		zoomEnabled = true;
		addZoomEvents(unicodeSize);
	} else {
		hideZoomWindow();
	}

	renderGlyphs();
}

function normalizeGlyphFileName(fileName) {
	const regex = /^glyph_([0-9A-Fa-f]{2})(-\d+)?\.png$/i;
	const match = fileName.match(regex);

	if (match) {
		return {
			isValid: true,
			hexValue: match[1].toUpperCase(),
			originalName: fileName,
			hasSuffix: !!match[2]
		};
	}

	return {
		isValid: false,
		hexValue: null,
		originalName: fileName,
		hasSuffix: false
	};
}

function removeZoomEvents() {
	const glyphOutput = document.getElementById('glyph-output');
	if (glyphOutput.zoomHandlers) {
		glyphOutput.removeEventListener('mouseover', glyphOutput.zoomHandlers.mouseover);
		glyphOutput.removeEventListener('mousemove', glyphOutput.zoomHandlers.mousemove);
		glyphOutput.removeEventListener('mouseout', glyphOutput.zoomHandlers.mouseout);
		delete glyphOutput.zoomHandlers;
	}
}

function addZoomEvents(unicodeSize) {
	const glyphOutput = document.getElementById('glyph-output');

	function zoomMouseoverHandler(e) {
		const target = e.target.closest('div[data-hex]');
		if (target && zoomEnabled) {
			showZoomWindow(unicodeSize);
			updateZoomWindowContent(target, unicodeSize);
		}
	}

	function zoomMousemoveHandler(e) {
		const target = e.target.closest('div[data-hex]');
		if (target && zoomWindow && zoomEnabled) {
			clearTimeout(updateTimer);
			updateTimer = setTimeout(() => {
				updateZoomWindowContent(target, unicodeSize);
			}, 50);
		}
	}

	function zoomMouseoutHandler(e) {
		if (!e.relatedTarget || !e.relatedTarget.closest('#glyph-output')) {
			hideZoomWindow();
		}
	}

	glyphOutput.addEventListener('mouseover', zoomMouseoverHandler);
	glyphOutput.addEventListener('mousemove', zoomMousemoveHandler);
	glyphOutput.addEventListener('mouseout', zoomMouseoutHandler);

	glyphOutput.zoomHandlers = {
		mouseover: zoomMouseoverHandler,
		mousemove: zoomMousemoveHandler,
		mouseout: zoomMouseoutHandler
	};
}

function updateZoomWindowContent(target, unicodeSize) {
	if (!target || !zoomWindow) return;

	const hexCode = target.getAttribute('data-hex');
	const position = target.getAttribute('data-position');
	const backgroundImage = target.style.backgroundImage;

	const zoomCanvas = zoomWindow.querySelector('canvas');
	const zoomCtx = zoomCanvas.getContext('2d');
	zoomCtx.imageSmoothingEnabled = false;

	zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);

	if (backgroundImage && backgroundImage !== 'none') {
		const img = new Image();
		img.onload = function () {
			const scale = Math.min(zoomCanvas.width / unicodeSize, zoomCanvas.height / unicodeSize);

			const scaledWidth = unicodeSize * scale;
			const scaledHeight = unicodeSize * scale;

			const offsetX = (zoomCanvas.width - scaledWidth) / 2;
			const offsetY = (zoomCanvas.height - scaledHeight) / 2;

			zoomCtx.drawImage(img, 0, 0, unicodeSize, unicodeSize,
				offsetX, offsetY, scaledWidth, scaledHeight);
		};
		img.src = backgroundImage.slice(5, -2);
	}

	const info = zoomWindow.querySelector('.zoom-info');
	info.textContent = `Hex: ${hexCode} - Position: ${position}`;
}

function showZoomWindow(unicodeSize) {
	if (!zoomWindow) {
		zoomWindow = createZoomWindow(unicodeSize);
		document.body.appendChild(zoomWindow);
	}
	zoomWindow.style.display = 'block';
}

function hideZoomWindow() {
	if (zoomWindow) {
		zoomWindow.style.display = 'none';
	}
}

function createZoomWindow(unicodeSize) {
	const zoomWindow = document.createElement('div');
	zoomWindow.className = 'zoom-window';
	zoomWindow.style.position = 'fixed';
	zoomWindow.style.right = '20px';
	zoomWindow.style.bottom = '20px';
	zoomWindow.style.zIndex = '1000';
	zoomWindow.style.background = getThemeValue('--zoom-bg');
	zoomWindow.style.border = `1px solid ${getThemeValue('--zoom-border')}`;
	zoomWindow.style.boxShadow = `0 0 10px ${getThemeValue('--shadow-color')}`;
	zoomWindow.style.padding = '5px';
	zoomWindow.style.display = 'none';

	const zoomCanvas = document.createElement('canvas');
	zoomCanvas.width = 256;
	zoomCanvas.height = 256;
	zoomWindow.appendChild(zoomCanvas);

	const info = document.createElement('div');
	info.className = 'zoom-info';
	zoomWindow.appendChild(info);

	return zoomWindow;
}

window.onload = () => {
	initializeGlyph();
	applyTheme();
	renderGlyphs();
};

const shortcutsClose = document.getElementById('shortcutsClose');
if (shortcutsClose) {
	shortcutsClose.addEventListener('click', () => toggleShortcutsHint(false));
}

document.addEventListener('keydown', (event) => {
	const tag = event.target?.tagName?.toLowerCase();
	if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return;
	const key = event.key.toLowerCase();
	if (key === '?') {
		toggleShortcutsHint();
		return;
	}
	if (key === 'escape') {
		toggleShortcutsHint(false);
		return;
	}
	if (key === 'u') {
		const { glyphUpload } = getUploadElements();
		glyphUpload?.click();
		return;
	}
	if (key === 'g') {
		const glyphOutput = document.getElementById('glyph-output');
		glyphOutput?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		return;
	}
	if (key === 'h') {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
});

document.getElementById('glyphUpload').addEventListener('change', function (e) {
	const file = e.target.files[0];
	if (!file) return;

	clearUploadMessages();

	if (!isPngFile(file)) {
		setUploadError('Only PNG files are allowed. Please upload a valid PNG glyph file.');
		return;
	}

	const normalized = normalizeGlyphFileName(file.name);

	if (!normalized.isValid) {
		setUploadError('Invalid file name. Please use the format glyph_XX.png (e.g., glyph_E0.png) where XX is a hex value from 00 to FF. Suffixes like -1, -2 are also accepted.');
		return;
	}

	const hexValue = normalized.hexValue;

	const reader = new FileReader();
	reader.onload = function (event) {
		const img = new Image();
		img.onload = function () {
			processGlyph(img, hexValue);
			const { glyphSuccessMsg, uploadMeta } = getUploadElements();
			glyphSuccessMsg.textContent = normalized.hasSuffix
				? `Glyph loaded successfully! (${file.name} → glyph_${hexValue}.png)`
				: 'Glyph loaded successfully!';
			glyphSuccessMsg.classList.remove('d-none');
			if (uploadMeta) {
				uploadMeta.textContent = `${file.name} • ${formatFileSize(file.size)}`;
				uploadMeta.classList.remove('d-none');
			}
		};
		img.onerror = function () {
			setUploadError('Failed to load image. Please ensure the file is a valid PNG image.');
		};
		img.src = event.target.result;
	};
	reader.onerror = function () {
		setUploadError('Failed to read file. Please try again.');
	};
	reader.readAsDataURL(file);
});

const uploadDropzone = document.getElementById('uploadDropzone');
if (uploadDropzone) {
	['dragenter', 'dragover'].forEach(eventName => {
		uploadDropzone.addEventListener(eventName, (event) => {
			event.preventDefault();
			event.stopPropagation();
			uploadDropzone.classList.add('drag-over');
		});
	});

	['dragleave', 'drop'].forEach(eventName => {
		uploadDropzone.addEventListener(eventName, (event) => {
			event.preventDefault();
			event.stopPropagation();
			uploadDropzone.classList.remove('drag-over');
		});
	});

	uploadDropzone.addEventListener('drop', (event) => {
		const { glyphUpload } = getUploadElements();
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		if (!isPngFile(file)) {
			setUploadError('Only PNG files are allowed. Please drop a valid PNG glyph file.');
			return;
		}

		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		glyphUpload.files = dataTransfer.files;
		glyphUpload.dispatchEvent(new Event('change', { bubbles: true }));
	});
}

window.addEventListener('scroll', function () {
	hideZoomWindow();
	if (zoomWindow) {
		zoomWindow.style.bottom = '20px';
	}
});

const style = document.createElement('style');
style.textContent = `
	.zoom-window {
		border-radius: 5px;
		background: var(--zoom-bg);
		padding: 10px;
		box-shadow: 0 0 15px var(--shadow-color);
		border: 1px solid var(--zoom-border);
	}

	.zoom-window canvas {
		display: block;
		image-rendering: pixelated;
		width: 200px;
		height: 200px;
	}

	.zoom-window .zoom-info {
		margin-top: 5px;
		font-size: 12px;
		text-align: center;
	}

	#glyph-output div {
		background-repeat: no-repeat;
		image-rendering: pixelated;
	}
`;
document.head.appendChild(style);
