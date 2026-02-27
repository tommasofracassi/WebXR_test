import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { LAYERS } from '../utils/layersConfig.js'

/**
 * HouseModel — Loads the house GLB model and applies the baked texture.
 * Identifies floor meshes and assigns them to the TELEPORT layer
 * so the TeleportSystem can raycast against them.
 */
export class HouseModel {
    constructor(scene) {
        this.scene = scene
        this.model = null
        this.floorMeshes = []

        this._loader = new GLTFLoader()
        this._textureLoader = new THREE.TextureLoader()
    }

    /**
     * Load the house model and baked texture.
     * @returns {Promise<THREE.Group>} The loaded model
     */
    load() {
        return new Promise((resolve, reject) => {
            // Load baked texture
            const bakedTexture = this._textureLoader.load('/BakedTexture.png')
            bakedTexture.flipY = false // GLB UVs are flipped
            bakedTexture.colorSpace = THREE.SRGBColorSpace

            const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

            this._loader.load(
                '/house.glb',
                (gltf) => {
                    this.model = gltf.scene
                    this.model.position.set(0, 0, 0)
                    this.model.scale.set(1, 1, 1)

                    // Apply baked material and detect floor meshes
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.material = bakedMaterial

                            // Identify floor surfaces:
                            // 1. By name convention (floor, pavimento, ground, plane)
                            // 2. Fallback: all meshes are set to teleport layer
                            const name = child.name.toLowerCase()
                            const isFloor = name.includes('floor') ||
                                name.includes('pavimento') ||
                                name.includes('ground') ||
                                name.includes('plane')

                            if (isFloor) {
                                child.layers.enable(LAYERS.TELEPORT)
                                this.floorMeshes.push(child)
                                console.log(`🏠 Floor mesh found: "${child.name}"`)
                            }
                        }
                    })

                    // If no named floor meshes found, enable teleport on ALL meshes
                    // (user can refine later by naming floor meshes in Blender)
                    if (this.floorMeshes.length === 0) {
                        console.log('⚠️ No floor meshes found by name, enabling teleport on all meshes')
                        this.model.traverse((child) => {
                            if (child.isMesh) {
                                child.layers.enable(LAYERS.TELEPORT)
                                this.floorMeshes.push(child)
                            }
                        })
                    }

                    this.scene.add(this.model)
                    console.log('✅ House model loaded with baked texture')
                    resolve(this.model)
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log(`Loading house: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
                    }
                },
                (error) => {
                    console.error('❌ Error loading house model:', error)
                    reject(error)
                }
            )
        })
    }
}
