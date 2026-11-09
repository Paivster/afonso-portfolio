document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation bar state
    initNavigation();
    
    // Check which page we are on and boot the appropriate renderer
    if (document.getElementById('collections-grid')) {
        renderCollectionsIndex();
    } else if (document.getElementById('collection-photos-grid')) {
        renderSingleCollection();
    }
});

/* ==========================================================================
   NAVIGATION INTERACTIONS
   ========================================================================== */
function initNavigation() {
    const nav = document.querySelector('.header-nav');
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links a');

    // 1. Scroll styling (add opaque backdrop filter when scrolling down)
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // 2. Mobile burger navigation toggle
    if (mobileToggle && navLinksContainer) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
        });

        links.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navLinksContainer.classList.remove('active');
            });
        });
    }

    // 3. Highlight current page link based on filename
    const currentPath = window.location.pathname;
    const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);

    links.forEach(link => {
        const href = link.getAttribute('href');
        // Check if matching current page
        if (href === filename || (filename === '' && href === 'index.html') || (filename === 'colecao.html' && href === 'galeria.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/* ==========================================================================
   DYNAMIC RENDERERS
   ========================================================================== */

// Helper to format raw filenames into readable titles
function formatPhotoTitle(filepath) {
    const filename = filepath.split('/').pop();
    let name = filename.substring(0, filename.lastIndexOf('.')) || filename;
    
    // Clean up generic camera prefixes
    name = name.replace(/_DSC/gi, 'Captura').replace(/IMG_/gi, 'Foto');
    
    // Separate trailing numbers (e.g. CaboDaRoca-9087 -> Cabo Da Roca #9087)
    const match = name.match(/^(.*?)[-_](\d+)$/);
    if (match) {
        let base = match[1];
        let num = match[2];
        base = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
        return `${base} #${num}`;
    }
    
    return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
}

// 1. Render Catalog Index (galeria.html)
function renderCollectionsIndex() {
    const grid = document.getElementById('collections-grid');
    const sortSelect = document.getElementById('catalog-sort-select');
    if (!grid) return;

    if (typeof collectionsData === 'undefined' || Object.keys(collectionsData).length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-secondary);">
                Nenhuma coleção encontrada. Por favor, execute o indexador <code>update-gallery.ps1</code>.
            </div>
        `;
        return;
    }

    // Bind event listener to sorting select box (only once)
    if (sortSelect && !sortSelect.dataset.listenerBound) {
        sortSelect.dataset.listenerBound = 'true';
        sortSelect.addEventListener('change', renderCollectionsIndex);
    }

    const sortBy = sortSelect ? sortSelect.value : 'date-desc';
    const keys = Object.keys(collectionsData);
    
    // Sort collections array dynamically in the browser
    keys.sort((a, b) => {
        const colA = collectionsData[a];
        const colB = collectionsData[b];

        if (sortBy === 'name-asc') {
            return colA.title.localeCompare(colB.title, 'pt', { sensitivity: 'base' });
        } else if (sortBy === 'name-desc') {
            return colB.title.localeCompare(colA.title, 'pt', { sensitivity: 'base' });
        } else if (sortBy === 'date-desc') {
            return new Date(colB.date) - new Date(colA.date);
        } else if (sortBy === 'date-asc') {
            return new Date(colA.date) - new Date(colB.date);
        } else if (sortBy === 'size-desc') {
            return colB.count - colA.count;
        } else if (sortBy === 'size-asc') {
            return colA.count - colB.count;
        }
        return 0;
    });

    let html = '';
    keys.forEach(key => {
        const col = collectionsData[key];
        html += `
            <article class="collection-card" onclick="location.href='colecao.html?id=${col.id}'" id="card-${col.id}">
                <div class="collection-card-img">
                    <img src="${col.cover}" alt="Capa da Coleção ${col.title}" loading="lazy">
                </div>
                <div class="collection-card-info">
                    <div class="collection-card-text">
                        <h3 class="collection-card-title">${col.title}</h3>
                        <span class="collection-card-date">${col.friendlyDate || ''}</span>
                    </div>
                    <span class="collection-card-meta">${col.count} fotos</span>
                </div>
            </article>
        `;
    });

    grid.innerHTML = html;
}

// 2. Render Single Collection (colecao.html)
function renderSingleCollection() {
    const grid = document.getElementById('collection-photos-grid');
    const titleEl = document.getElementById('collection-title');
    const subtitleEl = document.getElementById('collection-subtitle');
    const sortSelect = document.getElementById('photo-sort-select');
    
    if (!grid || !titleEl || !subtitleEl) return;

    // Parse URL parameter: ?id=CollectionID
    const params = new URLSearchParams(window.location.search);
    const colId = params.get('id');

    if (!colId || typeof collectionsData === 'undefined' || !collectionsData[colId]) {
        titleEl.textContent = 'Coleção não encontrada';
        subtitleEl.textContent = 'A coleção solicitada não existe ou foi removida.';
        grid.innerHTML = '';
        return;
    }

    const col = collectionsData[colId];
    
    // Set Header titles
    titleEl.textContent = col.title;
    subtitleEl.textContent = `${col.count} fotografias registadas nesta coleção`;
    document.title = `${col.title} | Portfolio`;

    // Bind event listener to sorting select box (only once)
    if (sortSelect && !sortSelect.dataset.listenerBound) {
        sortSelect.dataset.listenerBound = 'true';
        sortSelect.addEventListener('change', renderSingleCollection);
    }

    const sortBy = sortSelect ? sortSelect.value : 'date-desc';
    const photosCopy = [...col.photos];

    // Sort photo items dynamically in the browser
    photosCopy.sort((a, b) => {
        // photo elements are objects: { path, date }
        if (sortBy === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortBy === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortBy === 'name-asc') {
            const titleA = formatPhotoTitle(a.path);
            const titleB = formatPhotoTitle(b.path);
            return titleA.localeCompare(titleB, 'pt', { numeric: true, sensitivity: 'base' });
        } else if (sortBy === 'name-desc') {
            const titleA = formatPhotoTitle(a.path);
            const titleB = formatPhotoTitle(b.path);
            return titleB.localeCompare(titleA, 'pt', { numeric: true, sensitivity: 'base' });
        }
        return 0;
    });

    // Render individual photos
    let html = '';
    photosCopy.forEach((photoObj, index) => {
        const photoPath = photoObj.path;
        const photoTitle = formatPhotoTitle(photoPath);
        
        // We simulate a price estimate based on photo position index
        const basePrice = 45 + (index % 5) * 5;

        html += `
            <article class="gallery-mosaic-item" data-index="${index}" id="photo-${colId}-${index}">
                <img src="${photoPath}" alt="${photoTitle}" loading="lazy">
                <div class="gallery-mosaic-item-overlay">
                    <span class="item-category">Impressão de Autor</span>
                    <h2 class="item-title">${photoTitle}</h2>
                    <div class="mosaic-item-actions">
                        <button class="btn-inspect" aria-label="Analisar ${photoTitle}">Analisar Foto</button>
                        <a href="#loja" class="btn-buy" aria-label="Comprar impressão de ${photoTitle} por €${basePrice}">
                            Comprar — €${basePrice}
                        </a>
                    </div>
                </div>
            </article>
        `;
    });

    grid.innerHTML = html;

    // Boot lightbox listeners for dynamically rendered items
    initLightbox();
}

/* ==========================================================================
   IMAGE LIGHTBOX MODAL
   ========================================================================== */
function initLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-mosaic-item, .gallery-item');
    if (galleryItems.length === 0) return;

    // Construct lightbox overlay dynamically if not yet loaded
    let lightbox = document.querySelector('.lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <button class="lightbox-close" aria-label="Fechar">&times;</button>
            <div class="lightbox-content">
                <img class="lightbox-img" src="" alt="Ampliação da foto" style="transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="lightbox-caption">
                    <h3 class="lightbox-title">Título</h3>
                    <p class="lightbox-desc">Ficheiro</p>
                    <button class="btn-zoom-inspector" style="margin-top: 1rem; font-size: 0.75rem; border: 1px solid var(--border-color); padding: 0.4rem 1.2rem; border-radius: 50px; background: rgba(255,255,255,0.05); color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast);" aria-label="Ampliar Foto">Ampliar Análise (1.5x)</button>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);
        
        // Setup toggle zoom trigger once
        const zoomBtn = lightbox.querySelector('.btn-zoom-inspector');
        zoomBtn.addEventListener('click', () => {
            const img = lightbox.querySelector('.lightbox-img');
            if (img.style.transform === 'scale(1.5)') {
                img.style.transform = 'scale(1)';
                zoomBtn.textContent = 'Ampliar Análise (1.5x)';
            } else {
                img.style.transform = 'scale(1.5)';
                zoomBtn.textContent = 'Restaurar Tamanho';
            }
        });
    }

    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxTitle = lightbox.querySelector('.lightbox-title');
    const lightboxDesc = lightbox.querySelector('.lightbox-desc');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const zoomBtn = lightbox.querySelector('.btn-zoom-inspector');

    // Add click triggers
    galleryItems.forEach(item => {
        // Remove existing listener (by cloning node if needed, or simply replacing event)
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', (e) => {
            // Cancel trigger if user clicks direct shopping anchor
            if (e.target.closest('.btn-buy') || e.target.closest('.buy-print-link')) return;

            const img = newItem.querySelector('img');
            const title = newItem.querySelector('.item-title').textContent;
            
            // Generate metadata description
            const imgSrc = img.getAttribute('src');
            const filename = imgSrc.split('/').pop();
            const desc = `Ficheiro: ${filename} | Resolução Original Disponível`;

            if (img && lightboxImg) {
                // Reset zoom state when opening new image
                lightboxImg.style.transform = 'scale(1)';
                if (zoomBtn) zoomBtn.textContent = 'Ampliar Análise (1.5x)';
                
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightboxTitle.textContent = title;
                lightboxDesc.textContent = desc;
                
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            lightboxImg.src = '';
        }, 300);
    };

    closeBtn.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}
