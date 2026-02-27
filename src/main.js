import './style.css'
import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xfafefa)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 10, 8)
camera.lookAt(0, 0, 0)

// Renderer with WebXR enabled
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.xr.enabled = true
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.body.appendChild(renderer.domElement)

// ========== ORBIT CONTROLS (desktop only) ==========
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.update()

// Add VR button — request hand-tracking feature
document.body.appendChild(VRButton.createButton(renderer, {
  requiredFeatures: ['hand-tracking']
}))

// ========== LOAD THE HOUSE MODEL ==========
let houseModel = null
const loader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()

// Load the baked texture
const bakedTexture = textureLoader.load('/BakedTexture.png')
bakedTexture.flipY = false // GLB uses flipped UVs
bakedTexture.colorSpace = THREE.SRGBColorSpace

// Baked material — MeshBasicMaterial since lighting is already baked
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

loader.load(
  '/house.glb',
  (gltf) => {
    houseModel = gltf.scene
    houseModel.position.set(0, 0, 0)
    houseModel.scale.set(1, 1, 1)

    // Apply baked texture to all meshes
    houseModel.traverse((child) => {
      if (child.isMesh) {
        child.material = bakedMaterial
      }
    })

    scene.add(houseModel)
    console.log('✅ House model loaded with baked texture')
  },
  (progress) => {
    console.log('Loading house model...', (progress.loaded / progress.total * 100).toFixed(1) + '%')
  },
  (error) => {
    console.error('❌ Error loading house model:', error)
  }
)

// ========== LIGHTS ==========

const areaLight = new THREE.RectAreaLight(0xffffff, 1)
areaLight.position.set(0, 5, 0)
areaLight.width = 10
areaLight.height = 10
scene.add(areaLight)

// ========== GRID ==========
// const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
// gridHelper.position.y = 0
// scene.add(gridHelper)

// ========== HAND TRACKING SETUP ==========
const handModelFactory = new XRHandModelFactory()

// --- Hand 1 (left, index 0) ---
const hand1 = renderer.xr.getHand(0)
hand1.add(handModelFactory.createHandModel(hand1, 'mesh'))
scene.add(hand1)

// --- Hand 2 (right, index 1) ---
const hand2 = renderer.xr.getHand(1)
hand2.add(handModelFactory.createHandModel(hand2, 'mesh'))
scene.add(hand2)

// Also add controllers as fallback (for when controllers are used instead of hands)
const controller1 = renderer.xr.getController(0)
scene.add(controller1)
const controller2 = renderer.xr.getController(1)
scene.add(controller2)

// ========== TRACKING INDICATORS ==========
// Small spheres on index fingertips to show tracking is active
const indicatorGeometry = new THREE.SphereGeometry(0.015, 16, 16)
const indicatorMaterialLeft = new THREE.MeshBasicMaterial({ color: 0xff4444 })
const indicatorMaterialRight = new THREE.MeshBasicMaterial({ color: 0x4444ff })

const leftIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterialLeft)
const rightIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterialRight)
leftIndicator.visible = false
rightIndicator.visible = false
scene.add(leftIndicator)
scene.add(rightIndicator)

// Pinch indicators (between thumb and index)
const pinchIndicatorGeom = new THREE.SphereGeometry(0.02, 16, 16)
const pinchMaterialLeft = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
const pinchMaterialRight = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
const leftPinchIndicator = new THREE.Mesh(pinchIndicatorGeom, pinchMaterialLeft)
const rightPinchIndicator = new THREE.Mesh(pinchIndicatorGeom, pinchMaterialRight)
leftPinchIndicator.visible = false
rightPinchIndicator.visible = false
scene.add(leftPinchIndicator)
scene.add(rightPinchIndicator)

// ========== STATUS TEXT (floating text in the scene) ==========
// Create a floating status plane
const canvas = document.createElement('canvas')
canvas.width = 512
canvas.height = 128
const ctx = canvas.getContext('2d')
const statusTexture = new THREE.CanvasTexture(canvas)
const statusMaterial = new THREE.MeshBasicMaterial({ map: statusTexture, transparent: true })
const statusPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(0.6, 0.15),
  statusMaterial
)
statusPlane.position.set(0, 2.0, -1) // Above the cube
scene.add(statusPlane)

function updateStatusText(text, color = '#ffffff') {
  ctx.clearRect(0, 0, 512, 128)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.roundRect(0, 0, 512, 128, 16)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 36px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)
  statusTexture.needsUpdate = true
}

updateStatusText('Waiting for VR...', '#aaaaaa')



// ========== INTERACTION VARIABLES ==========
let isGrabbing = false
let previousHandPosition = new THREE.Vector3()
let activeHand = null
const PINCH_THRESHOLD = 0.04 // 4cm

// ========== HAND TRACKING EVENTS ==========
hand1.addEventListener('connected', (event) => {
  console.log('✅ Left hand connected!', event.data)
  updateStatusText('🖐️ Left Hand Tracked!', '#44ff44')
})

hand1.addEventListener('disconnected', () => {
  console.log('❌ Left hand disconnected')
  leftIndicator.visible = false
  leftPinchIndicator.visible = false
})

hand2.addEventListener('connected', (event) => {
  console.log('✅ Right hand connected!', event.data)
  updateStatusText('🖐️ Right Hand Tracked!', '#4444ff')
})

hand2.addEventListener('disconnected', () => {
  console.log('❌ Right hand disconnected')
  rightIndicator.visible = false
  rightPinchIndicator.visible = false
})

// Pinch events
hand1.addEventListener('pinchstart', () => {
  console.log('🤏 Left hand pinch start')
  if (!isGrabbing) {
    isGrabbing = true
    activeHand = hand1
    const wrist = hand1.joints['wrist']
    if (wrist) previousHandPosition.copy(wrist.position)
    updateStatusText('🤏 Grabbing! (Left)', '#ffff00')
    if (houseModel) {
      houseModel.traverse((child) => {
        if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x333300)
      })
    }
  }
})

hand1.addEventListener('pinchend', () => {
  console.log('✋ Left hand pinch end')
  if (activeHand === hand1) {
    isGrabbing = false
    activeHand = null
    updateStatusText('🖐️ Hands Tracked', '#44ff44')
    if (houseModel) {
      houseModel.traverse((child) => {
        if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x000000)
      })
    }
  }
})

hand2.addEventListener('pinchstart', () => {
  console.log('🤏 Right hand pinch start')
  if (!isGrabbing) {
    isGrabbing = true
    activeHand = hand2
    const wrist = hand2.joints['wrist']
    if (wrist) previousHandPosition.copy(wrist.position)
    updateStatusText('🤏 Grabbing! (Right)', '#ffff00')
    if (houseModel) {
      houseModel.traverse((child) => {
        if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x333300)
      })
    }
  }
})

hand2.addEventListener('pinchend', () => {
  console.log('✋ Right hand pinch end')
  if (activeHand === hand2) {
    isGrabbing = false
    activeHand = null
    updateStatusText('🖐️ Hands Tracked', '#44ff44')
    if (houseModel) {
      houseModel.traverse((child) => {
        if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x000000)
      })
    }
  }
})

// ========== HANDLE RESIZE ==========
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ========== ANIMATION LOOP ==========
function animate() {
  // Update OrbitControls only when NOT in XR
  if (!renderer.xr.isPresenting) {
    controls.update()
  }

  // Update tracking indicators
  updateHandIndicators(hand1, leftIndicator, leftPinchIndicator)
  updateHandIndicators(hand2, rightIndicator, rightPinchIndicator)

  // Handle grab rotation
  if (isGrabbing && activeHand && activeHand.joints) {
    const wrist = activeHand.joints['wrist']
    if (wrist) {
      const currentPos = wrist.position
      const delta = new THREE.Vector3().subVectors(currentPos, previousHandPosition)

      // Convert hand movement to house rotation
      if (houseModel) {
        houseModel.rotation.y += delta.x * 8
        houseModel.rotation.x -= delta.y * 8
      }

      previousHandPosition.copy(currentPos)
    }
  }

  renderer.render(scene, camera)
}

function updateHandIndicators(hand, fingerIndicator, pinchIndicator) {
  if (!hand.joints || !hand.joints['index-finger-tip']) {
    fingerIndicator.visible = false
    pinchIndicator.visible = false
    return
  }

  // Show indicator on index fingertip
  const indexTip = hand.joints['index-finger-tip']
  if (indexTip) {
    fingerIndicator.visible = true
    fingerIndicator.position.copy(indexTip.position)
  }

  // Show pinch indicator between thumb and index
  const thumbTip = hand.joints['thumb-tip']
  if (indexTip && thumbTip) {
    const midpoint = new THREE.Vector3()
      .addVectors(indexTip.position, thumbTip.position)
      .multiplyScalar(0.5)

    pinchIndicator.position.copy(midpoint)

    const distance = indexTip.position.distanceTo(thumbTip.position)
    pinchIndicator.visible = true

    // Change color based on pinch proximity
    if (distance < PINCH_THRESHOLD) {
      pinchIndicator.material.color.setHex(0x00ff00) // Green = pinching
      pinchIndicator.scale.setScalar(1.5)
    } else {
      pinchIndicator.material.color.setHex(0xffff00) // Yellow = not pinching
      pinchIndicator.scale.setScalar(1.0)
    }
  }
}

// Use WebXR animation loop
renderer.setAnimationLoop(animate)
