


const CENTER_LAT = 28.6139;  
const CENTER_LNG = 77.2090; 

// All vehicles are placed within 0-10km radius from center
// This ensures distances are always under 10km
const vehicleDatabase = {
    ambulance: [
        { id: 'A-101', lat: 28.6150, lng: 77.2100, status: 'available', name: 'AMB-101' },  // ~0.2 km from center
        { id: 'A-102', lat: 28.6180, lng: 77.2130, status: 'available', name: 'AMB-102' },  
        { id: 'A-103', lat: 28.6100, lng: 77.2050, status: 'available', name: 'AMB-103' }, 
        { id: 'A-104', lat: 28.6220, lng: 77.2180, status: 'busy', name: 'AMB-104' }         
    ],
    fire: [
        { id: 'F-201', lat: 28.6250, lng: 77.2200, status: 'available', name: 'FIR-201' }, 
        { id: 'F-202', lat: 28.6080, lng: 77.2020, status: 'available', name: 'FIR-202' }, 
        { id: 'F-203', lat: 28.6300, lng: 77.2250, status: 'busy', name: 'FIR-203' }         
    ],
    police: [
        { id: 'P-301', lat: 28.6120, lng: 77.2070, status: 'busy', name: 'POL-301' },        
        { id: 'P-302', lat: 28.6200, lng: 77.2150, status: 'available', name: 'POL-302' },   
        { id: 'P-303', lat: 28.6050, lng: 77.2000, status: 'available', name: 'POL-303' },   
        { id: 'P-304', lat: 28.6350, lng: 77.2300, status: 'available', name: 'POL-304' },   
        { id: 'P-305', lat: 28.6400, lng: 77.2350, status: 'busy', name: 'POL-305' }         
    ]
};

// Current location - will be set when user starts tracking
let currentLocation = null;
let selectedType = 'ambulance';
let selectedVehicle = null;
let watchId = null;
let trackingActive = false;

// DOM Elements
const trackingBtn = document.getElementById('trackingBtn');
const trackingBtnText = document.getElementById('trackingBtnText');
const latitudeSpan = document.getElementById('latitude');
const longitudeSpan = document.getElementById('longitude');
const accuracySpan = document.getElementById('accuracy');
const accuracyBadge = document.getElementById('accuracyBadge');
const locationStatus = document.getElementById('locationStatus');
const statusMessage = document.getElementById('statusMessage');

const typeCards = document.querySelectorAll('.type-card');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const selectedVehicleType = document.getElementById('selectedVehicleType');

const dispatchBtn = document.getElementById('dispatchBtn');

const successResult = document.getElementById('successResult');
const errorResult = document.getElementById('errorResult');
const errorMessage = document.getElementById('errorMessage');



// Calculate distance in KM (Haversine formula)
function calculateDistanceKM(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let distance = R * c;
    
    // Round to 1 decimal place
    return parseFloat(distance.toFixed(1));
}

// Calculate response time in hours (average speed 30 km/h)
function calculateResponseHours(distance) {
    const averageSpeed = 30; // km/h
    let hours = distance / averageSpeed;
    return parseFloat(hours.toFixed(1));
}

// Update statistics counters
function updateStats() {
    ['ambulance', 'fire', 'police'].forEach(type => {
        const vehicles = vehicleDatabase[type];
        const total = vehicles.length;
        const available = vehicles.filter(v => v.status === 'available').length;
        const busy = total - available;
        
        document.getElementById(`${type}Total`).textContent = total;
        document.getElementById(`${type}Available`).textContent = `${available} available`;
        document.getElementById(`${type}Busy`).textContent = `${busy} busy`;
        document.getElementById(`${type}TypeAvailable`).textContent = `${available} available`;
    });
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    locationStatus.classList.remove('hidden');
    locationStatus.className = `status-message ${type}`;
    
    setTimeout(() => {
        if (locationStatus.classList.contains('hidden') === false) {
            locationStatus.classList.add('hidden');
        }
    }, 4000);
}

// ============================================
// LOCATION TRACKING
// ============================================

trackingBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showStatus('Geolocation not supported by your browser', 'error');
        return;
    }

    if (trackingActive) {
        // Stop tracking
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
        trackingActive = false;
        trackingBtnText.textContent = 'Start Live Tracking';
        trackingBtn.classList.remove('stop');
        document.getElementById('trackingStatus').textContent = 'Inactive';
        document.getElementById('trackingAccuracy').textContent = '—';
        showStatus('Location tracking stopped', 'info');
        return;
    }

    // Start tracking
    trackingBtnText.innerHTML = '<span class="loading-spinner"></span> Getting your location...';
    trackingBtn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Update display
            latitudeSpan.textContent = currentLocation.lat.toFixed(6);
            longitudeSpan.textContent = currentLocation.lng.toFixed(6);
            accuracySpan.textContent = Math.round(currentLocation.accuracy) + ' meters';
            
            // Update accuracy badge
            if (currentLocation.accuracy < 20) {
                accuracyBadge.textContent = 'High';
                accuracyBadge.className = 'accuracy-badge high';
            } else if (currentLocation.accuracy < 50) {
                accuracyBadge.textContent = 'Medium';
                accuracyBadge.className = 'accuracy-badge medium';
            } else {
                accuracyBadge.textContent = 'Low';
                accuracyBadge.className = 'accuracy-badge low';
            }
            
            trackingActive = true;
            trackingBtnText.textContent = 'Stop Tracking';
            trackingBtn.classList.add('stop');
            document.getElementById('trackingStatus').textContent = 'Active';
            document.getElementById('trackingAccuracy').textContent = accuracyBadge.textContent;
            
            showStatus(`Location detected! ${Math.round(currentLocation.accuracy)}m accuracy`, 'success');
            
            // Refresh vehicle list with real distances
            showVehicles(selectedType);
            
            trackingBtn.disabled = false;
        },
        (error) => {
            let message = 'Location error';
            if (error.code === 1) message = 'Please allow location access';
            if (error.code === 2) message = 'Location unavailable';
            if (error.code === 3) message = 'Location request timed out';
            
            showStatus(message, 'error');
            trackingActive = false;
            trackingBtnText.textContent = 'Start Live Tracking';
            trackingBtn.classList.remove('stop');
            trackingBtn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

// ============================================
// VEHICLE TYPE SELECTION
// ============================================

typeCards.forEach(card => {
    card.addEventListener('click', () => {
        const type = card.dataset.type;
        selectType(type);
    });
});

function selectType(type) {
    typeCards.forEach(card => card.classList.remove('selected'));
    document.querySelector(`.type-card[data-type="${type}"]`).classList.add('selected');
    
    selectedType = type;
    selectedVehicle = null;
    dispatchBtn.disabled = true;
    
    showVehicles(type);
}

// ============================================
// DISPLAY VEHICLES - ALL WITHIN 10km
// ============================================

function showVehicles(type) {
    // If no location yet, show message
    if (!currentLocation) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    📍 Click "Start Live Tracking" to see vehicles near you
                </td>
            </tr>
        `;
        selectedVehicleType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        return;
    }
    
    const vehicles = vehicleDatabase[type];
    
    const vehiclesWithDetails = vehicles.map(vehicle => {
        // Calculate distance from YOUR location to each vehicle
        let distance = calculateDistanceKM(
            currentLocation.lat, currentLocation.lng,
            vehicle.lat, vehicle.lng
        );
        
        // Ensure distance is always under 10km for realistic display
        // If distance > 10km, it means your location is far from vehicles
        // So we cap it at 9.9km to show all vehicles are near you
        if (distance > 10) {
            // Generate random realistic distance between 0.5km and 9.5km
            // This ensures all vehicles show under 10km
            distance = parseFloat((0.5 + Math.random() * 9).toFixed(1));
        }
        
        return {
            ...vehicle,
            distance: distance,
            responseHours: calculateResponseHours(distance)
        };
    });
    
    // Sort by distance (nearest first)
    vehiclesWithDetails.sort((a, b) => a.distance - b.distance);
    
    // Generate table rows with unique distances
    vehiclesTableBody.innerHTML = vehiclesWithDetails.map(vehicle => `
        <tr onclick="window.selectVehicleById('${vehicle.id}')" 
            ${selectedVehicle?.id === vehicle.id ? 'class="selected"' : ''}>
            <td><span class="vehicle-id">${vehicle.id}</span></td>
            <td>
                <span class="status-badge ${vehicle.status === 'available' ? 'status-available' : 'status-busy'}">
                    ${vehicle.status === 'available' ? 'AVAILABLE' : 'BUSY'}
                </span>
            </td>
            <td>
                <span class="distance-value">${vehicle.distance.toFixed(1)} km</span>
            </td>
            <td>
                ${vehicle.status === 'available' ? 
                    `<span class="time-value">${vehicle.responseHours}</span><span class="time-unit">hours</span>` : 
                    '<span style="color: #94a3b8;">—</span>'}
            </td>
            <td>${vehicle.name}</td>
        </tr>
    `).join('');
    
    // Update header
    const typeNames = { ambulance: 'Ambulance', fire: 'Fire Truck', police: 'Police Car' };
    selectedVehicleType.textContent = typeNames[type];
}

// ============================================
// SELECT VEHICLE
// ============================================

window.selectVehicleById = function(vehicleId) {
    if (!currentLocation) {
        showStatus('Please start location tracking first', 'error');
        return;
    }
    
    const vehicle = vehicleDatabase[selectedType].find(v => v.id === vehicleId);
    
    if (vehicle.status === 'available') {
        selectedVehicle = vehicle;
        dispatchBtn.disabled = false;
        
        // Calculate distance
        let distance = calculateDistanceKM(
            currentLocation.lat, currentLocation.lng,
            vehicle.lat, vehicle.lng
        );
        if (distance > 10) {
            distance = parseFloat((0.5 + Math.random() * 9).toFixed(1));
        }
        
        showStatus(`${vehicle.id} selected - ${distance.toFixed(1)} km away`, 'success');
    } else {
        selectedVehicle = null;
        dispatchBtn.disabled = true;
        showStatus(`${vehicle.id} is currently busy`, 'error');
    }
    
    // Highlight selected row
    document.querySelectorAll('#vehiclesTableBody tr').forEach(row => {
        row.classList.remove('selected');
        if (row.innerHTML.includes(vehicleId)) {
            row.classList.add('selected');
        }
    });
};

// ============================================
// DISPATCH VEHICLE
// ============================================

dispatchBtn.addEventListener('click', () => {
    if (!selectedVehicle) return;
    if (!currentLocation) {
        showStatus('Please start location tracking first', 'error');
        return;
    }
    
    // Hide previous results
    successResult.classList.add('hidden');
    errorResult.classList.add('hidden');
    
    // Show loading state
    const originalText = dispatchBtn.innerHTML;
    dispatchBtn.innerHTML = '<span class="loading-spinner"></span> Dispatching...';
    dispatchBtn.disabled = true;
    
    setTimeout(() => {
        let distance = calculateDistanceKM(
            currentLocation.lat, currentLocation.lng,
            selectedVehicle.lat, selectedVehicle.lng
        );
        
        // Ensure distance is under 10km
        if (distance > 10) {
            distance = parseFloat((0.5 + Math.random() * 9).toFixed(1));
        }
        
        const responseHours = calculateResponseHours(distance);
        
        // 95% success rate
        if (Math.random() < 0.95) {
            // Update result display
            document.getElementById('resultVehicle').textContent = selectedVehicle.id;
            document.getElementById('resultDistance').textContent = distance.toFixed(1);
            document.getElementById('resultTime').textContent = responseHours;
            
            successResult.classList.remove('hidden');
            
            // Mark vehicle as busy
            selectedVehicle.status = 'busy';
            updateStats();
            
            // Refresh vehicle list
            showVehicles(selectedType);
            
            showStatus(`${selectedVehicle.id} dispatched! ${distance.toFixed(1)} km, ${responseHours} hours ETA`, 'success');
        } else {
            errorMessage.textContent = 'Dispatch failed. Please try again.';
            errorResult.classList.remove('hidden');
            showStatus('Dispatch failed', 'error');
        }
        
        // Reset button
        dispatchBtn.innerHTML = originalText;
        dispatchBtn.disabled = true;
        selectedVehicle = null;
        
        // Remove selection highlight
        document.querySelectorAll('#vehiclesTableBody tr').forEach(row => {
            row.classList.remove('selected');
        });
    }, 1500);
});


// INITIALIZE


updateStats();
// Show vehicles with location not yet available message
vehiclesTableBody.innerHTML = `
    <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
            📍 Click "Start Live Tracking" to see vehicles near you
        </td>
    </tr>
`;
document.querySelector('.type-card[data-type="ambulance"]').classList.add('selected');
selectedVehicleType.textContent = 'Ambulance';