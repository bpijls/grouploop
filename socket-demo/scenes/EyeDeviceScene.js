class EyeDevice {
    constructor(deviceId, deviceManager, existingEyes = []) {
        this.id = deviceId;
        this.deviceManager = deviceManager;
        
        // 3D position for the eye
        this.position = this.findValidPosition(existingEyes);
        
        // Eye components
        this.eyeRadius = 40;
        this.irisRadius = 25;
        this.pupilRadius = 8;
        
        // Rotation angles calculated from accelerometer
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        
        // Smoothing for rotation changes
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.targetRotationZ = 0;
        this.rotationSpeed = 0.1;
    }
    
    findValidPosition(existingEyes) {
        const minDistance = 80; // Minimum distance between eyes
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const position = {
                x: random(-300, 300),
                y: random(-300, 300),
                z: random(-200, 200) // Different z-positions for depth
            };
            
            // Check if this position is far enough from existing eyes
            let validPosition = true;
            for (const eye of existingEyes) {
                const distance = dist(
                    position.x, position.y, position.z,
                    eye.position.x, eye.position.y, eye.position.z
                );
                if (distance < minDistance) {
                    validPosition = false;
                    break;
                }
            }
            
            if (validPosition) {
                return position;
            }
            
            attempts++;
        }
        
        // If we can't find a valid position, place it with a unique z-offset
        return {
            x: random(-300, 300),
            y: random(-300, 300),
            z: random(-200, 200) + existingEyes.length * 50 // Stagger z-positions
        };
    }
    
    update(sensorData) {
        // Convert accelerometer values from 0-255 range to -2g to +2g
        // Mapping: 0 = -2g, 255 = +2g
        const aX_g = ((sensorData.ax || 128) / 255.0) * 4.0 - 2.0;
        const aY_g = ((sensorData.ay || 128) / 255.0) * 4.0 - 2.0;
        const aZ_g = ((sensorData.az || 128) / 255.0) * 4.0 - 2.0;
        
        // Calculate rotation angles from accelerometer values using atan2
        // Using aX-aZ and aY-aZ as specified
        const deltaX = aX_g - aZ_g;
        const deltaY = aY_g - aZ_g;
        
        // Use atan2 to calculate proper angles
        this.targetRotationX = rotationX + deltaX;
        this.targetRotationY = rotationY + deltaY;
        //this.targetRotationZ = atan2(aX_g, aY_g);
        
        // Smooth the rotation changes
        this.rotationX = lerp(this.rotationX, this.targetRotationX, this.rotationSpeed);
        this.rotationY = lerp(this.rotationY, this.targetRotationY, this.rotationSpeed);
        //this.rotationZ = lerp(this.rotationZ, this.targetRotationZ, this.rotationSpeed);
    }
    
    draw() {
        push();
        
        // Move to eye position
        translate(this.position.x, this.position.y, this.position.z);
        
        // Apply rotations
        rotateX(this.rotationX);
        rotateY(this.rotationY);
        rotateZ(this.rotationZ);
        
        // Draw the white eye sphere (sclera)
        fill(255, 255, 255);
        noStroke();
        sphere(this.eyeRadius);
        
        // Draw the iris (flat sphere)
        push();
        translate(0, 0, this.eyeRadius *0.75); // Move slightly forward
        scale(1, 1, 0.45); // Flatten the iris
        fill(100, 150, 200); // Blue iris
        noStroke();
        sphere(this.irisRadius);
        pop();
        
        // Draw the pupil (smaller flat sphere)
        push();
        translate(0, 0, this.eyeRadius * 1); // Move even more forward
        scale(1, 1, 0.4); // Flatten the pupil
        fill(0, 0, 0); // Black pupil
        noStroke();
        sphere(this.pupilRadius);
        pop();
        
        pop();
    }
    
    getPosition() {
        return this.position;
    }
    
    getId() {
        return this.id;
    }
}

class EyeDeviceScene extends Scene {
    constructor(deviceManager) {
        super(deviceManager);
        this.eyeDevices = new Map();
        this.lightPosition = { x: 0, y: -200, z: 200 };
        this.backLightPosition = { x: 0, y: 0, z: -400 }; // Bright light behind the eyes
    }
    
    setup() {
        // Initialize eye devices for existing devices
        const devices = Array.from(this.deviceManager.getAllDevices().values());
        for (const device of devices) {
            const id = device.getSensorData().id;
            this.createEyeDevice(id);
        }
    }
    
    createEyeDevice(deviceId) {
        if (!this.eyeDevices.has(deviceId)) {
            // Get existing eye devices for collision detection
            const existingEyes = Array.from(this.eyeDevices.values());
            const eyeDevice = new EyeDevice(deviceId, this.deviceManager, existingEyes);
            this.eyeDevices.set(deviceId, eyeDevice);
        }
    }
    
    updateEyeDevices() {
        const devices = Array.from(this.deviceManager.getAllDevices().values());
        
        for (const device of devices) {
            const data = device.getSensorData();
            const id = data.id;
            
            // Create eye device if it doesn't exist
            if (!this.eyeDevices.has(id)) {
                this.createEyeDevice(id);
            }
            
            // Update the eye device
            const eyeDevice = this.eyeDevices.get(id);
            eyeDevice.update(data);
        }
        
        // Remove eye devices that are no longer present
        const currentIds = new Set(devices.map(dev => dev.getSensorData().id));
        for (const id of this.eyeDevices.keys()) {
            if (!currentIds.has(id)) {
                this.eyeDevices.delete(id);
            }
        }
    }
    
    draw() {
        // Clear the screen
        clear();
        orbitControl();
        background(20, 20, 40); // Dark blue background
        push();
        translate(width/2, height/2);

        // Update eye devices
        this.updateEyeDevices();
        
        // Set up lighting
        ambientLight(40, 40, 60); // Reduced ambient light
        pointLight(255, 255, 255, this.lightPosition.x, this.lightPosition.y, this.lightPosition.z);
        
        // Add bright back-light to illuminate edges
        pointLight(255, 255, 255, this.backLightPosition.x, this.backLightPosition.y, this.backLightPosition.z);
        
        // Draw all eye devices
        for (const eyeDevice of this.eyeDevices.values()) {
            eyeDevice.draw();
        }
        
        // Draw debug information if enabled
        if (this.showDebugText) {
            this.drawDebugText();
        }
        pop();
    }
    
    drawDebugText() {
        // Switch to 2D mode for text rendering
        camera();
        hint(DISABLE_DEPTH_TEST);
        
        fill(255);
        textAlign(LEFT, TOP);
        textSize(16);
        text(`Eye Devices: ${this.eyeDevices.size}`, 10, 10);
        text('Press D to toggle debug info', 10, height - 20);
        
        // Show accelerometer data for each device
        let y = 40;
        for (const eyeDevice of this.eyeDevices.values()) {
            const device = this.deviceManager.getDevice(eyeDevice.getId());
            if (device) {
                const data = device.getSensorData();
                const aX_g = ((data.ax || 128) / 255.0) * 4.0 - 2.0;
                const aY_g = ((data.ay || 128) / 255.0) * 4.0 - 2.0;
                const aZ_g = ((data.az || 128) / 255.0) * 4.0 - 2.0;
                
                text(`ID:${data.id} aX:${aX_g.toFixed(2)}g aY:${aY_g.toFixed(2)}g aZ:${aZ_g.toFixed(2)}g`, 10, y);
                y += 20;
                
                if (y > height - 40) break;
            }
        }
        
        hint(ENABLE_DEPTH_TEST);
    }
}
