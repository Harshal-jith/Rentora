document.addEventListener('DOMContentLoaded', () => {
    // Force browser to scroll to the top of the page on load / reload for all pages
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    window.addEventListener('load', () => {
        window.scrollTo(0, 0);
    });

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
    const navAnalytics = document.getElementById('nav-analytics');
    const navLogoBtn = document.getElementById('nav-logo-btn');
    const exploreBtn = document.getElementById('explore-btn');
    
    // Views
    const viewHome = document.getElementById('view-home');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewBrowse = document.getElementById('view-browse');
    const viewBookings = document.getElementById('view-bookings');
    const viewAnalytics = document.getElementById('view-analytics');

    // Heavy Professional Opening Splash Preloader
    // Header remains hidden for guests — only revealed after login
    const openingSplash = document.getElementById('opening-splash');
    const mainNavbar = document.getElementById('main-navbar');

    setTimeout(() => {
        if (openingSplash) openingSplash.classList.add('splash-exit');
        setTimeout(() => {
            if (openingSplash) openingSplash.style.display = 'none';
            // Header reveal is deferred to checkUserSession()
        }, 1200);
    }, 3000);

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
            renderHomeFeaturedProperties();
        } catch (e) {
            console.error('Failed loading properties from Django backend API:', e);
        }
    }

    /* SPA Navigation */
    if (navHome) navHome.addEventListener('click', () => {
        // Authenticated users go to dashboard; guests go to hero
        showView(currentUser ? 'dashboard' : 'home');
    });
    if (navBrowse) navBrowse.addEventListener('click', () => showView('browse'));
    if (navBookings) navBookings.addEventListener('click', () => showView('bookings'));
    if (navAnalytics) navAnalytics.addEventListener('click', () => showView('analytics'));
    navLogoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView(currentUser ? 'dashboard' : 'home');
    });

    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showView('browse');
            const anchor = document.getElementById('listings-section-anchor');
            if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const heroUnlockBtn = document.getElementById('hero-unlock-btn');
    const heroAuthTriggerBtn = document.getElementById('hero-auth-trigger-btn');

    if (heroUnlockBtn) {
        heroUnlockBtn.addEventListener('click', () => {
            if (currentUser) {
                showView('browse');
            } else if (authModal) {
                authModal.classList.remove('hidden');
            }
        });
    }

    if (heroAuthTriggerBtn && authModal) {
        heroAuthTriggerBtn.addEventListener('click', () => {
            authModal.classList.remove('hidden');
        });
    }

    if (landingCtaPrimary) {
        landingCtaPrimary.addEventListener('click', () => {
            showView('browse');
            const anchor = document.getElementById('listings-section-anchor');
            if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (landingCtaSecondary) {
        landingCtaSecondary.addEventListener('click', () => {
            const benefits = document.getElementById('benefits-section');
            if (benefits) benefits.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function showView(view) {
        // Ensure user is scrolled to the top of the page on every view navigation
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        if (navHome) navHome.classList.remove('active');
        if (navBrowse) navBrowse.classList.remove('active');
        if (navBookings) navBookings.classList.remove('active');
        if (navAnalytics) navAnalytics.classList.remove('active');

        if (viewHome) viewHome.classList.add('hidden');
        if (viewDashboard) viewDashboard.classList.add('hidden');
        if (viewBrowse) viewBrowse.classList.add('hidden');
        if (viewBookings) viewBookings.classList.add('hidden');
        if (viewAnalytics) viewAnalytics.classList.add('hidden');

        if (view === 'home') {
            // Guest hero — no navbar
            if (viewHome) viewHome.classList.remove('hidden');
        } else if (view === 'dashboard') {
            if (navHome) navHome.classList.add('active');
            if (viewDashboard) viewDashboard.classList.remove('hidden');
            renderDashboard();
        } else if (view === 'browse') {
            if (navBrowse) navBrowse.classList.add('active');
            if (viewBrowse) viewBrowse.classList.remove('hidden');
            renderProperties();
        } else if (view === 'bookings') {
            if (navBookings) navBookings.classList.add('active');
            if (viewBookings) viewBookings.classList.remove('hidden');
            renderBookings();
        } else if (view === 'analytics') {
            if (navAnalytics) navAnalytics.classList.add('active');
            if (viewAnalytics) viewAnalytics.classList.remove('hidden');
            loadAnalyticsAndRenderCharts();
        }
    }

    /* ── Dashboard renderer ── */
    function renderDashboard() {
        // Greeting
        const greetingEl = document.getElementById('dash-greeting');
        const greetingNameEl = document.getElementById('dash-username');
        if (greetingEl && currentUser) {
            const hour = new Date().getHours();
            const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
            greetingEl.textContent = period + ',';
        }
        if (greetingNameEl && currentUser) {
            greetingNameEl.textContent = currentUser.username + '.';
        }

        // Avatar initials
        const avatarEl = document.getElementById('dash-avatar-initials');
        if (avatarEl && currentUser) {
            avatarEl.textContent = currentUser.username.charAt(0).toUpperCase();
        }

        // Quick stats
        const totalBookingsEl = document.getElementById('dash-stat-bookings');
        if (totalBookingsEl) {
            totalBookingsEl.textContent = bookings.filter(b => b.status !== 'Cancelled').length;
        }
        const totalPropsEl = document.getElementById('dash-stat-props');
        if (totalPropsEl) totalPropsEl.textContent = properties.length;

        // Render featured properties in dashboard
        renderDashboardFeatured();
    }

    function renderDashboardFeatured() {
        const grid = document.getElementById('dash-featured-grid');
        if (!grid || !properties.length) return;
        grid.innerHTML = '';
        properties.slice(0, 4).forEach(prop => {
            const card = document.createElement('div');
            card.className = 'dash-prop-card';
            card.innerHTML = `
                <div class="dash-prop-img">
                    <img src="${prop.image}" alt="${prop.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'">
                    <span class="dash-prop-badge">${prop.category || 'Luxury'}</span>
                </div>
                <div class="dash-prop-body">
                    <div class="dash-prop-location"><i class="fa-solid fa-location-dot"></i> ${prop.city}</div>
                    <h4 class="dash-prop-title">${prop.title}</h4>
                    <div class="dash-prop-specs">
                        <span><i class="fa-solid fa-bed"></i> ${prop.bedrooms} bed</span>
                        <span><i class="fa-solid fa-bath"></i> ${prop.bathrooms} bath</span>
                        <span><i class="fa-solid fa-star"></i> ${prop.rating.toFixed(1)}</span>
                    </div>
                    <div class="dash-prop-footer">
                        <span class="dash-prop-price">${formatCurrency(prop.rent)}<span>/mo</span></span>
                        <button class="dash-view-btn view-details-btn" data-id="${prop.id}">View</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
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

    // Close modals when clicking backdrop
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.classList.add('hidden');
    });

    bookingModal.addEventListener('click', (e) => {
        if (e.target === bookingModal) bookingModal.classList.add('hidden');
    });

    /* Render Featured Properties on Home View */
    function renderHomeFeaturedProperties() {
        const homeGrid = document.getElementById('home-featured-grid');
        if (!homeGrid) return;
        homeGrid.innerHTML = '';

        const topProps = properties.slice(0, 3);
        topProps.forEach(prop => {
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
            homeGrid.appendChild(card);
        });

        homeGrid.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const propertyId = parseInt(btn.getAttribute('data-id'));
                openDetailModal(propertyId);
            });
        });
    }

    const homeViewAllBtn = document.getElementById('home-view-all-btn');
    if (homeViewAllBtn) {
        homeViewAllBtn.addEventListener('click', () => {
            showView('browse');
            document.getElementById('listings-section-anchor').scrollIntoView({ behavior: 'smooth' });
        });
    }

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

    async function loadUserBookingsFromApi() {
        try {
            const res = await fetch('/api/user/bookings/');
            const data = await res.json();
            if (Array.isArray(data)) {
                bookings = data;
                localStorage.setItem('rentora_django_bookings', JSON.stringify(bookings));
            }
        } catch (e) {
            console.error('Failed loading bookings from Django backend:', e);
        }
    }

    /* Render Bookings Dashboard */
    async function renderBookings() {
        bookingsList.innerHTML = '';
        await loadUserBookingsFromApi();

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
            const isCancelled = (b.status || '').toLowerCase() === 'cancelled';

            card.innerHTML = `
                <div class="booking-item-header">
                    <div>
                        <h4 style="font-size: 1.2rem;">${b.propertyTitle}</h4>
                        <p><i class="fa-solid fa-location-dot"></i> ${b.propertyAddress}</p>
                    </div>
                </div>
                <div class="booking-item-meta" style="margin-bottom: 0.75rem;">
                    <span><i class="fa-solid fa-calendar"></i> Move-in: ${b.checkIn}</span>
                    <span><i class="fa-solid fa-indian-rupee-sign"></i> Rent: ${formatCurrency(b.totalPrice)}</span>
                </div>

                <!-- Compact Status Row -->
                <div style="display: inline-flex; align-items: center; gap: 0.6rem; margin-bottom: 0.85rem;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">Status:</span>
                    <span class="status-badge status-${(b.status || 'Pending').toLowerCase()}">${b.status || 'Pending'}</span>
                </div>

                <div style="display: flex; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem; flex-wrap: wrap; align-items: center;">
                    <a href="/api/bookings/${b.id}/pdf/" class="btn-primary-custom" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; text-decoration: none;" target="_blank">
                        <i class="fa-solid fa-file-pdf"></i> Download PDF Receipt
                    </a>
                    <a href="/api/bookings/${b.id}/qrcode/" class="btn-secondary-custom" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; text-decoration: none;" target="_blank">
                        <i class="fa-solid fa-qrcode"></i> View QR Pass
                    </a>
                    ${!isCancelled ? `
                        <button type="button" class="btn-secondary-custom cancel-booking-btn" data-id="${b.id}" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); margin-left: auto;">
                            <i class="fa-solid fa-ban"></i> Cancel Reservation
                        </button>
                    ` : ''}
                </div>
            `;
            bookingsList.appendChild(card);
        });
    }

    /* 2-Step Verified Cancellation Modal Logic */
    const cancelModal = document.getElementById('cancel-modal');
    const closeCancelModalBtn = document.getElementById('close-cancel-modal-btn');
    const abortCancelBtn = document.getElementById('abort-cancel-btn');
    const submitCancelBtn = document.getElementById('submit-cancel-btn');
    const refreshCancelPinBtn = document.getElementById('refresh-cancel-pin-btn');
    const cancelVerifyPinDisplay = document.getElementById('cancel-verify-pin-display');
    const cancelPinInput = document.getElementById('cancel-pin-input');
    const cancelPinError = document.getElementById('cancel-pin-error');
    const cancelModalBookingId = document.getElementById('cancel-modal-booking-id');

    let targetCancelBookingId = null;
    let currentGeneratedPin = '';

    function generateRandomPin() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function openCancelModal(bookingId) {
        targetCancelBookingId = parseInt(bookingId);
        currentGeneratedPin = generateRandomPin();
        if (cancelVerifyPinDisplay) cancelVerifyPinDisplay.textContent = currentGeneratedPin;
        if (cancelModalBookingId) cancelModalBookingId.textContent = `#${targetCancelBookingId}`;
        if (cancelPinInput) cancelPinInput.value = '';
        if (cancelPinError) cancelPinError.style.display = 'none';
        if (cancelModal) cancelModal.classList.remove('hidden');
    }

    function closeCancelModal() {
        if (cancelModal) cancelModal.classList.add('hidden');
        targetCancelBookingId = null;
    }

    if (closeCancelModalBtn) closeCancelModalBtn.addEventListener('click', closeCancelModal);
    if (abortCancelBtn) abortCancelBtn.addEventListener('click', closeCancelModal);
    if (refreshCancelPinBtn) {
        refreshCancelPinBtn.addEventListener('click', () => {
            currentGeneratedPin = generateRandomPin();
            if (cancelVerifyPinDisplay) cancelVerifyPinDisplay.textContent = currentGeneratedPin;
        });
    }

    // Delegate click listener for Cancel Reservation buttons
    document.addEventListener('click', (e) => {
        const cancelBtn = e.target.closest('.cancel-booking-btn');
        if (cancelBtn) {
            e.preventDefault();
            const bookingId = parseInt(cancelBtn.getAttribute('data-id'));
            if (bookingId) openCancelModal(bookingId);
        }
    });

    if (submitCancelBtn) {
        submitCancelBtn.addEventListener('click', async () => {
            const enteredPin = (cancelPinInput.value || '').trim();
            if (enteredPin !== currentGeneratedPin) {
                if (cancelPinError) {
                    cancelPinError.style.display = 'block';
                    cancelPinError.textContent = 'Verification PIN does not match. Please enter the 6-digit code shown above.';
                }
                return;
            }

            if (cancelPinError) cancelPinError.style.display = 'none';

            try {
                const res = await fetch(`/api/bookings/${targetCancelBookingId}/cancel/`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    closeCancelModal();
                    showToast(`Reservation #${targetCancelBookingId} verified & cancelled.`);
                    await renderBookings();
                } else {
                    if (cancelPinError) {
                        cancelPinError.style.display = 'block';
                        cancelPinError.textContent = data.error || 'Failed to cancel reservation.';
                    }
                }
            } catch (err) {
                showToast('Network error processing cancellation', true);
            }
        });
    }

    let categoriesChart = null;
    let citiesChart = null;

    async function loadAnalyticsAndRenderCharts() {
        try {
            const res = await fetch('/api/analytics/');
            const data = await res.json();

            const statProps = document.getElementById('stat-analytics-props');
            const statBookings = document.getElementById('stat-analytics-bookings');
            const statRevenue = document.getElementById('stat-analytics-revenue');

            if (statProps) statProps.textContent = data.totalProperties;
            if (statBookings) statBookings.textContent = data.totalBookings;
            if (statRevenue) statRevenue.textContent = formatCurrency(data.totalRevenue);

            if (typeof Chart === 'undefined') return;

            // Categories Donut Chart
            const catCtx = document.getElementById('chart-categories');
            if (catCtx) {
                if (categoriesChart) categoriesChart.destroy();
                categoriesChart = new Chart(catCtx, {
                    type: 'doughnut',
                    data: {
                        labels: data.categories.labels,
                        datasets: [{
                            data: data.categories.counts,
                            backgroundColor: ['#d97706', '#2563eb', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } }
                        }
                    }
                });
            }

            // Cities Bar Chart
            const cityCtx = document.getElementById('chart-cities');
            if (cityCtx) {
                if (citiesChart) citiesChart.destroy();
                citiesChart = new Chart(cityCtx, {
                    type: 'bar',
                    data: {
                        labels: data.cities.labels,
                        datasets: [{
                            label: 'Properties Count',
                            data: data.cities.counts,
                            backgroundColor: '#d97706',
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0, color: 'var(--text-primary)' } },
                            x: { ticks: { color: 'var(--text-primary)' } }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Analytics loading error:', e);
        }
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

    // Global Click Handler for View Details buttons across all views
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-details-btn, .map-popup-details-btn');
        if (btn) {
            e.preventDefault();
            const propertyId = parseInt(btn.getAttribute('data-id'));
            if (propertyId) {
                openDetailModal(propertyId);
            }
        }
    });

    /* Auth Modal & Session Management */
    const authModal = document.getElementById('auth-modal');
    const authModalBtn = document.getElementById('auth-modal-btn');
    const closeAuthBtn = document.getElementById('close-auth-btn');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabSignupBtn = document.getElementById('tab-signup-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authBtnLabel = document.getElementById('auth-btn-label');

    // Profile Dropdown Elements
    const userProfileDropdown = document.getElementById('user-profile-dropdown');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const dropdownRoleBadge = document.getElementById('dropdown-role-badge');
    const dropdownMyBookings = document.getElementById('dropdown-my-bookings');
    const dropdownAnalyticsBtn = document.getElementById('dropdown-analytics-btn');
    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');

    const heroUnlockBtn = document.getElementById('hero-unlock-btn');
    const heroAuthTriggerBtn = document.getElementById('hero-auth-trigger-btn');

    if (heroUnlockBtn) {
        heroUnlockBtn.addEventListener('click', () => {
            if (currentUser) {
                showView('browse');
            } else {
                authModal.classList.remove('hidden');
            }
        });
    }

    if (heroAuthTriggerBtn) {
        heroAuthTriggerBtn.addEventListener('click', () => {
            if (!currentUser && authModal) {
                authModal.classList.remove('hidden');
            } else if (currentUser) {
                showView('browse');
            }
        });
    }

    async function checkUserSession() {
        try {
            const res = await fetch('/api/auth/user/');
            const data = await res.json();
            if (data.authenticated) {
                currentUser = data;
                if (authBtnLabel) authBtnLabel.textContent = data.username;
                if (dropdownUsername) dropdownUsername.textContent = data.username;
                if (dropdownEmail) dropdownEmail.textContent = data.email || 'Member User';

                // Unlock Navigation Tabs for Authenticated Members
                if (navBrowse) navBrowse.classList.remove('hidden');
                if (navBookings) navBookings.classList.remove('hidden');

                if (heroUnlockBtn) {
                    heroUnlockBtn.innerHTML = 'Explore the Collection <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                }

                // Reveal navbar now that user is authenticated
                if (mainNavbar) mainNavbar.classList.add('header-visible');

                if (data.is_superuser) {
                    if (dropdownRoleBadge) {
                        dropdownRoleBadge.textContent = 'Admin';
                        dropdownRoleBadge.style.background = 'rgba(217, 119, 6, 0.15)';
                        dropdownRoleBadge.style.color = '#d97706';
                    }
                    if (navAnalytics) navAnalytics.classList.remove('hidden');
                    if (dropdownAnalyticsBtn) dropdownAnalyticsBtn.classList.remove('hidden');
                } else {
                    if (dropdownRoleBadge) {
                        dropdownRoleBadge.textContent = 'Member';
                        dropdownRoleBadge.style.background = 'rgba(37, 99, 235, 0.15)';
                        dropdownRoleBadge.style.color = '#2563eb';
                    }
                    if (navAnalytics) navAnalytics.classList.add('hidden');
                    if (dropdownAnalyticsBtn) dropdownAnalyticsBtn.classList.add('hidden');
                }

                // Automatically navigate logged-in member to executive dashboard
                showView('dashboard');

            } else {
                currentUser = null;
                if (authBtnLabel) authBtnLabel.textContent = 'Sign In';
                if (userProfileDropdown) userProfileDropdown.classList.add('hidden');

                // Hide all nav tabs — guest mode
                if (navBrowse) navBrowse.classList.add('hidden');
                if (navBookings) navBookings.classList.add('hidden');
                if (navAnalytics) navAnalytics.classList.add('hidden');
                if (dropdownAnalyticsBtn) dropdownAnalyticsBtn.classList.add('hidden');

                // Keep navbar hidden on hero for a clean immersive experience
                if (mainNavbar) mainNavbar.classList.remove('header-visible');

                if (heroUnlockBtn) {
                    heroUnlockBtn.innerHTML = 'Explore the Collection <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                }

                // Force view back to home hero screen for unauthenticated guests
                showView('home');
            }
        } catch (e) {
            console.error('Session check error:', e);
            if (navBrowse) navBrowse.classList.add('hidden');
            if (navBookings) navBookings.classList.add('hidden');
            if (navAnalytics) navAnalytics.classList.add('hidden');
        }
    }

    // Dashboard action button listeners
    const dashBrowseBtn = document.getElementById('dash-browse-btn');
    if (dashBrowseBtn) {
        dashBrowseBtn.addEventListener('click', () => showView('browse'));
    }
    const dashBookingsBtn = document.getElementById('dash-bookings-btn');
    if (dashBookingsBtn) {
        dashBookingsBtn.addEventListener('click', () => showView('bookings'));
    }
    const dashViewAllBtn = document.getElementById('dash-view-all-btn');
    if (dashViewAllBtn) {
        dashViewAllBtn.addEventListener('click', () => showView('browse'));
    }

    const dashSearchInput = document.getElementById('dash-search-input');
    const dashSearchSubmit = document.getElementById('dash-search-submit');

    function handleDashSearch() {
        if (dashSearchInput && searchInput) {
            searchInput.value = dashSearchInput.value;
            showView('browse');
            renderProperties();
        }
    }

    if (dashSearchSubmit) {
        dashSearchSubmit.addEventListener('click', handleDashSearch);
    }
    if (dashSearchInput) {
        dashSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleDashSearch();
        });
    }

    document.querySelectorAll('.dash-cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const category = chip.getAttribute('data-cat');
            selectedCategory = category;
            
            document.querySelectorAll('#category-chips .chip-item').forEach(c => {
                c.classList.toggle('active', c.getAttribute('data-category') === category);
            });

            showView('browse');
            renderProperties();
        });
    });

    if (authModalBtn) {
        authModalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUser) {
                if (userProfileDropdown) userProfileDropdown.classList.toggle('hidden');
            } else {
                authModal.classList.remove('hidden');
            }
        });
    }

    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout/', { method: 'POST' });
                if (userProfileDropdown) userProfileDropdown.classList.add('hidden');
                showToast('Signed out successfully');
                checkUserSession();
                showView('home');
            } catch (err) {
                showToast('Logout failed', true);
            }
        });
    }

    if (dropdownMyBookings) {
        dropdownMyBookings.addEventListener('click', () => {
            if (userProfileDropdown) userProfileDropdown.classList.add('hidden');
            showView('bookings');
        });
    }

    if (dropdownAnalyticsBtn) {
        dropdownAnalyticsBtn.addEventListener('click', () => {
            if (userProfileDropdown) userProfileDropdown.classList.add('hidden');
            showView('analytics');
        });
    }

    // Close profile dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userProfileDropdown && !userProfileDropdown.classList.contains('hidden')) {
            const container = document.getElementById('auth-nav-container');
            if (container && !container.contains(e.target)) {
                userProfileDropdown.classList.add('hidden');
            }
        }
    });

    if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => authModal.classList.add('hidden'));
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.add('hidden');
        });
    }

    if (tabLoginBtn && tabSignupBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.style.color = 'var(--accent)';
            tabLoginBtn.style.borderBottom = '2px solid var(--accent)';
            tabSignupBtn.style.color = 'var(--text-secondary)';
            tabSignupBtn.style.borderBottom = 'none';
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        });

        tabSignupBtn.addEventListener('click', () => {
            tabSignupBtn.style.color = 'var(--accent)';
            tabSignupBtn.style.borderBottom = '2px solid var(--accent)';
            tabLoginBtn.style.color = 'var(--text-secondary)';
            tabLoginBtn.style.borderBottom = 'none';
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById('login-username').value.trim(),
                password: document.getElementById('login-password').value
            };
            try {
                const res = await fetch('/api/auth/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    authModal.classList.add('hidden');
                    showToast(`Welcome back, ${data.username}!`);
                    checkUserSession();
                } else {
                    showToast(data.error || 'Login failed', true);
                }
            } catch (err) {
                showToast('Network error logging in', true);
            }
        });
    }

    /* =============================================================
       MANA YERBA MATE STYLE HIGHLY INTERACTIVE HERO MODULE
       ============================================================= */

    // 1. Fluid Custom Cursor Follower
    const cursorFollower = document.getElementById('hero-cursor-follower');
    const heroSection = document.getElementById('view-home');
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    if (heroSection && cursorFollower) {
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.15;
            cursorY += (mouseY - cursorY) * 0.15;
            if (cursorFollower) {
                cursorFollower.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            }
            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Expand cursor ring over interactive elements
        const interactiveElements = document.querySelectorAll('.hero-btn-primary, .hero-btn-ghost, .switcher-thumb, .hero-hotspot, .vibe-btn, .hero-sound-toggle');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorFollower.classList.add('active');
            });
            el.addEventListener('mouseleave', () => {
                cursorFollower.classList.remove('active');
            });
        });
    }

    // 2. 3D Mouse Parallax Effect on Hero Stage
    const heroStage = document.getElementById('hero-stage');
    const heroAmbientCanvas = document.getElementById('hero-ambient-canvas');

    if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroSection.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            if (heroStage) {
                heroStage.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
            }
            if (heroAmbientCanvas) {
                heroAmbientCanvas.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
            }
        });

        heroSection.addEventListener('mouseleave', () => {
            if (heroStage) heroStage.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0)';
            if (heroAmbientCanvas) heroAmbientCanvas.style.transform = 'translate(0,0)';
        });
    }

    // 3. Interactive Estate Switcher
    const switcherThumbs = document.querySelectorAll('.switcher-thumb');
    const mainImg = document.getElementById('hero-main-img');
    const titleEl = document.getElementById('hero-estate-title');
    const locEl = document.getElementById('hero-estate-loc');
    const priceEl = document.getElementById('hero-estate-price');
    const coordEl = document.getElementById('hero-tele-coord');
    const climateEl = document.getElementById('hero-tele-climate');
    const badgeTextEl = document.getElementById('hero-estate-badge-text');

    switcherThumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            switcherThumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');

            const img = thumb.getAttribute('data-img');
            const title = thumb.getAttribute('data-title');
            const loc = thumb.getAttribute('data-loc');
            const price = thumb.getAttribute('data-price');
            const coord = thumb.getAttribute('data-coord');
            const climate = thumb.getAttribute('data-climate');
            const id = thumb.getAttribute('data-id');

            if (mainImg) {
                mainImg.style.opacity = '0';
                mainImg.style.transform = 'scale(1.08)';
                setTimeout(() => {
                    mainImg.src = img;
                    mainImg.style.opacity = '1';
                    mainImg.style.transform = 'scale(1)';
                }, 250);
            }

            if (titleEl) titleEl.textContent = title;
            if (locEl) locEl.textContent = loc;
            if (priceEl) priceEl.textContent = price;
            if (coordEl) coordEl.textContent = coord;
            if (climateEl) climateEl.textContent = climate;
            if (badgeTextEl) badgeTextEl.textContent = `FEATURED ESTATE #0${id}`;
        });
    });

    // 4. Vibe Selector
    const vibeBtns = document.querySelectorAll('.vibe-btn');
    vibeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            vibeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const vibe = btn.getAttribute('data-vibe');
            if (vibe === 'coastal') {
                if (switcherThumbs[0]) switcherThumbs[0].click();
            } else if (vibe === 'highland') {
                if (switcherThumbs[2]) switcherThumbs[2].click();
            } else if (vibe === 'lagoon') {
                if (switcherThumbs[1]) switcherThumbs[1].click();
            }
        });
    });

    // 5. Interactive Audio Equalizer / Soundscape Synthesizer (Web Audio API)
    const soundBtn = document.getElementById('hero-sound-btn');
    let audioCtx = null;
    let isSoundPlaying = false;
    let noiseNode = null;

    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            isSoundPlaying = !isSoundPlaying;
            soundBtn.classList.toggle('playing', isSoundPlaying);

            if (isSoundPlaying) {
                try {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const bufferSize = audioCtx.sampleRate * 2;
                    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const output = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                    noiseNode = audioCtx.createBufferSource();
                    noiseNode.buffer = noiseBuffer;
                    noiseNode.loop = true;

                    const filter = audioCtx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 350;

                    const gainNode = audioCtx.createGain();
                    gainNode.gain.value = 0.05;

                    noiseNode.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    noiseNode.start();
                    showToast('Ocean breeze ambient soundscape enabled');
                } catch (e) {
                    console.log('Audio Context error:', e);
                }
            } else {
                if (noiseNode) {
                    try { noiseNode.stop(); } catch(e) {}
                }
                showToast('Soundscape muted');
            }
        });
    }

    /* =============================================================
       REDO UI BI-DIRECTIONAL POP ANIMATIONS FOR BRAND LANDING HERO
       ============================================================= */
    const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-pop');

    if ('IntersectionObserver' in window && revealElements.length) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -60px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    const storyUnlockBtn = document.getElementById('story-unlock-btn');
    if (storyUnlockBtn && authModal) {
        storyUnlockBtn.addEventListener('click', () => {
            if (currentUser) {
                showView('browse');
            } else {
                authModal.classList.remove('hidden');
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById('signup-username').value.trim(),
                email: document.getElementById('signup-email').value.trim(),
                password: document.getElementById('signup-password').value
            };
            try {
                const res = await fetch('/api/auth/signup/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    authModal.classList.add('hidden');
                    showToast(`Account created for ${data.username}!`);
                    checkUserSession();
                } else {
                    showToast(data.error || 'Signup failed', true);
                }
            } catch (err) {
                showToast('Network error creating account', true);
            }
        });
    }

    // Initial load
    loadPropertiesFromApi();
    animateHeroStats();
    checkUserSession();
});
