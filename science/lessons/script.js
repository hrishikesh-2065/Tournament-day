document.addEventListener('DOMContentLoaded', () => {
    // --- Thermometry Logic ---

    const tempSlider = document.getElementById('temp-slider');
    const celsiusOutput = document.getElementById('celsius-output');
    const fahrenheitOutput = document.getElementById('fahrenheit-output');
    const kelvinOutput = document.getElementById('kelvin-output');
    const liquidLevel = document.getElementById('liquid-level');

    // Function to calculate and update all values
    function updateThermometry() {
        // Get the current Celsius value from the slider
        const C = parseFloat(tempSlider.value);
        celsiusOutput.textContent = `${C}°C`;

        // Calculate Fahrenheit (F = C * 9/5 + 32)
        const F = (C * 9 / 5) + 32;
        fahrenheitOutput.textContent = `${F.toFixed(1)}°F`;

        // Calculate Kelvin (K = C + 273.15)
        const K = C + 273.15;
        kelvinOutput.textContent = `${K.toFixed(2)} K`;

        // Update the visual liquid level
        // Normalize the C value (from -50 to 100) to a percentage (0% to 100%)
        // Range: 150 units. (-50 is 0, 100 is 150)
        const minTemp = -50;
        const maxTemp = 100;
        const normalizedValue = (C - minTemp) / (maxTemp - minTemp); // 0 to 1
        const heightPercent = normalizedValue * 100;

        // Clamp the height to be between 0% and 100%
        liquidLevel.style.height = `${Math.max(0, Math.min(100, heightPercent))}%`;
    }

    // Event listener for the slider
    tempSlider.addEventListener('input', updateThermometry);

    // Initialize with the default value
    updateThermometry();


    // --- Fiber Optics Logic ---

    const angleSlider = document.getElementById('angle-slider');
    const angleOutput = document.getElementById('angle-output');
    const lightBeam = document.getElementById('light-beam');
    const tirResult = document.getElementById('tir-result');

    // Refractive Indices (n1 > n2 for TIR)
    const n_core = 1.5;
    const n_cladding = 1.4;

    // Calculate Critical Angle (in degrees)
    // Critical Angle (θc) = arcsin(n2 / n1)
    const criticalAngleRad = Math.asin(n_cladding / n_core);
    const criticalAngleDeg = criticalAngleRad * (180 / Math.PI); // Convert to degrees

    // Function to update the TIR simulation
    function updateFiberOptics() {
        // Get the current incident angle from the slider
        const incidentAngleDeg = parseFloat(angleSlider.value);
        angleOutput.textContent = `${incidentAngleDeg}°`;

        // The angle we care about for TIR is the one inside the core, 
        // which should be measured from the NORMAL (the perpendicular line).
        // For simplicity in this visual, we use the angle from the fiber wall.
        // A smaller angle *from the normal* (meaning a beam closer to the wall)
        // is what causes TIR. Let's simplify the visual rotation:

        // Rotate the light beam element to simulate the incident angle
        // We invert the angle for the visual effect (e.g., 90 deg should be horizontal)
        const rotationAngle = 90 - incidentAngleDeg;
        lightBeam.style.transform = `rotate(${rotationAngle}deg)`;

        // Check for Total Internal Reflection (TIR)
        // TIR occurs when Incident Angle (from the Normal) > Critical Angle
        if (incidentAngleDeg > criticalAngleDeg) {
            tirResult.innerHTML = `**TIR OCCURS!** Light is reflected back into the core. Angle (${incidentAngleDeg}°) > Critical Angle (${criticalAngleDeg.toFixed(1)}°). This is how information travels!`;
            tirResult.style.color = '#008000'; // Green for success
            lightBeam.style.backgroundColor = '#ffcc00'; // Bright yellow
        } else {
            tirResult.innerHTML = `**NO TIR!** Light escapes the core. Angle (${incidentAngleDeg}°) < Critical Angle (${criticalAngleDeg.toFixed(1)}°). Information is lost!`;
            tirResult.style.color = '#cc0000'; // Red for failure
            lightBeam.style.backgroundColor = '#ff6347'; // Dimmer orange/red
        }
    }

    // Event listener for the angle slider
    angleSlider.addEventListener('input', updateFiberOptics);

    // Initialize with the default value
    updateFiberOptics();
});