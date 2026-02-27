import * as THREE from 'three'

/**
 * HandTrackingSystem — Manages hand tracking indicators and events.
 * Shows visual spheres on fingertips and pinch detection.
 */
export class HandTrackingSystem {
    constructor(scene, hand1, hand2) {
        this.scene = scene
        this.hand1 = hand1
        this.hand2 = hand2

        this.PINCH_THRESHOLD = 0.04 // 4cm

        // ========== TRACKING INDICATORS ==========
        const indicatorGeometry = new THREE.SphereGeometry(0.015, 16, 16)

        this.leftIndicator = new THREE.Mesh(
            indicatorGeometry,
            new THREE.MeshBasicMaterial({ color: 0xff4444 })
        )
        this.rightIndicator = new THREE.Mesh(
            indicatorGeometry,
            new THREE.MeshBasicMaterial({ color: 0x4444ff })
        )
        this.leftIndicator.visible = false
        this.rightIndicator.visible = false
        this.scene.add(this.leftIndicator)
        this.scene.add(this.rightIndicator)

        // Pinch indicators
        const pinchGeom = new THREE.SphereGeometry(0.02, 16, 16)
        this.leftPinch = new THREE.Mesh(
            pinchGeom,
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
        )
        this.rightPinch = new THREE.Mesh(
            pinchGeom,
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
        )
        this.leftPinch.visible = false
        this.rightPinch.visible = false
        this.scene.add(this.leftPinch)
        this.scene.add(this.rightPinch)

        // ========== EVENTS ==========
        this.hand1.addEventListener('connected', () => {
            console.log('✅ Left hand connected')
        })
        this.hand1.addEventListener('disconnected', () => {
            this.leftIndicator.visible = false
            this.leftPinch.visible = false
        })
        this.hand2.addEventListener('connected', () => {
            console.log('✅ Right hand connected')
        })
        this.hand2.addEventListener('disconnected', () => {
            this.rightIndicator.visible = false
            this.rightPinch.visible = false
        })
    }

    /**
     * Update hand indicators each frame.
     */
    update() {
        this._updateHand(this.hand1, this.leftIndicator, this.leftPinch)
        this._updateHand(this.hand2, this.rightIndicator, this.rightPinch)
    }

    _updateHand(hand, fingerIndicator, pinchIndicator) {
        if (!hand.joints || !hand.joints['index-finger-tip']) {
            fingerIndicator.visible = false
            pinchIndicator.visible = false
            return
        }

        // Index fingertip indicator
        const indexTip = hand.joints['index-finger-tip']
        if (indexTip) {
            fingerIndicator.visible = true
            fingerIndicator.position.copy(indexTip.position)
        }

        // Pinch indicator between thumb and index
        const thumbTip = hand.joints['thumb-tip']
        if (indexTip && thumbTip) {
            const midpoint = new THREE.Vector3()
                .addVectors(indexTip.position, thumbTip.position)
                .multiplyScalar(0.5)

            pinchIndicator.position.copy(midpoint)
            const distance = indexTip.position.distanceTo(thumbTip.position)
            pinchIndicator.visible = true

            if (distance < this.PINCH_THRESHOLD) {
                pinchIndicator.material.color.setHex(0x00ff00)
                pinchIndicator.scale.setScalar(1.5)
            } else {
                pinchIndicator.material.color.setHex(0xffff00)
                pinchIndicator.scale.setScalar(1.0)
            }
        }
    }
}
