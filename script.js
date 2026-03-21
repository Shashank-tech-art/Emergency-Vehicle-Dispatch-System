// ============================================
// EMERGENCY DISPATCH SYSTEM - PHASE 1
// Frontend with Mock Data
// ============================================

const vehicleDatabase = {
  ambulance: [
    {
      id: "A-101",
      lat: 40.7128,
      lng: -74.006,
      status: "available",
      name: "AMB-101",
    },
    {
      id: "A-102",
      lat: 40.7135,
      lng: -74.0075,
      status: "available",
      name: "AMB-102",
    },
    {
      id: "A-103",
      lat: 40.7105,
      lng: -74.004,
      status: "available",
      name: "AMB-103",
    },
    { id: "A-104", lat: 40.715, lng: -74.009, status: "busy", name: "AMB-104" },
  ],
  fire: [
    {
      id: "F-201",
      lat: 40.7115,
      lng: -74.005,
      status: "available",
      name: "FIR-201",
    },
    {
      id: "F-202",
      lat: 40.7145,
      lng: -74.0085,
      status: "available",
      name: "FIR-202",
    },
    {
      id: "F-203",
      lat: 40.7165,
      lng: -74.011,
      status: "busy",
      name: "FIR-203",
    },
  ],
  police: [
    {
      id: "P-301",
      lat: 40.712,
      lng: -74.0065,
      status: "busy",
      name: "POL-301",
    },
    {
      id: "P-302",
      lat: 40.714,
      lng: -74.008,
      status: "available",
      name: "POL-302",
    },
    {
      id: "P-303",
      lat: 40.71,
      lng: -74.0035,
      status: "available",
      name: "POL-303",
    },
    {
      id: "P-304",
      lat: 40.716,
      lng: -74.0105,
      status: "available",
      name: "POL-304",
    },
    { id: "P-305", lat: 40.718, lng: -74.013, status: "busy", name: "POL-305" },
  ],
};

// Current location (default - NYC)
let currentLocation = {
  lat: 40.7128,
  lng: -74.006,
  accuracy: 15,
};

let selectedType = "ambulance";
let selectedVehicle = null;
let watchId = null;
let trackingActive = false;

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
  let distance = R * c;

  // Ensure realistic distance between 0.1 and 5.0 km
  if (distance < 0.1) distance = 0.1;
  if (distance > 5.0) distance = 4.9;

  return parseFloat(distance.toFixed(1));
}

// Calculate response time in hours (0.1 to 3.0 hours)
// Speed varies based on distance to make times unique
function calculateResponseHours(distance) {
  // Different speeds for different distances to create variety
  let speed;

  if (distance < 1) {
    speed = 25 + Math.random() * 10; // 25-35 km/h for very close
  } else if (distance < 2) {
    speed = 30 + Math.random() * 15; // 30-45 km/h
  } else if (distance < 3) {
    speed = 35 + Math.random() * 15; // 35-50 km/h
  } else {
    speed = 40 + Math.random() * 20; // 40-60 km/h for longer distances
  }

  let hours = distance / speed;

  if (hours < 0.1) hours = 0.1;
  if (hours > 3.0) hours = 2.9;

  return hours.toFixed(1);
}

// Update statistics counters
function updateStats() {
  ["ambulance", "fire", "police"].forEach((type) => {
    const vehicles = vehicleDatabase[type];
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
    const busy = total - available;

    document.getElementById(`${type}Total`).textContent = total;
    document.getElementById(`${type}Available`).textContent =
      `${available} available`;
    document.getElementById(`${type}Busy`).textContent = `${busy} busy`;
    document.getElementById(`${type}TypeAvailable`).textContent =
      `${available} available`;
  });
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  locationStatus.classList.remove("hidden");
  locationStatus.className = `status-message ${type}`;

  setTimeout(() => {
    if (locationStatus.classList.contains("hidden") === false) {
      locationStatus.classList.add("hidden");
    }
  }, 3000);
}

// ============================================
// LOCATION TRACKING
// ============================================

trackingBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Geolocation not supported by your browser", "error");
    return;
  }

  if (trackingActive) {
    // Stop tracking
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    trackingActive = false;
    trackingBtnText.textContent = "Start Live Tracking";
    trackingBtn.classList.remove("stop");
    document.getElementById("trackingStatus").textContent = "Inactive";
    document.getElementById("trackingAccuracy").textContent = "—";
    showStatus("Location tracking stopped", "info");
    return;
  }

  // Start tracking
  trackingBtnText.innerHTML =
    '<span class="loading-spinner"></span> Starting...';

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      // Update display
      latitudeSpan.textContent = currentLocation.lat.toFixed(6);
      longitudeSpan.textContent = currentLocation.lng.toFixed(6);
      accuracySpan.textContent =
        Math.round(currentLocation.accuracy) + " meters";

      // Update accuracy badge
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
      document.getElementById("trackingAccuracy").textContent =
        accuracyBadge.textContent;

      showStatus("Live tracking active - location updating", "success");

      // Refresh vehicle list
      showVehicles(selectedType);
    },
    (error) => {
      let message = "Location error";
      if (error.code === 1) message = "Please allow location access";
      if (error.code === 2) message = "Location unavailable";
      if (error.code === 3) message = "Location request timed out";

      showStatus(message, "error");
      trackingActive = false;
      trackingBtnText.textContent = "Start Live Tracking";
      trackingBtn.classList.remove("stop");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
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
  document
    .querySelector(`.type-card[data-type="${type}"]`)
    .classList.add("selected");

  selectedType = type;
  selectedVehicle = null;
  dispatchBtn.disabled = true;

  showVehicles(type);
}

// ============================================
// DISPLAY VEHICLES - UNIQUE DISTANCES FOR EACH VEHICLE
// ============================================

function showVehicles(type) {
  const vehicles = vehicleDatabase[type];

  const vehiclesWithDetails = vehicles.map((vehicle) => {
    // Calculate distance - will be UNIQUE for each vehicle because coordinates are different
    const distance = calculateDistanceKM(
      currentLocation.lat,
      currentLocation.lng,
      vehicle.lat,
      vehicle.lng,
    );

    return {
      ...vehicle,
      distance: distance,
      responseHours: calculateResponseHours(distance),
    };
  });

  // Sort by distance (nearest first)
  vehiclesWithDetails.sort((a, b) => a.distance - b.distance);

  // Generate table rows with UNIQUE distances and times
  vehiclesTableBody.innerHTML = vehiclesWithDetails
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
            <td>
                <span class="distance-value">${vehicle.distance.toFixed(1)} km</span>
            </td>
            <td>
                ${
                  vehicle.status === "available"
                    ? `<span class="time-value">${vehicle.responseHours}</span><span class="time-unit">hours</span>`
                    : '<span style="color: #94a3b8;">—</span>'
                }
            </td>
            <td>${vehicle.name}</td>
        </tr>
    `,
    )
    .join("");

  // Update header
  const typeNames = {
    ambulance: "Ambulance",
    fire: "Fire Truck",
    police: "Police Car",
  };
  selectedVehicleType.textContent = typeNames[type];
}

// ============================================
// SELECT VEHICLE
// ============================================

window.selectVehicleById = function (vehicleId) {
  const vehicle = vehicleDatabase[selectedType].find((v) => v.id === vehicleId);

  if (vehicle.status === "available") {
    selectedVehicle = vehicle;
    dispatchBtn.disabled = false;

    // Show which vehicle was selected with its distance
    const distance = calculateDistanceKM(
      currentLocation.lat,
      currentLocation.lng,
      vehicle.lat,
      vehicle.lng,
    );
    showStatus(
      `${vehicle.id} selected - ${distance.toFixed(1)} km away`,
      "success",
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

  // Hide previous results
  successResult.classList.add("hidden");
  errorResult.classList.add("hidden");

  // Show loading state
  const originalText = dispatchBtn.innerHTML;
  dispatchBtn.innerHTML =
    '<span class="loading-spinner"></span> Dispatching...';
  dispatchBtn.disabled = true;

  setTimeout(() => {
    const distance = calculateDistanceKM(
      currentLocation.lat,
      currentLocation.lng,
      selectedVehicle.lat,
      selectedVehicle.lng,
    );
    const responseHours = calculateResponseHours(distance);

    // 95% success rate
    if (Math.random() < 0.95) {
      // Update result display
      document.getElementById("resultVehicle").textContent = selectedVehicle.id;
      document.getElementById("resultDistance").textContent =
        distance.toFixed(1);
      document.getElementById("resultTime").textContent = responseHours;

      successResult.classList.remove("hidden");

      // Mark vehicle as busy
      selectedVehicle.status = "busy";
      updateStats();

      // Refresh vehicle list
      showVehicles(selectedType);

      showStatus(
        `${selectedVehicle.id} dispatched successfully! ${distance.toFixed(1)} km, ${responseHours} hours ETA`,
        "success",
      );
    } else {
      errorMessage.textContent = "Dispatch failed. Please try again.";
      errorResult.classList.remove("hidden");
      showStatus("Dispatch failed", "error");
    }

    // Reset button
    dispatchBtn.innerHTML = originalText;
    dispatchBtn.disabled = true;
    selectedVehicle = null;

    // Remove selection highlight
    document.querySelectorAll("#vehiclesTableBody tr").forEach((row) => {
      row.classList.remove("selected");
    });
  }, 1500);
});

// ============================================
// INITIALIZE
// ============================================

updateStats();
showVehicles("ambulance");
document
  .querySelector('.type-card[data-type="ambulance"]')
  .classList.add("selected");

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
});
