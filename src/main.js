import './style.css'
import * as THREE from 'three'
import { SceneManager } from './core/SceneManager.js'
import { XRManager } from './core/XRManager.js'
import { HouseModel } from './objects/HouseModel.js'
import { TeleportSystem } from './systems/TeleportSystem.js'
import { HandTrackingSystem } from './systems/HandTrackingSystem.js'

/**
 * Main entry point — orchestrates all modules.
 */

// ========== INITIALIZE CORE ==========
const sceneManager = new SceneManager()
const { scene, camera, renderer } = sceneManager

// ========== INITIALIZE XR ==========
const xrManager = new XRManager(scene, camera, renderer)

// ========== LOAD HOUSE MODEL ==========
const houseModel = new HouseModel(scene)
houseModel.load().then(() => {
  console.log('🏠 House ready — floor meshes:', houseModel.floorMeshes.length)
})

// ========== INITIALIZE TELEPORT SYSTEM ==========
const teleportSystem = new TeleportSystem(
  scene,
  xrManager.playerRig,
  camera,
  renderer
)
// Register both controllers for teleport
teleportSystem.addController(xrManager.controller1)
teleportSystem.addController(xrManager.controller2)

// ========== INITIALIZE HAND TRACKING ==========
const handTracking = new HandTrackingSystem(
  scene,
  xrManager.hand1,
  xrManager.hand2
)

// ========== CLOCK FOR DELTA TIME ==========
const clock = new THREE.Clock()

// ========== ANIMATION LOOP ==========

function animate() {
  const delta = clock.getDelta()

  // Update scene (orbit controls on desktop)
  sceneManager.update()

  // Update teleport system (raycasting, marker, fade)
  teleportSystem.update(delta, houseModel.floorMeshes)

  // Update hand tracking indicators
  handTracking.update()

  // Render
  renderer.render(scene, camera)
}

// Use WebXR animation loop
renderer.setAnimationLoop(animate)
