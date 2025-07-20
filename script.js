let params = new URLSearchParams(document.location.search);
let API_TOKEN = params.get("token");
let forceStop = false;
const ws = new WebSocket('wss://tablette-api.jordan-toulain.workers.dev/ws');

document.addEventListener('DOMContentLoaded', () => {

    ws.onopen = () => {
        console.log('✅ Connecté au WebSocket !');
        const userToken = API_TOKEN;
        ws.send(JSON.stringify({ type: 'auth', token: userToken }));
    };

    let currentVehicles = [];

    const carGrid = document.getElementById('car-grid');
    const contentWrapper = document.querySelector('.content-wrapper');
    const notificationContainer = document.getElementById('notification-container');

    function showNotification(message, type = 'success') {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        
        notificationContainer.appendChild(notif);

        if(type != 'error'){
            setTimeout(() => {
                notif.remove();
            }, 5000);
        }
    }
    
    ws.onclose = () => {
        console.log('👀 Déconnecté.');
        showNotification('Déconnecté de la tablette.', 'error')
    };

    const renderVehicles = (vehicles) => {
        carGrid.innerHTML = '';        
        let count = 0;

        vehicles.forEach(car => {
            if(!car[1]) {return};
            count++;
            const card = document.createElement('div');
            card.className = 'car-card';
            card.dataset.id = car[0]; 
            
            let isAlreadyValidated = car[3] === API_TOKEN;
            let isOthersValidated = car[3] && car[3] !== API_TOKEN;

            if (isOthersValidated) {
                card.classList.add('validated2');
            }
            if (isAlreadyValidated) {
                card.classList.add('validated');
            }

            let buttonHtml;
            if (isOthersValidated) {
                buttonHtml = '<button class="found-btn" disabled>Indisponible.</button>';
            } else if (isAlreadyValidated) {
                buttonHtml = `<button class="target-btn unfind-btn">
                                <span class="text-original">Contactez : ${car[2] || 'INFO'}</span>
                              </button>`;
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
                <div class="card-footer">
                    ${buttonHtml}
                </div>`;
            carGrid.appendChild(card);
        });

        if (count === 0) {
            carGrid.innerHTML = `<p>Aucune cible disponible pour le moment.</p>`;
        }

        carGrid.classList.remove('loading');
    };

    const updateVehicleList = async (vehicles) => {
        if(forceStop === true){ return; }
        try {
            currentVehicles = vehicles;
            renderVehicles(vehicles);
        } catch (error) {
            carGrid.innerHTML = `<p style="color: var(--c-red-error);">Impossible de charger les données. Vérifiez la connexion et le token API.</p>`;
            forceStop = true
        }
    };

    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    
    let lightboxImages = [];
    let currentImageIndex = 0;

    function showImage(index) {
        modalImg.src = lightboxImages[index];
    }

    carGrid.addEventListener('click', (event) => {
        const imageContainer = event.target.closest('.card-image-container');
        if (imageContainer) {
            const card = imageContainer.closest('.car-card');
            const id = card.dataset.id;
            const vehicle = currentVehicles.find(v => v[0] == id);

            if (vehicle) {
                lightboxImages = [`./images/${vehicle[1]}_front.png`];
                if (vehicle[1]) {
                    lightboxImages.push(`./images/${vehicle[1]}_back.png`);
                }
                
                currentImageIndex = 0;
                showImage(currentImageIndex);
                imageModal.classList.add('visible');
            }
        }
    });

    imageModal.addEventListener('click', () => imageModal.classList.remove('visible'));

    modalImg.addEventListener('mouseover', () => {
        if (currentImageIndex < lightboxImages.length - 1) {
            currentImageIndex++;
            showImage(currentImageIndex);
        }
    });

    modalImg.addEventListener('mouseout', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            showImage(currentImageIndex);
        }
    });
    
    setTimeout(() => contentWrapper.classList.add('loaded'), 300);

    const timeEl = document.getElementById('tablet-time');
    setInterval(() => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    carGrid.addEventListener('click', async (event) => {
        if (event.target.classList.contains('target-btn')) {
            const button = event.target;
            const card = button.closest('.car-card');
            const id = card.dataset.id;

            if (button.disabled || button.classList.contains('loading')) return;

            button.classList.add('loading');

            if (button.classList.contains('unfind-btn')) {
                button.textContent = 'Annulation...';
                ws.send(JSON.stringify({ type: 'unfind', vehID: id }));
            } else {
                button.textContent = 'Validation en cours...';
                ws.send(JSON.stringify({ type: 'find', vehID: id }));
            }
        }
    });

    carGrid.addEventListener('mouseover', (event) => {
        if (event.target.classList.contains('car-image')) {
            const img = event.target;
            const rearImgSrc = img.dataset.imgRear;
            if (rearImgSrc) img.src = rearImgSrc;
        }
    });

    carGrid.addEventListener('mouseout', (event) => {
        if (event.target.classList.contains('car-image')) {
            const img = event.target;
            const frontImgSrc = img.dataset.imgFront;
            if (frontImgSrc) img.src = frontImgSrc;
        }
    });

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('⬅️ Message reçu:', data);

        switch (data.type) {
            case 'auth_success':
                showNotification('Connexion réussie.', 'success');
                break;
            case 'vehicles_update':
                carGrid.classList.add('loading');
                setTimeout(() => updateVehicleList(data.payload), 300);
                break;
            case 'find_success':
                showNotification('Cible validée.', 'success');
                // L'interface sera mise à jour par 'vehicles_update' qui suit
                break;
            case 'unfind_success':
                showNotification('Validation annulée.', 'success');
                // L'interface sera mise à jour par 'vehicles_update' qui suit
                break;
            case 'find_error':
            case 'unfind_error':
                showNotification(data.message || 'Une erreur est survenue.', 'warning');
                const loadingButton = carGrid.querySelector('.target-btn.loading');
                if (loadingButton) {
                    loadingButton.classList.remove('loading');
                }
                break;
            case 'error':
                 showNotification(data.error, 'error');
                 break;
        }
    };
});
