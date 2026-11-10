/**
 * 3D Interactive Room â€” Afonso Portfolio (Award-Winning Showcase Edition)
 * Features:
 *  - 2-Spot Cinematic Navigation (SecretÃ¡ria & SofÃ¡)
 *  - Butter-smooth camera rotation damping with physical momentum
 *  - Ultra-sharp Anisotropic 8x texture filtering
 *  - Dual interactive triggers: click the 3D Sofa directly OR the floor hotspots OR the bottom switcher
 *  - Rich, vibrant ACES Filmic lighting with soft ambient warmth
 *  - Glassmorphic tooltips with actionable hints (Spotify, PortefÃ³lio, Gear, Sobre Mim)
 */

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  State & Spots Configuration
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let scene, camera, renderer, raycaster;
let mouse        = new THREE.Vector2(-9999, -9999);
let clock        = new THREE.Clock();
let interactives = []; // interactive link meshes
let waypoints    = []; // floor waypoint markers
let hoveredObj   = null;
let isDragging   = false;
let isPanelOpen  = false; // Global flag â€” blocks 3D interaction while an overlay panel is open
let prevMouse    = { x: 0, y: 0 };

// Spherical camera angles with butter-smooth damping
let yaw         = 0;
let pitch       = 0;
let targetYaw   = 0;
let targetPitch = 0;
const PITCH_LIMIT = Math.PI * 0.44; // ~80Â° up/down cap
const DRAG_SPEED  = 0.0032;
const DAMPING     = 0.09; // Physical rotation momentum

// The 2 Viewpoint Spots in the Room
const SPOTS = {
    desk: {
        id: 'desk',
        label: 'SecretÃ¡ria',
        pos: new THREE.Vector3(1.2239, 1.1712, 0.62816),
        yaw: 0,
        pitch: (90.861 - 90) * (Math.PI / 180) // ~0.015 rad (horizontal)
    },
    sofa: {
        id: 'sofa',
        label: 'SofÃ¡',
        pos: new THREE.Vector3(-0.54699, 0.93483, -0.53729),
        yaw: (573.6 - 720) * (Math.PI / 180), // ~ -2.555 rad (framed across towards desk & room)
        pitch: (95.661 - 90) * (Math.PI / 180) // ~ 0.0988 rad (sitting angle)
    }
};
let currentSpotId = 'desk';

// Smooth Camera Flight Transition State
let isTransitioning = false;
let transitionProgress = 0;
const transitionStartPos = new THREE.Vector3();
const transitionEndPos   = new THREE.Vector3();
let transitionStartYaw = 0, transitionEndYaw = 0;
let transitionStartPitch = 0, transitionEndPitch = 0;
const TRANSITION_DURATION = 1.25; // seconds for cinematic flight

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Link â†’ destination map (lowercase keys)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LINK_MAP = {
    // Monitors
    link_monitor1: { type: 'overlay', panel: 'panel-about' },
    link_monitor2: { type: 'overlay', panel: 'panel-social' },

    // Paintings / Quadros
    link_quadrogrande:       { type: 'internal', url: 'galeria.html' },
    link_quadropequenocima:  { type: 'internal', url: 'galeria.html' },
    link_quadropequenobaixo: { type: 'internal', url: 'galeria.html' },
    link_quadromacmiller:    { type: 'external', url: 'https://open.spotify.com/user/1188973573?si=71e579738e2c4d2b' },
    link_quadromadeira:      { type: 'internal', url: 'galeria.html' },

    // Cameras â†’ Gear overlay
    link_camera1: { type: 'overlay', panel: 'panel-gear' },
    link_camera2: { type: 'overlay', panel: 'panel-gear' },
    link_camera3: { type: 'overlay', panel: 'panel-gear' },

    // Files â†’ CV & Academic work overlay
    link_files: { type: 'overlay', panel: 'panel-cv' },

    // TV â†’ Letterboxd
    link_tv: { type: 'external', url: 'https://letterboxd.com/Paivster/' },

    // Sofa Navigation
    link_sofa:       { type: 'spot', spotId: 'sofa' },
    link_cadeira:    { type: 'spot', spotId: 'desk' },
    link_secretaria: { type: 'spot', spotId: 'desk' },
    link_desk:       { type: 'spot', spotId: 'desk' },
};

// Tooltip labels â€” first word / short title only
// Tooltip labels - short title only
const LINK_LABELS = {
    link_monitor1:          'Sobre Mim',
    link_monitor2:          'Redes Sociais',
    link_quadrogrande:      'Portef\u00f3lio \u2192',
    link_quadropequenocima: 'Portef\u00f3lio \u2192',
    link_quadropequenobaixo:'Portef\u00f3lio \u2192',
    link_quadromacmiller:   'Spotify \u2192',
    link_quadromadeira:     'Portef\u00f3lio \u2192',
    link_camera1:           'O Meu Gear',
    link_camera2:           'O Meu Gear',
    link_camera3:           'O Meu Gear',
    link_files:             'CV & Trabalhos',
    link_tv:                'Letterboxd \u2192',
    link_sofa:              'Sof\u00e1 \u2192',
    link_cadeira:           'Secret\u00e1ria \u2192',
    link_secretaria:        'Secret\u00e1ria \u2192',
    link_desk:              'Secret\u00e1ria \u2192',
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Glassmorphic Tooltip
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const tooltip = document.createElement('div');
Object.assign(tooltip.style, {
    position:              'fixed',
    padding:               '9px 16px',
    background:            'rgba(14, 14, 16, 0.88)',
    backdropFilter:        'blur(12px)',
    webkitBackdropFilter:  'blur(12px)',
    border:                '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius:          '8px',
    color:                 '#ffffff',
    fontFamily:            "'Work Sans', sans-serif",
    fontSize:              '12px',
    fontWeight:            '500',
    letterSpacing:         '0.06em',
    textTransform:         'uppercase',
    pointerEvents:         'none',
    opacity:               '0',
    transform:             'translate(-50%, -130%)',
    transition:            'opacity 0.2s ease, transform 0.15s ease',
    zIndex:                '9000',
    boxShadow:             '0 12px 32px rgba(0,0,0,0.65)',
    whiteSpace:            'nowrap',
});
document.body.appendChild(tooltip);

function showTooltip(label, x, y) {
    tooltip.textContent = label;
    tooltip.style.left  = x + 'px';
    tooltip.style.top   = y + 'px';
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translate(-50%, -140%) scale(1)';
}
function hideTooltip() {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translate(-50%, -125%) scale(0.96)';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Main Init
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function init3DRoom() {
    const container = document.getElementById('room-3d-container');
    if (!container) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181818);

    // 2. Camera Setup (Starts at Desk Spot)
    camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.05, 100);
    camera.position.copy(SPOTS.desk.pos);
    yaw         = SPOTS.desk.yaw;
    pitch       = SPOTS.desk.pitch;
    targetYaw   = yaw;
    targetPitch = pitch;

    // 3. High-Fidelity Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping       = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 1.42; // Slightly dialed back â€” bright but not washed
    renderer.outputEncoding    = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // 4. Raycaster
    raycaster = new THREE.Raycaster();

    // 5. Lighting Setup
    setupEnhancedLighting();

    // 6. Create 3D Floor Waypoint Markers
    createFloorWaypoints();

    // 7. Load GLB
    loadRoom();

    // 8. Event Listeners
    container.addEventListener('mousedown',  onDragStart);
    window.addEventListener('mousemove',    onDragMove);
    window.addEventListener('mouseup',      onDragEnd);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove',    onTouchMove,  { passive: false });
    window.addEventListener('touchend',     onDragEnd);
    window.addEventListener('click',        onClick);
    window.addEventListener('resize',       onResize);

    // Instructions hint
    const hint = document.getElementById('room-hint-text');
    if (hint) hint.textContent = 'Arrasta para olhar 360Â° â€¢ Explora a sala e clica nos detalhes';

    animateLoop();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Enhanced Ambient & Fill Lighting
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setupEnhancedLighting() {
    // 1. Ambient â€” slightly dialed back from 1.65
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    // 2. Hemisphere light â€” warm ceiling, cool floor bounce
    const hemiLight = new THREE.HemisphereLight(0xfff8f0, 0x4a4a5a, 0.80);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    // 3. Warm ceiling fill
    const ceilingFill = new THREE.DirectionalLight(0xfff5ea, 0.48);
    ceilingFill.position.set(0.5, 3.5, 0.5);
    scene.add(ceilingFill);

    // 4. Left-side fill to lift the dark left bookshelf + wall
    const leftFill = new THREE.DirectionalLight(0xffeedd, 0.38);
    leftFill.position.set(-3, 2, 1);
    scene.add(leftFill);

    // 5. Cool window fill from the right
    const sideFill = new THREE.DirectionalLight(0xeef4ff, 0.32);
    sideFill.position.set(2, 1.5, -1);
    scene.add(sideFill);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Floor Waypoint Markers (Google Street View Style)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function createFloorWaypoints() {
    const ringGeo = new THREE.RingGeometry(0.20, 0.28, 48);
    const discGeo = new THREE.CircleGeometry(0.12, 48);
    const auraGeo = new THREE.RingGeometry(0.28, 0.38, 48);

    // Waypoint leading to Sofa
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(SPOTS.sofa.pos.x, 0.05, SPOTS.sofa.pos.z);
    sofaGroup.rotation.x = -Math.PI / 2;
    sofaGroup.userData = { isWaypoint: true, targetSpot: 'sofa', label: 'SofÃ¡ ðŸ›‹ï¸' };

    const sofaRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const sofaRing = new THREE.Mesh(ringGeo, sofaRingMat);
    const sofaDiscMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const sofaDisc = new THREE.Mesh(discGeo, sofaDiscMat);
    const sofaAuraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const sofaAura = new THREE.Mesh(auraGeo, sofaAuraMat);

    sofaGroup.add(sofaRing);
    sofaGroup.add(sofaDisc);
    sofaGroup.add(sofaAura);
    sofaGroup.userData.ring = sofaRing;
    sofaGroup.userData.disc = sofaDisc;
    sofaGroup.userData.aura = sofaAura;

    // Waypoint leading to Desk
    const deskGroup = new THREE.Group();
    deskGroup.position.set(SPOTS.desk.pos.x, 0.05, SPOTS.desk.pos.z);
    deskGroup.rotation.x = -Math.PI / 2;
    deskGroup.userData = { isWaypoint: true, targetSpot: 'desk', label: 'SecretÃ¡ria ðŸ–¥ï¸' };

    const deskRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const deskRing = new THREE.Mesh(ringGeo, deskRingMat);
    const deskDiscMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const deskDisc = new THREE.Mesh(discGeo, deskDiscMat);
    const deskAuraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const deskAura = new THREE.Mesh(auraGeo, deskAuraMat);

    deskGroup.add(deskRing);
    deskGroup.add(deskDisc);
    deskGroup.add(deskAura);
    deskGroup.userData.ring = deskRing;
    deskGroup.userData.disc = deskDisc;
    deskGroup.userData.aura = deskAura;

    scene.add(sofaGroup);
    scene.add(deskGroup);

    waypoints = [sofaGroup, deskGroup];
    updateWaypointsVisibility();
}

function updateWaypointsVisibility() {
    waypoints.forEach(wp => {
        // Only show the waypoint that leads to the OTHER spot
        const isTarget = wp.userData.targetSpot !== currentSpotId;
        wp.visible = isTarget;
    });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Cinematic Camera Flight Transition
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchSpot(spotId) {
    if (isTransitioning || currentSpotId === spotId) return;
    const target = SPOTS[spotId];
    if (!target) return;

    currentSpotId = spotId;
    isTransitioning = true;
    transitionProgress = 0;

    transitionStartPos.copy(camera.position);
    transitionEndPos.copy(target.pos);

    transitionStartYaw = yaw;
    // Shortest angular turn for yaw
    let deltaYaw = (target.yaw - yaw) % (Math.PI * 2);
    if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
    transitionEndYaw = yaw + deltaYaw;

    transitionStartPitch = pitch;
    transitionEndPitch   = target.pitch;

    targetYaw   = transitionEndYaw;
    targetPitch = transitionEndPitch;

    // Update bottom UI pill buttons
    document.querySelectorAll('.viewpoint-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-spot') === spotId);
    });

    updateWaypointsVisibility();
    hideTooltip();
}
window.switchSpot = switchSpot;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  GLB Loader with 8x Anisotropic Filtering
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadRoom() {
    if (typeof THREE.GLTFLoader === 'undefined') {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
        s.onload = () => loadGLB();
        document.head.appendChild(s);
    } else {
        loadGLB();
    }
}

function loadGLB() {
    const loader = new THREE.GLTFLoader();
    const loaderEl = document.getElementById('room-loader');
    const maxAnisotropy = renderer ? Math.min(renderer.capabilities.getMaxAnisotropy(), 8) : 4;

    const modelUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8000')
        ? 'images/quartinho.glb'
        : 'https://rcpc1nnbrntvtunq.public.blob.vercel-storage.com/Quartinho.glb';

    loader.load(
        modelUrl,

        (gltf) => {
            const model = gltf.scene;
            const linkGroups = {};

            model.traverse((node) => {
                if (node.name && node.name.toLowerCase().startsWith('link_')) {
                    linkGroups[node.name.toLowerCase()] = node;
                }

                if (node.isMesh) {
                    if (node.material) {
                        const mats = Array.isArray(node.material) ? node.material : [node.material];
                        mats.forEach(mat => {
                            // Ultra-sharp texture filtering
                            if (mat.map) {
                                mat.map.encoding = THREE.sRGBEncoding;
                                mat.map.anisotropy = maxAnisotropy;
                                mat.map.generateMipmaps = true;
                                mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                                mat.map.needsUpdate = true;
                            }
                            if (mat.emissive) {
                                mat._origEmissiveHex       = mat.emissive.getHex();
                                mat._origEmissiveIntensity = mat.emissiveIntensity || 0;
                            }
                            // Soften overly dark metals when environment map is absent
                            if (mat.metalness > 0.7 && (!mat.roughness || mat.roughness < 0.2)) {
                                mat.metalness = 0.4;
                            }
                        });
                    }

                    const linkId = getLinkId(node);
                    if (linkId) {
                        node.userData.linkId = linkId.toLowerCase();

                        // Clone materials so this object's highlight NEVER affects others
                        if (node.material) {
                            if (Array.isArray(node.material)) {
                                node.material = node.material.map(m => m.clone());
                            } else {
                                node.material = node.material.clone();
                            }

                            const mats = Array.isArray(node.material) ? node.material : [node.material];
                            mats.forEach(mat => {
                                if (mat.color) {
                                    mat._origColorHex = mat.color.getHex();
                                }
                                if (mat.emissive) {
                                    mat._origEmissiveHex       = mat.emissive.getHex();
                                    mat._origEmissiveIntensity = mat.emissiveIntensity || 0;
                                }
                            });
                        }

                        interactives.push(node);
                    }
                }
            });

            window._linkGroups = linkGroups;
            scene.add(model);

            // -----------------------------------------------------------------
            // POST-LOAD MATERIAL & TEXTURE CORRECTIONS
            // -----------------------------------------------------------------
            try {
                // 1. BeerBottle: vidro verde escuro + rotulo vermelho e branco
                model.traverse(function(node) {
                    if (!node.isMesh) return;
                    var nodeMats = Array.isArray(node.material) ? node.material : [node.material];
                    var hasBeerMat = nodeMats.some(function(m) { return m && (m.name || '').toLowerCase().indexOf('beer') >= 0; });
                    if (!hasBeerMat && node.name !== 'BeerBottle') return;

                    nodeMats.forEach(function(mat) {
                        if (!mat || !mat.name) return;
                        var mn = mat.name.toLowerCase();
                        if (mn.indexOf('beerglass') >= 0) {
                            mat.color.set(0x0d3814); // verde escuro
                            mat.metalness = 0.05;
                            mat.roughness = 0.06;
                            mat.opacity = 0.85;
                            mat.transparent = true;
                            if (mat.transmission !== undefined) mat.transmission = 0;
                            mat.needsUpdate = true;
                        } else if (mn.indexOf('beerlabelinside') >= 0) {
                            mat.color.set(0x771111);
                            mat.metalness = 0.0;
                            mat.roughness = 0.5;
                            mat.transparent = false;
                            mat.opacity = 1.0;
                            mat.needsUpdate = true;
                        } else if (mn.indexOf('beerlabel') >= 0) {
                            mat.color.set(0xbd1818); // rotulo vermelho vivo
                            mat.metalness = 0.0;
                            mat.roughness = 0.35;
                            mat.transparent = false;
                            mat.opacity = 1.0;
                            mat.needsUpdate = true;
                        } else if (mn.indexOf('beercap') >= 0) {
                            mat.color.set(0xd8d8d8); // tampa metalica
                            mat.metalness = 0.85;
                            mat.roughness = 0.2;
                            mat.needsUpdate = true;
                        }
                    });
                });

                // 2. link_quadroPequenoCima: rodar foto 90 graus
                var quadroNode = linkGroups['link_quadropequenocima'];
                if (quadroNode) {
                    quadroNode.traverse(function(child) {
                        if (!child.isMesh) return;
                        var qm = Array.isArray(child.material) ? child.material : [child.material];
                        qm.forEach(function(mat) {
                            if (!mat) return;
                            var tex = mat.emissiveMap || mat.map;
                            if (tex) {
                                tex.center.set(0.5, 0.5);
                                tex.rotation = Math.PI / 2; // rodar 90 graus (direito)
                                tex.matrixAutoUpdate = true;
                                tex.updateMatrix();
                                mat.needsUpdate = true;
                            }
                        });
                    });
                }

                // 3. link_Monitor1: subir imagem no monitor (nao ficar puxada para baixo)
                var monitorNode = linkGroups['link_monitor1'];
                if (monitorNode) {
                    monitorNode.traverse(function(child) {
                        if (!child.isMesh) return;
                        var mm = Array.isArray(child.material) ? child.material : [child.material];
                        mm.forEach(function(mat) {
                            if (!mat) return;
                            if (mat.name === 'MainMonitorScreen' && (mat.emissiveMap || mat.map)) {
                                var tex = mat.emissiveMap || mat.map;
                                tex.repeat.set(3.85, 4.10);
                                tex.rotation = 1.570796;
                                tex.center.set(0, 1);
                                tex.offset.set(-4.10 + 0.15, 0.45);
                                tex.matrixAutoUpdate = true;
                                tex.updateMatrix();
                                mat.needsUpdate = true;
                            }
                        });
                    });
                }
            } catch (errPost) {
                console.warn('Post-load correction notice:', errPost);
            }
            // -----------------------------------------------------------------

            if (typeof window.__updateLoaderProgress === 'function') {
                window.__updateLoaderProgress(100);
            }

            if (loaderEl) {
                loaderEl.style.opacity = '0';
                setTimeout(() => loaderEl.remove(), 600);
            }
        },

        (xhr) => {
            // Se o servidor/Vercel Blob nÃ£o expuser o Content-Length via CORS, xhr.total vem a 0.
            // Usamos o tamanho real conhecido do novo modelo WebP (110.3 MB = 110323768 bytes) como referÃªncia.
            const total = (xhr.total && xhr.total > 0) ? xhr.total : 110323768;
            const pct = Math.min(99, Math.max(1, Math.round((xhr.loaded / total) * 100)));
            if (typeof window.__updateLoaderProgress === 'function') {
                window.__updateLoaderProgress(pct);
            }
        },

        (err) => {
            console.error('GLB load error:', err);
            const errDetail = (err && (err.message || err.statusText)) || 'Verifique a ligacao ou reinicie o servidor.';
            if (loaderEl) loaderEl.innerHTML = '<div style="color:#ff6b6b;font-family:sans-serif;padding:2rem;text-align:center;">Erro ao carregar a sala 3D.<br><span style="font-size:0.75rem;color:#aaa;text-transform:none;">' + errDetail + '</span></div>';
        }
    );
}

function getLinkId(node) {
    let current = node;
    while (current) {
        if (current.name && current.name.toLowerCase().startsWith('link_')) {
            return current.name;
        }
        current = current.parent;
    }
    return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Drag-to-look (360Â° with Smooth Momentum)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let dragStartX = 0, dragStartY = 0;
let didDrag = false;

function onDragStart(e) {
    if (isTransitioning || isPanelOpen) return;
    isDragging = true;
    didDrag    = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    prevMouse  = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
}

function onDragMove(e) {
    const container = document.getElementById('room-3d-container');
    if (container) {
        const rect = container.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    }

    if (!isDragging || isTransitioning) return;

    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    prevMouse = { x: e.clientX, y: e.clientY };

    // Update target angles with smooth momentum
    targetYaw   -= dx * DRAG_SPEED;
    targetPitch -= dy * DRAG_SPEED;
    targetPitch  = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, targetPitch));

    const totalDx = Math.abs(e.clientX - dragStartX);
    const totalDy = Math.abs(e.clientY - dragStartY);
    if (totalDx > 5 || totalDy > 5) didDrag = true;
}

function onDragEnd() {
    isDragging = false;
    document.body.style.cursor = hoveredObj ? 'pointer' : 'default';
}

function onTouchStart(e) {
    if (isTransitioning || isPanelOpen) return;
    const t = e.touches[0];
    isDragging = true;
    didDrag    = false;
    dragStartX = t.clientX;
    dragStartY = t.clientY;
    prevMouse  = { x: t.clientX, y: t.clientY };
}

function onTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    const fakeEvent = { clientX: t.clientX, clientY: t.clientY };
    onDragMove(fakeEvent);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Click Handler (Objects, Sofa & Floor Waypoints)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function onClick(e) {
    if (didDrag || isTransitioning || isPanelOpen) return;
    if (!hoveredObj) return;

    // 1. Floor Waypoint
    if (hoveredObj.userData.isWaypoint) {
        switchSpot(hoveredObj.userData.targetSpot);
        return;
    }

    // 2. Interactive Link Objects
    const linkId = (hoveredObj.userData.linkId || '').toLowerCase();
    const dest   = LINK_MAP[linkId];
    if (!dest) return;

    if (dest.type === 'spot') {
        switchSpot(dest.spotId);
    } else if (dest.type === 'overlay') {
        openPanel(dest.panel);
    } else if (dest.type === 'internal') {
        window.location.href = dest.url;
    } else if (dest.type === 'external') {
        window.open(dest.url, '_blank', 'noopener');
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Overlay Panels
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openPanel(panelId) {
    const overlay = document.getElementById('panel-overlay');
    const panels  = document.querySelectorAll('.info-panel');
    panels.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(panelId);
    if (target) target.classList.add('active');
    if (overlay) overlay.classList.add('active');
    isPanelOpen = true;
    hideTooltip();
    // Clear any active glow while panel is showing
    if (hoveredObj && hoveredObj.userData.linkId) {
        setGlow(hoveredObj.userData.linkId, false);
        hoveredObj = null;
    }
}

function closeAllPanels() {
    const overlay = document.getElementById('panel-overlay');
    const panels  = document.querySelectorAll('.info-panel');
    panels.forEach(p => p.classList.remove('active'));
    if (overlay) overlay.classList.remove('active');
    isPanelOpen = false;
}
window.closeAllPanels = closeAllPanels;
window.openPanel      = openPanel;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Hover Glow Effect (Isolated to Selected Mesh Group)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setGlow(linkId, on) {
    if (!linkId) return;
    const root = (window._linkGroups || {})[linkId.toLowerCase()];
    if (!root) return;

    const isFiles = linkId.toLowerCase() === 'link_files';
    const isSofa  = linkId.toLowerCase() === 'link_sofa';

    root.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach(mat => {
            if (!mat) return;

            if (isFiles) {
                // High contrast darkening for white papers
                if (on) {
                    if (mat.color) mat.color.setHex(0x555555);
                    if (mat.emissive) {
                        mat.emissive.setHex(0x222222);
                        mat.emissiveIntensity = 0.6;
                    }
                } else {
                    if (mat.color) mat.color.setHex(mat._origColorHex || 0xffffff);
                    if (mat.emissive) {
                        mat.emissive.setHex(mat._origEmissiveHex || 0x000000);
                        mat.emissiveIntensity = mat._origEmissiveIntensity || 0;
                    }
                }
            } else if (isSofa) {
                // Very soft subtle highlight for the sofa
                if (mat.emissive) {
                    if (on) {
                        mat.emissive.setHex(0xaaaaaa);
                        mat.emissiveIntensity = 0.08;
                    } else {
                        mat.emissive.setHex(mat._origEmissiveHex || 0x000000);
                        mat.emissiveIntensity = mat._origEmissiveIntensity || 0;
                    }
                }
            } else {
                // Standard crisp highlight for all other links
                if (mat.emissive) {
                    if (on) {
                        mat.emissive.setHex(0xffffff);
                        mat.emissiveIntensity = 0.45;
                    } else {
                        mat.emissive.setHex(mat._origEmissiveHex || 0x000000);
                        mat.emissiveIntensity = mat._origEmissiveIntensity || 0;
                    }
                }
            }
        });
    });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Raycasting (Objects & Floor Waypoints)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateHover(mouseEvent) {
    if (isTransitioning || isPanelOpen) {
        hideTooltip();
        return;
    }

    raycaster.setFromCamera(mouse, camera);

    // Collect visible waypoint child meshes
    const waypointHitMeshes = [];
    waypoints.forEach(wp => {
        if (wp.visible) {
            wp.children.forEach(c => {
                c.userData.parentGroup = wp;
                waypointHitMeshes.push(c);
            });
        }
    });

    const candidates = [...interactives, ...waypointHitMeshes];
    const hits = raycaster.intersectObjects(candidates, false);

    if (hits.length > 0) {
        const hit = hits[0].object;

        // Waypoint hit
        if (hit.userData.parentGroup && hit.userData.parentGroup.userData.isWaypoint) {
            const wp = hit.userData.parentGroup;
            if (hoveredObj && hoveredObj.userData.linkId) {
                setGlow(hoveredObj.userData.linkId, false);
            }
            hoveredObj = wp;
            document.body.style.cursor = isDragging ? 'grabbing' : 'pointer';
            if (mouseEvent) showTooltip(wp.userData.label, mouseEvent.clientX, mouseEvent.clientY);
            return;
        }

        // Link Object hit
        const linkId = (hit.userData.linkId || '').toLowerCase();
        const dest   = LINK_MAP[linkId];

        // If sitting on the sofa, don't glow the sofa itself
        if (dest && dest.type === 'spot' && dest.spotId === currentSpotId) {
            if (hoveredObj && hoveredObj.userData && hoveredObj.userData.linkId) {
                setGlow(hoveredObj.userData.linkId, false);
            }
            hoveredObj = null;
            document.body.style.cursor = isDragging ? 'grabbing' : 'default';
            hideTooltip();
            return;
        }

        if (linkId !== (hoveredObj && (hoveredObj.userData.linkId || '').toLowerCase())) {
            if (hoveredObj && hoveredObj.userData.linkId) {
                setGlow(hoveredObj.userData.linkId, false);
            }
            hoveredObj = hit;
            setGlow(linkId, true);
            document.body.style.cursor = isDragging ? 'grabbing' : 'pointer';
        }
        const label = LINK_LABELS[linkId] || linkId;
        if (mouseEvent) showTooltip(label, mouseEvent.clientX, mouseEvent.clientY);
    } else {
        if (hoveredObj && hoveredObj.userData.linkId) {
            setGlow(hoveredObj.userData.linkId, false);
        }
        hoveredObj = null;
        document.body.style.cursor = isDragging ? 'grabbing' : 'default';
        hideTooltip();
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Camera apply look direction
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function applyCameraRotation() {
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    camera.quaternion.copy(qYaw).multiply(qPitch);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Resize
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function onResize() {
    const container = document.getElementById('room-3d-container');
    if (!container || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Render loop
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _lastMouseEvent = null;
window.addEventListener('mousemove', e => { _lastMouseEvent = e; });

function animateLoop() {
    requestAnimationFrame(animateLoop);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Pulse visible floor waypoint rings
    const pulseRing = Math.sin(elapsedTime * 2.8) * 0.08 + 1.0;
    const pulseAura = Math.sin(elapsedTime * 2.8 - 0.5) * 0.12 + 1.0;
    waypoints.forEach(wp => {
        if (wp.visible) {
            if (wp.userData.ring) wp.userData.ring.scale.set(pulseRing, pulseRing, 1);
            if (wp.userData.aura) wp.userData.aura.scale.set(pulseAura, pulseAura, 1);
        }
    });

    // Smooth camera flight transition
    if (isTransitioning) {
        transitionProgress += delta / TRANSITION_DURATION;
        if (transitionProgress >= 1) {
            transitionProgress = 1;
            isTransitioning = false;
        }

        // Smooth cubic-bezier easing
        const t = transitionProgress;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.lerpVectors(transitionStartPos, transitionEndPos, ease);
        yaw         = transitionStartYaw   + (transitionEndYaw   - transitionStartYaw)   * ease;
        pitch       = transitionStartPitch + (transitionEndPitch - transitionStartPitch) * ease;
        targetYaw   = yaw;
        targetPitch = pitch;
    } else {
        // Physical rotation momentum damping
        yaw   += (targetYaw   - yaw)   * DAMPING;
        pitch += (targetPitch - pitch) * DAMPING;
    }

    applyCameraRotation();
    updateHover(_lastMouseEvent);
    renderer.render(scene, camera);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Export
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.init3DRoom = init3DRoom;

