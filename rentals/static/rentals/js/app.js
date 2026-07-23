document.addEventListener('DOMContentLoaded', () => {
    // State management
    let properties = [];
    let bookings = JSON.parse(localStorage.getItem('rentora_django_bookings')) || [];
    let currentProperty = null;
    let currentSlideIndex = 0;
    let selectedCategory = '';
    let currentSort = 'featured';
    let currentViewMode = 'grid';
    let mapInstance = null;
    let mapMarkers = [];

    // Navigation elements
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    const navHome = document.getElementById('nav-home');
    const navBrowse = document.getElementById('nav-browse');
    const navBookings = document.getElementById('nav-bookings');
    const navLogoBtn = document.getElementById('nav-logo-btn');
    const exploreBtn = document.getElementById('explore-btn');
    
    // Views
    const viewHome = document.getElementById('view-home');
    const viewBrowse = document.getElementById('view-browse');
    const viewBookings = document.getElementById('view-bookings');

    // CTAs on Landing page
    const landingCtaPrimary = document.getElementById('landing-cta-primary');
    const landingCtaSecondary = document.getElementById('landing-cta-secondary');

    // Catalog filters & view controls
    const searchInput = document.getElementById('search-input');
    const cityFilter = document.getElementById('city-filter');
    const bedroomsFilter = document.getElementById('bedrooms-filter');
    const priceFilter = document.getElementById('price-filter');
    const categoryChips = document.getElementById('category-chips');
    const sortFilter = document.getElementById('sort-filter');
    const viewToggleGrid = document.getElementById('view-toggle-grid');
    const viewToggleMap = document.getElementById('view-toggle-map');
    const propertiesCount = document.getElementById('properties-count');
    const listingsGrid = document.getElementById('listings-grid');
    const mapViewContainer = document.getElementById('map-view-container');

    // Detailed View Modal Elements
    const detailModal = document.getElementById('detail-modal');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const carouselSlidesContainer = document.getElementById('carousel-slides-container');
    const carouselDotsContainer = document.getElementById('carousel-dots-container');
    const carouselPrevBtn = document.getElementById('carousel-prev-btn');
    const carouselNextBtn = document.getElementById('carousel-next-btn');
    const galleryImageLabel = document.getElementById('gallery-image-label');
    
    const detailPropertyTitle = document.getElementById('detail-property-title');
    const detailPropertyAddress = document.getElementById('detail-property-address');
    const detailPropertyDesc = document.getElementById('detail-property-desc');
    const detailPropertyAmenities = document.getElementById('detail-property-amenities');
    const detailPropertyPrice = document.getElementById('detail-property-price');
    const detailSpecBeds = document.getElementById('detail-spec-beds');
    const detailSpecBaths = document.getElementById('detail-spec-baths');
    const detailSpecArea = document.getElementById('detail-spec-area');
    const detailSpecFurnishing = document.getElementById('detail-spec-furnishing');
    const detailSpecParking = document.getElementById('detail-spec-parking');
    const reserveSpaceBtn = document.getElementById('reserve-space-btn');

    // Booking Request Modal Elements
    const bookingModal = document.getElementById('booking-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBookingBtn = document.getElementById('cancel-booking-btn');
    const bookingForm = document.getElementById('booking-form');
    const modalPropertyId = document.getElementById('modal-property-id');
    const summaryPropertyTitle = document.getElementById('summary-property-title');
    const summaryPropertyRent = document.getElementById('summary-property-rent');
    const summaryPropertyAddress = document.getElementById('summary-property-address');

    // Dashboard element
    const bookingsList = document.getElementById('bookings-list');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    /* Theme Management */
    const savedTheme = localStorage.getItem('rentora_theme') || 'light';
    setTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('rentora_theme', theme);
        if (theme === 'dark') {
            themeIcon.className = 'fa-solid fa-sun';
            themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
        } else {
            themeIcon.className = 'fa-solid fa-moon';
            themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
        }
    }

    /* Fetch Properties from Django API */
    async function loadPropertiesFromApi() {
        try {
            const res = await fetch('/api/properties/');
            properties = await res.json();
            renderProperties();
        } catch (e) {
            console.error('Failed loading properties from Django backend API:', e);
        }
    }

    /* SPA Navigation */
    navHome.addEventListener('click', () => showView('home'));
    navBrowse.addEventListener('click', () => showView('browse'));
    navBookings.addEventListener('click', () => showView('bookings'));
    navLogoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('home');
    });

    exploreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('browse');
        document.getElementById('listings-section-anchor').scrollIntoView({ behavior: 'smooth' });
    });

    landingCtaPrimary.addEventListener('click', () => {
        showView('browse');
        document.getElementById('listings-section-anchor').scrollIntoView({ behavior: 'smooth' });
    });

    landingCtaSecondary.addEventListener('click', () => {
        document.getElementById('benefits-section').scrollIntoView({ behavior: 'smooth' });
    });

    function showView(view) {
        navHome.classList.remove('active');
        navBrowse.classList.remove('active');
        navBookings.classList.remove('active');

        viewHome.classList.add('hidden');
        viewBrowse.classList.add('hidden');
        viewBookings.classList.add('hidden');

        if (view === 'home') {
            navHome.classList.add('active');
            viewHome.classList.remove('hidden');
            animateHeroStats();
        } else if (view === 'browse') {
            navBrowse.classList.add('active');
            viewBrowse.classList.remove('hidden');
            renderProperties();
        } else if (view === 'bookings') {
            navBookings.classList.add('active');
            viewBookings.classList.remove('hidden');
            renderBookings();
        }
    }

    /* Hero Stats Counter */
    function animateHeroStats() {
        const numbers = document.querySelectorAll('.stat-number');
        numbers.forEach(numEl => {
            const target = parseFloat(numEl.getAttribute('data-target'));
            const prefix = numEl.getAttribute('data-prefix') || '';
            const suffix = numEl.getAttribute('data-suffix') || '';
            const isFloat = target % 1 !== 0;

            let current = 0;
            const duration = 1200;
            const steps = 40;
            const increment = target / steps;
            const stepTime = duration / steps;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                const formattedVal = isFloat ? current.toFixed(2) : Math.floor(current);
                numEl.textContent = `${prefix}${formattedVal}${suffix}`;
            }, stepTime);
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    /* Render Properties */
    function renderProperties() {
        const query = searchInput.value.toLowerCase().trim();
        const city = cityFilter.value;
        const bedrooms = bedroomsFilter.value;
        const maxPrice = priceFilter.value ? parseInt(priceFilter.value) : null;

        let filtered = properties.filter(prop => {
            const matchesSearch = prop.title.toLowerCase().includes(query) ||
                                  prop.description.toLowerCase().includes(query) ||
                                  prop.address.toLowerCase().includes(query);
            const matchesCity = !city || prop.city === city;
            const matchesBedrooms = !bedrooms || prop.bedrooms === parseInt(bedrooms);
            const matchesPrice = !maxPrice || prop.rent <= maxPrice;
            const matchesCategory = !selectedCategory || prop.category === selectedCategory;

            return matchesSearch && matchesCity && matchesBedrooms && matchesPrice && matchesCategory;
        });

        if (currentSort === 'price-low') {
            filtered.sort((a, b) => a.rent - b.rent);
        } else if (currentSort === 'price-high') {
            filtered.sort((a, b) => b.rent - a.rent);
        } else if (currentSort === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        }

        propertiesCount.textContent = `${filtered.length} property${filtered.length === 1 ? '' : 'ies'} found`;

        if (currentViewMode === 'grid') {
            listingsGrid.classList.remove('hidden');
            mapViewContainer.classList.add('hidden');
            renderGridCards(filtered);
        } else {
            listingsGrid.classList.add('hidden');
            mapViewContainer.classList.remove('hidden');
            initAndRenderMap(filtered);
        }
    }

    function renderGridCards(filtered) {
        listingsGrid.innerHTML = '';

        if (filtered.length === 0) {
            listingsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-magnifying-glass-location"></i>
                    <h3>No Listings Found</h3>
                    <p>Try adjusting your search filters or category chips.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(prop => {
            const card = document.createElement('div');
            card.className = 'property-card glass-effect';
            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${prop.image}" alt="${prop.title}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'">
                    <span class="card-tag">${prop.category || (prop.furnished ? 'Fully Furnished' : 'Semi-Furnished')}</span>
                    <span class="card-rating">
                        <i class="fa-solid fa-star"></i>
                        <span>${prop.rating.toFixed(2)}</span>
                    </span>
                </div>
                <div class="card-body">
                    <div class="card-location"><i class="fa-solid fa-location-dot"></i> ${prop.city}</div>
                    <h3 class="card-title">${prop.title}</h3>
                    <p class="card-description">${prop.description}</p>
                    <div class="card-specs">
                        <span class="spec-item"><i class="fa-solid fa-bed"></i> ${prop.bedrooms} Bed${prop.bedrooms > 1 ? 's' : ''}</span>
                        <span class="spec-item"><i class="fa-solid fa-bath"></i> ${prop.bathrooms} Bath${prop.bathrooms > 1 ? 's' : ''}</span>
                        <span class="spec-item"><i class="fa-solid fa-maximize"></i> ${prop.area} sq.ft</span>
                    </div>
                    <div class="card-footer">
                        <div class="card-price-div">
                            <span class="price-label">Monthly Rent</span>
                            <div>
                                <span class="price-value">${formatCurrency(prop.rent)}</span>
                                <span class="price-period">/mo</span>
                            </div>
                        </div>
                        <button class="btn-primary-custom view-details-btn" data-id="${prop.id}">
                            <i class="fa-solid fa-circle-info"></i> View Details
                        </button>
                    </div>
                </div>
            `;
            listingsGrid.appendChild(card);
        });

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const propertyId = parseInt(btn.getAttribute('data-id'));
                openDetailModal(propertyId);
            });
        });
    }

    /* Leaflet Map */
    function initAndRenderMap(filteredProps) {
        if (typeof L === 'undefined') return;

        if (!mapInstance) {
            mapInstance = L.map('rentora-map').setView([10.1, 76.5], 7);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(mapInstance);
        }

        setTimeout(() => { mapInstance.invalidateSize(); }, 100);

        mapMarkers.forEach(marker => mapInstance.removeLayer(marker));
        mapMarkers = [];

        if (filteredProps.length === 0) return;

        const bounds = [];

        filteredProps.forEach(prop => {
            const lat = prop.lat || 9.9312;
            const lng = prop.lng || 76.2673;

            bounds.push([lat, lng]);

            const customIcon = L.divIcon({
                className: 'custom-map-pin-icon',
                html: `
                    <div style="background: var(--gradient-accent); color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #fff; font-size: 0.85rem;">
                        <i class="fa-solid fa-house-chimney"></i>
                    </div>
                `,
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            });

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance);

            const popupContent = `
                <div class="map-popup-card">
                    <img src="${prop.image}" alt="${prop.title}" class="map-popup-img" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'">
                    <div class="map-popup-body">
                        <div class="map-popup-title">${prop.title}</div>
                        <div class="map-popup-rent">${formatCurrency(prop.rent)}/mo</div>
                        <button class="btn-primary-custom map-popup-btn map-popup-details-btn" data-id="${prop.id}">
                            View Details
                        </button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            mapMarkers.push(marker);
        });

        if (bounds.length > 0) {
            mapInstance.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    /* Modal Handlers */
    function openDetailModal(propertyId) {
        currentProperty = properties.find(p => p.id === propertyId);
        if (!currentProperty) return;

        detailPropertyTitle.textContent = currentProperty.title;
        detailPropertyAddress.textContent = currentProperty.address;
        detailPropertyDesc.textContent = currentProperty.description;
        detailPropertyPrice.textContent = `${formatCurrency(currentProperty.rent)} /mo`;

        detailSpecBeds.textContent = currentProperty.bedrooms;
        detailSpecBaths.textContent = currentProperty.bathrooms;
        detailSpecArea.textContent = currentProperty.area.toLocaleString();
        detailSpecFurnishing.textContent = currentProperty.furnished ? 'Furnished' : 'Unfurnished';
        detailSpecParking.textContent = currentProperty.parking ? 'Available' : 'None';

        detailPropertyAmenities.innerHTML = '';
        currentProperty.amenities.forEach(amenity => {
            const chip = document.createElement('span');
            chip.className = 'amenity-chip';
            chip.innerHTML = `<i class="fa-solid fa-check"></i> ${amenity}`;
            detailPropertyAmenities.appendChild(chip);
        });

        setupCarousel(currentProperty.images || [currentProperty.image]);
        detailModal.classList.remove('hidden');
    }

    function setupCarousel(imageUrls) {
        currentSlideIndex = 0;
        carouselSlidesContainer.innerHTML = '';
        carouselDotsContainer.innerHTML = '';

        imageUrls.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = `carousel-slide ${i === 0 ? 'active' : ''}`;
            slide.innerHTML = `<img src="${url}" alt="Property view" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'">`;
            carouselSlidesContainer.appendChild(slide);

            const dot = document.createElement('span');
            dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => goToSlide(i));
            carouselDotsContainer.appendChild(dot);
        });

        updateCarouselUI();
    }

    function goToSlide(index) {
        const slides = carouselSlidesContainer.querySelectorAll('.carousel-slide');
        const dots = carouselDotsContainer.querySelectorAll('.carousel-dot');
        if (!slides.length) return;

        slides[currentSlideIndex].classList.remove('active');
        dots[currentSlideIndex].classList.remove('active');

        currentSlideIndex = (index + slides.length) % slides.length;

        slides[currentSlideIndex].classList.add('active');
        dots[currentSlideIndex].classList.add('active');

        updateCarouselUI();
    }

    function updateCarouselUI() {
        const slides = carouselSlidesContainer.querySelectorAll('.carousel-slide');
        galleryImageLabel.textContent = `Photo ${currentSlideIndex + 1} of ${slides.length}`;
    }

    carouselPrevBtn.addEventListener('click', () => goToSlide(currentSlideIndex - 1));
    carouselNextBtn.addEventListener('click', () => goToSlide(currentSlideIndex + 1));
    closeDetailBtn.addEventListener('click', () => detailModal.classList.add('hidden'));

    reserveSpaceBtn.addEventListener('click', () => {
        detailModal.classList.add('hidden');
        openBookingModal(currentProperty);
    });

    function openBookingModal(property) {
        if (!property) return;
        modalPropertyId.value = property.id;
        summaryPropertyTitle.textContent = property.title;
        summaryPropertyAddress.textContent = property.address;
        summaryPropertyRent.textContent = `${formatCurrency(property.rent)} /mo`;

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('check-in-date').value = today;

        bookingModal.classList.remove('hidden');
    }

    closeModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));
    cancelBookingBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));

    /* Submit Booking Request to Django Backend API */
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const propertyId = parseInt(modalPropertyId.value);
        const prop = properties.find(p => p.id === propertyId);
        
        const payload = {
            propertyId: propertyId,
            fullName: document.getElementById('renter-name').value.trim(),
            email: document.getElementById('renter-email').value.trim(),
            phone: document.getElementById('renter-phone').value.trim(),
            guests: document.getElementById('guests-count').value,
            checkIn: document.getElementById('check-in-date').value,
            leaseMonths: document.getElementById('lease-duration').value,
            specialRequests: document.getElementById('special-requests').value.trim(),
            totalPrice: prop ? prop.rent : 0
        };

        try {
            const res = await fetch('/api/bookings/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (data.success) {
                bookingModal.classList.add('hidden');
                showToast('Booking request submitted & saved to Django database!');
                
                // Track locally for renter
                bookings.push({
                    id: data.bookingId,
                    propertyTitle: prop ? prop.title : 'Property',
                    propertyAddress: prop ? prop.address : '',
                    checkIn: payload.checkIn,
                    status: 'Pending',
                    totalPrice: payload.totalPrice
                });
                localStorage.setItem('rentora_django_bookings', JSON.stringify(bookings));
                
                showView('bookings');
            } else {
                showToast(data.error || 'Failed submitting booking', true);
            }
        } catch (err) {
            showToast('Network error submitting booking', true);
        }
    });

    /* Render Bookings Dashboard */
    function renderBookings() {
        bookingsList.innerHTML = '';

        if (!bookings.length) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    <h3>No Reservations Yet</h3>
                    <p>Explore our catalog and submit a reservation request to get started.</p>
                </div>
            `;
            return;
        }

        bookings.forEach(b => {
            const card = document.createElement('div');
            card.className = 'booking-item-card glass-effect';
            card.innerHTML = `
                <div class="booking-item-header">
                    <div>
                        <h4>${b.propertyTitle}</h4>
                        <p><i class="fa-solid fa-location-dot"></i> ${b.propertyAddress}</p>
                    </div>
                    <span class="status-badge status-${(b.status || 'Pending').toLowerCase()}">${b.status || 'Pending'}</span>
                </div>
                <div class="booking-item-meta">
                    <span><i class="fa-solid fa-calendar"></i> Move-in: ${b.checkIn}</span>
                    <span><i class="fa-solid fa-indian-rupee-sign"></i> Rent: ${formatCurrency(b.totalPrice)}</span>
                </div>
            `;
            bookingsList.appendChild(card);
        });
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'custom-toast glass-effect';
        toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    /* Event Listeners */
    if (categoryChips) {
        categoryChips.querySelectorAll('.chip-item').forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedCategory = chip.getAttribute('data-category');
                renderProperties();
            });
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderProperties();
        });
    }

    if (viewToggleGrid && viewToggleMap) {
        viewToggleGrid.addEventListener('click', () => {
            viewToggleGrid.classList.add('active');
            viewToggleMap.classList.remove('active');
            currentViewMode = 'grid';
            renderProperties();
        });

        viewToggleMap.addEventListener('click', () => {
            viewToggleMap.classList.add('active');
            viewToggleGrid.classList.remove('active');
            currentViewMode = 'map';
            renderProperties();
        });
    }

    searchInput.addEventListener('input', renderProperties);
    cityFilter.addEventListener('change', renderProperties);
    bedroomsFilter.addEventListener('change', renderProperties);
    priceFilter.addEventListener('change', renderProperties);

    // Initial load
    loadPropertiesFromApi();
    animateHeroStats();
});
