class Attractor {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color; // [r, g, b]
        this.phase = random(0, TWO_PI);
    }

    draw() {
        let transparency = (sin(frameCount * 0.02 + this.phase) + 1.0) / 2;
        transparency = map(transparency, 0, 1, 0.2, 1);
        fill(this.color[0] , this.color[1], this.color[2], transparency * 255);
        noStroke();        
        circle(this.x, this.y, this.radius * 2);
    }
}

class DeviceRepresentation {
    constructor(device, x, y) {
        this.device = device;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 15;
        
        // Flocking parameters
        this.maxSpeed = 2.0;
        this.maxForce = 0.15;
        this.attractionStrength = 0.08;
        this.separationDistance = 50;
        this.alignmentDistance = 60;
        this.cohesionDistance = 80;
        this.separationWeight = 1.8;
        this.alignmentWeight = 0.5;
        this.cohesionWeight = 0.6;
        
        // Determine which attractor this is attracted to
        this.attractedToLeft = false;
        this.previousTap = false; // Track previous tap state for edge detection
        this.updateAttraction();
    }

    updateAttraction() {
        const data = this.device.getSensorData();
        // dNW > dNE means attracted to left attractor
        // dNE > dNW means attracted to right attractor
        this.attractedToLeft = (data.dNW || 0) > (data.dNE || 0);
    }

    getColor() {
        return this.attractedToLeft ? [255, 0, 0] : [0, 0, 255]; // Red or Blue
    }

    // Flocking behavior: separation, alignment, cohesion
    flock(representations) {
        const separation = this.separate(representations);
        const alignment = this.align(representations);
        const cohesion = this.cohere(representations);

        // Apply forces
        this.applyForce(separation.x * this.separationWeight, separation.y * this.separationWeight);
        this.applyForce(alignment.x * this.alignmentWeight, alignment.y * this.alignmentWeight);
        this.applyForce(cohesion.x * this.cohesionWeight, cohesion.y * this.cohesionWeight);
    }

    separate(representations) {
        const steer = { x: 0, y: 0 };
        let count = 0;

        for (const rep of representations) {
            if (rep === this) continue;
            
            const dx = this.x - rep.x;
            const dy = this.y - rep.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.separationDistance) {
                const invDist = 1.0 / dist;
                steer.x += dx * invDist;
                steer.y += dy * invDist;
                count++;
            }
        }

        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
            const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (mag > 0) {
                steer.x = (steer.x / mag) * this.maxSpeed;
                steer.y = (steer.y / mag) * this.maxSpeed;
                steer.x -= this.vx;
                steer.y -= this.vy;
                this.limitForce(steer);
            }
        }

        return steer;
    }

    align(representations) {
        const steer = { x: 0, y: 0 };
        let count = 0;

        for (const rep of representations) {
            if (rep === this) continue;
            if (rep.attractedToLeft !== this.attractedToLeft) continue; // Only align with same color
            
            const dx = this.x - rep.x;
            const dy = this.y - rep.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.alignmentDistance) {
                steer.x += rep.vx;
                steer.y += rep.vy;
                count++;
            }
        }

        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
            const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (mag > 0) {
                steer.x = (steer.x / mag) * this.maxSpeed;
                steer.y = (steer.y / mag) * this.maxSpeed;
                steer.x -= this.vx;
                steer.y -= this.vy;
                this.limitForce(steer);
            }
        }

        return steer;
    }

    cohere(representations) {
        const steer = { x: 0, y: 0 };
        let count = 0;

        for (const rep of representations) {
            if (rep === this) continue;
            if (rep.attractedToLeft !== this.attractedToLeft) continue; // Only cohere with same color
            
            const dx = this.x - rep.x;
            const dy = this.y - rep.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.cohesionDistance) {
                steer.x += rep.x;
                steer.y += rep.y;
                count++;
            }
        }

        if (count > 0) {
            steer.x = (steer.x / count) - this.x;
            steer.y = (steer.y / count) - this.y;
            const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (mag > 0) {
                steer.x = (steer.x / mag) * this.maxSpeed;
                steer.y = (steer.y / mag) * this.maxSpeed;
                steer.x -= this.vx;
                steer.y -= this.vy;
                this.limitForce(steer);
            }
        }

        return steer;
    }

    // Attraction to the appropriate attractor
    attract(targetAttractor) {
        const dx = targetAttractor.x - this.x;
        const dy = targetAttractor.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const normalizedX = dx / dist;
            const normalizedY = dy / dist;
            
            // Apply attraction force
            const forceX = normalizedX * this.attractionStrength;
            const forceY = normalizedY * this.attractionStrength;
            
            this.applyForce(forceX, forceY);
        }
    }

    // Collision with attractor (bounce off)
    checkCollisionWithAttractor(attractor) {
        const dx = this.x - attractor.x;
        const dy = this.y - attractor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + attractor.radius;

        if (dist < minDist) {
            // Bounce off
            const normalizedX = dx / (dist || 1);
            const normalizedY = dy / (dist || 1);
            
            // Reflect velocity
            const dotProduct = this.vx * normalizedX + this.vy * normalizedY;
            this.vx -= 2 * dotProduct * normalizedX;
            this.vy -= 2 * dotProduct * normalizedY;
            
            // Push out of collision
            const overlap = minDist - dist;
            this.x += normalizedX * overlap;
            this.y += normalizedY * overlap;
            
            // Dampen velocity slightly
            this.vx *= 0.8;
            this.vy *= 0.8;
        }
    }

    applyForce(fx, fy) {
        this.vx += fx;
        this.vy += fy;
    }

    limitForce(force) {
        const mag = Math.sqrt(force.x * force.x + force.y * force.y);
        if (mag > this.maxForce) {
            force.x = (force.x / mag) * this.maxForce;
            force.y = (force.y / mag) * this.maxForce;
        }
    }

    update() {
        // Update velocity limits
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Boundary constraints
        const padding = this.radius;
        if (this.x < padding) {
            this.x = padding;
            this.vx *= -0.5;
        }
        if (this.x > width - padding) {
            this.x = width - padding;
            this.vx *= -0.5;
        }
        if (this.y < padding) {
            this.y = padding;
            this.vy *= -0.5;
        }
        if (this.y > height - padding) {
            this.y = height - padding;
            this.vy *= -0.5;
        }
    }

    draw() {
        const color = this.getColor();
        fill(color[0], color[1], color[2]);
        noStroke();
        circle(this.x, this.y, this.radius * 2);
    }
}

class MidiControllerScene extends Scene {
    constructor(deviceManager) {
        super(deviceManager);
        this.representations = new Map(); // deviceId -> DeviceRepresentation
        this.leftAttractor = null;
        this.rightAttractor = null;
        this.maxConnectionDistance = 150;
        this.beatVolume = 0; // Ranges from 0 to 127
        this.baseBeatVolumeIncrease = 15; // Base amount to increase when red device is tapped
        this.beatVolumeCoolDown = 0.3; // Amount to decrease each frame
        this.filterValue = 0; // Ranges from 0 to 127, based on average aZ of blue devices
        this.previousBeatVolume = 0; // Track previous value for MIDI change detection
        this.previousFilterValue = 0; // Track previous value for MIDI change detection
        this.beatVolumeCC = 1; // MIDI CC number for beatVolume (Modulation Wheel)
        this.filterValueCC = 2; // MIDI CC number for filterValue (Breath Controller)
    }

    setup() {
        // Create attractors at 1/4 and 3/4 width, vertically centered
        const leftX = width * 0.25;
        const rightX = width * 0.75;
        const centerY = height / 2;
        const rightAttractorRadius = 50; // Blue attractor starts at minimum size (when filterValue = 0)
        const leftAttractorRadius = 50; // Red attractor starts at minimum size (when beatVolume = 0)

        this.leftAttractor = new Attractor(leftX, centerY, leftAttractorRadius, [255, 50, 50]); // Red
        this.rightAttractor = new Attractor(rightX, centerY, rightAttractorRadius, [50, 50, 255]); // Blue
    }

    draw() {
        background(16);

        // Update attractor positions if canvas was resized
        if (this.leftAttractor && this.rightAttractor) {
            this.leftAttractor.x = width * 0.25;
            this.leftAttractor.y = height / 2;
            this.rightAttractor.x = width * 0.75;
            this.rightAttractor.y = height / 2;
        }

        // Get all devices and create/update representations
        const devices = Array.from(this.deviceManager.getAllDevices().values());
        const aliveIds = new Set();

        // First pass: update attractions and collect tap states
        const tapEvents = []; // Store tap events to process after counting red devices
        for (const device of devices) {
            const data = device.getSensorData();
            const id = data.id;
            aliveIds.add(id);

            let rep = this.representations.get(id);
            if (!rep) {
                // Create new representation at random position
                rep = new DeviceRepresentation(
                    device,
                    random(50, width - 50),
                    random(50, height - 50)
                );
                this.representations.set(id, rep);
            }

            // Update attraction based on current sensor data
            rep.updateAttraction();
            
            // Check for tap events (but process after counting red devices)
            const currentTap = data.tap || false;
            if (rep.attractedToLeft && currentTap && !rep.previousTap) {
                tapEvents.push(rep);
            }
            // Update previousTap for next frame
            rep.previousTap = currentTap;
        }
        
        // Count red devices (attracted to left attractor) after all attractions are updated
        const representations = Array.from(this.representations.values());
        const redDevicesCount = representations.filter(r => r.attractedToLeft).length;
        
        // Calculate dynamic beatVolumeIncrease based on number of red devices
        // More devices = smaller increase per tap
        // Formula: baseIncrease / redDevicesCount
        const dynamicBeatVolumeIncrease = redDevicesCount > 0 
            ? this.baseBeatVolumeIncrease / redDevicesCount 
            : this.baseBeatVolumeIncrease;
        
        // Process tap events with dynamic increase
        for (const rep of tapEvents) {
            // Tap detected on red device - increase beatVolume with dynamic amount
            this.beatVolume += dynamicBeatVolumeIncrease;
            this.beatVolume = constrain(this.beatVolume, 0, 127);
        }
        
        // Cool down beatVolume each frame
        this.beatVolume -= this.beatVolumeCoolDown;
        this.beatVolume = constrain(this.beatVolume, 0, 127);
        
        // Send MIDI control change if beatVolume changed
        if (Math.round(this.beatVolume) !== Math.round(this.previousBeatVolume)) {
            this.sendBeatVolumeMIDI();
            this.previousBeatVolume = this.beatVolume;
        }

        // Remove representations for devices that no longer exist
        for (const id of this.representations.keys()) {
            if (!aliveIds.has(id)) {
                this.representations.delete(id);
            }
        }

        // Recalculate representations after cleanup
        const allRepresentations = Array.from(this.representations.values());
        
        // Calculate filterValue based on average aZ of blue devices
        const blueReps = allRepresentations.filter(r => !r.attractedToLeft);
        
        if (blueReps.length > 0) {
            // Calculate average aZ value of blue devices
            let sumAZ = 0;
            for (const rep of blueReps) {
                const data = rep.device.getSensorData();
                sumAZ += data.az || 0;
            }
            const avgAZ = sumAZ / blueReps.length;
            
            // Map aZ from 0-255 to filterValue 127-0 (inverse relationship)
            // When aZ = 0, filterValue = 127
            // When aZ = 255, filterValue = 0
            this.filterValue = map(avgAZ, 0, 255, 127, 0);
            this.filterValue = constrain(this.filterValue, 0, 127);
        } else {
            // No blue devices, set filterValue to 0
            this.filterValue = 0;
        }
        
        // Send MIDI control change if filterValue changed
        if (Math.round(this.filterValue) !== Math.round(this.previousFilterValue)) {
            this.sendFilterValueMIDI();
            this.previousFilterValue = this.filterValue;
        }
        
        // Update red attractor size based on beatVolume
        // Size = 50 when beatVolume = 0, size = 150 when beatVolume = 127
        if (this.leftAttractor) {
            this.leftAttractor.radius = 50 + (this.beatVolume / 127) * 100;
        }
        
        // Update blue attractor size based on filterValue
        // Size = 50 when filterValue = 0, size = 150 when filterValue = 127
        if (this.rightAttractor) {
            this.rightAttractor.radius = 50 + (this.filterValue / 127) * 100;
        }

        // Apply flocking behavior
        for (const rep of allRepresentations) {
            rep.flock(allRepresentations);
        }

        // Apply attraction to appropriate attractor
        for (const rep of allRepresentations) {
            const targetAttractor = rep.attractedToLeft ? this.leftAttractor : this.rightAttractor;
            rep.attract(targetAttractor);
            rep.checkCollisionWithAttractor(targetAttractor);
        }

        // Update all representations
        for (const rep of allRepresentations) {
            rep.update();
        }

        // Draw mesh lines between representations of the same color
        this.drawMesh(allRepresentations);

        // Draw attractors
        if (this.leftAttractor) this.leftAttractor.draw();
        if (this.rightAttractor) this.rightAttractor.draw();

        // Draw representations
        for (const rep of allRepresentations) {
            rep.draw();
        }

        if (this.showDebugText) {
            this.drawDebugText();
        }
    }

    drawMesh(representations) {
        // Separate representations by color
        const redReps = representations.filter(r => r.attractedToLeft);
        const blueReps = representations.filter(r => !r.attractedToLeft);

        // Draw mesh for red representations
        this.drawMeshForGroup(redReps, [255, 0, 0]);
        
        // Draw mesh for blue representations
        this.drawMeshForGroup(blueReps, [0, 0, 255]);
    }

    drawMeshForGroup(group, color) {
        if (group.length < 2) return;

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const rep1 = group[i];
                const rep2 = group[j];
                
                const dx = rep2.x - rep1.x;
                const dy = rep2.y - rep1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.maxConnectionDistance) {
                    // Calculate transparency: close = fully opaque (255), far = fully transparent (0)
                    const alpha = map(dist, 0, this.maxConnectionDistance, 255, 0);
                    
                    stroke(color[0], color[1], color[2], alpha);
                    strokeWeight(5);
                    line(rep1.x, rep1.y, rep2.x, rep2.y);
                }
            }
        }
    }

    sendBeatVolumeMIDI() {
        // Send MIDI control change message for beatVolume
        if (window.grouploopOutput) {
            try {
                const value = Math.round(this.beatVolume);
                window.grouploopOutput.sendControlChange(this.beatVolumeCC, value, 1);
            } catch (error) {
                console.error('Error sending beatVolume MIDI:', error);
            }
        }
    }

    sendFilterValueMIDI() {
        // Send MIDI control change message for filterValue
        if (window.grouploopOutput) {
            try {
                const value = Math.round(this.filterValue);
                window.grouploopOutput.sendControlChange(this.filterValueCC, value, 1);
            } catch (error) {
                console.error('Error sending filterValue MIDI:', error);
            }
        }
    }

    drawDebugText() {
        blendMode(BLEND);
        fill(255);
        textAlign(LEFT, TOP);
        textSize(16);
        text(`Devices: ${this.representations.size}`, 10, 20);
        text('Flocking behavior with attractors based on dNW/dNE', 10, height - 30);
        text('Press D to toggle debug info', 10, height - 10);
    }
}
