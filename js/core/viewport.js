import { SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT, PC_TARGET_WIDTH, MOBILE_TARGET_WIDTH } from './constants.js';

// Virtual resolution (może być większa niż safe zone)
let _VIRTUAL_WIDTH;
let _VIRTUAL_HEIGHT;

// Safe zone offset w virtual space
let _safeZoneX = 0;
let _safeZoneY = 0;

// Scaling and Offset Globals
let _scaleFactor = 1;
let _offsetX = 0;
let _offsetY = 0;
let _resizeTimeoutId = null;

// Export getters for read-only access
export const getVirtualWidth = () => _VIRTUAL_WIDTH;
export const getVirtualHeight = () => _VIRTUAL_HEIGHT;
export const getSafeZoneX = () => _safeZoneX;
export const getSafeZoneY = () => _safeZoneY;
export const getScaleFactor = () => _scaleFactor;
export const getOffsetX = () => _offsetX;
export const getOffsetY = () => _offsetY;

// Device detection
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
           || ('ontouchstart' in window);
}

export function getTargetWidth() {
    return isMobileDevice() ? MOBILE_TARGET_WIDTH : PC_TARGET_WIDTH;
}

// Core Sizing and Scaling Logic
export function getViewportDimensions() {
    if (window.visualViewport) {
        // Safe areas support (iOS notch, etc)
        const safeTop = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--sai-top')) || 0;
        const safeBottom = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--sai-bottom')) || 0;

        return {
            width: window.visualViewport.width,
            height: window.visualViewport.height - safeTop - safeBottom
        };
    }
    return { width: window.innerWidth, height: window.innerHeight };
}

export function calculateGameArea() {
    const { width, height } = getViewportDimensions();
    const screenAspect = width / height;
    const safeAspect = SAFE_ZONE_WIDTH / SAFE_ZONE_HEIGHT;

    const targetWidth = getTargetWidth();

    // MOBILE: fill screen
    if (isMobileDevice()) {
        if (screenAspect >= safeAspect) {
            // Wider than safe zone - add extra space on sides
            _VIRTUAL_WIDTH = SAFE_ZONE_HEIGHT * screenAspect;
            _VIRTUAL_HEIGHT = SAFE_ZONE_HEIGHT;
            _safeZoneX = (_VIRTUAL_WIDTH - SAFE_ZONE_WIDTH) / 2;
            _safeZoneY = 0;
        } else {
            // Narrower - fit safe zone to width
            _VIRTUAL_WIDTH = SAFE_ZONE_WIDTH;
            _VIRTUAL_HEIGHT = SAFE_ZONE_WIDTH / screenAspect;
            _safeZoneX = 0;
            _safeZoneY = (_VIRTUAL_HEIGHT - SAFE_ZONE_HEIGHT) / 2;
        }
    }
    // DESKTOP: smaller viewport for lower res sprites
    else {
        _VIRTUAL_WIDTH = targetWidth;
        _VIRTUAL_HEIGHT = SAFE_ZONE_HEIGHT;
        _safeZoneX = (_VIRTUAL_WIDTH - SAFE_ZONE_WIDTH) / 2;
        _safeZoneY = 0;
    }
}

export function updateScaleAndOffset() {
    const { width, height } = getViewportDimensions();
    const screenAspect = width / height;
    const virtualAspect = _VIRTUAL_WIDTH / _VIRTUAL_HEIGHT;

    if (screenAspect > virtualAspect) {
        _scaleFactor = height / _VIRTUAL_HEIGHT;
        _offsetX = (width - _VIRTUAL_WIDTH * _scaleFactor) / 2;
        _offsetY = 0;
    } else {
        _scaleFactor = width / _VIRTUAL_WIDTH;
        _offsetX = 0;
        _offsetY = (height - _VIRTUAL_HEIGHT * _scaleFactor) / 2;
    }
}

export function updateGameDimensions(game) {
    calculateGameArea();
    const { width, height } = getViewportDimensions();
    // resizeCanvas will be called from main sketch
    updateScaleAndOffset();

    // Reinitialize touch strips po resize
    if (game && game.isTouchDevice) {
        game.initTouchStrips();
    }

    return { width, height };
}

export function handleResizeEvent(game, resizeCanvasFn) {
    clearTimeout(_resizeTimeoutId);
    _resizeTimeoutId = setTimeout(() => {
        const dims = updateGameDimensions(game);
        if (resizeCanvasFn) {
            resizeCanvasFn(dims.width, dims.height);
        }
    }, 150);
}
