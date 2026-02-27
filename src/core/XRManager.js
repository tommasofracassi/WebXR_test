import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'

/**
 * XRManager — Manages WebXR session, player rig, controllers and hands.
 * 
 * The player rig is a THREE.Group that contains the camera.
 * Teleportation moves the rig, not the camera directly.
 * This preserves the correct camera offset from the headset tracking.
 */
export class XRManager {
    constructor(scene, camera, renderer) {
        this.scene = scene
        this.camera = camera
        this.renderer = renderer

        // ========== PLAYER RIG ==========
        // The camera is added to the rig so teleport can move the rig
        this.playerRig = new THREE.Group()
        this.playerRig.add(this.camera)
        this.scene.add(this.playerRig)

        // ========== VR BUTTON ==========
        document.body.appendChild(VRButton.createButton(this.renderer, {
            optionalFeatures: ['hand-tracking']
        }))

        // ========== CONTROLLERS ==========
        this.controller1 = this.renderer.xr.getController(0)
        this.controller2 = this.renderer.xr.getController(1)
        this.playerRig.add(this.controller1)
        this.playerRig.add(this.controller2)

        // ========== HANDS ==========
        const handModelFactory = new XRHandModelFactory()

        this.hand1 = this.renderer.xr.getHand(0)
        this.hand1.add(handModelFactory.createHandModel(this.hand1, 'mesh'))
        this.playerRig.add(this.hand1)

        this.hand2 = this.renderer.xr.getHand(1)
        this.hand2.add(handModelFactory.createHandModel(this.hand2, 'mesh'))
        this.playerRig.add(this.hand2)

        // Controller grip models (visual representation)
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0)
        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1)
        this.playerRig.add(this.controllerGrip1)
        this.playerRig.add(this.controllerGrip2)
    }
}
