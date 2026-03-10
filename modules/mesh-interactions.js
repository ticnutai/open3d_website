export function setMeshEmissive(mesh, colorHex) {
  if (!mesh || !mesh.material) return;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((mat) => {
    if (!mat || !('emissive' in mat) || !mat.emissive) return;
    if (!mat.userData._originalEmissive) {
      mat.userData._originalEmissive = mat.emissive.clone();
    }
    if (typeof colorHex === 'number') {
      mat.emissive.setHex(colorHex);
      return;
    }
    mat.emissive.copy(mat.userData._originalEmissive);
  });
}

export function applyXrayMaterialState(mesh, xrayEnabled, xrayOpacityValueNumber) {
  if (!mesh || !mesh.material) return;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((mat) => {
    if (!mat) return;
    if (!mat.userData._xrayOriginal) {
      mat.userData._xrayOriginal = {
        transparent: mat.transparent,
        opacity: mat.opacity,
        depthWrite: mat.depthWrite,
      };
    }
    if (xrayEnabled) {
      mat.transparent = true;
      mat.opacity = xrayOpacityValueNumber;
      mat.depthWrite = false;
      return;
    }
    const original = mat.userData._xrayOriginal;
    mat.transparent = original.transparent;
    mat.opacity = original.opacity;
    mat.depthWrite = original.depthWrite;
  });
}

export function updateMeshVisual(mesh, selectedMesh, hoveredMesh) {
  if (!mesh) return;
  if (mesh === selectedMesh) {
    setMeshEmissive(mesh, 0x2244aa);
    return;
  }
  if (mesh === hoveredMesh) {
    setMeshEmissive(mesh, 0x1f7a4a);
    return;
  }
  setMeshEmissive(mesh, null);
}

export function updateStructureRows(structureEntries, selectedMesh, hoveredMesh) {
  structureEntries.forEach((entry) => {
    entry.item.classList.toggle('selected', entry.mesh === selectedMesh);
    entry.item.classList.toggle('hovered', entry.mesh === hoveredMesh);
  });
}

export function applyXrayToMeshes(meshes, selectedMesh, hoveredMesh, xrayEnabled, xrayOpacityValueNumber) {
  meshes.forEach((mesh) => {
    applyXrayMaterialState(mesh, xrayEnabled, xrayOpacityValueNumber);
    updateMeshVisual(mesh, selectedMesh, hoveredMesh);
  });
}
