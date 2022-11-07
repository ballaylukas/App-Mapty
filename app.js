"use strict";

//////////// ELEMENTS ////////////
// CONTAINER
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
// INPUTS
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

//////////// CLASSES ////////////
// PARENT CLASS WORKOUT
class Workout {
  // PUBLIC FIELDS
  date = new Date();
  // Manually create unique ID
  id = (Date.now() + "").slice(-10);
  // // Clicks
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // SET WORKOUT DESCRIPTION
  _setDescription() {
    // prettier-ignore
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // CALCULATE CLICKS
  // click() {
  //   this.clicks++;
  // }
}

// CHILD CLASS RUNNING
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // CALCULATE PACE
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// CHILD CLASS CYCLING
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  // CALCULATE SPEED
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////// APPLICATION ARCHITECTURE ////////////
// APPLICATION CLASS
class App {
  // PRIVATE FIELDS
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // USER POSITION
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // EVENT LISTENERS
    // SUBMIT FORM
    form.addEventListener("submit", this._newWorkout.bind(this));

    // TOGGLE INPUT CADENCE / ELEVATION
    inputType.addEventListener("change", this._toggleElevationField);

    // MOVE TO POPUP
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  // GEOLOCATION
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  // LOADING MAP
  _loadMap(position) {
    // Get coordinates
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // Link from google maps
    console.log(`https://www.google.cz/maps/@${latitude},${longitude}`);

    // Create map (LEAFLET)
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel); // method setView(coordinates, zoom)

    // Map tiles layer (LEAFLET)
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Method "on" handling clicks on map (LEAFLET)
    this.#map.on("click", this._showForm.bind(this));

    // Render data
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  // SHOW FORM
  _showForm(mapE) {
    this.#mapEvent = mapE;

    // Show workout form and focus Input Distance
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // HIDE FORM
  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    // Hide workout form effect
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  // TOGGLE INPUT CADENCE / ELEVATION
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  // NEW WORKOUT
  _newWorkout(e) {
    // Prevent default behavior
    e.preventDefault();

    // Check functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // Get coordinates
    const { lat, lng } = this.#mapEvent.latlng;
    // Workout
    let workout;

    // If workout running => create running object
    if (type === "running") {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      // New workout
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling => create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");

      // New workout
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // RENDER WORKOUT MARKER ON MAP
  _renderWorkoutMarker(workout) {
    // Map marker (LEAFLET)
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  // RENDER WORKOUT
  _renderWorkout(workout) {
    // HTML
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === "running") {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }

    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  // MOVE TO POPUP
  _moveToPopup(e) {
    // Workout element
    const workoutEl = e.target.closest(".workout");

    // Guard clause
    if (!workoutEl) return;

    // Find by ID
    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );

    // Method (LEAFLET)
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // USING THE PUBLIC INTERFACE (just show problem with local Storage)
    // workout.click();
  }

  // SET LOCAL STORAGE TO ALL WORKOUTS
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // GET DATA FROM LOCAL STORAGE
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    // Guard clause
    if (!data) return;

    // Store data
    this.#workouts = data;

    // Render data
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  // RESET DATA FROM LOCAL STORAGE
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
