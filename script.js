let params = new URLSearchParams(document.location.search);
let API_TOKEN = params.get("token");
let forceStop = false;
const ws = new WebSocket('wss://tablette-api.jordan-toulain.workers.dev/ws');

const VEHICLE_MODELS = [
    'FAGGIO', 'BLAZER', 'BAGGER', 'NEMESIS', 'RUFFIAN', 'PCJ 600', 'THRUST', 'VADER', 'HAKUCHOU', 'DOUBLE T', 'DAEMON', 'BATI 801', 'SANCHEZ', 'AKUMA', 'CAVALCADE', 'TACO VAN', 'INTRUDER', 'SURGE', 'SENTINEL', 'SENTINEL XS', 'VIGERO', 'ORACLE', 'ORACLE XS', 'BANSHEE', 'SURFER', 'FQ 2', 'SURANO', 'DUBSTA', 'PICADOR', 'SCHAFTER', 'BUCCANEER', 'PHOENIX', 'WARRENER', 'MESA', 'RANCHER XL', 'BEEJAY XL', 'GRANGER', 'INFERNUS', 'FUGITIVE', 'RHAPSODY', 'LANDSTALKER', 'FELTZER', 'PENUMBRA', 'PRIMO', 'BALLER', 'MINIVAN', 'FELON GT', 'FELON', 'SABRE TURBO', 'CARBONIZZARE', 'HABANERO', 'BUFFALO', 'MASSACRO', 'INGOT', 'DUNELOADER', 'F620', 'JESTER', 'SANDKING XL', 'SANDKING SWB', 'DUKES', 'EXEMPLAR', 'MANANA', 'DILETTANTE', 'JACKAL', 'BLISTA', 'BLISTA COMPACT', 'SCHWARTZER', 'FUTO', 'TORNADO', 'ALPHA', 'RADIUS', 'ISSI', 'BOBCAT XL', 'SADLER', 'SULTAN', 'FURORE GT', 'ROCOTO', 'GAUNTLET', 'VOLTIC', 'CADDIE', 'ASTEROPE', 'REGINA', 'SUPER DIAMOND', 'BISON', 'PANTO', 'INJECTION', 'PIGALLE', 'EMPEROR', 'RAPID GT', 'DOMINATOR', 'GRESLEY', 'PREMIER', 'ZION', 'ZION CABRIO', 'PEYOTE', 'SEMINOLE', 'COQUETTE', 'STRATUM', 'YOUGA', 'SERRANO', 'PATRIOT', 'FUSILADE', 'COMET', 'PRAIRIE', '9F', 'REBEL ROUILLÉ', 'REBEL', 'GLENDALE', 'WASHINGTON', 'STALLION', 'HUNTLEY S', '9F CABRIO', 'RUINER', 'DUNE BUGGY'
];

document.addEventListener('DOMContentLoaded', () => {

    ws.onopen = () => {
        console.log('✅ Connecté au WebSocket !');
        if (API_TOKEN) {
            ws.send(JSON.stringify({ type: 'auth', token: API_TOKEN }));
        }
    };

    let currentVehicles = [];
    let adminSlot = null;

    const carGrid = document.getElementById('car-grid');
    const contentWrapper = document.querySelector('.content-wrapper');
    const notificationContainer = document.getElementById('notification-container');
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const timeEl = document.getElementById('tablet-time');

    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const adminModalOverlay = document.getElementById('admin-modal-overlay');
    const adminVehicleSearch = document.getElementById('admin-vehicle-search');
    const adminSearchResults = document.getElementById('admin-search-results');
    const adminVehiclePreview = document.getElementById('admin-vehicle-preview');
    const adminSetVehicleBtn = document.getElementById('admin-set-vehicle-btn');
    const adminRemoveVehicleBtn = document.getElementById('admin-remove-vehicle-btn');

    function showNotification(message, type = 'success') {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        notificationContainer.appendChild(notif);
        if (type !== 'error') {
            setTimeout(() => notif.remove(), 5000);
        }
    }

    ws.onclose = () => {
        console.log('👀 Déconnecté.');
        showNotification('Déconnecté de la tablette.', 'error');
    };

    const renderVehicles = (vehicles) => {
        carGrid.innerHTML = '';
        let count = 0;
        vehicles.forEach(car => {
            if (!car[1]) { return; }
            count++;
            const card = document.createElement('div');
            card.className = 'car-card';
            card.dataset.id = car[0];

            const isFound = car[3] && car[3].length > 0;
            const isFoundByMe = isFound && car[3] === API_TOKEN;
            const isAdmin = adminSlot != null;

            if (isFound && !isFoundByMe && !isAdmin) {
                card.classList.add('validated2');
            }
            if (isFound && isFoundByMe) {
                card.classList.add('validated');
            }

            if (isFound && !isFoundByMe && isAdmin) {
                card.classList.add('validated3');
            }

            let buttonHtml;
            if (isFound) {
                if (isFoundByMe) {
                    buttonHtml = `<button class="target-btn unfind-btn"><span class="text-original">Contactez : ${car[2] || 'INFO'}</span></button>`;
                } else if(isAdmin){
                    buttonHtml = `<button class="target-btn unfindother-btn"><span class="text-original">Trouvé par : ${car[4] || 'INFO'}</span></button>`;
                }else{
                    buttonHtml = '<button class="found-btn" disabled>Indisponible.</button>';
                }
            } else {
                buttonHtml = '<button class="target-btn">Valider la cible.</button>';
            }

            card.innerHTML = `
                <div class="card-content">
                    <div class="card-image-container">
                        <img src="./images/${car[1]}_front.png" alt="Vue avant ${car[1]}" class="car-image" data-img-front="./images/${car[1]}_front.png"
                                ${car[1] ? `data-img-rear="./images/${car[1]}_back.png"` : ''}
                                onerror="this.onerror=null;this.src='https://placehold.co/600x400/ccc/000?text=Image+Indisponible';">
                    </div>
                    <h2 class="card-title">${car[1]}</h2>
                </div>
                <div class="card-footer">${buttonHtml}</div>`;
            carGrid.appendChild(card);
        });
        if (count === 0) {
            carGrid.innerHTML = `<p>Aucune cible disponible pour le moment.</p>`;
        }
        carGrid.classList.remove('loading');
    };

    const updateVehicleList = (vehicles) => {
        if (forceStop) return;
        try {
            currentVehicles = vehicles;
            renderVehicles(vehicles);
        } catch (error) {
            carGrid.innerHTML = `<p style="color: var(--c-red-error);">Impossible de charger les données.</p>`;
            forceStop = true;
        }
    };

    let lightboxImages = [];
    let currentImageIndex = 0;
    function showImage(index) { modalImg.src = lightboxImages[index]; }
    carGrid.addEventListener('click', (event) => {
        const imageContainer = event.target.closest('.card-image-container');
        if (imageContainer) {
            const card = imageContainer.closest('.car-card');
            const id = card.dataset.id;
            const vehicle = currentVehicles.find(v => v[0] == id);
            if (vehicle) {
                lightboxImages = [`./images/${vehicle[1]}_front.png`];
                if (vehicle[1]) lightboxImages.push(`./images/${vehicle[1]}_back.png`);
                currentImageIndex = 0;
                showImage(currentImageIndex);
                imageModal.classList.add('visible');
            }
        }
    });
    imageModal.addEventListener('click', () => imageModal.classList.remove('visible'));
    modalImg.addEventListener('mouseover', () => { if (currentImageIndex < lightboxImages.length - 1) showImage(++currentImageIndex); });
    modalImg.addEventListener('mouseout', () => { if (currentImageIndex > 0) showImage(--currentImageIndex); });

    setTimeout(() => contentWrapper.classList.add('loaded'), 300);
    setInterval(() => { timeEl.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }, 1000);

    carGrid.addEventListener('click', async (event) => {
        const button = event.target.closest('.target-btn');
        if (button) {
            const card = button.closest('.car-card');
            const id = card.dataset.id;
            if (button.disabled || button.classList.contains('loading')) return;
            button.classList.add('loading');
            if (button.classList.contains('unfind-btn') || button.classList.contains('unfindother-btn')) {
                button.innerHTML = 'Annulation...';
                ws.send(JSON.stringify({ type: 'unfind', vehID: id }));
            } else {
                button.textContent = 'Validation en cours...';
                ws.send(JSON.stringify({ type: 'find', vehID: id }));
            }
        }
    });

    carGrid.addEventListener('mouseover', (event) => { if (event.target.classList.contains('car-image')) { const img = event.target; if (img.dataset.imgRear) img.src = img.dataset.imgRear; } });
    carGrid.addEventListener('mouseout', (event) => { if (event.target.classList.contains('car-image')) { const img = event.target; if (img.dataset.imgFront) img.src = img.dataset.imgFront; } });

    function setupAdminPanel() {
        adminPanelBtn.style.display = 'block';
        let selectedModel = null;
        
        VEHICLE_MODELS.sort();

        adminPanelBtn.addEventListener('click', () => adminModalOverlay.classList.add("visible"));
        
        adminModalOverlay.addEventListener('click', (e) => { 
            if (e.target === adminModalOverlay) {
                adminModalOverlay.classList.remove("visible");
                adminSearchResults.style.display = 'none';
            }
        });

        adminVehicleSearch.addEventListener('input', () => {
            const query = adminVehicleSearch.value.toLowerCase();
            adminSearchResults.innerHTML = '';
            selectedModel = null;

            if (query.length === 0) {
                adminSearchResults.style.display = 'none';
                return;
            }
            
            const filteredModels = VEHICLE_MODELS.filter(model => model.toLowerCase().includes(query));

            if (filteredModels.length > 0) {
                filteredModels.forEach(model => {
                    const item = document.createElement('div');
                    item.className = 'result-item';
                    item.textContent = model;
                    item.addEventListener('click', () => {
                        adminVehicleSearch.value = model;
                        selectedModel = model;
                        adminVehiclePreview.src = `./images/${model}_front.png`;
                        adminSearchResults.innerHTML = '';
                        adminSearchResults.style.display = 'none';
                    });
                    adminSearchResults.appendChild(item);
                });
                adminSearchResults.style.display = 'block';
            } else {
                adminSearchResults.style.display = 'none';
            }
        });

        adminSetVehicleBtn.addEventListener('click', () => {
            if (selectedModel && adminSlot && VEHICLE_MODELS.includes(selectedModel)) {
                ws.send(JSON.stringify({ type: 'setVehicle', slot: adminSlot, vehicleModel: selectedModel }));
                adminModalOverlay.classList.remove("visible");
            } else {
                showNotification('Veuillez sélectionner un véhicule valide dans la liste.', 'warning');
            }
        });

        adminRemoveVehicleBtn.addEventListener('click', () => {
            if (adminSlot) {
                ws.send(JSON.stringify({ type: 'removeVehicle', slot: adminSlot }));
                adminModalOverlay.classList.remove("visible");
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!adminVehicleSearch.contains(e.target) && !adminSearchResults.contains(e.target)) {
                 adminSearchResults.style.display = 'none';
            }
        });
    }

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('⬅️ Message reçu:', data);

        switch (data.type) {
            case 'auth_success':
                showNotification('Connexion réussie.', 'success');
                if (data.adminSlot) {
                    adminSlot = data.adminSlot;
                    setupAdminPanel();
                }
                break;
            case 'vehicles_update':
                carGrid.classList.add('loading');
                setTimeout(() => updateVehicleList(data.payload), 300);
                break;
            case 'find_error':
            case 'unfind_error':
            case 'set_vehicle_error':
            case 'remove_vehicle_error':
                showNotification(data.message || 'Une erreur est survenue.', 'warning');
                updateVehicleList(currentVehicles);
                break;
            case 'set_vehicle_success':
                showNotification('Cible définie avec succès.', 'success');
                break;
            case 'remove_vehicle_success':
                showNotification('Cible retirée avec succès.', 'success');
                break;
            case 'error':
                showNotification(data.error, 'error');
                break;
        }
    };
});