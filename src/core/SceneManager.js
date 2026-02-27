import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * SceneManager — Creates and manages the Three.js scene, camera, renderer.
 * Also handles OrbitControls for desktop viewing and window resize.
 */
export class SceneManager {
    constructor() {
        // Scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0xfafefa)

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        )
        this.camera.position.set(0, 10, 8)
        this.camera.lookAt(0, 0, 0)

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.xr.enabled = true
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.0
        document.body.appendChild(this.renderer.domElement)

        // Lights — area light for general illumination
        const areaLight = new THREE.RectAreaLight(0xffffff, 1)
        areaLight.position.set(0, 5, 0)
        areaLight.width = 10
        areaLight.height = 10
        this.scene.add(areaLight)

        // OrbitControls (desktop only) — free rotation around the house at origin
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.target.set(0, 0, 0)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05
        this.controls.enablePan = false         // Keep the house centered
        this.controls.minPolarAngle = 0         // Allow looking from top
        this.controls.maxPolarAngle = Math.PI   // Allow looking from bottom
        this.controls.update()

        // Handle resize
        window.addEventListener('resize', () => this._onResize())
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    /**
     * Update controls — call each frame.
     * Disables OrbitControls during XR sessions.
     */
    update() {
        if (!this.renderer.xr.isPresenting) {
            this.controls.update()
        }
    }
}
