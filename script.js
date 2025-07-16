const workerUrl = 'https://tablette-api.jordan-toulain.workers.dev';
let params = new URLSearchParams(document.location.search);
let API_TOKEN = params.get("token");
let forceStop = false;

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://tablette-api.jordan-toulain.workers.dev';
    const REFRESH_INTERVAL = 10000;
    let currentVehicles = [];

    const api = {
        fetchVehicles: () => {
            return fetch(`${API_BASE_URL}/vehicles`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': API_TOKEN
                    },
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur réseau: ${response.statusText}`);
                    }
                    return response.json();
                });
        },
        validateTarget: (id) => {
            return fetch(`${API_BASE_URL}/findVehicle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': API_TOKEN,
                    'veh': id
                },
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur réseau: ${response.statusText}`);
                }
                return response.json();
            });
        }
    };

    const carGrid = document.getElementById('car-grid');
    const contentWrapper = document.querySelector('.content-wrapper');

    const renderVehicles = (vehicles) => {

        carGrid.innerHTML = '';
        

        let count = 0;

        vehicles.forEach(car => {
            if(car[1] === "") {return};
            count++;
            const card = document.createElement('div');
            card.className = 'car-card';
            card.dataset.id = car[0]; 
            
            let isAlreadyValidated = false
            let isOthersValidated = false
            if (car[3] === "FOUND"){
                isOthersValidated = true
            }
            if (car[3] === API_TOKEN){
                isAlreadyValidated = true
            }
            if (isOthersValidated) {
                card.classList.add('validated2');
            }
            if (isAlreadyValidated) {
                card.classList.add('validated');
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
                    ${isOthersValidated ? '<button class="found-btn" disabled>Indisponible.</button>' : `<button class="target-btn" ${isAlreadyValidated ? 'disabled' : ''}>
                        ${isAlreadyValidated ? `Contactez : ${car[2]}` : 'Valider la cible.'}
                    </button>`}
                </div>`;
            carGrid.appendChild(card);
        });

        if (count === 0) {
            carGrid.innerHTML = `<p>Aucune cible disponible pour le moment.</p>`;
            return;
        }
    };

    const updateVehicleList = async () => {
        if(forceStop === true){ return; }
        carGrid.classList.add('loading');
        try {
            const vehicles = await api.fetchVehicles(API_TOKEN);
            currentVehicles = vehicles;
            renderVehicles(vehicles);
        } catch (error) {
            carGrid.innerHTML = `<p style="color: var(--c-red-error);">Impossible de charger les données. Vérifiez la connexion et le token API.</p>`;
            forceStop = true
        } finally {
            carGrid.classList.remove('loading');
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
            console.log(currentImageIndex, lightboxImages.length)
        }
    });

    modalImg.addEventListener('mouseout', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            showImage(currentImageIndex);
            console.log(currentImageIndex, lightboxImages.length)
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
            button.textContent = 'Validation en cours...';

            try {
                const response = await api.validateTarget(id);
                if (response.success) {
                    button.disabled = true;
                    button.textContent = `Contactez : ${response.contact || '555-XXXX'}`;
                    card.classList.add('validated');
                } else {
                    throw new Error(response.message || 'La validation a échoué.');
                }
            } catch (error) {
                button.textContent = 'Échec lors de la validation.';
                updateVehicleList()
            } finally {
                button.classList.remove('loading');
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

    updateVehicleList();
    setInterval(updateVehicleList, REFRESH_INTERVAL);
});