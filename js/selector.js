// ========================================
// GLOBAL VARIABLES
// ========================================
// Generate photo paths for original 230 photos + 224 new event photos (454 total)
const photos = [
    // Original 230 photos (photo_001 to photo_230)
    ...Array.from({length: 230}, (_, i) => `photos/photo_${String(i + 1).padStart(3, '0')}.webp`),
    // New 224 event photos (evento-141 to evento-364)
    ...Array.from({length: 224}, (_, i) => `photos/evento-${141 + i}.webp`)
];

// LIMITS FOR VALENTINA'S PACKAGE
const LIMITS = {
    impresion: 100,    // Máximo 100 fotos para impresión
    caja_usb: 1,       // 1 foto para caja USB
    caja_fotos: 1      // 1 foto para caja de fotos
    // redes_sociales: sin límite
};

const STORAGE_KEY = 'valentina_xv_photo_selections';
let photoSelections = {};
let currentPhotoIndex = null;
let currentFilter = 'all';

// ========================================
// LOCAL STORAGE FUNCTIONS
// ========================================
function loadSelections() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            photoSelections = JSON.parse(saved);
            console.log('Selecciones cargadas desde localStorage:', photoSelections);
        }
    } catch (error) {
        console.error('Error cargando selecciones:', error);
        photoSelections = {};
    }
}

function saveSelections() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photoSelections));
        console.log('Selecciones guardadas en localStorage');
    } catch (error) {
        console.error('Error guardando selecciones:', error);
        showToast('Error al guardar. Verifica el espacio del navegador.', 'error');
    }
}

function clearAllSelections() {
    if (confirm('¿Estás segura de que quieres borrar TODAS las selecciones? Esta acción no se puede deshacer.')) {
        photoSelections = {};
        saveSelections();
        renderGallery();
        updateStats();
        updateFilterButtons();
        showToast('Todas las selecciones han sido eliminadas', 'success');
    }
}

// ========================================
// STATS FUNCTIONS
// ========================================
function getStats() {
    const stats = {
        impresion: 0,
        caja_usb: 0,
        caja_fotos: 0,
        redes_sociales: 0,
        descartada: 0,
        sinClasificar: photos.length
    };

    Object.values(photoSelections).forEach(selection => {
        if (selection.impresion) stats.impresion++;
        if (selection.caja_usb) stats.caja_usb++;
        if (selection.caja_fotos) stats.caja_fotos++;
        if (selection.redes_sociales) stats.redes_sociales++;
        if (selection.descartada) stats.descartada++;
    });

    stats.sinClasificar = photos.length - Object.keys(photoSelections).length;

    return stats;
}

function updateStats() {
    const stats = getStats();

    // Update counters
    document.getElementById('countImpresion').textContent = stats.impresion;
    document.getElementById('countCajaUsb').textContent = stats.caja_usb;
    document.getElementById('countCajaFotos').textContent = stats.caja_fotos;
    document.getElementById('countRedesSociales').textContent = stats.redes_sociales;
    document.getElementById('countDescartada').textContent = stats.descartada;
    document.getElementById('countSinClasificar').textContent = stats.sinClasificar;

    // Add warning class if limits exceeded
    const impresionCard = document.querySelector('.stat-card.impresion');
    const cajaUsbCard = document.querySelector('.stat-card.caja-usb');
    const cajaFotosCard = document.querySelector('.stat-card.caja-fotos');

    if (impresionCard) {
        if (stats.impresion > LIMITS.impresion) {
            impresionCard.classList.add('exceeded');
        } else {
            impresionCard.classList.remove('exceeded');
        }
    }

    if (cajaUsbCard) {
        if (stats.caja_usb > LIMITS.caja_usb) {
            cajaUsbCard.classList.add('exceeded');
        } else {
            cajaUsbCard.classList.remove('exceeded');
        }
    }

    if (cajaFotosCard) {
        if (stats.caja_fotos > LIMITS.caja_fotos) {
            cajaFotosCard.classList.add('exceeded');
        } else {
            cajaFotosCard.classList.remove('exceeded');
        }
    }
}

// ========================================
// GALLERY FUNCTIONS
// ========================================
function renderGallery() {
    const grid = document.getElementById('photosGrid');
    grid.innerHTML = '';

    photos.forEach((photo, index) => {
        const selection = photoSelections[index] || {};
        const hasAny = selection.impresion || selection.caja_usb || selection.caja_fotos || selection.redes_sociales || selection.descartada;

        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.index = index;

        // Add category classes
        if (selection.descartada) {
            card.classList.add('has-descartada');
        } else {
            const categories = [];
            if (selection.impresion) categories.push('impresion');
            if (selection.caja_usb) categories.push('caja_usb');
            if (selection.caja_fotos) categories.push('caja_fotos');
            if (selection.redes_sociales) categories.push('redes_sociales');

            if (categories.length > 1) {
                card.classList.add('has-multiple');
            } else if (categories.length === 1) {
                card.classList.add(`has-${categories[0]}`);
            }
        }

        // Build badges HTML
        let badgesHTML = '';
        if (hasAny) {
            badgesHTML = '<div class="photo-badges">';
            if (selection.impresion) badgesHTML += '<span class="badge badge-impresion">📸 Impresión</span>';
            if (selection.caja_usb) badgesHTML += '<span class="badge badge-caja-usb">💾 Caja USB</span>';
            if (selection.caja_fotos) badgesHTML += '<span class="badge badge-caja-fotos">📦 Caja Fotos</span>';
            if (selection.redes_sociales) badgesHTML += '<span class="badge badge-redes-sociales">📱 Redes Sociales</span>';
            if (selection.descartada) badgesHTML += '<span class="badge badge-descartada">❌ Descartada</span>';
            badgesHTML += '</div>';
        }

        card.innerHTML = `
            <div class="photo-image-container">
                <img src="${photo}" alt="Foto ${index + 1}" loading="lazy">
            </div>
            <div class="photo-number">Foto ${index + 1}</div>
            ${badgesHTML}
        `;

        card.addEventListener('click', () => openModal(index));
        grid.appendChild(card);
    });

    applyFilter();
}

// ========================================
// FILTER FUNCTIONS
// ========================================
function isPhotoVisible(index) {
    const selection = photoSelections[index] || {};
    let show = false;

    switch (currentFilter) {
        case 'all':
            show = true;
            break;
        case 'impresion':
            show = selection.impresion === true;
            break;
        case 'caja-usb':
            show = selection.caja_usb === true;
            break;
        case 'caja-fotos':
            show = selection.caja_fotos === true;
            break;
        case 'redes-sociales':
            show = selection.redes_sociales === true;
            break;
        case 'descartada':
            show = selection.descartada === true;
            break;
        case 'sin-clasificar':
            show = !selection.impresion && !selection.caja_usb && !selection.caja_fotos && !selection.redes_sociales && !selection.descartada;
            break;
    }
    console.log(`isPhotoVisible(index: ${index}, currentFilter: ${currentFilter}) => ${show}`);
    return show;
}

function applyFilter() {
    const cards = document.querySelectorAll('.photo-card');

    cards.forEach(card => {
        const index = parseInt(card.dataset.index);
        card.classList.toggle('hidden', !isPhotoVisible(index));
    });
}

function setFilter(filter) {
    console.log('Setting filter to:', filter);
    currentFilter = filter;
    applyFilter();

    // Update button states
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function updateFilterButtons() {
    const stats = getStats();

    document.getElementById('btnFilterAll').textContent = `Todas (${photos.length})`;
    document.getElementById('btnFilterImpresion').textContent = `Impresión (${stats.impresion}/${LIMITS.impresion})`;
    document.getElementById('btnFilterCajaUsb').textContent = `Caja USB (${stats.caja_usb}/${LIMITS.caja_usb})`;
    document.getElementById('btnFilterCajaFotos').textContent = `Caja Fotos (${stats.caja_fotos}/${LIMITS.caja_fotos})`;
    document.getElementById('btnFilterRedesSociales').textContent = `Redes Sociales (${stats.redes_sociales})`;
    document.getElementById('btnFilterDescartada').textContent = `Descartadas (${stats.descartada})`;
    document.getElementById('btnFilterSinClasificar').textContent = `Sin Clasificar (${stats.sinClasificar})`;
}

function findNextVisiblePhoto(startIndex, direction) {
    let newIndex = startIndex;
    const totalPhotos = photos.length;

    if (direction === 'next') {
        for (let i = startIndex + 1; i < totalPhotos; i++) {
            if (isPhotoVisible(i)) {
                return i;
            }
        }
    } else { // 'prev'
        for (let i = startIndex - 1; i >= 0; i--) {
            if (isPhotoVisible(i)) {
                return i;
            }
        }
    }

    return null; // No next/prev visible photo found
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openModal(index) {
    console.log(`Opening modal for index: ${index}, currentFilter: ${currentFilter}`);
    currentPhotoIndex = index;
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    const modalPhotoNumber = document.getElementById('modalPhotoNumber');

    modalImage.src = photos[index];
    modalPhotoNumber.textContent = `Foto ${index + 1}`;

    // Load current selections
    const selection = photoSelections[index] || {};

    document.querySelectorAll('.option-btn').forEach(btn => {
        const category = btn.dataset.category;
        btn.classList.toggle('selected', selection[category] === true);
    });

    // Update navigation button states
    updateNavigationButtons();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateNavigationButtons() {
    const btnPrev = document.getElementById('btnPrevPhoto');
    const btnNext = document.getElementById('btnNextPhoto');

    if (btnPrev && btnNext) {
        const prevIndex = findNextVisiblePhoto(currentPhotoIndex, 'prev');
        const nextIndex = findNextVisiblePhoto(currentPhotoIndex, 'next');

        btnPrev.disabled = prevIndex === null;
        btnPrev.style.opacity = prevIndex === null ? '0.3' : '1';
        btnPrev.style.cursor = prevIndex === null ? 'not-allowed' : 'pointer';

        btnNext.disabled = nextIndex === null;
        btnNext.style.opacity = nextIndex === null ? '0.3' : '1';
        btnNext.style.cursor = nextIndex === null ? 'not-allowed' : 'pointer';
    }
}

function hasUnsavedChanges() {
    if (currentPhotoIndex === null) return false;

    const savedSelection = photoSelections[currentPhotoIndex] || {};
    const currentSelection = {};
    document.querySelectorAll('.option-btn.selected').forEach(btn => {
        currentSelection[btn.dataset.category] = true;
    });

    const savedKeys = Object.keys(savedSelection).filter(k => savedSelection[k]);
    const currentKeys = Object.keys(currentSelection);

    if (savedKeys.length !== currentKeys.length) return true;

    const allKeys = new Set([...savedKeys, ...currentKeys]);

    for (const key of allKeys) {
        if (!!savedSelection[key] !== !!currentSelection[key]) {
            return true;
        }
    }

    return false;
}

function navigatePhoto(direction) {
    console.log(`Navigating photo: ${direction}`);
    if (currentPhotoIndex === null) return;

    const proceed = () => {
        const newIndex = findNextVisiblePhoto(currentPhotoIndex, direction);
        console.log(`findNextVisiblePhoto returned: ${newIndex}`);

        if (newIndex !== null) {
            currentPhotoIndex = newIndex;
            const modalImage = document.getElementById('modalImage');
            const modalPhotoNumber = document.getElementById('modalPhotoNumber');

            modalImage.src = photos[newIndex];
            modalPhotoNumber.textContent = `Foto ${newIndex + 1}`;

            const selection = photoSelections[newIndex] || {};
            document.querySelectorAll('.option-btn').forEach(btn => {
                const category = btn.dataset.category;
                btn.classList.toggle('selected', selection[category] === true);
            });

            updateNavigationButtons();
        }
    };

    if (hasUnsavedChanges()) {
        if (confirm('¿Deseas guardar los cambios antes de continuar?')) {
            saveModalSelection(proceed);
        } else {
            proceed();
        }
    } else {
        proceed();
    }
}

function closeModal() {
    const doClose = () => {
        const modal = document.getElementById('photoModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentPhotoIndex = null;
    };

    if (hasUnsavedChanges()) {
        if (confirm('¿Deseas guardar los cambios antes de salir?')) {
            saveModalSelection(doClose);
        } else {
            doClose();
        }
    } else {
        doClose();
    }
}

function saveModalSelection(callback) {
    if (currentPhotoIndex === null) return;

    const selectedCategories = {};
    let hasAnySelection = false;

    document.querySelectorAll('.option-btn').forEach(btn => {
        const category = btn.dataset.category;
        const isSelected = btn.classList.contains('selected');
        selectedCategories[category] = isSelected;
        if (isSelected) hasAnySelection = true;
    });

    // Only save if there's at least one selection
    if (hasAnySelection) {
        photoSelections[currentPhotoIndex] = selectedCategories;
    } else {
        // Remove from selections if nothing is selected
        delete photoSelections[currentPhotoIndex];
    }

    saveSelections();
    renderGallery();
    updateStats();
    updateFilterButtons();
    showToast('Selección guardada correctamente', 'success');

    if (callback && typeof callback === 'function') {
        callback();
    } else {
        closeModal();
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
function exportToJSON() {
    const exportData = {
        INSTRUCCIONES: '⚠️ IMPORTANTE: Por favor envía este archivo por WhatsApp al 4779203776',
        whatsapp: '4779203776',
        nombre: 'Valentina Rivera Olmedo',
        fecha_evento: '18 de octubre de 2025',
        fecha_exportacion: new Date().toISOString(),
        total_fotos: photos.length,
        estadisticas: getStats(),
        selecciones: [],
        sugerencias_de_cambios: {
            video: feedbackData.video.length > 0 ? feedbackData.video : 'Sin cambios sugeridos',
            fotos: feedbackData.photos.length > 0 ? feedbackData.photos : 'Sin cambios sugeridos'
        }
    };

    photos.forEach((photo, index) => {
        const selection = photoSelections[index];
        if (selection && (selection.impresion || selection.caja_usb || selection.caja_fotos || selection.redes_sociales || selection.descartada)) {
            exportData.selecciones.push({
                numero_foto: index + 1,
                archivo: photo,
                impresion: selection.impresion || false,
                caja_usb: selection.caja_usb || false,
                caja_fotos: selection.caja_fotos || false,
                redes_sociales: selection.redes_sociales || false,
                descartada: selection.descartada || false
            });
        }
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seleccion-valentina-rivera-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('📥 Reporte descargado. ¡Envíalo por WhatsApp al 4779203776!', 'success');
}

function generateTextSummary() {
    const stats = getStats();
    let summary = '📸 SELECCIÓN DE FOTOS - XV AÑOS VALENTINA RIVERA OLMEDO\n';
    summary += '═══════════════════════════════════════\n\n';
    summary += `📊 RESUMEN GENERAL:\n`;
    summary += `   Total de fotos: ${photos.length}\n`;
    summary += `   📸 Para impresión: ${stats.impresion}\n`;
    summary += `   💾 Para Caja USB: ${stats.caja_usb}\n`;
    summary += `   📦 Para Caja de Fotos: ${stats.caja_fotos}\n`;
    summary += `   📱 Para redes sociales: ${stats.redes_sociales}\n`;
    summary += `   ❌ Descartadas: ${stats.descartada}\n`;
    summary += `   ⭕ Sin clasificar: ${stats.sinClasificar}\n\n`;

    const categories = ['impresion', 'caja_usb', 'caja_fotos', 'redes_sociales', 'descartada'];
    const categoryNames = {
        impresion: '📸 IMPRESIÓN',
        caja_usb: '💾 CAJA USB',
        caja_fotos: '📦 CAJA DE FOTOS',
        redes_sociales: '📱 REDES SOCIALES',
        descartada: '❌ DESCARTADAS'
    };

    categories.forEach(category => {
        const photosInCategory = [];
        photos.forEach((photo, index) => {
            const selection = photoSelections[index];
            if (selection && selection[category]) {
                photosInCategory.push(index + 1);
            }
        });

        if (photosInCategory.length > 0) {
            summary += `${categoryNames[category]}:\n`;
            summary += `   Fotos: ${photosInCategory.join(', ')}\n`;
            summary += `   Total: ${photosInCategory.length}\n\n`;
        }
    });

    summary += `\n📅 Generado el: ${new Date().toLocaleString('es-MX')}\n`;

    return summary;
}

function copyToClipboard() {
    const summary = generateTextSummary();

    navigator.clipboard.writeText(summary).then(() => {
        showToast('Resumen copiado al portapapeles', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = summary;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Resumen copiado al portapapeles', 'success');
    });
}

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Load saved selections
    loadSelections();

    // Render gallery
    renderGallery();

    // Update stats
    updateStats();

    // Update filter buttons
    updateFilterButtons();

    // Filter buttons
    document.getElementById('btnFilterAll').addEventListener('click', () => setFilter('all'));
    document.getElementById('btnFilterImpresion').addEventListener('click', () => setFilter('impresion'));
    document.getElementById('btnFilterCajaUsb').addEventListener('click', () => setFilter('caja-usb'));
    document.getElementById('btnFilterCajaFotos').addEventListener('click', () => setFilter('caja-fotos'));
    document.getElementById('btnFilterRedesSociales').addEventListener('click', () => setFilter('redes-sociales'));
    document.getElementById('btnFilterDescartada').addEventListener('click', () => setFilter('descartada'));
    document.getElementById('btnFilterSinClasificar').addEventListener('click', () => setFilter('sin-clasificar'));

    // Set data-filter attributes
    document.getElementById('btnFilterAll').dataset.filter = 'all';
    document.getElementById('btnFilterImpresion').dataset.filter = 'impresion';
    document.getElementById('btnFilterCajaUsb').dataset.filter = 'caja-usb';
    document.getElementById('btnFilterCajaFotos').dataset.filter = 'caja-fotos';
    document.getElementById('btnFilterRedesSociales').dataset.filter = 'redes-sociales';
    document.getElementById('btnFilterDescartada').dataset.filter = 'descartada';
    document.getElementById('btnFilterSinClasificar').dataset.filter = 'sin-clasificar';

    // Set initial active filter
    document.getElementById('btnFilterAll').classList.add('active');

    // Action buttons
    document.getElementById('btnExport').addEventListener('click', exportToJSON);
    document.getElementById('btnShare').addEventListener('click', copyToClipboard);
    document.getElementById('btnClear').addEventListener('click', clearAllSelections);

    // Modal controls
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('btnCancelSelection').addEventListener('click', closeModal);
    document.getElementById('btnSaveSelection').addEventListener('click', saveModalSelection);

    // Option buttons - no restrictions, just warnings
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            const isCurrentlySelected = btn.classList.contains('selected');

            // If selecting descartada, deselect all others
            if (category === 'descartada' && !isCurrentlySelected) {
                document.querySelectorAll('.option-btn').forEach(b => {
                    if (b !== btn) b.classList.remove('selected');
                });
            }

            // If selecting any other, deselect descartada
            if (category !== 'descartada' && !isCurrentlySelected) {
                document.querySelector('.option-btn[data-category="descartada"]').classList.remove('selected');
            }

            btn.classList.toggle('selected');

            // Show warning if exceeding recommended limit (but allow it)
            if (!isCurrentlySelected && LIMITS[category]) {
                const stats = getStats();
                // Add 1 because we're about to select this one
                const futureCount = stats[category] + 1;
                if (futureCount > LIMITS[category]) {
                    const messages = {
                        impresion: `⚠️ Nota: Has seleccionado ${futureCount} fotos para impresión (se recomiendan ${LIMITS.impresion})`,
                        caja_usb: `⚠️ Nota: Has seleccionado ${futureCount} fotos para Caja USB (se recomienda ${LIMITS.caja_usb})`,
                        caja_fotos: `⚠️ Nota: Has seleccionado ${futureCount} fotos para Caja de Fotos (se recomienda ${LIMITS.caja_fotos})`
                    };
                    showToast(messages[category], 'warning');
                }
            }
        });
    });

    // Close modal on outside click
    document.getElementById('photoModal').addEventListener('click', (e) => {
        if (e.target.id === 'photoModal') {
            closeModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('photoModal');
        if (modal.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeModal();
            } else if (e.key === 'Enter') {
                saveModalSelection();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigatePhoto('prev');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigatePhoto('next');
            }
        }
    });

    // Navigation button click handlers
    const btnPrevPhoto = document.getElementById('btnPrevPhoto');
    const btnNextPhoto = document.getElementById('btnNextPhoto');

    if (btnPrevPhoto) {
        btnPrevPhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            navigatePhoto('prev');
        });
    }

    if (btnNextPhoto) {
        btnNextPhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            navigatePhoto('next');
        });
    }

    console.log('Selector de fotos inicializado');
    console.log(`Total de fotos: ${photos.length}`);
    console.log('Selecciones cargadas:', photoSelections);
});

// ========================================
// AUTO-SAVE ON VISIBILITY CHANGE
// ========================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Página oculta - guardando selecciones...');
        saveSelections();
    }
});

// ========================================
// BEFORE UNLOAD WARNING
// ========================================
window.addEventListener('beforeunload', (e) => {
    saveSelections();
});

// ========================================
// FEEDBACK MANAGEMENT
// ========================================
const FEEDBACK_KEY = 'valentina_xv_feedback';
let feedbackData = {
    video: [],
    photos: []
};

// Load feedback from localStorage
function loadFeedback() {
    try {
        const saved = localStorage.getItem(FEEDBACK_KEY);
        if (saved) {
            feedbackData = JSON.parse(saved);
            renderFeedbackLists();
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
    }
}

// Save feedback to localStorage
function saveFeedback() {
    try {
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackData));
    } catch (error) {
        console.error('Error saving feedback:', error);
    }
}

// Add video feedback
function addVideoFeedback() {
    const minute = document.getElementById('videoMinute').value.trim();
    const change = document.getElementById('videoChange').value.trim();

    if (!minute || !change) {
        showToast('Por favor completa ambos campos', 'error');
        return;
    }

    feedbackData.video.push({ minute, change });
    saveFeedback();
    renderFeedbackLists();

    // Clear inputs
    document.getElementById('videoMinute').value = '';
    document.getElementById('videoChange').value = '';

    showToast('Sugerencia de video agregada', 'success');
}

// Add photo feedback
function addPhotoFeedback() {
    const photoNumber = document.getElementById('photoNumber').value.trim();
    const change = document.getElementById('photoChange').value.trim();

    if (!photoNumber || !change) {
        showToast('Por favor completa ambos campos', 'error');
        return;
    }

    if (photoNumber < 1 || photoNumber > photos.length) {
        showToast(`El número de foto debe estar entre 1 y ${photos.length}`, 'error');
        return;
    }

    feedbackData.photos.push({ photoNumber: parseInt(photoNumber), change });
    saveFeedback();
    renderFeedbackLists();

    // Clear inputs
    document.getElementById('photoNumber').value = '';
    document.getElementById('photoChange').value = '';

    showToast('Sugerencia de foto agregada', 'success');
}

// Remove video feedback
function removeVideoFeedback(index) {
    feedbackData.video.splice(index, 1);
    saveFeedback();
    renderFeedbackLists();
    showToast('Sugerencia eliminada', 'success');
}

// Remove photo feedback
function removePhotoFeedback(index) {
    feedbackData.photos.splice(index, 1);
    saveFeedback();
    renderFeedbackLists();
    showToast('Sugerencia eliminada', 'success');
}

// Render feedback lists
function renderFeedbackLists() {
    const videoList = document.getElementById('videoFeedbackList');
    const photoList = document.getElementById('photoFeedbackList');

    if (!videoList || !photoList) return;

    // Render video feedback
    if (feedbackData.video.length === 0) {
        videoList.innerHTML = '<p style="color: #999; font-style: italic; margin: 10px 0;">No hay sugerencias de cambios en el video</p>';
    } else {
        videoList.innerHTML = feedbackData.video.map((item, index) => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #2196f3; min-width: 60px;">⏱️ ${item.minute}</span>
                <span style="flex: 1; color: #333;">${item.change}</span>
                <button onclick="removeVideoFeedback(${index})" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">🗑️</button>
            </div>
        `).join('');
    }

    // Render photo feedback
    if (feedbackData.photos.length === 0) {
        photoList.innerHTML = '<p style="color: #999; font-style: italic; margin: 10px 0;">No hay sugerencias de cambios en las fotos</p>';
    } else {
        photoList.innerHTML = feedbackData.photos.map((item, index) => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #8b6f47; min-width: 60px;">📸 #${item.photoNumber}</span>
                <span style="flex: 1; color: #333;">${item.change}</span>
                <button onclick="removePhotoFeedback(${index})" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">🗑️</button>
            </div>
        `).join('');
    }
}

// Load feedback on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFeedback();
});
