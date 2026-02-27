import * as THREE from 'three'

/**
 * TeleportMarker — Visual indicator showing where the user will teleport.
 * Displays a glowing ring on valid floor surfaces.
 */
export class TeleportMarker {
    constructor(scene) {
        this.scene = scene
        this.visible = false

        // Outer ring
        const ringGeometry = new THREE.RingGeometry(0.15, 0.2, 32)
        ringGeometry.rotateX(-Math.PI / 2) // Lay flat on the floor
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        })
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial)

        // Inner filled circle (subtle glow)
        const circleGeometry = new THREE.CircleGeometry(0.15, 32)
        circleGeometry.rotateX(-Math.PI / 2)
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        })
        this.circle = new THREE.Mesh(circleGeometry, circleMaterial)

        // Group them together
        this.marker = new THREE.Group()
        this.marker.add(this.ring)
        this.marker.add(this.circle)
        this.marker.visible = false
        this.scene.add(this.marker)

        // Animation state
        this._time = 0
    }

    /**
     * Show the marker at a specific position.
     * @param {THREE.Vector3} position - World position for the marker
     * @param {THREE.Vector3} normal - Surface normal to align the marker
     */
    show(position, normal) {
        this.marker.position.copy(position)
        // Offset slightly above surface to prevent z-fighting
        this.marker.position.y += 0.01

        this.marker.visible = true
        this.visible = true
    }

    /**
     * Hide the marker.
     */
    hide() {
        this.marker.visible = false
        this.visible = false
    }

    /**
     * Animate the marker (subtle pulse effect).
     * @param {number} delta - Time delta in seconds
     */
    update(delta) {
        if (!this.visible) return

        this._time += delta * 3
        const scale = 1.0 + Math.sin(this._time) * 0.1
        this.marker.scale.setScalar(scale)

        // Pulse opacity
        this.ring.material.opacity = 0.6 + Math.sin(this._time) * 0.2
    }

    /**
     * Get the current teleport target position.
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this.marker.position.clone()
    }
}
