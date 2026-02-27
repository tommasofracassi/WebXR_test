import * as THREE from 'three'
import { TeleportMarker } from '../objects/TeleportMarker.js'
import { createTeleportRaycaster, isValidTeleportSurface, getControllerRay } from '../utils/raycastUtils.js'

/**
 * TeleportSystem — Full teleport locomotion for WebXR.
 * 
 * Features:
 * - Visible ray line from controllers
 * - Circular marker on valid floor surfaces
 * - Trigger-based teleport execution
 * - Fade to black transition for comfort (prevents motion sickness)
 */
export class TeleportSystem {
    constructor(scene, playerRig, camera, renderer) {
        this.scene = scene
        this.playerRig = playerRig
        this.camera = camera
        this.renderer = renderer

        // Teleport state
        this._isAiming = false
        this._hasValidTarget = false
        this._isTeleporting = false

        // Raycaster for floor detection
        this._raycaster = createTeleportRaycaster()

        // Teleport marker
        this._marker = new TeleportMarker(scene)

        // ========== RAY LINE ==========
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ])
        this._rayMaterial = new THREE.LineBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.6
        })
        this._rayLine = new THREE.Line(rayGeometry, this._rayMaterial)
        this._rayLine.visible = false
        // The ray line will be added to each controller when active

        // ========== FADE OVERLAY ==========
        // Full-screen black quad for fade transition
        this._fadeGeometry = new THREE.PlaneGeometry(2, 2)
        this._fadeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        })
        this._fadeQuad = new THREE.Mesh(this._fadeGeometry, this._fadeMaterial)
        this._fadeQuad.renderOrder = 9999
        this._fadeQuad.frustumCulled = false
        // We'll position it in front of the camera
        this._fadeQuad.position.set(0, 0, -0.3)
        this.camera.add(this._fadeQuad)

        // Fade animation state
        this._fadeAlpha = 0
        this._fadeDirection = 0 // 0=none, 1=fading out, -1=fading in
        this._teleportTarget = new THREE.Vector3()
        this._fadeDuration = 0.25 // seconds

        // Controllers to track
        this._controllers = []

        // Temporary vectors (reusable to avoid GC)
        this._tempMatrix = new THREE.Matrix4()
        this._tempVector = new THREE.Vector3()
        this._intersections = []
    }

    /**
     * Register a controller for teleport input.
     * @param {THREE.Object3D} controller - XR controller
     */
    addController(controller) {
        this._controllers.push(controller)

        // Create a ray line for this controller
        const ray = this._rayLine.clone()
        controller.add(ray)
        controller._teleportRay = ray
        ray.visible = false

        // Listen for select events (trigger press)
        controller.addEventListener('selectstart', () => {
            controller._isSelecting = true
        })
        controller.addEventListener('selectend', () => {
            controller._isSelecting = false
            // Execute teleport if we have a valid target
            if (this._hasValidTarget && !this._isTeleporting) {
                this._startTeleport()
            }
        })
    }

    /**
     * Start the teleport fade transition.
     */
    _startTeleport() {
        this._isTeleporting = true
        this._teleportTarget.copy(this._marker.getPosition())
        this._fadeDirection = 1 // Start fading out
        this._fadeAlpha = 0
    }

    /**
     * Execute the actual position change (called at peak of fade).
     */
    _executeTeleport() {
        // Calculate the offset:
        // We want the camera's world position to end up at the target.
        // Since the camera is inside the player rig, we need to account for 
        // the camera's local offset from the rig
        const cameraWorldPos = new THREE.Vector3()
        this.camera.getWorldPosition(cameraWorldPos)

        const rigWorldPos = new THREE.Vector3()
        this.playerRig.getWorldPosition(rigWorldPos)

        // The difference between camera and rig is the headset offset
        const offset = new THREE.Vector3().subVectors(cameraWorldPos, rigWorldPos)

        // Move the rig so the camera ends at the target
        // Keep the Y from the rig (don't change height, the headset tracking handles that)
        this.playerRig.position.x = this._teleportTarget.x - offset.x
        this.playerRig.position.z = this._teleportTarget.z - offset.z
        // Set Y to the floor height
        this.playerRig.position.y = this._teleportTarget.y
    }

    /**
     * Update each frame. Handles raycasting, marker, and fade animation.
     * @param {number} delta - Time delta in seconds
     * @param {Array<THREE.Object3D>} teleportMeshes - Meshes to raycast against
     */
    update(delta, teleportMeshes) {
        // ========== FADE ANIMATION ==========
        if (this._fadeDirection !== 0) {
            this._fadeAlpha += this._fadeDirection * (delta / this._fadeDuration)

            if (this._fadeDirection === 1 && this._fadeAlpha >= 1) {
                // Fully black — execute teleport and start fading in
                this._fadeAlpha = 1
                this._executeTeleport()
                this._fadeDirection = -1
            } else if (this._fadeDirection === -1 && this._fadeAlpha <= 0) {
                // Fully transparent — teleport complete
                this._fadeAlpha = 0
                this._fadeDirection = 0
                this._isTeleporting = false
            }

            this._fadeMaterial.opacity = Math.max(0, Math.min(1, this._fadeAlpha))
            return // Don't update raycasting during fade
        }

        // ========== CONTROLLER RAYCASTING ==========
        this._hasValidTarget = false

        if (!this.renderer.xr.isPresenting || !teleportMeshes.length) {
            this._marker.hide()
            this._controllers.forEach(c => {
                if (c._teleportRay) c._teleportRay.visible = false
            })
            return
        }

        for (const controller of this._controllers) {
            // Get controller world transform
            this._tempMatrix.identity().extractRotation(controller.matrixWorld)

            // Set raycaster from controller
            const ray = getControllerRay(controller)
            this._raycaster.set(ray.origin, ray.direction)

            // Perform raycast against teleport meshes
            const intersections = this._raycaster.intersectObjects(teleportMeshes, false)

            if (intersections.length > 0) {
                const hit = intersections[0]

                if (isValidTeleportSurface(hit)) {
                    // Valid floor hit — show marker
                    this._marker.show(hit.point, hit.face.normal)
                    this._hasValidTarget = true

                    // Update ray line to end at hit point
                    if (controller._teleportRay) {
                        controller._teleportRay.visible = true
                        // Scale ray to hit distance
                        const positions = controller._teleportRay.geometry.attributes.position
                        positions.setXYZ(1, 0, 0, -hit.distance)
                        positions.needsUpdate = true
                        // Color: valid (cyan)
                        controller._teleportRay.material.color.setHex(0x00ccff)
                    }
                } else {
                    // Invalid surface — show red ray, no marker
                    if (controller._teleportRay) {
                        controller._teleportRay.visible = true
                        const positions = controller._teleportRay.geometry.attributes.position
                        positions.setXYZ(1, 0, 0, -hit.distance)
                        positions.needsUpdate = true
                        controller._teleportRay.material.color.setHex(0xff4444)
                    }
                    this._marker.hide()
                }
            } else {
                // No hit — show default ray
                if (controller._teleportRay) {
                    controller._teleportRay.visible = true
                    const positions = controller._teleportRay.geometry.attributes.position
                    positions.setXYZ(1, 0, 0, -5)
                    positions.needsUpdate = true
                    controller._teleportRay.material.color.setHex(0x666666)
                }
                this._marker.hide()
            }
        }

        // Update marker animation
        this._marker.update(delta)
    }
}
