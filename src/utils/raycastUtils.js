import * as THREE from 'three'
import { LAYERS } from './layersConfig.js'

/**
 * Creates a raycaster configured for teleport floor detection.
 * Only checks objects on the TELEPORT layer.
 */
export function createTeleportRaycaster() {
    const raycaster = new THREE.Raycaster()
    raycaster.layers.set(LAYERS.TELEPORT)
    return raycaster
}

/**
 * Checks if a raycast intersection is a valid teleport surface.
 * Valid surfaces face upward (normal Y > 0.9 — roughly flat floors).
 * @param {THREE.Intersection} intersection
 * @returns {boolean}
 */
export function isValidTeleportSurface(intersection) {
    if (!intersection || !intersection.face) return false

    // Get world normal from the face
    const normal = intersection.face.normal.clone()
    const obj = intersection.object

    // Transform normal to world space
    normal.transformDirection(obj.matrixWorld)

    // Dot product with world up — must be mostly upward
    return normal.dot(new THREE.Vector3(0, 1, 0)) > 0.85
}

/**
 * Extracts ray origin and direction from a controller's world matrix.
 * @param {THREE.Object3D} controller
 * @returns {{ origin: THREE.Vector3, direction: THREE.Vector3 }}
 */
export function getControllerRay(controller) {
    const origin = new THREE.Vector3()
    const direction = new THREE.Vector3(0, 0, -1)

    controller.getWorldPosition(origin)
    controller.getWorldQuaternion(new THREE.Quaternion()).clone()

    // Direction is -Z in controller local space
    direction.applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion()))

    return { origin, direction }
}
