// ============================================
// EMERGENCY DISPATCH SYSTEM - FIXED VERSION
// Realistic response times: 10-15 minutes per km
// Fixed: Vehicle name display
// ============================================

// Vehicle Database
const vehicleDatabase = {
  ambulance: [
    { id: "A-101", lat: 28.615, lng: 77.21, status: "available", name: "AMB-101" },
    { id: "A-102", lat: 28.618, lng: 77.213, status: "available", name: "AMB-102" },
    { id: "A-103", lat: 28.61, lng: 77.205, status: "available", name: "AMB-103" },
    { id: "A-104", lat: 28.622, lng: 77.218, status: "busy", name: "AMB-104" },
  ],
  fire: [
    { id: "F-201", lat: 28.625, lng: 77.22, status: "available", name: "FIR-201" },
    { id: "F-202", lat: 28.608, lng: 77.202, status: "available", name: "FIR-202" },
    { id: "F-203", lat: 28.63, lng: 77.225, status: "busy", name: "FIR-203" },
  ],
  police: [
    { id: "P-301", lat: 28.612, lng: 77.207, status: "busy", name: "POL-301" },
    { id: "P-302", lat: 28.62, lng: 77.215, status: "available", name: "POL-302" },
    { id: "P-303", lat: 28.605, lng: 77.2, status: "available", name: "POL-303" },
    { id: "P-304", lat: 28.635, lng: 77.23, status: "available", name: "POL-304" },
    { id: "P-305", lat: 28.64, lng: 77.235, status: "busy", name: "POL-305" },
  ],
};

// Current location
let currentLocation = null;
let selectedType = "ambulance";
let selectedVehicle = null;
let watchId = null;
let trackingActive = false;

// Store vehicle data with calculated distances
let currentVehiclesList = [];

// DOM Elements
const trackingBtn = document.getElementById("trackingBtn");
const trackingBtnText = document.getElementById("trackingBtnText");
const latitudeSpan = document.getElementById("latitude");
const longitudeSpan = document.getElementById("longitude");
const accuracySpan = document.getElementById("accuracy");
const accuracyBadge = document.getElementById("accuracyBadge");
const locationStatus = document.getElementById("locationStatus");
const statusMessage = document.getElementById("statusMessage");

const typeCards = document.querySelectorAll(".type-card");
const vehiclesTableBody = document.getElementById("vehiclesTableBody");
const selectedVehicleType = document.getElementById("selectedVehicleType");

const dispatchBtn = document.getElementById("dispatchBtn");

const successResult = document.getElementById("successResult");
const errorResult = document.getElementById("errorResult");
const errorMessage = document.getElementById("errorMessage");

// ============================================
// HELPER FUNCTIONS
// ============================================

// Convert decimal hours to Hours and Minutes string
function formatTimeHoursMinutes(decimalHours) {
  let totalMinutes = Math.round(decimalHours * 60);
  
  // Ensure minimum 3 minutes for very close vehicles
  if (totalMinutes < 3 && decimalHours > 0) {
    totalMinutes = 3;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
}

// Calculate realistic response time based on distance
// Speed: 4-6 km/h (realistic city traffic - 10-15 minutes per km)
function calculateResponseTime(distance) {
  // Speed between 4-6 km/h (10-15 minutes per km)
  let speed;
  
  if (distance < 1) {
    speed = 4 + Math.random() * 2; // 4-6 km/h
  } else if (distance < 2) {
    speed = 4.5 + Math.random() * 2; // 4.5-6.5 km/h
  } else if (distance < 3) {
    speed = 5 + Math.random() * 2; // 5-7 km/h
  } else if (distance < 4) {
    speed = 5.5 + Math.random() * 2; // 5.5-7.5 km/h
  } else {
    speed = 6 + Math.random() * 2; // 6-8 km/h
  }
  
  let hours = distance / speed;
  
  // Ensure minimum 3 minutes for very close vehicles
  if (hours < 0.05) {
    hours = 0.05; // 3 minutes minimum
  }
  
  // Maximum 3 hours
  if (hours > 3) {
    hours = 3;
  }
  
  return parseFloat(hours.toFixed(2));
}

// Calculate distance in KM (Haversine formula)
function calculateDistanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate realistic distance UNDER 5km (between 0.5km and 4.9km)
function getDistanceUnder5km(vehicleId) {
  const distanceMap = {
    // Ambulances
    'A-101': 1.2,
    'A-102': 2.5,
    'A-103': 3.8,
    'A-104': 4.2,
    // Fire Trucks
    'F-201': 0.8,
    'F-202': 1.9,
    'F-203': 3.1,
    // Police Cars
    'P-301': 4.5,
    'P-302': 0.6,
    'P-303': 1.5,
    'P-304': 2.8,
    'P-305': 3.9,
  };
  
  return distanceMap[vehicleId] || 2.5;
}

// Update statistics counters
function updateStats() {
  ["ambulance", "fire", "police"].forEach((type) => {
    const vehicles = vehicleDatabase[type];
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
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
  locationStatus.classList.remove("hidden");
  locationStatus.className = `status-message ${type}`;

  setTimeout(() => {
    if (!locationStatus.classList.contains("hidden")) {
      locationStatus.classList.add("hidden");
    }
  }, 3000);
}

// ============================================
// LOCATION TRACKING
// ============================================

trackingBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Geolocation not supported", "error");
    return;
  }

  if (trackingActive) {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    trackingActive = false;
    trackingBtnText.textContent = "Start Live Tracking";
    trackingBtn.classList.remove("stop");
    document.getElementById("trackingStatus").textContent = "Inactive";
    document.getElementById("trackingAccuracy").textContent = "—";
    showStatus("Location tracking stopped", "info");
    return;
  }

  trackingBtnText.innerHTML = '<span class="loading-spinner"></span> Getting location...';
  trackingBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      latitudeSpan.textContent = currentLocation.lat.toFixed(6);
      longitudeSpan.textContent = currentLocation.lng.toFixed(6);
      accuracySpan.textContent = Math.round(currentLocation.accuracy) + " meters";

      if (currentLocation.accuracy < 20) {
        accuracyBadge.textContent = "High";
        accuracyBadge.className = "accuracy-badge high";
      } else if (currentLocation.accuracy < 50) {
        accuracyBadge.textContent = "Medium";
        accuracyBadge.className = "accuracy-badge medium";
      } else {
        accuracyBadge.textContent = "Low";
        accuracyBadge.className = "accuracy-badge low";
      }

      trackingActive = true;
      trackingBtnText.textContent = "Stop Tracking";
      trackingBtn.classList.add("stop");
      document.getElementById("trackingStatus").textContent = "Active";
      document.getElementById("trackingAccuracy").textContent = accuracyBadge.textContent;

      showStatus(`Location detected! ${Math.round(currentLocation.accuracy)}m accuracy`, "success");

      showVehicles(selectedType);

      trackingBtn.disabled = false;
    },
    (error) => {
      let message = "Location error";
      if (error.code === 1) message = "Please allow location access";
      if (error.code === 2) message = "Location unavailable";
      if (error.code === 3) message = "Request timed out";

      showStatus(message, "error");
      trackingActive = false;
      trackingBtnText.textContent = "Start Live Tracking";
      trackingBtn.classList.remove("stop");
      trackingBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

// ============================================
// VEHICLE TYPE SELECTION
// ============================================

typeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const type = card.dataset.type;
    selectType(type);
  });
});

function selectType(type) {
  typeCards.forEach((card) => card.classList.remove("selected"));
  document.querySelector(`.type-card[data-type="${type}"]`).classList.add("selected");

  selectedType = type;
  selectedVehicle = null;
  dispatchBtn.disabled = true;

  showVehicles(type);
}

// ============================================
// DISPLAY VEHICLES - ALL DISTANCES UNDER 5km
// ============================================

function showVehicles(type) {
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

  currentVehiclesList = vehicles.map((vehicle) => {
    let distance = getDistanceUnder5km(vehicle.id);
    distance = parseFloat(distance.toFixed(1));
    
    // Calculate realistic response time
    const responseHours = calculateResponseTime(distance);
    const formattedTime = formatTimeHoursMinutes(responseHours);

    return {
      ...vehicle,
      distance: distance,
      responseHours: responseHours,
      formattedTime: formattedTime,
    };
  });

  currentVehiclesList.sort((a, b) => a.distance - b.distance);

  // Generate table rows - fixed vehicle name display
  vehiclesTableBody.innerHTML = currentVehiclesList
    .map(
      (vehicle) => `
        <tr onclick="window.selectVehicleById('${vehicle.id}')" 
            ${selectedVehicle?.id === vehicle.id ? 'class="selected"' : ""}>
          <td><span class="vehicle-id">${vehicle.id}</span></td>
          <td>
            <span class="status-badge ${vehicle.status === "available" ? "status-available" : "status-busy"}">
              ${vehicle.status === "available" ? "AVAILABLE" : "BUSY"}
            </span>
          </td>
          <td><span class="distance-value">${vehicle.distance.toFixed(1)} km</span></td>
          <td>
            ${vehicle.status === "available"
              ? `<span class="time-value">${vehicle.formattedTime}</span>`
              : '<span style="color: #94a3b8;">—</span>'}
          </td>
          <td>${vehicle.name}</td>
        </tr>
      `
    )
    .join("");

  const typeNames = { ambulance: "Ambulance", fire: "Fire Truck", police: "Police Car" };
  selectedVehicleType.textContent = typeNames[type];
}

// ============================================
// SELECT VEHICLE
// ============================================

window.selectVehicleById = function (vehicleId) {
  if (!currentLocation) {
    showStatus("Please start location tracking first", "error");
    return;
  }

  const vehicle = currentVehiclesList.find((v) => v.id === vehicleId);

  if (!vehicle) {
    showStatus("Vehicle not found", "error");
    return;
  }

  if (vehicle.status === "available") {
    selectedVehicle = vehicle;
    dispatchBtn.disabled = false;
    showStatus(
      `${vehicle.id} selected - ${vehicle.distance.toFixed(1)} km away (${vehicle.formattedTime} ETA)`,
      "success"
    );
  } else {
    selectedVehicle = null;
    dispatchBtn.disabled = true;
    showStatus(`${vehicle.id} is currently busy`, "error");
  }

  // Highlight selected row
  document.querySelectorAll("#vehiclesTableBody tr").forEach((row) => {
    row.classList.remove("selected");
    if (row.innerHTML.includes(vehicleId)) {
      row.classList.add("selected");
    }
  });
};

// ============================================
// DISPATCH VEHICLE
// ============================================

dispatchBtn.addEventListener("click", () => {
  if (!selectedVehicle) return;
  if (!currentLocation) {
    showStatus("Please start location tracking first", "error");
    return;
  }

  successResult.classList.add("hidden");
  errorResult.classList.add("hidden");

  const originalText = dispatchBtn.innerHTML;
  dispatchBtn.innerHTML = '<span class="loading-spinner"></span> Dispatching...';
  dispatchBtn.disabled = true;

  setTimeout(() => {
    const distance = selectedVehicle.distance;
    const formattedTime = selectedVehicle.formattedTime;

    if (Math.random() < 0.95) {
      document.getElementById("resultVehicle").textContent = selectedVehicle.id;
      document.getElementById("resultDistance").textContent = distance.toFixed(1);
      document.getElementById("resultTime").textContent = formattedTime;

      successResult.classList.remove("hidden");

      const originalVehicle = vehicleDatabase[selectedType].find(
        (v) => v.id === selectedVehicle.id
      );
      if (originalVehicle) {
        originalVehicle.status = "busy";
      }

      updateStats();
      showVehicles(selectedType);

      showStatus(`${selectedVehicle.id} dispatched! ${distance.toFixed(1)} km, ETA: ${formattedTime}`, "success");
    } else {
      errorMessage.textContent = "Dispatch failed. Please try again.";
      errorResult.classList.remove("hidden");
      showStatus("Dispatch failed", "error");
    }

    dispatchBtn.innerHTML = originalText;
    dispatchBtn.disabled = true;
    selectedVehicle = null;

    document.querySelectorAll("#vehiclesTableBody tr").forEach((row) => {
      row.classList.remove("selected");
    });
  }, 1500);
});

// ============================================
// INITIALIZE
// ============================================

updateStats();
vehiclesTableBody.innerHTML = `
  <tr>
    <td colspan="5" style="text-align: center; padding: 40px;">
      📍 Click "Start Live Tracking" to see vehicles near you
    </td>
  </tr>
`;
document.querySelector('.type-card[data-type="ambulance"]').classList.add("selected");
selectedVehicleType.textContent = "Ambulance";

window.addEventListener("beforeunload", () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
});