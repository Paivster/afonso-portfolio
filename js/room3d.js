/**
 * 3D Interactive Room — Afonso Portfolio (Award-Winning Showcase Edition)
 * Features:
 *  - 2-Spot Cinematic Navigation (Secretária & Sofá)
 *  - Butter-smooth camera rotation damping with physical momentum
 *  - Ultra-sharp Anisotropic 8x texture filtering
 *  - Dual interactive triggers: click the 3D Sofa directly OR the floor hotspots OR the bottom switcher
 *  - Rich, vibrant ACES Filmic lighting with soft ambient warmth
 *  - Glassmorphic tooltips with actionable hints (Spotify, Portefólio, Gear, Sobre Mim)
 */

// ─────────────────────────────────────────────
//  State & Spots Configuration
// ─────────────────────────────────────────────
let scene, camera, renderer, raycaster;
let mouse        = new THREE.Vector2(-9999, -9999);
let clock        = new THREE.Clock();
let interactives = []; // interactive link meshes
let waypoints    = []; // floor waypoint markers
let hoveredObj   = null;
let isDragging   = false;
let isPanelOpen  = false; // Global flag — blocks 3D interaction while an overlay panel is open
let prevMouse    = { x: 0, y: 0 };

// Spherical camera angles with butter-smooth damping
let yaw         = 0;
let pitch       = 0;
let targetYaw   = 0;
let targetPitch = 0;
const PITCH_LIMIT = Math.PI * 0.44; // ~80° up/down cap
const DRAG_SPEED  = 0.0032;
const DAMPING     = 0.09; // Physical rotation momentum

// The 2 Viewpoint Spots in the Room
const SPOTS = {
    desk: {
        id: 'desk',
        label: 'Secretária',
        pos: new THREE.Vector3(1.2239, 1.1712, 0.62816),
        yaw: 0,
        pitch: (90.861 - 90) * (Math.PI / 180) // ~0.015 rad (horizontal)
    },
    sofa: {
        id: 'sofa',
        label: 'Sofá',
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

// ─────────────────────────────────────────────
//  Link → destination map (lowercase keys)
// ─────────────────────────────────────────────
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

    // Cameras → Gear overlay
    link_camera1: { type: 'overlay', panel: 'panel-gear' },
    link_camera2: { type: 'overlay', panel: 'panel-gear' },
    link_camera3: { type: 'overlay', panel: 'panel-gear' },

    // Files → CV & Academic work overlay
    link_files: { type: 'overlay', panel: 'panel-cv' },

    // TV → Letterboxd
    link_tv: { type: 'external', url: 'https://letterboxd.com/Paivster/' },

    // Sofa Navigation
    link_sofa:       { type: 'spot', spotId: 'sofa' },
    link_cadeira:    { type: 'spot', spotId: 'desk' },
    link_secretaria: { type: 'spot', spotId: 'desk' },
    link_desk:       { type: 'spot', spotId: 'desk' },
};

// Tooltip labels — first word / short title only
const LINK_LABELS = {
    link_monitor1:          'Sobre Mim',
    link_monitor2:          'Redes Sociais',
    link_quadrogrande:      'Portefólio ↗',
    link_quadropequenocima: 'Portefólio ↗',
    link_quadropequenobaixo:'Portefólio ↗',
    link_quadromacmiller:   'Spotify ↗',
    link_quadromadeira:     'Portefólio ↗',
    link_camera1:           'O Meu Gear',
    link_camera2:           'O Meu Gear',
    link_camera3:           'O Meu Gear',
    link_files:             'CV & Trabalhos',
    link_tv:                'Letterboxd ↗',
    link_sofa:              'Sofá 🛋️',
    link_cadeira:           'Secretária 🖥️',
    link_secretaria:        'Secretária 🖥️',
    link_desk:              'Secretária 🖥️',
};

// ─────────────────────────────────────────────
//  Glassmorphic Tooltip
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Main Init
// ─────────────────────────────────────────────
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping       = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 1.42; // Slightly dialed back — bright but not washed
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
    if (hint) hint.textContent = 'Arrasta para olhar 360° • Explora a sala e clica nos detalhes';

    animateLoop();
}

// ─────────────────────────────────────────────
//  Enhanced Ambient & Fill Lighting
// ─────────────────────────────────────────────
function setupEnhancedLighting() {
    // 1. Ambient — slightly dialed back from 1.65
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    // 2. Hemisphere light — warm ceiling, cool floor bounce
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

// ─────────────────────────────────────────────
//  Floor Waypoint Markers (Google Street View Style)
// ─────────────────────────────────────────────
function createFloorWaypoints() {
    const ringGeo = new THREE.RingGeometry(0.20, 0.28, 48);
    const discGeo = new THREE.CircleGeometry(0.12, 48);
    const auraGeo = new THREE.RingGeometry(0.28, 0.38, 48);

    // Waypoint leading to Sofa
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(SPOTS.sofa.pos.x, 0.05, SPOTS.sofa.pos.z);
    sofaGroup.rotation.x = -Math.PI / 2;
    sofaGroup.userData = { isWaypoint: true, targetSpot: 'sofa', label: 'Sofá 🛋️' };

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
    deskGroup.userData = { isWaypoint: true, targetSpot: 'desk', label: 'Secretária 🖥️' };

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

// ─────────────────────────────────────────────
//  Cinematic Camera Flight Transition
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  GLB Loader with 8x Anisotropic Filtering
// ─────────────────────────────────────────────
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

    const modelUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
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

            // ─────────────────────────────────────────────────────────────────
            // POST-LOAD MATERIAL & TEXTURE CORRECTIONS
            // ─────────────────────────────────────────────────────────────────
            model.traverse((node) => {
                if (!node.isMesh) return;
                const name = node.name || '';

                // ── 1. BeerBottle: corrigir cor do vidro (fica cinzento sem envMap) ──
                // Detectar pela mesh OU pelo nome do material (sub-meshes do grupo)
                const nodeMats = Array.isArray(node.material) ? node.material : [node.material];
                const hasBeerMat = nodeMats.some(m => m && (m.name || '').toLowerCase().includes('beer'));
                if (name === 'BeerBottle' || hasBeerMat) {
                    nodeMats.forEach(mat => {
                        if (!mat) return;
                        const matName = (mat.name || '').toLowerCase();

                        if (matName.includes('beerglass')) {
                            // Vidro verde escuro — desligar transmissão e simular com cor
                            mat.color.set(0x1a3a1a);       // verde escuro
                            mat.metalness   = 0.0;
                            mat.roughness   = 0.08;
                            mat.opacity     = 0.72;
                            mat.transparent = true;
                            mat.transmission = 0;           // desactivar transmissão física (precisa de envMap)
                            mat.needsUpdate = true;
                        } else if (matName.includes('beerlabel') && !matName.includes('inside')) {
                            // Label exterior — garantir que é opaco e visível
                            mat.transparent = false;
                            mat.opacity     = 1.0;
                            mat.metalness   = 0.0;
                            mat.roughness   = 0.7;
                            mat.needsUpdate = true;
                        } else if (matName.includes('beercap')) {
                            // Tampa metálica
                            mat.metalness   = 0.8;
                            mat.roughness   = 0.3;
                            mat.needsUpdate = true;
                        }
                    });
                }

                // ── 2. link_quadroPequenoCima: foto rodada 90° ──
                if (name.toLowerCase() === 'link_quadropequenocima') {
                    const mats = Array.isArray(node.material) ? node.material : [node.material];
                    mats.forEach(mat => {
                        if (mat && mat.map) {
                            mat.map.center.set(0.5, 0.5);
                            mat.map.rotation = -Math.PI / 2;  // -90° (testar +90° se ficar ao contrário)
                            mat.map.needsUpdate = true;
                        }
                    });
                }

                // ── 3. link_Monitor1: imagem demasiado para baixo ──
                if (name.toLowerCase() === 'link_monitor1') {
                    const mats = Array.isArray(node.material) ? node.material : [node.material];
                    mats.forEach(mat => {
                        if (mat && mat.map) {
                            mat.map.offset.set(0, 0.18);   // subir a imagem (ajustar se necessário)
                            mat.map.needsUpdate = true;
                        }
                    });
                }
            });
            // ─────────────────────────────────────────────────────────────────

            if (typeof window.__updateLoaderProgress === 'function') {
                window.__updateLoaderProgress(100);
            }

            if (loaderEl) {
                loaderEl.style.opacity = '0';
                setTimeout(() => loaderEl.remove(), 600);
            }
        },

        (xhr) => {
            // Se o servidor/Vercel Blob não expuser o Content-Length via CORS, xhr.total vem a 0.
            // Usamos o tamanho real conhecido do novo modelo WebP (110.3 MB = 110323768 bytes) como referência.
            const total = (xhr.total && xhr.total > 0) ? xhr.total : 110323768;
            const pct = Math.min(99, Math.max(1, Math.round((xhr.loaded / total) * 100)));
            if (typeof window.__updateLoaderProgress === 'function') {
                window.__updateLoaderProgress(pct);
            }
        },

        (err) => {
            console.error('GLB load error:', err);
            if (loaderEl) loaderEl.textContent = 'Erro ao carregar a sala 3D.';
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

// ─────────────────────────────────────────────
//  Drag-to-look (360° with Smooth Momentum)
// ─────────────────────────────────────────────
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
    const t = e.touches[0];
    const fakeEvent = { clientX: t.clientX, clientY: t.clientY };
    onDragMove(fakeEvent);
}

// ─────────────────────────────────────────────
//  Click Handler (Objects, Sofa & Floor Waypoints)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Overlay Panels
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Hover Glow Effect (Isolated to Selected Mesh Group)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Raycasting (Objects & Floor Waypoints)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Camera apply look direction
// ─────────────────────────────────────────────
function applyCameraRotation() {
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    camera.quaternion.copy(qYaw).multiply(qPitch);
}

// ─────────────────────────────────────────────
//  Resize
// ─────────────────────────────────────────────
function onResize() {
    const container = document.getElementById('room-3d-container');
    if (!container || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ─────────────────────────────────────────────
//  Render loop
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Export
// ─────────────────────────────────────────────
window.init3DRoom = init3DRoom;
