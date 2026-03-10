export function createModelLoaderController(options) {
  const {
    THREE,
    loader,
    baseModelOptions,
    mirroredPartKeys,
    formatStructureName,
    getModelLabel,
    getCurrentLang,
    getActiveRequestId,
    setPlaceholder,
    tf,
    loadingListElement,
  } = options;

  function isStaleRequest(requestId) {
    return requestId !== getActiveRequestId();
  }

  function loadScene(path, requestId, onProgress) {
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          if (isStaleRequest(requestId)) return;
          resolve(gltf);
        },
        onProgress,
        (error) => {
          if (isStaleRequest(requestId)) return;
          reject(error);
        }
      );
    });
  }

  function prepareMirroredMeshMaterials(root) {
    root.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (Array.isArray(child.material)) {
        child.material = child.material.map((mat) => {
          const m = mat.clone();
          m.side = THREE.DoubleSide;
          return m;
        });
        return;
      }
      const cloned = child.material.clone();
      cloned.side = THREE.DoubleSide;
      child.material = cloned;
    });
  }

  function isLikelyBilateralModel(root) {
    if (!root) return false;

    let hasLeftName = false;
    let hasRightName = false;
    root.traverse((child) => {
      if (!child.isMesh) return;
      const name = String(child.name || '').toLowerCase();
      if (!hasLeftName && /\bleft\b|_l\b|\.l\b|\bl\b|שמאל/.test(name)) hasLeftName = true;
      if (!hasRightName && /\bright\b|_r\b|\.r\b|\br\b|ימין/.test(name)) hasRightName = true;
    });
    if (hasLeftName && hasRightName) return true;

    // Fallback heuristic: if the source already spans both X sides, avoid mirroring it again.
    const box = new THREE.Box3().setFromObject(root);
    const spanX = Math.abs(box.max.x - box.min.x);
    if (!Number.isFinite(spanX) || spanX < 1e-6) return false;
    const crossesMidline = box.min.x < -0.01 && box.max.x > 0.01;
    return crossesMidline;
  }

  function normalizeAndCenterModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.0 / maxDim;
    model.scale.setScalar(scale);
    box.setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
  }

  function getBoxSizeAndCenter(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box, size, center };
  }

  function applyTransformRule(partRoot, rule, refCenter, refSize) {
    if (!partRoot || !rule) return;

    const partBox = new THREE.Box3().setFromObject(partRoot);
    const partSize = new THREE.Vector3();
    const partCenter = new THREE.Vector3();
    partBox.getSize(partSize);
    partBox.getCenter(partCenter);

    const axis = rule.fitAxis || 'y';
    const sourceDim = Math.max(partSize[axis] || 1, 1e-6);
    const targetDim = Math.max((refSize[axis] || 1) * (rule.sizeRatio || 0.1), 1e-6);
    const uniformScale = targetDim / sourceDim;
    partRoot.scale.multiplyScalar(uniformScale);

    const scaledBox = new THREE.Box3().setFromObject(partRoot);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    const targetCenter = new THREE.Vector3(
      refCenter.x + refSize.x * (rule.offset?.x || 0),
      refCenter.y + refSize.y * (rule.offset?.y || 0),
      refCenter.z + refSize.z * (rule.offset?.z || 0)
    );

    partRoot.position.add(targetCenter.sub(scaledCenter));

    if (rule.rotation) {
      partRoot.rotation.set(
        THREE.MathUtils.degToRad(rule.rotation.x || 0),
        THREE.MathUtils.degToRad(rule.rotation.y || 0),
        THREE.MathUtils.degToRad(rule.rotation.z || 0)
      );
      const rotatedBox = new THREE.Box3().setFromObject(partRoot);
      const rotatedCenter = new THREE.Vector3();
      rotatedBox.getCenter(rotatedCenter);
      const correction = new THREE.Vector3(
        refCenter.x + refSize.x * (rule.offset?.x || 0),
        refCenter.y + refSize.y * (rule.offset?.y || 0),
        refCenter.z + refSize.z * (rule.offset?.z || 0)
      ).sub(rotatedCenter);
      partRoot.position.add(correction);
    }
  }

  function applyCompositeAnatomicalPlacement(selected, partRootsByKey, group) {
    if (!selected?.parts?.includes('overview-skeleton')) return;
    if (!partRootsByKey['heart-human-organ3d'] && !partRootsByKey['lungs-human-organ3d'] && !partRootsByKey['kidneys-human-organ3d']) return;

    const refObject = partRootsByKey['overview-skeleton'] || group;
    const { size: refSize, center: refCenter } = getBoxSizeAndCenter(refObject);

    const rules = {
      'heart-human-organ3d': {
        fitAxis: 'y',
        sizeRatio: 0.09,
        offset: { x: 0.02, y: 0.24, z: 0.09 },
        rotation: { x: 0, y: 180, z: 0 },
      },
      'lungs-human-organ3d': {
        fitAxis: 'y',
        sizeRatio: 0.22,
        offset: { x: 0.02, y: 0.24, z: 0.08 },
        rotation: { x: 0, y: 180, z: 0 },
      },
      'kidneys-human-organ3d': {
        fitAxis: 'y',
        sizeRatio: 0.10,
        offset: { x: 0.0, y: 0.02, z: 0.03 },
        rotation: { x: 0, y: 180, z: 0 },
      },
    };

    Object.entries(rules).forEach(([partKey, rule]) => {
      const partRoot = partRootsByKey[partKey];
      if (!partRoot) return;
      applyTransformRule(partRoot, rule, refCenter, refSize);
    });

    // Correct major lateral drift when source assets carry non-anatomical local origins.
    const organKeys = ['heart-human-organ3d', 'lungs-human-organ3d', 'kidneys-human-organ3d'];
    const organGroup = new THREE.Group();
    let organCount = 0;
    organKeys.forEach((key) => {
      const root = partRootsByKey[key];
      if (!root) return;
      organGroup.add(root.clone());
      organCount += 1;
    });
    if (organCount > 0) {
      const organBox = new THREE.Box3().setFromObject(organGroup);
      const organCenter = new THREE.Vector3();
      organBox.getCenter(organCenter);
      const deltaX = (refCenter.x - organCenter.x) * 0.92;
      organKeys.forEach((key) => {
        const root = partRootsByKey[key];
        if (!root) return;
        root.position.x += deltaX;
      });
    }
  }

  async function loadCompositeModel(selected, requestId) {
    const group = new THREE.Group();
    const collectedAnimations = [];
    const partRootsByKey = {};
    const parts = selected.parts || [];
    let loadedCount = 0;

    for (const partKey of parts) {
      const part = baseModelOptions[partKey];
      if (!part) continue;

      const loaded = await loadScene(part.path, requestId, () => {});
      if (isStaleRequest(requestId)) return null;
      const scenePart = loaded.scene;
      if (Array.isArray(loaded.animations) && loaded.animations.length) {
        collectedAnimations.push(...loaded.animations);
      }

      const partRoot = new THREE.Group();
      partRoot.userData.partKey = partKey;
      scenePart.traverse((child) => {
        if (!child.isMesh) return;
        const meshName = formatStructureName(child.name);
        child.userData.partKey = partKey;
        child.userData.listName = `${getModelLabel(part)}: ${meshName}`;
      });

      partRoot.add(scenePart);

      if (mirroredPartKeys.has(partKey) && !isLikelyBilateralModel(scenePart)) {
        const mirroredPart = scenePart.clone(true);
        mirroredPart.scale.x = -1;
        prepareMirroredMeshMaterials(mirroredPart);
        mirroredPart.traverse((child) => {
          if (!child.isMesh) return;
          const meshName = formatStructureName(child.name);
          child.userData.listName = `${getModelLabel(part)} (${getCurrentLang() === 'he' ? 'משוקף' : 'mirrored'}): ${meshName}`;
        });
        partRoot.add(mirroredPart);
      }

      group.add(partRoot);
      partRootsByKey[partKey] = partRoot;
      loadedCount += 1;
      setPlaceholder(tf('loadingStep', loadedCount, parts.length));
    }

    applyCompositeAnatomicalPlacement(selected, partRootsByKey, group);

    normalizeAndCenterModel(group);
    return { root: group, animations: collectedAnimations };
  }

  async function loadSingleModel(selected, requestId, modelKey) {
    const loaded = await loadScene(selected.path, requestId, (xhr) => {
      const percent = xhr.total ? (xhr.loaded / xhr.total) * 100 : 0;
      const placeholder = loadingListElement.querySelector('.placeholder');
      if (placeholder) {
        placeholder.textContent = tf('loadingPercent', percent.toFixed(0));
      }
    });
    if (isStaleRequest(requestId)) return null;

    const model = loaded.scene;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.userData.listName = formatStructureName(child.name);
    });

    let rootModel = model;
    if (mirroredPartKeys.has(modelKey) && !isLikelyBilateralModel(model)) {
      const wrapper = new THREE.Group();
      wrapper.add(model);
      const mirrored = model.clone(true);
      mirrored.scale.x = -1;
      prepareMirroredMeshMaterials(mirrored);
      mirrored.traverse((child) => {
        if (!child.isMesh) return;
        const meshName = formatStructureName(child.name);
        child.userData.listName = `(mirrored) ${meshName}`;
      });
      wrapper.add(mirrored);
      rootModel = wrapper;
    }

    normalizeAndCenterModel(rootModel);
    return {
      root: rootModel,
      animations: Array.isArray(loaded.animations) ? loaded.animations : [],
    };
  }

  return {
    loadCompositeModel,
    loadSingleModel,
  };
}
