/*
 * script.js
 *
 * This module creates an interactive 3D viewer using three.js. It loads a
 * GLB file from the `models` directory and exposes controls for showing
 * or hiding the individual mesh components of the model. The names of the
 * meshes are used as labels in the sidebar. The viewer automatically
 * centers and scales the model to fit the scene. If you plan to use a
 * different model file, update the MODEL_PATH constant below accordingly.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/exporters/GLTFExporter.js';
import { BASE_MODEL_OPTIONS, MODEL_OPTIONS, I18N, MIRRORED_PART_KEYS } from './modules/config.js';
import {
  formatStructureName,
  classifyBodyPart,
} from './modules/anatomy-utils.js';
import { createDetailsDialogController } from './modules/details-dialog.js';
import { createModelLoaderController } from './modules/model-loader.js';
import { createUiControlsController } from './modules/ui-controls.js';
import { registerEventBindings } from './modules/event-bindings.js';
import {
  updateMeshVisual as updateMeshVisualState,
  updateStructureRows as updateStructureRowsState,
  applyXrayToMeshes,
} from './modules/mesh-interactions.js';
import {
  buildPersistedState,
  migrateAndNormalizeState,
  readPersistedState,
  writePersistedState,
} from './modules/state-storage.js';

// DOM elements
const containerEl = document.getElementById('viewer');
const appTitleEl = document.getElementById('appTitle');
const langToggleBtn = document.getElementById('langToggleBtn');
const modelPinBtn = document.getElementById('modelPinBtn');
const themeSettingsBtn = document.getElementById('themeSettingsBtn');
const structuresTitleEl = document.getElementById('structuresTitle');
const listEl = document.getElementById('structures');
const exportBtn = document.getElementById('exportGlbBtn');
const filterInput = document.getElementById('filterInput');
const advancedSearchModesEl = document.getElementById('advancedSearchModes');
const advancedSearchModeButtons = Array.from(document.querySelectorAll('#advancedSearchModes [data-search-mode]'));
const advancedSearchResultsEl = document.getElementById('advancedSearchResults');
const modelSelect = document.getElementById('modelSelect');
const openModelComposerBtn = document.getElementById('openModelComposerBtn');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');
const validateModelsBtn = document.getElementById('validateModelsBtn');
const auditFullSystemBtn = document.getElementById('auditFullSystemBtn');
const modelClipBadge = document.getElementById('modelClipBadge');
const pickedPartEl = document.getElementById('pickedPart');
const hoverPartEl = document.getElementById('hoverPart');
const openDetailsBtn = document.getElementById('openDetailsBtn');
const partDetailsDialog = document.getElementById('partDetailsDialog');
const partDetailsTitle = document.getElementById('partDetailsTitle');
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
const tabPanelInfo = document.getElementById('tabPanelInfo');
const tabPanelAnimations = document.getElementById('tabPanelAnimations');
const tabPanelImages = document.getElementById('tabPanelImages');
const tabPanelVideos = document.getElementById('tabPanelVideos');
const openXyzFromDetailsBtn = document.getElementById('openXyzFromDetailsBtn');
const openXyzLockFromDetailsBtn = document.getElementById('openXyzLockFromDetailsBtn');
const openXyzUnlockFromDetailsBtn = document.getElementById('openXyzUnlockFromDetailsBtn');
const xrayToggle = document.getElementById('xrayToggle');
const xrayLabelText = document.getElementById('xrayLabelText');
const proToolsTitle = document.getElementById('proToolsTitle');
const proPresetLabel = document.getElementById('proPresetLabel');
const proPresetSelect = document.getElementById('proPresetSelect');
const applyProPresetBtn = document.getElementById('applyProPresetBtn');
const realisticModeToggle = document.getElementById('realisticModeToggle');
const realisticModeLabel = document.getElementById('realisticModeLabel');
const humanScaleToggle = document.getElementById('humanScaleToggle');
const humanScaleLabel = document.getElementById('humanScaleLabel');
const activityAnimLabel = document.getElementById('activityAnimLabel');
const activityAnimSelect = document.getElementById('activityAnimSelect');
const activitySpeedLabel = document.getElementById('activitySpeedLabel');
const activitySpeed = document.getElementById('activitySpeed');
const activitySpeedValue = document.getElementById('activitySpeedValue');
const activityPlayBtn = document.getElementById('activityPlayBtn');
const activityPauseBtn = document.getElementById('activityPauseBtn');
const activityResetBtn = document.getElementById('activityResetBtn');
const timelineStartBtn = document.getElementById('timelineStartBtn');
const timelineStopBtn = document.getElementById('timelineStopBtn');
const timelineStatus = document.getElementById('timelineStatus');
const systemDemoLabel = document.getElementById('systemDemoLabel');
const systemDemoSelect = document.getElementById('systemDemoSelect');
const systemDemoStartBtn = document.getElementById('systemDemoStartBtn');
const systemDemoStopBtn = document.getElementById('systemDemoStopBtn');
const systemDemoStatus = document.getElementById('systemDemoStatus');
const performanceModeLabel = document.getElementById('performanceModeLabel');
const performanceModeSelect = document.getElementById('performanceModeSelect');
const adaptiveQualityToggle = document.getElementById('adaptiveQualityToggle');
const adaptiveQualityLabel = document.getElementById('adaptiveQualityLabel');
const performanceStatus = document.getElementById('performanceStatus');
const xrayOpacity = document.getElementById('xrayOpacity');
const xrayOpacityValue = document.getElementById('xrayOpacityValue');
const partAnalysisSelect = document.getElementById('partAnalysisSelect');
const analyzePartBtn = document.getElementById('analyzePartBtn');
const isolatePartBtn = document.getElementById('isolatePartBtn');
const resetIsolationBtn = document.getElementById('resetIsolationBtn');
const layerEditNameInput = document.getElementById('layerEditNameInput');
const layerEditCategoryInput = document.getElementById('layerEditCategoryInput');
const layerCategoriesList = document.getElementById('layerCategoriesList');
const applyLayerMetaBtn = document.getElementById('applyLayerMetaBtn');
const clearLayerMetaBtn = document.getElementById('clearLayerMetaBtn');
const categoryManageSelect = document.getElementById('categoryManageSelect');
const categoryManageNameInput = document.getElementById('categoryManageNameInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const renameCategoryBtn = document.getElementById('renameCategoryBtn');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
const analysisResult = document.getElementById('analysisResult');
const showAllBtn = document.getElementById('showAllBtn');
const hideAllBtn = document.getElementById('hideAllBtn');
const invertVisibilityBtn = document.getElementById('invertVisibilityBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const layerIconExpandBtn = document.getElementById('layerIconExpandBtn');
const layerIconCollapseBtn = document.getElementById('layerIconCollapseBtn');
const layerIconShowBtn = document.getElementById('layerIconShowBtn');
const layerIconHideBtn = document.getElementById('layerIconHideBtn');
const layerIconInvertBtn = document.getElementById('layerIconInvertBtn');
const layerIconClearBtn = document.getElementById('layerIconClearBtn');
const focusSelectedBtn = document.getElementById('focusSelectedBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const angleFrontBtn = document.getElementById('angleFrontBtn');
const angleSideBtn = document.getElementById('angleSideBtn');
const angleTopBtn = document.getElementById('angleTopBtn');
const advancedToolsTitle = document.getElementById('advancedToolsTitle');
const highlightNeighborsBtn = document.getElementById('highlightNeighborsBtn');
const clearNeighborsBtn = document.getElementById('clearNeighborsBtn');
const studyModeToggleBtn = document.getElementById('studyModeToggleBtn');
const studyRevealBtn = document.getElementById('studyRevealBtn');
const studyNextBtn = document.getElementById('studyNextBtn');
const studyStatus = document.getElementById('studyStatus');
const compareModelLabel = document.getElementById('compareModelLabel');
const compareModelSelect = document.getElementById('compareModelSelect');
const compareToggleBtn = document.getElementById('compareToggleBtn');
const compareClearBtn = document.getElementById('compareClearBtn');
const layerPresetLabel = document.getElementById('layerPresetLabel');
const layerPresetSelect = document.getElementById('layerPresetSelect');
const applyLayerPresetBtn = document.getElementById('applyLayerPresetBtn');
const resetLayerPresetBtn = document.getElementById('resetLayerPresetBtn');
const bookmarkLabel = document.getElementById('bookmarkLabel');
const bookmarkSelect = document.getElementById('bookmarkSelect');
const bookmarkSaveBtn = document.getElementById('bookmarkSaveBtn');
const bookmarkGoBtn = document.getElementById('bookmarkGoBtn');
const clinicalTourStartBtn = document.getElementById('clinicalTourStartBtn');
const clinicalTourStopBtn = document.getElementById('clinicalTourStopBtn');
const clinicalTourStatus = document.getElementById('clinicalTourStatus');
const exportImageBtn = document.getElementById('exportImageBtn');
const recordVideoBtn = document.getElementById('recordVideoBtn');
const toggleFavoriteBtn = document.getElementById('toggleFavoriteBtn');
const favoritesOnlyBtn = document.getElementById('favoritesOnlyBtn');
const footerTextEl = document.getElementById('footerText');
const closeDetailsBtn = document.querySelector('.part-dialog-actions button[type="submit"]');
const statusTotalEl = document.getElementById('statusTotal');
const statusVisibleEl = document.getElementById('statusVisible');
const statusSelectedEl = document.getElementById('statusSelected');
const expandFoldersBtn = document.getElementById('expandFoldersBtn');
const collapseFoldersBtn = document.getElementById('collapseFoldersBtn');
const directLibraryTitle = document.getElementById('directLibraryTitle');
const openAnimationsGalleryBtn = document.getElementById('openAnimationsGalleryBtn');
const directLibraryRefreshBtn = document.getElementById('directLibraryRefreshBtn');
const directModelsTitle = document.getElementById('directModelsTitle');
const directModelsList = document.getElementById('directModelsList');
const directAnimationsTitle = document.getElementById('directAnimationsTitle');
const directAnimationsList = document.getElementById('directAnimationsList');
const animationsGalleryDialog = document.getElementById('animationsGalleryDialog');
const animationsGalleryTitle = document.getElementById('animationsGalleryTitle');
const animationsGallerySubtitle = document.getElementById('animationsGallerySubtitle');
const animationsGalleryGrid = document.getElementById('animationsGalleryGrid');
const animationsGalleryCloseBtn = document.getElementById('animationsGalleryCloseBtn');
const fullSystemAuditDialog = document.getElementById('fullSystemAuditDialog');
const fullSystemAuditTitle = document.getElementById('fullSystemAuditTitle');
const fullSystemAuditReport = document.getElementById('fullSystemAuditReport');
const runFullSystemAuditBtn = document.getElementById('runFullSystemAuditBtn');
const closeFullSystemAuditBtn = document.getElementById('closeFullSystemAuditBtn');
const themeSettingsDialog = document.getElementById('themeSettingsDialog');
const themeSettingsTitle = document.getElementById('themeSettingsTitle');
const themeOptionButtons = Array.from(document.querySelectorAll('.theme-option-btn'));
const themeFrameBorderColor = document.getElementById('themeFrameBorderColor');
const themeModelBgColor = document.getElementById('themeModelBgColor');
const themeModelBgMode = document.getElementById('themeModelBgMode');
const themeModelBgSecondaryColor = document.getElementById('themeModelBgSecondaryColor');
const themeModelBgAngle = document.getElementById('themeModelBgAngle');
const themeControlBgColor = document.getElementById('themeControlBgColor');
const themeControlBorderColor = document.getElementById('themeControlBorderColor');
const themeControlTextColor = document.getElementById('themeControlTextColor');
const themeTabActiveBgColor = document.getElementById('themeTabActiveBgColor');
const themeTabActiveTextColor = document.getElementById('themeTabActiveTextColor');
const themeResetColorsBtn = document.getElementById('themeResetColorsBtn');
const themeExportPaletteBtn = document.getElementById('themeExportPaletteBtn');
const themeImportPaletteBtn = document.getElementById('themeImportPaletteBtn');
const themeImportPaletteInput = document.getElementById('themeImportPaletteInput');
const modelComposerDialog = document.getElementById('modelComposerDialog');
const modelComposerTitle = document.getElementById('modelComposerTitle');
const composerNameInput = document.getElementById('composerNameInput');
const composerModelsList = document.getElementById('composerModelsList');
const composerBuildBtn = document.getElementById('composerBuildBtn');
const composerDeleteBtn = document.getElementById('composerDeleteBtn');
const composerCloseBtn = document.getElementById('composerCloseBtn');
const composerSelectAllBtn = document.getElementById('composerSelectAllBtn');
const composerClearAllBtn = document.getElementById('composerClearAllBtn');
const composerExportBtn = document.getElementById('composerExportBtn');
const editedModelPresetSelect = document.getElementById('editedModelPresetSelect');
const editedModelPresetNameInput = document.getElementById('editedModelPresetNameInput');
const editedModelSaveBtn = document.getElementById('editedModelSaveBtn');
const editedModelLoadBtn = document.getElementById('editedModelLoadBtn');
const editedModelRenameBtn = document.getElementById('editedModelRenameBtn');
const editedModelDeleteBtn = document.getElementById('editedModelDeleteBtn');
const xyzFloatingDialog = document.getElementById('xyzFloatingDialog');
const xyzFloatingTitle = document.getElementById('xyzFloatingTitle');
const xyzFloatingMoveStep = document.getElementById('xyzFloatingMoveStep');
const xyzFloatingRotateStep = document.getElementById('xyzFloatingRotateStep');
const xyzFloatingScaleStep = document.getElementById('xyzFloatingScaleStep');
const xyzFloatingSnapToggle = document.getElementById('xyzFloatingSnapToggle');
const xyzFloatingAutoSaveToggle = document.getElementById('xyzFloatingAutoSaveToggle');
const xyzFloatingSymmetryToggle = document.getElementById('xyzFloatingSymmetryToggle');
const xyzFloatingFollowBtn = document.getElementById('xyzFloatingFollowBtn');
const xyzAxisLockXToggle = document.getElementById('xyzAxisLockXToggle');
const xyzAxisLockYToggle = document.getElementById('xyzAxisLockYToggle');
const xyzAxisLockZToggle = document.getElementById('xyzAxisLockZToggle');
const xyzAnalogPad = document.getElementById('xyzAnalogPad');
const xyzAnalogStick = document.getElementById('xyzAnalogStick');
const xyzStepSlider = document.getElementById('xyzStepSlider');
const xyzStepValue = document.getElementById('xyzStepValue');
const xyzFloatingScaleUpBtn = document.getElementById('xyzFloatingScaleUpBtn');
const xyzFloatingScaleDownBtn = document.getElementById('xyzFloatingScaleDownBtn');
const xyzFloatingUndoBtn = document.getElementById('xyzFloatingUndoBtn');
const xyzFloatingRedoBtn = document.getElementById('xyzFloatingRedoBtn');
const xyzFloatingLockBtn = document.getElementById('xyzFloatingLockBtn');
const xyzFloatingSaveBtn = document.getElementById('xyzFloatingSaveBtn');
const xyzFloatingResetSavedBtn = document.getElementById('xyzFloatingResetSavedBtn');
const xyzFloatingResetBaseBtn = document.getElementById('xyzFloatingResetBaseBtn');
const xyzGridToggleBtn = document.getElementById('xyzGridToggleBtn');
const xyzCalibrationPanel = document.getElementById('xyzCalibrationPanel');
const xyzMoveStepInput = document.getElementById('xyzMoveStepInput');
const xyzRotateStepInput = document.getElementById('xyzRotateStepInput');
const xyzScaleStepInput = document.getElementById('xyzScaleStepInput');
const xyzSnapToggle = document.getElementById('xyzSnapToggle');
const xyzResetPlacementBtn = document.getElementById('xyzResetPlacementBtn');
const xyzScaleUpBtn = document.getElementById('xyzScaleUpBtn');
const xyzScaleDownBtn = document.getElementById('xyzScaleDownBtn');
const xyzAutoSaveToggle = document.getElementById('xyzAutoSaveToggle');
const xyzSymmetryToggle = document.getElementById('xyzSymmetryToggle');
const xyzGridModeSelect = document.getElementById('xyzGridModeSelect');
const xyzGridStyleSelect = document.getElementById('xyzGridStyleSelect');
const xyzFloatingGridStyleBtn = document.getElementById('xyzFloatingGridStyleBtn');
const xyzFloatingGridMiniPanel = document.getElementById('xyzFloatingGridMiniPanel');
const xyzFloatingGridModeSelect = document.getElementById('xyzFloatingGridModeSelect');
const xyzFloatingGridStyleSelect = document.getElementById('xyzFloatingGridStyleSelect');
const xyzGridCenterColorInput = document.getElementById('xyzGridCenterColorInput');
const xyzGridPlaneColorInput = document.getElementById('xyzGridPlaneColorInput');
const xyzGridLineBoldnessRange = document.getElementById('xyzGridLineBoldnessRange');
const xyzGridLineBoldnessValue = document.getElementById('xyzGridLineBoldnessValue');
const xyzGridPresetClinicalBtn = document.getElementById('xyzGridPresetClinicalBtn');
const xyzGridPresetContrastBtn = document.getElementById('xyzGridPresetContrastBtn');
const xyzGridPresetTeachingBtn = document.getElementById('xyzGridPresetTeachingBtn');
const xyzDebugStateBtn = document.getElementById('xyzDebugStateBtn');
const xyzSafeRenderBtn = document.getElementById('xyzSafeRenderBtn');
const xyzRenderNormalBtn = document.getElementById('xyzRenderNormalBtn');
const xyzRenderSafeBtn = document.getElementById('xyzRenderSafeBtn');
const xyzRenderUltraBtn = document.getElementById('xyzRenderUltraBtn');
const xyzSaveWorkspaceBtn = document.getElementById('xyzSaveWorkspaceBtn');
const xyzLoadWorkspaceBtn = document.getElementById('xyzLoadWorkspaceBtn');
const xyzResetWorkspaceBtn = document.getElementById('xyzResetWorkspaceBtn');
const xyzWorkspaceProfileSelect = document.getElementById('xyzWorkspaceProfileSelect');
const xyzWorkspaceProfileName = document.getElementById('xyzWorkspaceProfileName');
const xyzWorkspaceSaveAsBtn = document.getElementById('xyzWorkspaceSaveAsBtn');
const xyzWorkspaceDeleteBtn = document.getElementById('xyzWorkspaceDeleteBtn');
const xyzWorkspaceExportBtn = document.getElementById('xyzWorkspaceExportBtn');
const xyzWorkspaceImportBtn = document.getElementById('xyzWorkspaceImportBtn');
const xyzWorkspaceImportInput = document.getElementById('xyzWorkspaceImportInput');
const xyzWorkspaceAutoSaveToggle = document.getElementById('xyzWorkspaceAutoSaveToggle');
const xyzWorkspaceAutoSaveSec = document.getElementById('xyzWorkspaceAutoSaveSec');
const xyzBackupAllBtn = document.getElementById('xyzBackupAllBtn');
const xyzRestoreAllBtn = document.getElementById('xyzRestoreAllBtn');
const xyzRestoreAllInput = document.getElementById('xyzRestoreAllInput');
const xyzUnlockAllBtn = document.getElementById('xyzUnlockAllBtn');
const xyzPanicResetBtn = document.getElementById('xyzPanicResetBtn');
const xyzHighlightLocksBtn = document.getElementById('xyzHighlightLocksBtn');
const xyzAutoUnlockToggle = document.getElementById('xyzAutoUnlockToggle');
const xyzVerboseDebugToggle = document.getElementById('xyzVerboseDebugToggle');
const xyzDebugCopyBtn = document.getElementById('xyzDebugCopyBtn');
const xyzDebugClearBtn = document.getElementById('xyzDebugClearBtn');
const xyzDebugConsole = document.getElementById('xyzDebugConsole');
const xyzDebugFab = document.getElementById('xyzDebugFab');
const xyzGridNumbersBoldToggle = document.getElementById('xyzGridNumbersBoldToggle');
const xyzGridNumberScaleRange = document.getElementById('xyzGridNumberScaleRange');
const xyzGridNumberScaleValue = document.getElementById('xyzGridNumberScaleValue');
const xyzFloatingGridSizeRange = document.getElementById('xyzFloatingGridSizeRange');
const xyzFloatingGridSizeValue = document.getElementById('xyzFloatingGridSizeValue');
const xyzFloatingGridDivisionsRange = document.getElementById('xyzFloatingGridDivisionsRange');
const xyzFloatingGridDivisionsValue = document.getElementById('xyzFloatingGridDivisionsValue');
const xyzSnapSourceSelect = document.getElementById('xyzSnapSourceSelect');
const xyzSnapMultiplierRange = document.getElementById('xyzSnapMultiplierRange');
const xyzSnapMultiplierValue = document.getElementById('xyzSnapMultiplierValue');
const xyzGridSizeRange = document.getElementById('xyzGridSizeRange');
const xyzGridSizeValue = document.getElementById('xyzGridSizeValue');
const xyzGridDivisionsRange = document.getElementById('xyzGridDivisionsRange');
const xyzGridDivisionsValue = document.getElementById('xyzGridDivisionsValue');
const xyzPosXInput = document.getElementById('xyzPosXInput');
const xyzPosYInput = document.getElementById('xyzPosYInput');
const xyzPosZInput = document.getElementById('xyzPosZInput');
const xyzApplyNumbersBtn = document.getElementById('xyzApplyNumbersBtn');
const xyzLockSelectedBtn = document.getElementById('xyzLockSelectedBtn');
const xyzPrevPartBtn = document.getElementById('xyzPrevPartBtn');
const xyzNextPartBtn = document.getElementById('xyzNextPartBtn');
const xyzSlotSelect = document.getElementById('xyzSlotSelect');
const xyzSaveSlotBtn = document.getElementById('xyzSaveSlotBtn');
const xyzLoadSlotBtn = document.getElementById('xyzLoadSlotBtn');
const xyzClearSlotBtn = document.getElementById('xyzClearSlotBtn');
const xyzSavePlacementBtn = document.getElementById('xyzSavePlacementBtn');
const xyzResetToSavedBtn = document.getElementById('xyzResetToSavedBtn');
const xyzClearPlacementBtn = document.getElementById('xyzClearPlacementBtn');
const xyzAlignCenterXBtn = document.getElementById('xyzAlignCenterXBtn');
const xyzUndoBtn = document.getElementById('xyzUndoBtn');
const xyzRedoBtn = document.getElementById('xyzRedoBtn');
const xyzExportCalibrationsBtn = document.getElementById('xyzExportCalibrationsBtn');
const xyzImportCalibrationsBtn = document.getElementById('xyzImportCalibrationsBtn');
const xyzImportCalibrationsInput = document.getElementById('xyzImportCalibrationsInput');
const xyzSelectionStatus = document.getElementById('xyzSelectionStatus');
const DIALOG_LAYOUT_STORAGE_KEY = 'open3dviewer.dialogLayouts.v1';
const WORKSPACE_VIEW_STORAGE_KEY = 'open3dviewer.workspaceView.v1';
const WORKSPACE_VIEW_PROFILES_KEY = 'open3dviewer.workspaceProfiles.v1';
const DIALOG_Z_BASE = 2300;
let dialogZCounter = DIALOG_Z_BASE;
const THEME_STORAGE_KEY = 'open3dviewer.theme.v1';
const THEME_CUSTOM_STORAGE_KEY = 'open3dviewer.themeCustomPalette.v1';
const CUSTOM_COMPOSITES_STORAGE_KEY = 'open3dviewer.customComposites.v1';
const LAYER_META_STORAGE_KEY = 'open3dviewer.layerMeta.v1';
const CUSTOM_LAYER_CATEGORIES_STORAGE_KEY = 'open3dviewer.customLayerCategories.v1';
const EDITED_MODEL_PRESETS_STORAGE_KEY = 'open3dviewer.editedModelPresets.v1';
const CUSTOM_COMPOSITE_PREFIX = 'custom-compose:';
const BUILTIN_CATEGORY_KEYS = new Set([
  'all',
  'head',
  'upper-limb',
  'lower-limb',
  'spine',
  'thorax',
  'internal-organs',
  'abdomen-pelvis',
  'vascular',
  'nervous',
  'other',
]);

function openDialogNonBlocking(dialog) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.show === 'function') {
    dialog.show();
    return;
  }
  dialog.setAttribute('open', 'open');
}

function ensureDialogWindowControls(dialog, handle) {
  if (!dialog || !handle) return;
  handle.classList.add('dialog-titlebar');
  if (handle.querySelector('.dialog-window-controls')) return;

  const controls = document.createElement('span');
  controls.className = 'dialog-window-controls';

  const minimizeBtn = document.createElement('button');
  minimizeBtn.type = 'button';
  minimizeBtn.className = 'dialog-icon-btn dialog-minimize-btn';
  minimizeBtn.setAttribute('aria-label', 'מזער חלון');
  minimizeBtn.title = 'מזער';
  minimizeBtn.textContent = '_';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'dialog-icon-btn dialog-close-btn';
  closeBtn.setAttribute('aria-label', 'סגור חלון');
  closeBtn.title = 'סגור';
  closeBtn.textContent = 'X';

  controls.appendChild(minimizeBtn);
  controls.appendChild(closeBtn);
  handle.appendChild(controls);

  minimizeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dialog.dispatchEvent(new CustomEvent('dialog-minimize-toggle'));
  });

  closeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  });
}

function enableDialogDragging(dialog, handle) {
  if (!dialog || !handle) return;
  ensureDialogWindowControls(dialog, handle);

  const dialogId = dialog.id || 'dialog';

  function readDialogLayouts() {
    try {
      const raw = localStorage.getItem(DIALOG_LAYOUT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeDialogLayouts(layouts) {
    try {
      localStorage.setItem(DIALOG_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      // Ignore storage errors.
    }
  }

  function applyLayout(layout) {
    if (!layout || typeof layout !== 'object') return;
    const width = Number(layout.width);
    const height = Number(layout.height);
    const left = Number(layout.left);
    const top = Number(layout.top);
    if (![width, height, left, top].every(Number.isFinite)) return;

    const clampedWidth = Math.min(Math.max(width, 320), window.innerWidth - 16);
    const clampedHeight = Math.min(Math.max(height, 220), window.innerHeight - 16);
    const maxLeft = Math.max(8, window.innerWidth - clampedWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - clampedHeight - 8);
    const clampedLeft = Math.min(maxLeft, Math.max(8, left));
    const clampedTop = Math.min(maxTop, Math.max(8, top));

    dialog.style.position = 'fixed';
    dialog.style.margin = '0';
    dialog.style.right = 'auto';
    dialog.style.bottom = 'auto';
    dialog.style.width = `${clampedWidth}px`;
    dialog.style.height = `${clampedHeight}px`;
    dialog.style.left = `${clampedLeft}px`;
    dialog.style.top = `${clampedTop}px`;

    const zIndex = Number(layout.zIndex);
    if (Number.isFinite(zIndex) && zIndex >= DIALOG_Z_BASE) {
      dialog.style.zIndex = String(Math.round(zIndex));
      dialogZCounter = Math.max(dialogZCounter, Math.round(zIndex));
    }

    if (typeof layout.minimized === 'boolean') {
      setDialogMinimized(layout.minimized, false);
    }

    if (layout.open === true && !dialog.open) {
      openDialogNonBlocking(dialog);
    }
  }

  function setDialogMinimized(nextMinimized, persist = true) {
    const minimized = !!nextMinimized;
    dialog.classList.toggle('is-minimized', minimized);
    const minimizeBtn = dialog.querySelector('.dialog-minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.textContent = minimized ? '[]' : '_';
      minimizeBtn.title = minimized ? 'שחזר' : 'מזער';
    }
    if (persist) persistCurrentLayout();
  }

  function getDialogZIndex() {
    const inlineZ = Number(dialog.style.zIndex);
    if (Number.isFinite(inlineZ)) return inlineZ;
    const computed = Number(window.getComputedStyle(dialog).zIndex);
    return Number.isFinite(computed) ? computed : DIALOG_Z_BASE;
  }

  function bringDialogToFront(persist = true) {
    const currentZ = getDialogZIndex();
    dialogZCounter = Math.max(dialogZCounter + 1, currentZ + 1, DIALOG_Z_BASE + 1);
    dialog.style.zIndex = String(dialogZCounter);
    if (persist) persistCurrentLayout();
  }

  function persistCurrentLayout() {
    const rect = dialog.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return;
    const layouts = readDialogLayouts();
    layouts[dialogId] = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      zIndex: getDialogZIndex(),
      minimized: dialog.classList.contains('is-minimized'),
      open: !!dialog.open,
    };
    writeDialogLayouts(layouts);
  }

  const savedLayouts = readDialogLayouts();
  if (savedLayouts[dialogId]) {
    applyLayout(savedLayouts[dialogId]);
  } else {
    bringDialogToFront(false);
  }

  dialog.addEventListener('dialog-minimize-toggle', () => {
    setDialogMinimized(!dialog.classList.contains('is-minimized'));
  });

  dialog.addEventListener('cancel', () => {
    setDialogMinimized(false, false);
  });

  dialog.addEventListener('toggle', () => {
    if (dialog.open) bringDialogToFront(false);
    persistCurrentLayout();
  });

  dialog.addEventListener('pointerdown', () => {
    if (dialog.open) bringDialogToFront(false);
  });

  let isDragging = false;
  let isResizing = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startLeft = 0;
  let startTop = 0;
  let startWidth = 0;
  let startHeight = 0;

  let resizeHandle = dialog.querySelector('.dialog-resize-handle');
  if (!resizeHandle) {
    resizeHandle = document.createElement('div');
    resizeHandle.className = 'dialog-resize-handle';
    resizeHandle.setAttribute('aria-hidden', 'true');
    dialog.appendChild(resizeHandle);
  }

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const interactiveTarget = event.target.closest('button, input, select, textarea, a, video');
    if (interactiveTarget) return;

    const rect = dialog.getBoundingClientRect();
    bringDialogToFront(false);
    dialog.style.position = 'fixed';
    dialog.style.margin = '0';
    dialog.style.left = `${rect.left}px`;
    dialog.style.top = `${rect.top}px`;
    dialog.style.right = 'auto';
    dialog.style.bottom = 'auto';

    isDragging = true;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    dialog.classList.add('is-dragging');
    event.preventDefault();
  });

  resizeHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    bringDialogToFront(false);
    const rect = dialog.getBoundingClientRect();
    isResizing = true;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    dialog.classList.add('is-resizing');
    event.preventDefault();
    event.stopPropagation();
  });

  window.addEventListener('pointermove', (event) => {
    if (isResizing) {
      const minWidth = 320;
      const minHeight = 220;
      const nextWidth = Math.min(window.innerWidth - 16, Math.max(minWidth, startWidth + (event.clientX - startPointerX)));
      const nextHeight = Math.min(window.innerHeight - 16, Math.max(minHeight, startHeight + (event.clientY - startPointerY)));
      dialog.style.width = `${nextWidth}px`;
      dialog.style.height = `${nextHeight}px`;
      return;
    }
    if (!isDragging) return;

    const rect = dialog.getBoundingClientRect();
    const deltaX = event.clientX - startPointerX;
    const deltaY = event.clientY - startPointerY;

    const minLeft = 8;
    const minTop = 8;
    const maxLeft = Math.max(minLeft, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(minTop, window.innerHeight - rect.height - 8);

    const nextLeft = Math.min(maxLeft, Math.max(minLeft, startLeft + deltaX));
    const nextTop = Math.min(maxTop, Math.max(minTop, startTop + deltaY));

    dialog.style.left = `${nextLeft}px`;
    dialog.style.top = `${nextTop}px`;
  });

  window.addEventListener('pointerup', () => {
    if (isResizing) {
      isResizing = false;
      dialog.classList.remove('is-resizing');
      persistCurrentLayout();
    }
    if (!isDragging) return;
    isDragging = false;
    dialog.classList.remove('is-dragging');
    persistCurrentLayout();
    if (dialogId === 'xyzFloatingDialog') {
      xyzFloatingFollowSelection = false;
      syncXyzFloatingFollowButton();
      saveXyzPanelSettings();
    }
  });

  dialog.addEventListener('close', () => {
    isDragging = false;
    isResizing = false;
    dialog.classList.remove('is-dragging');
    dialog.classList.remove('is-resizing');
    setDialogMinimized(false, false);
    persistCurrentLayout();
  });

  window.addEventListener('resize', () => {
    const layouts = readDialogLayouts();
    if (layouts[dialogId]) {
      applyLayout(layouts[dialogId]);
    }
  });

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      if (dialog.open) {
        persistCurrentLayout();
      }
    });
    resizeObserver.observe(dialog);
  }
}

enableDialogDragging(partDetailsDialog, partDetailsTitle);
enableDialogDragging(animationsGalleryDialog, animationsGalleryTitle);
enableDialogDragging(themeSettingsDialog, themeSettingsTitle);
enableDialogDragging(modelComposerDialog, modelComposerTitle);
enableDialogDragging(xyzFloatingDialog, xyzFloatingTitle);

const THEME_DEFAULT_PALETTES = {
  'ocean-pro': {
    frameBorder: '#d4af37',
    modelBg: '#000000',
    modelBgMode: 'solid',
    modelBgSecondary: '#101820',
    modelBgAngle: 135,
    controlBg: '#ffffff',
    controlBorder: '#c7d6eb',
    controlText: '#0a2e6e',
    tabActiveBg: '#1a73e8',
    tabActiveText: '#ffffff',
  },
  'light-gold': {
    frameBorder: '#d4af37',
    modelBg: '#ffffff',
    modelBgMode: 'linear',
    modelBgSecondary: '#d9e9ff',
    modelBgAngle: 135,
    controlBg: '#fffdf6',
    controlBorder: '#d4af37',
    controlText: '#001f5b',
    tabActiveBg: '#0a2e6e',
    tabActiveText: '#ffffff',
  },
  'graphite-dark': {
    frameBorder: '#8a94aa',
    modelBg: '#000000',
    modelBgMode: 'linear',
    modelBgSecondary: '#1d2638',
    modelBgAngle: 135,
    controlBg: '#1c2333',
    controlBorder: '#3a4a6b',
    controlText: '#dfe8ff',
    tabActiveBg: '#3f6fd4',
    tabActiveText: '#ffffff',
  },
  'mint-clinic': {
    frameBorder: '#0d9f8c',
    modelBg: '#e8fff8',
    modelBgMode: 'radial',
    modelBgSecondary: '#c8f2e8',
    modelBgAngle: 135,
    controlBg: '#f4fffb',
    controlBorder: '#8fd7ca',
    controlText: '#0e4652',
    tabActiveBg: '#0c8d7d',
    tabActiveText: '#ffffff',
  },
};

function getCurrentThemeName() {
  return document.documentElement.getAttribute('data-theme') || 'ocean-pro';
}

function readThemeCustomPalettes() {
  try {
    const raw = localStorage.getItem(THEME_CUSTOM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeThemeCustomPalettes(value) {
  try {
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors.
  }
}

function resolveThemePalette(themeName) {
  const theme = String(themeName || 'ocean-pro');
  const defaults = THEME_DEFAULT_PALETTES[theme] || THEME_DEFAULT_PALETTES['ocean-pro'];
  const custom = readThemeCustomPalettes()[theme];
  return { ...defaults, ...(custom || {}) };
}

let sceneBackgroundTexture = null;

function sanitizeModelBgMode(value) {
  const mode = String(value || 'solid').toLowerCase();
  if (mode === 'linear' || mode === 'radial') return mode;
  return 'solid';
}

function normalizeModelBgAngle(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 135;
  const clamped = Math.max(0, Math.min(360, Math.round(numeric)));
  return clamped;
}

function hexToRgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!match) return null;
  const parsed = match[1];
  return {
    r: Number.parseInt(parsed.slice(0, 2), 16),
    g: Number.parseInt(parsed.slice(2, 4), 16),
    b: Number.parseInt(parsed.slice(4, 6), 16),
  };
}

function blendHexColors(primaryHex, secondaryHex, weight = 0.5) {
  const a = hexToRgb(primaryHex);
  const b = hexToRgb(secondaryHex);
  if (!a) return secondaryHex || '#000000';
  if (!b) return primaryHex || '#000000';
  const w = Math.max(0, Math.min(1, Number(weight) || 0.5));
  const mix = (x, y) => Math.round(x * (1 - w) + y * w);
  const r = mix(a.r, b.r).toString(16).padStart(2, '0');
  const g = mix(a.g, b.g).toString(16).padStart(2, '0');
  const bHex = mix(a.b, b.b).toString(16).padStart(2, '0');
  return `#${r}${g}${bHex}`;
}

function buildViewerBackgroundCss(palette) {
  const mode = sanitizeModelBgMode(palette.modelBgMode);
  const primary = palette.modelBg || '#000000';
  const secondary = palette.modelBgSecondary || primary;
  const angle = normalizeModelBgAngle(palette.modelBgAngle);
  if (mode === 'linear') {
    return `linear-gradient(${angle}deg, ${primary} 0%, ${secondary} 100%)`;
  }
  if (mode === 'radial') {
    return `radial-gradient(circle at 30% 22%, ${primary} 0%, ${secondary} 100%)`;
  }
  return primary;
}

function applySceneBackgroundFromPalette(palette) {
  if (typeof scene === 'undefined' || !scene) return;

  const mode = sanitizeModelBgMode(palette.modelBgMode);
  const primary = palette.modelBg || '#000000';
  const secondary = palette.modelBgSecondary || primary;
  const angle = normalizeModelBgAngle(palette.modelBgAngle);

  if (sceneBackgroundTexture) {
    sceneBackgroundTexture.dispose();
    sceneBackgroundTexture = null;
  }

  if (mode === 'solid') {
    scene.background = new THREE.Color(primary);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    scene.background = new THREE.Color(primary);
    return;
  }

  let gradient;
  if (mode === 'linear') {
    const rad = (angle * Math.PI) / 180;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const half = Math.hypot(canvas.width, canvas.height) / 2;
    const x0 = cx - Math.cos(rad) * half;
    const y0 = cy - Math.sin(rad) * half;
    const x1 = cx + Math.cos(rad) * half;
    const y1 = cy + Math.sin(rad) * half;
    gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  } else {
    gradient = ctx.createRadialGradient(
      canvas.width * 0.3,
      canvas.height * 0.22,
      canvas.width * 0.05,
      canvas.width * 0.52,
      canvas.height * 0.5,
      canvas.width * 0.72,
    );
  }

  gradient.addColorStop(0, primary);
  gradient.addColorStop(1, secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  if ('SRGBColorSpace' in THREE) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  sceneBackgroundTexture = texture;
  scene.background = texture;
}

function applyThemePalette(themeName) {
  const palette = resolveThemePalette(themeName);
  const rootStyle = document.documentElement.style;
  const backgroundCss = buildViewerBackgroundCss(palette);
  rootStyle.setProperty('--ui-frame-border', palette.frameBorder);
  rootStyle.setProperty('--ui-model-bg', palette.modelBg);
  rootStyle.setProperty('--ui-model-bg-css', backgroundCss);
  rootStyle.setProperty('--ui-control-bg', palette.controlBg);
  rootStyle.setProperty('--ui-control-border', palette.controlBorder);
  rootStyle.setProperty('--ui-control-text', palette.controlText);
  rootStyle.setProperty('--ui-tab-active-bg', palette.tabActiveBg);
  rootStyle.setProperty('--ui-tab-active-text', palette.tabActiveText);
  applySceneBackgroundFromPalette(palette);
}

function syncThemeControlsFromCurrentTheme() {
  const palette = resolveThemePalette(getCurrentThemeName());
  if (themeFrameBorderColor) themeFrameBorderColor.value = palette.frameBorder;
  if (themeModelBgColor) themeModelBgColor.value = palette.modelBg;
  if (themeModelBgMode) themeModelBgMode.value = sanitizeModelBgMode(palette.modelBgMode);
  if (themeModelBgSecondaryColor) themeModelBgSecondaryColor.value = palette.modelBgSecondary || palette.modelBg;
  if (themeModelBgAngle) themeModelBgAngle.value = String(normalizeModelBgAngle(palette.modelBgAngle));
  if (themeControlBgColor) themeControlBgColor.value = palette.controlBg;
  if (themeControlBorderColor) themeControlBorderColor.value = palette.controlBorder;
  if (themeControlTextColor) themeControlTextColor.value = palette.controlText;
  if (themeTabActiveBgColor) themeTabActiveBgColor.value = palette.tabActiveBg;
  if (themeTabActiveTextColor) themeTabActiveTextColor.value = palette.tabActiveText;
}

function saveThemePaletteFromControls() {
  const theme = getCurrentThemeName();
  const allCustom = readThemeCustomPalettes();
  allCustom[theme] = {
    frameBorder: themeFrameBorderColor?.value || '#d4af37',
    modelBg: themeModelBgColor?.value || '#000000',
    modelBgMode: sanitizeModelBgMode(themeModelBgMode?.value || 'solid'),
    modelBgSecondary: themeModelBgSecondaryColor?.value || (themeModelBgColor?.value || '#000000'),
    modelBgAngle: normalizeModelBgAngle(themeModelBgAngle?.value || 135),
    controlBg: themeControlBgColor?.value || '#ffffff',
    controlBorder: themeControlBorderColor?.value || '#c7d6eb',
    controlText: themeControlTextColor?.value || '#0a2e6e',
    tabActiveBg: themeTabActiveBgColor?.value || '#1a73e8',
    tabActiveText: themeTabActiveTextColor?.value || '#ffffff',
  };
  writeThemeCustomPalettes(allCustom);
  applyThemePalette(theme);
}

function resetCurrentThemePalette() {
  const theme = getCurrentThemeName();
  const allCustom = readThemeCustomPalettes();
  delete allCustom[theme];
  writeThemeCustomPalettes(allCustom);
  applyThemePalette(theme);
  syncThemeControlsFromCurrentTheme();
}

function exportCurrentThemePalette() {
  const theme = getCurrentThemeName();
  const payload = {
    version: 1,
    theme,
    palette: resolveThemePalette(theme),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `open3dviewer-theme-${theme}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function isValidThemePalette(palette) {
  if (!palette || typeof palette !== 'object') return false;
  const requiredColorKeys = ['frameBorder', 'modelBg', 'controlBg', 'controlBorder', 'controlText', 'tabActiveBg', 'tabActiveText'];
  const hasRequiredColors = requiredColorKeys.every((key) => typeof palette[key] === 'string' && /^#[0-9a-f]{6}$/i.test(palette[key]));
  if (!hasRequiredColors) return false;

  const optionalSecondary = palette.modelBgSecondary;
  if (optionalSecondary !== undefined && (typeof optionalSecondary !== 'string' || !/^#[0-9a-f]{6}$/i.test(optionalSecondary))) {
    return false;
  }

  const optionalMode = palette.modelBgMode;
  if (optionalMode !== undefined && !['solid', 'linear', 'radial'].includes(String(optionalMode).toLowerCase())) {
    return false;
  }

  const optionalAngle = palette.modelBgAngle;
  if (optionalAngle !== undefined) {
    const angle = Number(optionalAngle);
    if (!Number.isFinite(angle) || angle < 0 || angle > 360) return false;
  }

  return true;
}

async function importThemePaletteFromFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const palette = data?.palette;
    if (!isValidThemePalette(palette)) {
      if (themeSettingsTitle) themeSettingsTitle.textContent = 'קובץ ערכה לא תקין';
      return;
    }
    const theme = getCurrentThemeName();
    const allCustom = readThemeCustomPalettes();
    allCustom[theme] = { ...palette };
    writeThemeCustomPalettes(allCustom);
    applyThemePalette(theme);
    syncThemeControlsFromCurrentTheme();
    if (themeSettingsTitle) themeSettingsTitle.textContent = 'הגדרות תצוגה וערכות נושא';
  } catch {
    if (themeSettingsTitle) themeSettingsTitle.textContent = 'שגיאה בייבוא ערכה';
  }
}

function applyTheme(themeName) {
  const nextTheme = String(themeName || 'ocean-pro').trim() || 'ocean-pro';
  document.documentElement.setAttribute('data-theme', nextTheme);
  applyThemePalette(nextTheme);
  syncThemeControlsFromCurrentTheme();
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage errors.
  }
}

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(stored || 'ocean-pro');
  } catch {
    applyTheme('ocean-pro');
  }
}

let currentModel = null;
let currentModelClips = [];
let modelAnimationMixer = null;
let activeModelClipAction = null;
let structureEntries = [];
let structureFolders = [];
let layerMetaStore = {};
const customLayerCategories = new Set();
let customCompositeStore = {};
const customCompositeKeys = new Set();
let editedModelPresetsStore = { presets: {}, selected: '' };
let currentModelKey = 'full-system';
let loadRequestId = 0;
let selectedMesh = null;
let hoveredMesh = null;
let xrayEnabled = false;
let xrayOpacityValueNumber = 0.35;
let realisticModeEnabled = false;
let humanScaleModeEnabled = false;
let activityAnimMode = 'none';
let activitySpeedValueNumber = 1;
let activityPaused = false;
let proPresetMode = 'custom';
let timelineActive = false;
let timelinePhaseIndex = 0;
let timelinePhaseElapsed = 0;
let systemDemoActive = false;
let systemDemoMode = 'heart';
let systemDemoUsesRealClip = false;
let performanceMode = 'balanced';
let adaptiveQualityEnabled = true;
let animationMode = 'none';
let lastAnimationTime = performance.now();
let lastHoverPickAt = 0;
let viewerInteracting = false;
let currentLang = 'he';
let favoritesOnly = false;
const favoritePartNames = new Set();
let pickableMeshes = [];
let pendingPointerEvent = null;
let mouseTransformDragging = false;
let mouseTransformPointerId = null;
let mouseTransformRoot = null;
let mouseTransformDragOffset = new THREE.Vector3();
let mouseTransformPlane = new THREE.Plane();
let mouseTransformMoved = false;
let detailsTriggerEl = null;
let compareOverlayModel = null;
let compareEnabled = false;
let advancedSearchMode = 'contains';
let studyModeEnabled = false;
let studyCurrentAnswer = '';
let studyScoreCorrect = 0;
let studyScoreTotal = 0;
let clinicalTourTimer = null;
let clinicalTourStep = 0;
let videoRecorder = null;
let recordedVideoChunks = [];
const cameraBookmarks = [];
let pendingBookmark = null;
let pendingWorkspaceSnapshot = null;
let pendingEditedModelPreset = null;
let directAnimationCatalog = [];
let xyzGridVisible = false;
let xyzGridGroup = null;
let xyzGridPlaneMode = 'all';
let xyzGridStyle = 'classic';
let xyzGridSize = 2.6;
let xyzGridDivisions = 26;
let xyzGridCustomCenterColor = '#c89b2b';
let xyzGridCustomPlaneColor = '#5273ad';
let xyzGridLineBoldness = 1;
let xyzGridNumbersBold = false;
let xyzGridNumberScale = 1;
let xyzSnapSource = 'step';
let xyzSnapMultiplier = 1;
let xyzHighlightLocksEnabled = false;
let xyzAutoUnlockOnMove = false;
let xyzVerboseDebugEnabled = false;
let xyzSafeRenderModeEnabled = false;
let xyzRenderProfile = 'normal';
let xyzSafeRenderRestoreXray = false;
let xyzSafeRenderRestoreHighlightLocks = false;
let xyzDebugLastDragLogAt = 0;
let workspaceProfileStore = { profiles: {}, selectedProfile: 'default', autoSaveEnabled: false, autoSaveSeconds: 10 };
let workspaceAutoSaveTimer = null;
const XYZ_DEBUG_LOG_LIMIT = 180;
const xyzDebugLines = [];
let xyzConsoleHookInstalled = false;
let xyzWebglLastMessage = '';
let xyzWebglLastAt = 0;
let xyzWebglRepeatCount = 0;
const XYZ_TRANSFORM_STORAGE_KEY = 'open3dviewer.manualTransforms.v1';
const XYZ_SLOT_STORAGE_KEY = 'open3dviewer.xyzSlots.v1';
const XYZ_SETTINGS_STORAGE_KEY = 'open3dviewer.xyzSettings.v1';
const STRUCTURE_VISIBILITY_STORAGE_KEY = 'open3dviewer.structureVisibility.v1';
const XYZ_HISTORY_LIMIT = 300;
const xyzUndoStack = [];
const xyzRedoStack = [];
let xyzAutoSaveEnabled = true;
let xyzSymmetryEnabled = false;
let xyzFloatingFollowSelection = true;
let xyzAxisLockX = false;
let xyzAxisLockY = false;
let xyzAxisLockZ = false;
let modelViewportPinned = false;
let analogJoystickActive = false;
let analogJoystickPointerId = null;
let analogJoystickLastStepAt = 0;
let middleMouseLastClickAt = 0;
const analogJoystickVector = new THREE.Vector2(0, 0);

const TIMELINE_PHASES = [
  { id: 'explode', durationSec: 6 },
  { id: 'focus', durationSec: 5 },
  { id: 'xray', durationSec: 5 },
  { id: 'restore', durationSec: 4 },
];

const SYSTEM_KEYWORDS = {
  heart: ['heart', 'cardiac', 'myocard', 'atri', 'ventric', 'aorta', 'coronary', 'לב'],
  respiratory: ['lung', 'trachea', 'bronch', 'bronchi', 'alveol', 'diaphragm', 'ריאה', 'קנה'],
  circulatory: ['arter', 'vein', 'vascular', 'blood', 'aorta', 'vena', 'capillar', 'דם', 'עורק', 'וריד'],
  lymphatic: ['lymph', 'node', 'thoracic duct', 'לימפ', 'קשר'],
  urinary: ['kidney', 'renal', 'ureter', 'bladder', 'urethra', 'שתן', 'כליה', 'שלפוח'],
  head: ['skull', 'cranium', 'brain', 'mandible', 'maxilla', 'nasal', 'orbital', 'ראש', 'גולגולת', 'מוח'],
};

const selectionAssistBadgeEl = document.createElement('div');
selectionAssistBadgeEl.className = 'selection-assist-badge';
selectionAssistBadgeEl.setAttribute('aria-live', 'polite');
selectionAssistBadgeEl.textContent = 'בחירת איבר: לא נבחר';
containerEl.appendChild(selectionAssistBadgeEl);

const moveDeltaPopupEl = document.createElement('div');
moveDeltaPopupEl.className = 'move-delta-popup';
moveDeltaPopupEl.setAttribute('aria-live', 'polite');
containerEl.appendChild(moveDeltaPopupEl);
let moveDeltaPopupTimer = null;
let moveDeltaPopupLastAt = 0;

function formatSigned3(value) {
  const n = Number(value) || 0;
  const fixed = Math.abs(n) < 0.0005 ? '0.000' : Math.abs(n).toFixed(3);
  return `${n >= 0 ? '+' : '-'}${fixed}`;
}

function showMoveDeltaPopup(dx, dy, dz, source = '') {
  if (!moveDeltaPopupEl) return;
  const now = performance.now();
  if (source === 'Drag' && now - moveDeltaPopupLastAt < 55) return;
  moveDeltaPopupLastAt = now;

  const parts = [];
  if (Math.abs(dx) >= 0.0005) parts.push(`X ${formatSigned3(dx)}`);
  if (Math.abs(dy) >= 0.0005) parts.push(`Y ${formatSigned3(dy)}`);
  if (Math.abs(dz) >= 0.0005) parts.push(`Z ${formatSigned3(dz)}`);
  if (!parts.length) return;

  const he = currentLang === 'he';
  const prefix = source
    ? (he ? `תזוזה (${source}): ` : `Move (${source}): `)
    : (he ? 'תזוזה: ' : 'Move: ');
  moveDeltaPopupEl.textContent = `${prefix}${parts.join(' | ')}`;
  moveDeltaPopupEl.classList.add('is-visible');
  if (moveDeltaPopupTimer) clearTimeout(moveDeltaPopupTimer);
  moveDeltaPopupTimer = setTimeout(() => {
    moveDeltaPopupEl.classList.remove('is-visible');
  }, 420);
}

function updateSelectionAssistBadge() {
  const selectedName = getMeshDisplayName(selectedMesh);
  const he = currentLang === 'he';
  if (!selectedMesh) {
    selectionAssistBadgeEl.textContent = he
      ? 'בחירת איבר: לא נבחר | לחיצה כפולה לבחירה'
      : 'Selection: none | double click to select';
    selectionAssistBadgeEl.classList.remove('is-selected');
    selectionAssistBadgeEl.classList.remove('is-dragging');
    containerEl.classList.remove('has-active-selection');
    containerEl.classList.toggle('xyz-select-mode', !!xyzGridVisible);
    return;
  }

  const xyzHint = xyzGridVisible
    ? (he
      ? ' | XYZ פעיל: קליק בודד בוחר, גרור נבחר להזזה (או Shift+Drag), חצים מזיזים'
      : ' | XYZ active: single click selects, drag selected part to move (or Shift+Drag), arrows nudge')
    : (he
      ? ' | לחיצה כפולה מחליפה בחירה'
      : ' | double click to change selection');

  selectionAssistBadgeEl.textContent = `${he ? 'נבחר' : 'Selected'}: ${selectedName}${xyzHint}`;
  selectionAssistBadgeEl.classList.add('is-selected');
  selectionAssistBadgeEl.classList.toggle('is-dragging', mouseTransformDragging);
  containerEl.classList.add('has-active-selection');
  containerEl.classList.toggle('xyz-select-mode', !!xyzGridVisible);
}

function syncModelPinButton() {
  if (!modelPinBtn) return;
  const he = currentLang === 'he';
  modelPinBtn.classList.toggle('is-active', modelViewportPinned);
  modelPinBtn.title = modelViewportPinned
    ? (he ? 'קיבוע פעיל: המודל נעול במקום' : 'Pinned: model is fixed')
    : (he ? 'קבע את המודל במקום' : 'Pin model position');
  modelPinBtn.setAttribute('aria-label', modelPinBtn.title);
}

function applyModelViewportPinState() {
  if (typeof controls === 'undefined' || !controls) return;
  controls.enableRotate = !modelViewportPinned;
  controls.enablePan = !modelViewportPinned;
  controls.enableZoom = !modelViewportPinned;
  controls.enabled = !modelViewportPinned;
  containerEl.classList.toggle('model-pinned', modelViewportPinned);
  if (modelViewportPinned) {
    controls.autoRotate = false;
  }
  syncModelPinButton();
}

function isAxisLocked(axis) {
  if (axis === 'x') return !!xyzAxisLockX;
  if (axis === 'y') return !!xyzAxisLockY;
  if (axis === 'z') return !!xyzAxisLockZ;
  return false;
}

function readNumericStep(inputEl, fallback, minValue) {
  const raw = String(inputEl?.value ?? '').trim().replace(',', '.');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minValue, parsed);
}

function formatStepForUi(value) {
  return value.toFixed(3);
}

function syncMoveStepControls(rawValue) {
  const numeric = Math.min(5, readNumericStep({ value: rawValue }, 0.02, 0.001));
  const formatted = formatStepForUi(numeric);
  if (xyzMoveStepInput) xyzMoveStepInput.value = formatted;
  if (xyzFloatingMoveStep) xyzFloatingMoveStep.value = formatted;
  if (xyzStepSlider) xyzStepSlider.value = formatted;
  if (xyzStepValue) xyzStepValue.textContent = formatted;
}

function getCurrentSnapIncrement() {
  const moveStep = readNumericStep(xyzMoveStepInput, 0.02, 0.001);
  const gridStep = xyzGridDivisions > 0 ? (xyzGridSize / xyzGridDivisions) : moveStep;
  const source = xyzSnapSource === 'grid' ? gridStep : moveStep;
  const mult = THREE.MathUtils.clamp(Number(xyzSnapMultiplier) || 1, 0.25, 4);
  return Math.max(0.0005, source * mult);
}

function buildXyzDebugSummary() {
  const root = getSelectedTransformRoot();
  const rootName = root?.userData?.partKey || root?.name || 'none';
  const rootLocked = root ? isRootLocked(root) : false;
  const locks = [xyzAxisLockX ? 'X' : '', xyzAxisLockY ? 'Y' : '', xyzAxisLockZ ? 'Z' : ''].filter(Boolean).join(',') || '-';
  const increment = getCurrentSnapIncrement().toFixed(4);
  return {
    he: `XYZ Debug | part:${rootName} | rootLock:${rootLocked ? 'ON' : 'OFF'} | axisLock:${locks} | safe:${xyzSafeRenderModeEnabled ? 'ON' : 'OFF'} | grid:${xyzGridPlaneMode}/${xyzGridStyle} | size:${xyzGridSize.toFixed(2)} div:${xyzGridDivisions} | snap:${xyzSnapSource} x${xyzSnapMultiplier.toFixed(2)} => ${increment}`,
    en: `XYZ Debug | part:${rootName} | rootLock:${rootLocked ? 'ON' : 'OFF'} | axisLock:${locks} | safe:${xyzSafeRenderModeEnabled ? 'ON' : 'OFF'} | grid:${xyzGridPlaneMode}/${xyzGridStyle} | size:${xyzGridSize.toFixed(2)} div:${xyzGridDivisions} | snap:${xyzSnapSource} x${xyzSnapMultiplier.toFixed(2)} => ${increment}`,
  };
}

function pushXyzDebugLine(label, details = {}) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const ts = `${hh}:${mm}:${ss}.${ms}`;
  const root = getSelectedTransformRoot();
  const rootName = root?.userData?.partKey || root?.name || 'none';
  const axisLocks = [xyzAxisLockX ? 'X' : '', xyzAxisLockY ? 'Y' : '', xyzAxisLockZ ? 'Z' : ''].filter(Boolean).join('') || '-';
  const lockTag = root && isRootLocked(root) ? 'rootLock=1' : 'rootLock=0';
  const baseMeta = `root=${rootName} axis=${axisLocks} ${lockTag} snap=${xyzSnapToggle?.checked ? '1' : '0'} inc=${getCurrentSnapIncrement().toFixed(4)}`;
  const extra = Object.entries(details)
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ');
  const line = `[${ts}] ${label} | ${baseMeta}${extra ? ` ${extra}` : ''}`;
  xyzDebugLines.push(line);
  if (xyzDebugLines.length > XYZ_DEBUG_LOG_LIMIT) {
    xyzDebugLines.splice(0, xyzDebugLines.length - XYZ_DEBUG_LOG_LIMIT);
  }
  if (xyzDebugConsole) {
    xyzDebugConsole.textContent = xyzDebugLines.join('\n');
    xyzDebugConsole.scrollTop = xyzDebugConsole.scrollHeight;
  }
  console.debug('[XYZ DEBUG]', line);
}

function xyzDebug(label, details = {}) {
  if (!xyzVerboseDebugEnabled) return;
  pushXyzDebugLine(label, details);
}

function syncSafeRenderButtonUi() {
  if (!xyzSafeRenderBtn) return;
  const he = currentLang === 'he';
  xyzSafeRenderBtn.textContent = xyzSafeRenderModeEnabled
    ? (he ? 'Safe Render פעיל' : 'Safe Render ON')
    : (he ? 'Safe Render כבוי' : 'Safe Render OFF');
  xyzSafeRenderBtn.classList.toggle('is-active', xyzSafeRenderModeEnabled);
}

function syncRenderProfileButtonsUi() {
  const he = currentLang === 'he';
  if (xyzRenderNormalBtn) xyzRenderNormalBtn.textContent = he ? 'רגיל' : 'Normal';
  if (xyzRenderSafeBtn) xyzRenderSafeBtn.textContent = he ? 'בטוח' : 'Safe';
  if (xyzRenderUltraBtn) xyzRenderUltraBtn.textContent = he ? 'אולטרה בטוח' : 'Ultra Safe';
  if (xyzRenderNormalBtn) xyzRenderNormalBtn.classList.toggle('is-active', xyzRenderProfile === 'normal');
  if (xyzRenderSafeBtn) xyzRenderSafeBtn.classList.toggle('is-active', xyzRenderProfile === 'safe');
  if (xyzRenderUltraBtn) xyzRenderUltraBtn.classList.toggle('is-active', xyzRenderProfile === 'ultra');
}

function applyRenderProfile(profile, persist = true) {
  const next = ['normal', 'safe', 'ultra'].includes(profile) ? profile : 'normal';
  xyzRenderProfile = next;

  if (next === 'normal') {
    applySafeRenderMode(false);
    performanceMode = 'balanced';
    adaptiveQualityEnabled = true;
  } else if (next === 'safe') {
    applySafeRenderMode(true);
    performanceMode = 'max';
    adaptiveQualityEnabled = true;
  } else {
    applySafeRenderMode(true);
    performanceMode = 'max';
    adaptiveQualityEnabled = true;
    realisticModeEnabled = false;
    activityAnimMode = 'none';
    activityPaused = false;
    if (realisticModeToggle) realisticModeToggle.checked = false;
    if (activityAnimSelect) activityAnimSelect.value = 'none';
    if (activitySpeed) activitySpeed.value = '1';
    activitySpeedValueNumber = 1;
    if (activitySpeedValue) activitySpeedValue.textContent = '1.0x';
    controls.autoRotate = false;
    applyProfessionalMode();
    applyExplodeState(0);
    renderer.setPixelRatio(Math.max(0.6, Math.min(window.devicePixelRatio || 1, 0.7)));
    onResize();
  }

  if (performanceModeSelect) performanceModeSelect.value = performanceMode;
  if (adaptiveQualityToggle) adaptiveQualityToggle.checked = adaptiveQualityEnabled;
  applyPerformanceSettings(false, true);
  updatePerformanceStatusUI();
  syncProfessionalUiState();
  syncRenderProfileButtonsUi();

  if (persist) {
    saveXyzPanelSettings();
    saveAppState();
  }

  setXyzStatusMessage(
    next === 'normal'
      ? 'XYZ: פרופיל רינדור רגיל'
      : next === 'safe'
        ? 'XYZ: פרופיל רינדור בטוח'
        : 'XYZ: פרופיל Ultra Safe פעיל',
    next === 'normal'
      ? 'XYZ: render profile normal'
      : next === 'safe'
        ? 'XYZ: render profile safe'
        : 'XYZ: render profile ultra safe',
  );
  pushXyzDebugLine('render-profile', { profile: next });
}

function findMeshByPartKey(partKey) {
  if (!partKey) return null;
  const match = structureEntries.find((entry) => String(entry.mesh?.userData?.partKey || '') === String(partKey));
  return match?.mesh || null;
}

function buildWorkspaceSnapshot() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    modelKey: currentModelKey,
    theme: getCurrentThemeName(),
    selectedPartKey: selectedMesh?.userData?.partKey || null,
    camera: {
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    },
    xyz: {
      gridVisible: !!xyzGridVisible,
      floatingOpen: !!xyzFloatingDialog?.open,
      floatingMinimized: !!xyzFloatingDialog?.classList.contains('is-minimized'),
      miniPanelOpen: !!(xyzFloatingGridMiniPanel && !xyzFloatingGridMiniPanel.hidden),
      renderProfile: xyzRenderProfile,
      followSelection: !!xyzFloatingFollowSelection,
    },
  };
}

function sanitizeWorkspaceProfileName(rawName) {
  const text = String(rawName || '').trim();
  if (!text) return 'default';
  return text.slice(0, 50);
}

function readWorkspaceProfilesStore() {
  const fallback = {
    profiles: {},
    selectedProfile: 'default',
    autoSaveEnabled: false,
    autoSaveSeconds: 10,
  };
  try {
    const raw = localStorage.getItem(WORKSPACE_VIEW_PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
      selectedProfile: sanitizeWorkspaceProfileName(parsed.selectedProfile || 'default'),
      autoSaveEnabled: parsed.autoSaveEnabled === true,
      autoSaveSeconds: THREE.MathUtils.clamp(Number(parsed.autoSaveSeconds) || 10, 3, 120),
    };
  } catch {
    return fallback;
  }
}

function writeWorkspaceProfilesStore() {
  try {
    localStorage.setItem(WORKSPACE_VIEW_PROFILES_KEY, JSON.stringify(workspaceProfileStore));
  } catch {
    // Ignore storage errors.
  }
}

function syncWorkspaceProfilesUi() {
  if (!xyzWorkspaceProfileSelect) return;
  const profileNames = Object.keys(workspaceProfileStore.profiles).sort((a, b) => a.localeCompare(b));
  if (!profileNames.includes('default')) profileNames.unshift('default');

  xyzWorkspaceProfileSelect.innerHTML = '';
  profileNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    xyzWorkspaceProfileSelect.appendChild(option);
  });

  const selected = sanitizeWorkspaceProfileName(workspaceProfileStore.selectedProfile || 'default');
  workspaceProfileStore.selectedProfile = selected;
  xyzWorkspaceProfileSelect.value = selected;

  if (xyzWorkspaceProfileName) xyzWorkspaceProfileName.value = selected;
  if (xyzWorkspaceAutoSaveToggle) xyzWorkspaceAutoSaveToggle.checked = !!workspaceProfileStore.autoSaveEnabled;
  if (xyzWorkspaceAutoSaveSec) xyzWorkspaceAutoSaveSec.value = String(workspaceProfileStore.autoSaveSeconds || 10);
}

function restartWorkspaceAutoSaveTimer() {
  if (workspaceAutoSaveTimer) {
    clearInterval(workspaceAutoSaveTimer);
    workspaceAutoSaveTimer = null;
  }
  if (!workspaceProfileStore.autoSaveEnabled) return;
  const seconds = THREE.MathUtils.clamp(Number(workspaceProfileStore.autoSaveSeconds) || 10, 3, 120);
  workspaceAutoSaveTimer = setInterval(() => {
    saveWorkspaceSnapshot(workspaceProfileStore.selectedProfile, true);
  }, seconds * 1000);
}

function initWorkspaceProfilesState() {
  workspaceProfileStore = readWorkspaceProfilesStore();
  const legacy = readWorkspaceSnapshot();
  if (legacy && !workspaceProfileStore.profiles.default) {
    workspaceProfileStore.profiles.default = legacy;
  }
  if (!workspaceProfileStore.selectedProfile) {
    workspaceProfileStore.selectedProfile = 'default';
  }
  syncWorkspaceProfilesUi();
  writeWorkspaceProfilesStore();
  restartWorkspaceAutoSaveTimer();
}

function exportWorkspaceProfiles() {
  try {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: workspaceProfileStore,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `open3dviewer-workspace-profiles-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setXyzStatusMessage('XYZ: פרופילים יוצאו לקובץ', 'XYZ: workspace profiles exported');
  } catch {
    setXyzStatusMessage('XYZ: ייצוא פרופילים נכשל', 'XYZ: failed to export workspace profiles');
  }
}

function normalizeImportedWorkspaceStore(input) {
  if (!input || typeof input !== 'object') return null;
  const source = input.data && typeof input.data === 'object' ? input.data : input;
  const profiles = source.profiles && typeof source.profiles === 'object' ? source.profiles : {};

  const normalizedProfiles = {};
  Object.entries(profiles).forEach(([name, snapshot]) => {
    const safeName = sanitizeWorkspaceProfileName(name);
    if (!snapshot || typeof snapshot !== 'object') return;
    normalizedProfiles[safeName] = snapshot;
  });

  return {
    profiles: normalizedProfiles,
    selectedProfile: sanitizeWorkspaceProfileName(source.selectedProfile || 'default'),
    autoSaveEnabled: source.autoSaveEnabled === true,
    autoSaveSeconds: THREE.MathUtils.clamp(Number(source.autoSaveSeconds) || 10, 3, 120),
  };
}

async function importWorkspaceProfiles(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = normalizeImportedWorkspaceStore(parsed);
    if (!imported) {
      setXyzStatusMessage('XYZ: קובץ פרופילים לא תקין', 'XYZ: invalid workspace profile file');
      return;
    }

    workspaceProfileStore.profiles = {
      ...workspaceProfileStore.profiles,
      ...imported.profiles,
    };
    workspaceProfileStore.selectedProfile = imported.selectedProfile || workspaceProfileStore.selectedProfile || 'default';
    workspaceProfileStore.autoSaveEnabled = imported.autoSaveEnabled;
    workspaceProfileStore.autoSaveSeconds = imported.autoSaveSeconds;

    writeWorkspaceProfilesStore();
    syncWorkspaceProfilesUi();
    restartWorkspaceAutoSaveTimer();
    setXyzStatusMessage('XYZ: פרופילים יובאו בהצלחה', 'XYZ: workspace profiles imported');
    pushXyzDebugLine('workspace-import', { profiles: Object.keys(imported.profiles).length });
  } catch {
    setXyzStatusMessage('XYZ: שגיאה בייבוא פרופילים', 'XYZ: failed to import workspace profiles');
  }
}

function exportAllOpen3dState() {
  try {
    const bundle = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('open3dviewer.')) continue;
      bundle[key] = localStorage.getItem(key);
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      state: bundle,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `open3dviewer-full-state-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setXyzStatusMessage('XYZ: בוצע גיבוי מלא', 'XYZ: full backup exported');
  } catch {
    setXyzStatusMessage('XYZ: גיבוי מלא נכשל', 'XYZ: full backup export failed');
  }
}

async function importAllOpen3dState(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const state = parsed?.state;
    if (!state || typeof state !== 'object') {
      setXyzStatusMessage('XYZ: קובץ גיבוי לא תקין', 'XYZ: invalid backup file');
      return;
    }
    Object.entries(state).forEach(([key, value]) => {
      if (!String(key).startsWith('open3dviewer.')) return;
      if (typeof value !== 'string') return;
      localStorage.setItem(key, value);
    });
    setXyzStatusMessage('XYZ: גיבוי שוחזר. רענן דף להחלה מלאה', 'XYZ: backup restored. Refresh page for full apply');
    pushXyzDebugLine('full-restore', { keys: Object.keys(state).length });
  } catch {
    setXyzStatusMessage('XYZ: שחזור גיבוי נכשל', 'XYZ: backup restore failed');
  }
}

function saveWorkspaceSnapshot(profileName = null, silent = false) {
  try {
    const resolvedName = sanitizeWorkspaceProfileName(profileName || workspaceProfileStore.selectedProfile || xyzWorkspaceProfileSelect?.value || 'default');
    const payload = buildWorkspaceSnapshot();
    localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify(payload));
    workspaceProfileStore.profiles[resolvedName] = payload;
    workspaceProfileStore.selectedProfile = resolvedName;
    writeWorkspaceProfilesStore();
    syncWorkspaceProfilesUi();
    if (!silent) {
      setXyzStatusMessage('XYZ: מצב תצוגה נשמר', 'XYZ: workspace view saved');
    }
    pushXyzDebugLine('workspace-save', { profile: resolvedName, model: payload.modelKey, part: payload.selectedPartKey || '-' });
  } catch {
    if (!silent) {
      setXyzStatusMessage('XYZ: שמירת מצב נכשלה', 'XYZ: failed to save workspace view');
    }
  }
}

function readWorkspaceSnapshot() {
  try {
    const raw = localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function applyWorkspaceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const theme = String(snapshot.theme || '').trim();
  if (theme) applyTheme(theme);

  const position = snapshot.camera?.position;
  const target = snapshot.camera?.target;
  if (Array.isArray(position) && position.length === 3) camera.position.fromArray(position);
  if (Array.isArray(target) && target.length === 3) controls.target.fromArray(target);
  controls.update();

  const desiredGridVisible = snapshot.xyz?.gridVisible === true;
  if (desiredGridVisible !== xyzGridVisible) {
    toggleXyzGrid();
  }

  applyRenderProfile(snapshot.xyz?.renderProfile || 'normal');

  if (xyzFloatingGridMiniPanel) {
    xyzFloatingGridMiniPanel.hidden = !(snapshot.xyz?.miniPanelOpen === true);
  }
  if (xyzFloatingGridStyleBtn) {
    xyzFloatingGridStyleBtn.classList.toggle('is-active', !!snapshot.xyz?.miniPanelOpen);
  }

  const wantFloatingOpen = snapshot.xyz?.floatingOpen === true;
  if (wantFloatingOpen) {
    openXyzFloatingDialog();
    if (snapshot.xyz?.floatingMinimized) {
      xyzFloatingDialog?.classList.add('is-minimized');
      const minimizeBtn = xyzFloatingDialog?.querySelector('.dialog-minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.textContent = '[]';
        minimizeBtn.title = 'שחזר';
      }
    }
  } else {
    closeXyzFloatingDialog();
  }

  if (typeof snapshot.xyz?.followSelection === 'boolean') {
    xyzFloatingFollowSelection = snapshot.xyz.followSelection;
    syncXyzFloatingFollowButton();
  }

  const selectedPartKey = snapshot.selectedPartKey;
  if (selectedPartKey) {
    const mesh = findMeshByPartKey(selectedPartKey);
    if (mesh) setSelectedMesh(mesh);
  }

  updateXyzSelectionStatus();
  saveXyzPanelSettings();
  saveAppState();
  setXyzStatusMessage('XYZ: מצב תצוגה שוחזר', 'XYZ: workspace view restored');
  pushXyzDebugLine('workspace-load', { model: snapshot.modelKey || '-', part: selectedPartKey || '-' });
}

function loadWorkspaceSnapshot(profileName = null) {
  const resolvedName = sanitizeWorkspaceProfileName(profileName || workspaceProfileStore.selectedProfile || xyzWorkspaceProfileSelect?.value || 'default');
  const snapshot = workspaceProfileStore.profiles[resolvedName] || readWorkspaceSnapshot();
  if (!snapshot) {
    setXyzStatusMessage('XYZ: אין מצב שמור לטעינה', 'XYZ: no saved workspace view');
    return;
  }
  workspaceProfileStore.selectedProfile = resolvedName;
  writeWorkspaceProfilesStore();
  syncWorkspaceProfilesUi();

  if (snapshot.modelKey && snapshot.modelKey !== currentModelKey) {
    currentModelKey = snapshot.modelKey;
    if (modelSelect) modelSelect.value = currentModelKey;
    pendingBookmark = {
      model: snapshot.modelKey,
      cameraPos: Array.isArray(snapshot.camera?.position) ? snapshot.camera.position : camera.position.toArray(),
      target: Array.isArray(snapshot.camera?.target) ? snapshot.camera.target : controls.target.toArray(),
    };
    pendingWorkspaceSnapshot = snapshot;
    loadModelByKey(snapshot.modelKey);
    return;
  }

  applyWorkspaceSnapshot(snapshot);
}

function resetWorkspaceSnapshot(profileName = null) {
  const resolvedName = sanitizeWorkspaceProfileName(profileName || workspaceProfileStore.selectedProfile || xyzWorkspaceProfileSelect?.value || 'default');
  if (workspaceProfileStore.profiles[resolvedName]) {
    delete workspaceProfileStore.profiles[resolvedName];
  }
  if (workspaceProfileStore.selectedProfile === resolvedName) {
    workspaceProfileStore.selectedProfile = 'default';
  }
  writeWorkspaceProfilesStore();
  syncWorkspaceProfilesUi();
  localStorage.removeItem(WORKSPACE_VIEW_STORAGE_KEY);
  setXyzStatusMessage('XYZ: מצב תצוגה שמור אופס', 'XYZ: saved workspace view reset');
  pushXyzDebugLine('workspace-reset', { profile: resolvedName });
}

function applySafeRenderMode(forceState = xyzSafeRenderModeEnabled) {
  xyzSafeRenderModeEnabled = !!forceState;

  if (xyzSafeRenderModeEnabled) {
    xyzSafeRenderRestoreXray = !!xrayEnabled;
    xyzSafeRenderRestoreHighlightLocks = !!xyzHighlightLocksEnabled;

    if (xrayEnabled) {
      xrayEnabled = false;
      if (xrayToggle) xrayToggle.checked = false;
      applyXrayToCurrentModel();
    }

    if (xyzHighlightLocksEnabled) {
      xyzHighlightLocksEnabled = false;
      applyLockHighlights();
    }

    if (sceneBackgroundTexture) {
      sceneBackgroundTexture.dispose();
      sceneBackgroundTexture = null;
    }
    if (scene) {
      scene.background = new THREE.Color(0x0b111d);
    }

    setXyzStatusMessage(
      'XYZ: Safe Render הופעל (XRAY/Highlight כובו, רקע פשוט)',
      'XYZ: Safe Render enabled (XRAY/highlight off, simple background)',
    );
    pushXyzDebugLine('safe-render', { enabled: true });
  } else {
    applySceneBackgroundFromPalette(resolveThemePalette(getCurrentThemeName()));

    if (xyzSafeRenderRestoreHighlightLocks) {
      xyzHighlightLocksEnabled = true;
      applyLockHighlights();
    }
    if (xyzSafeRenderRestoreXray) {
      xrayEnabled = true;
      if (xrayToggle) xrayToggle.checked = true;
      applyXrayToCurrentModel();
    }

    setXyzStatusMessage('XYZ: Safe Render כבוי', 'XYZ: Safe Render disabled');
    pushXyzDebugLine('safe-render', { enabled: false });
  }

  if (xyzHighlightLocksBtn) {
    xyzHighlightLocksBtn.classList.toggle('is-active', xyzHighlightLocksEnabled);
  }
  syncSafeRenderButtonUi();
  saveXyzPanelSettings();
}

async function copyXyzDebugLog() {
  const text = xyzDebugLines.length ? xyzDebugLines.join('\n') : '[XYZ Debug] empty';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return true;
  } catch {
    return false;
  }
}

function installXyzConsoleCapture() {
  if (xyzConsoleHookInstalled) return;
  xyzConsoleHookInstalled = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  const handleLine = (level, args) => {
    const line = args
      .map((item) => {
        if (typeof item === 'string') return item;
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .join(' ')
      .trim();

    if (!line) return;
    if (!/webgl|gl_invalid_operation|feedback loop|framebuffer|glDrawElements/i.test(line)) return;

    const now = performance.now();
    if (line === xyzWebglLastMessage && now - xyzWebglLastAt < 800) {
      xyzWebglRepeatCount += 1;
      if (xyzWebglRepeatCount % 20 === 0) {
        pushXyzDebugLine('webgl-repeat', { count: xyzWebglRepeatCount, sample: line.slice(0, 140) });
      }
      return;
    }

    xyzWebglLastMessage = line;
    xyzWebglLastAt = now;
    xyzWebglRepeatCount = 1;
    pushXyzDebugLine('webgl-error', { level, msg: line.slice(0, 260) });
  };

  console.warn = (...args) => {
    handleLine('warn', args);
    originalWarn(...args);
  };
  console.error = (...args) => {
    handleLine('error', args);
    originalError(...args);
  };
}

function t(key) {
  return I18N[currentLang][key] || I18N.en[key] || key;
}

function tf(key, ...args) {
  let text = t(key);
  args.forEach((arg, idx) => {
    text = text.replace(`{${idx}}`, String(arg));
  });
  return text;
}

function getModelLabel(model) {
  if (!model?.labels) return '';
  return model.labels[currentLang] || model.labels.en || '';
}

function buildFallbackModelLabel(key) {
  const clean = String(key || '')
    .replace(/\.glb$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!clean) return 'Model';
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeManifestLabel(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function getDirectLibraryText() {
  return currentLang === 'he'
    ? {
      title: 'ספריה ישירה',
      refresh: 'רענן ספריה',
      models: 'מודלים',
      animations: 'אנימציות',
      fullGallery: 'גלריה מלאה',
      galleryTitle: 'גלריית אנימציות מלאה',
      gallerySubtitle: 'כל האנימציות הזמינות מוצגות כאן לצפייה ישירה.',
      close: 'סגור',
      openModel: 'פתח',
      noModels: 'לא נמצאו מודלים בקטלוג.',
      noAnimations: 'לא נמצאו אנימציות בקטלוג.',
      refreshBusy: 'מרענן...',
    }
    : {
      title: 'Direct Library',
      refresh: 'Refresh Library',
      models: 'Models',
      animations: 'Animations',
      fullGallery: 'Full Gallery',
      galleryTitle: 'Full Animations Gallery',
      gallerySubtitle: 'All available animations are shown here for direct viewing.',
      close: 'Close',
      openModel: 'Open',
      noModels: 'No models were found in the catalog.',
      noAnimations: 'No animations were found in the catalog.',
      refreshBusy: 'Refreshing...',
    };
}

function inferMediaMime(path) {
  const cleanPath = String(path || '').toLowerCase();
  if (cleanPath.endsWith('.webm')) return 'video/webm';
  if (cleanPath.endsWith('.mp4')) return 'video/mp4';
  if (cleanPath.endsWith('.ogg') || cleanPath.endsWith('.ogv')) return 'video/ogg';
  if (cleanPath.endsWith('.gif')) return 'image/gif';
  return '';
}

async function loadDirectAnimationCatalog() {
  try {
    const response = await fetch(`media/animations/catalog.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((item) => typeof item?.localPath === 'string' && item.localPath.trim().length > 0);
  } catch {
    return [];
  }
}

function renderDirectModelsList() {
  if (!directModelsList) return;
  const text = getDirectLibraryText();
  directModelsList.innerHTML = '';

  const entries = Object.entries(MODEL_OPTIONS);
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'direct-library-empty';
    empty.textContent = text.noModels;
    directModelsList.appendChild(empty);
    return;
  }

  entries.forEach(([key, model]) => {
    const row = document.createElement('div');
    row.className = `direct-model-item${key === currentModelKey ? ' active' : ''}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'direct-model-name';
    nameEl.textContent = getModelLabel(model);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'direct-model-open';
    openBtn.textContent = text.openModel;
    openBtn.addEventListener('click', () => {
      modelSelect.value = key;
      loadModelByKey(key);
      saveAppState();
    });

    row.appendChild(nameEl);
    row.appendChild(openBtn);
    directModelsList.appendChild(row);
  });
}

function renderDirectAnimationsList(items) {
  if (!directAnimationsList) return;
  const text = getDirectLibraryText();
  directAnimationsList.innerHTML = '';

  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'direct-library-empty';
    empty.textContent = text.noAnimations;
    directAnimationsList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const path = String(item.localPath || '').trim();
    if (!path) return;

    const card = document.createElement('article');
    card.className = 'direct-animation-item';

    const title = document.createElement('div');
    title.className = 'direct-animation-title';
    title.textContent = String(item.label || item.id || path);
    card.appendChild(title);

    const mime = inferMediaMime(path);
    if (mime.startsWith('video/')) {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      const source = document.createElement('source');
      source.src = path;
      source.type = mime;
      video.appendChild(source);
      card.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = path;
      img.alt = String(item.label || item.id || 'Animation');
      card.appendChild(img);
    }

    directAnimationsList.appendChild(card);
  });
}

function renderAnimationsGalleryGrid(items) {
  if (!animationsGalleryGrid) return;
  const text = getDirectLibraryText();
  animationsGalleryGrid.innerHTML = '';

  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'direct-library-empty';
    empty.textContent = text.noAnimations;
    animationsGalleryGrid.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const path = String(item.localPath || '').trim();
    if (!path) return;

    const card = document.createElement('article');
    card.className = 'direct-animation-item';

    const title = document.createElement('div');
    title.className = 'direct-animation-title';
    title.textContent = String(item.label || item.id || path);
    card.appendChild(title);

    const mime = inferMediaMime(path);
    if (mime.startsWith('video/')) {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      const source = document.createElement('source');
      source.src = path;
      source.type = mime;
      video.appendChild(source);
      card.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = path;
      img.alt = String(item.label || item.id || 'Animation');
      card.appendChild(img);
    }

    animationsGalleryGrid.appendChild(card);
  });
}

function updateDirectLibraryLabels() {
  const text = getDirectLibraryText();
  if (directLibraryTitle) directLibraryTitle.textContent = text.title;
  if (openAnimationsGalleryBtn) openAnimationsGalleryBtn.textContent = text.fullGallery;
  if (directLibraryRefreshBtn && !directLibraryRefreshBtn.disabled) directLibraryRefreshBtn.textContent = text.refresh;
  if (directModelsTitle) directModelsTitle.textContent = text.models;
  if (directAnimationsTitle) directAnimationsTitle.textContent = text.animations;
  if (animationsGalleryTitle) animationsGalleryTitle.textContent = text.galleryTitle;
  if (animationsGallerySubtitle) animationsGallerySubtitle.textContent = text.gallerySubtitle;
  if (animationsGalleryCloseBtn) animationsGalleryCloseBtn.textContent = text.close;
}

async function refreshDirectLibrary() {
  updateDirectLibraryLabels();
  renderDirectModelsList();
  directAnimationCatalog = await loadDirectAnimationCatalog();
  renderDirectAnimationsList(directAnimationCatalog);
  renderAnimationsGalleryGrid(directAnimationCatalog);
}

async function loadDynamicModelsManifest() {
  try {
    const response = await fetch(`models/manifest.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    const items = Array.isArray(manifest?.models) ? manifest.models : [];

    items.forEach((item) => {
      const key = String(item?.key || '').trim();
      const path = String(item?.path || '').trim();
      if (!key || !path || !path.toLowerCase().endsWith('.glb')) return;
      if (MODEL_OPTIONS[key]?.parts) return;

      const fallbackLabel = buildFallbackModelLabel(key);
      const labels = {
        he: normalizeManifestLabel(item?.labels?.he, fallbackLabel),
        en: normalizeManifestLabel(item?.labels?.en, fallbackLabel),
      };

      BASE_MODEL_OPTIONS[key] = { labels, path };
      MODEL_OPTIONS[key] = BASE_MODEL_OPTIONS[key];
      if (item?.mirror === true) {
        MIRRORED_PART_KEYS.add(key);
      }
    });
  } catch {
    // Manifest is optional; use built-in model options when unavailable.
  }
}

function saveAppState() {
  const state = buildPersistedState({
    lang: currentLang,
    model: currentModelKey,
    xrayEnabled,
    xrayOpacity: xrayOpacityValueNumber,
    favoritesOnly,
    favorites: Array.from(favoritePartNames),
    analysisCategory: partAnalysisSelect.value,
    filterText: filterInput.value || '',
    realisticMode: realisticModeEnabled,
    humanScaleMode: humanScaleModeEnabled,
    activityAnim: activityAnimMode,
    activitySpeed: activitySpeedValueNumber,
    proPreset: proPresetMode,
    systemDemo: systemDemoMode,
    performanceMode,
    adaptiveQuality: adaptiveQualityEnabled,
  });
  writePersistedState(localStorage, state);
}

function updateModelClipBadge(isLoading = false) {
  if (!modelClipBadge) return;
  if (isLoading) {
    modelClipBadge.textContent = t('clipLoading');
    return;
  }
  const clipCount = currentModelClips.length;
  modelClipBadge.textContent = clipCount > 0 ? tf('clipCount', clipCount) : t('clipNone');
}

function loadAppState() {
  try {
    const rawState = readPersistedState(localStorage);
    const state = migrateAndNormalizeState(rawState, {
      defaultLang: currentLang,
      defaultModel: currentModelKey,
      defaultOpacity: xrayOpacityValueNumber,
      modelOptions: MODEL_OPTIONS,
      categoryValues: Array.from(partAnalysisSelect.options).map((opt) => opt.value),
    });
    if (!state) return;
    currentLang = state.lang;
    currentModelKey = state.model;
    xrayEnabled = state.xrayEnabled;
    xrayOpacityValueNumber = state.xrayOpacity;
    favoritesOnly = state.favoritesOnly;
    realisticModeEnabled = !!state.realisticMode;
    humanScaleModeEnabled = !!state.humanScaleMode;
    activityAnimMode = state.activityAnim || 'none';
    activitySpeedValueNumber = typeof state.activitySpeed === 'number' ? state.activitySpeed : 1;
    proPresetMode = state.proPreset || 'custom';
    systemDemoMode = state.systemDemo || 'heart';
    performanceMode = state.performanceMode || 'balanced';
    adaptiveQualityEnabled = state.adaptiveQuality !== false;
    state.favorites.forEach((name) => favoritePartNames.add(name));
    filterInput.value = state.filterText;
    partAnalysisSelect.value = state.analysisCategory;

    // Persist migrated/normalized state back to localStorage.
    saveAppState();
  } catch {
    // Ignore broken persisted state and continue with defaults.
  }
}

function getMeshDisplayName(mesh) {
  return mesh ? (mesh.userData.listName || formatStructureName(mesh.name)) : '';
}

function normalizeLayerMetaText(value) {
  return String(value || '').trim();
}

function getLayerMetaMeshKey(mesh) {
  return String(mesh?.name || mesh?.uuid || '').trim();
}

function sanitizeCompositeDisplayName(rawName) {
  const cleaned = String(rawName || '').replace(/\s+/g, ' ').trim();
  return cleaned || (currentLang === 'he' ? 'קומפוזיציה חדשה' : 'New Composition');
}

function buildCompositeKeyFromName(rawName) {
  const base = sanitizeCompositeDisplayName(rawName)
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `${Date.now()}`;
  return `${CUSTOM_COMPOSITE_PREFIX}${base}`;
}

function readLayerMetaStore() {
  try {
    const raw = localStorage.getItem(LAYER_META_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLayerMetaStore(nextStore) {
  try {
    localStorage.setItem(LAYER_META_STORAGE_KEY, JSON.stringify(nextStore || {}));
  } catch {
    // Ignore storage errors.
  }
}

function loadLayerMetaStore() {
  layerMetaStore = readLayerMetaStore();
}

function harvestCustomCategoriesFromLayerMeta() {
  Object.values(layerMetaStore).forEach((modelMap) => {
    if (!modelMap || typeof modelMap !== 'object') return;
    Object.values(modelMap).forEach((meta) => {
      const normalized = normalizeCategoryValue(meta?.category || '');
      if (!normalized || BUILTIN_CATEGORY_KEYS.has(normalized)) return;
      customLayerCategories.add(normalized);
    });
  });
}

function getLayerMetaForMesh(mesh) {
  const meshKey = getLayerMetaMeshKey(mesh);
  if (!meshKey || !currentModelKey) return null;
  const modelMap = layerMetaStore[currentModelKey];
  if (!modelMap || typeof modelMap !== 'object') return null;
  const meta = modelMap[meshKey];
  if (!meta || typeof meta !== 'object') return null;
  return {
    name: normalizeLayerMetaText(meta.name),
    category: normalizeLayerMetaText(meta.category),
  };
}

function setLayerMetaForMesh(mesh, metaPatch) {
  const meshKey = getLayerMetaMeshKey(mesh);
  if (!meshKey || !currentModelKey) return;
  const modelMap = { ...(layerMetaStore[currentModelKey] || {}) };
  const current = modelMap[meshKey] || {};
  const nextMeta = {
    name: normalizeLayerMetaText(metaPatch?.name ?? current.name),
    category: normalizeLayerMetaText(metaPatch?.category ?? current.category),
  };

  if (nextMeta.category) {
    registerCustomCategory(nextMeta.category);
  }

  if (!nextMeta.name && !nextMeta.category) {
    delete modelMap[meshKey];
  } else {
    modelMap[meshKey] = nextMeta;
  }

  if (Object.keys(modelMap).length === 0) {
    delete layerMetaStore[currentModelKey];
  } else {
    layerMetaStore[currentModelKey] = modelMap;
  }

  writeLayerMetaStore(layerMetaStore);
}

function clearLayerMetaForMesh(mesh) {
  setLayerMetaForMesh(mesh, { name: '', category: '' });
}

function syncLayerEditorFromSelection() {
  if (!layerEditNameInput || !layerEditCategoryInput) return;
  if (!selectedMesh) {
    layerEditNameInput.value = '';
    layerEditCategoryInput.value = '';
    return;
  }
  const meta = getLayerMetaForMesh(selectedMesh);
  layerEditNameInput.value = meta?.name || '';
  layerEditCategoryInput.value = meta?.category || '';
}

function normalizeCategoryValue(rawValue) {
  const cleaned = normalizeLayerMetaText(rawValue);
  return cleaned.toLowerCase();
}

function getBuiltinCategoryKeys() {
  return Array.from(BUILTIN_CATEGORY_KEYS);
}

function readCustomLayerCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_LAYER_CATEGORIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeCategoryValue(item))
      .filter((item) => item && !BUILTIN_CATEGORY_KEYS.has(item));
  } catch {
    return [];
  }
}

function writeCustomLayerCategories() {
  try {
    localStorage.setItem(CUSTOM_LAYER_CATEGORIES_STORAGE_KEY, JSON.stringify(Array.from(customLayerCategories).sort()));
  } catch {
    // Ignore storage errors.
  }
}

function loadCustomLayerCategories() {
  customLayerCategories.clear();
  readCustomLayerCategories().forEach((item) => customLayerCategories.add(item));
}

function registerCustomCategory(rawName, persist = true) {
  const normalized = normalizeCategoryValue(rawName);
  if (!normalized || BUILTIN_CATEGORY_KEYS.has(normalized)) return false;
  customLayerCategories.add(normalized);
  if (persist) writeCustomLayerCategories();
  return true;
}

function buildCategoryOptionList() {
  const builtins = getBuiltinCategoryKeys();
  const custom = Array.from(customLayerCategories).sort((a, b) => a.localeCompare(b, currentLang === 'he' ? 'he' : 'en'));
  return [...builtins, ...custom];
}

function syncLayerCategoryInputs() {
  if (layerCategoriesList) {
    layerCategoriesList.innerHTML = '';
    Array.from(customLayerCategories)
      .sort((a, b) => a.localeCompare(b, currentLang === 'he' ? 'he' : 'en'))
      .forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        layerCategoriesList.appendChild(option);
      });
  }

  if (categoryManageSelect) {
    categoryManageSelect.innerHTML = '';
    const allOptions = buildCategoryOptionList();
    allOptions.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = getCategoryLabelByValue(value);
      categoryManageSelect.appendChild(option);
    });
  }
}

function syncPartAnalysisCategoryOptions() {
  if (!partAnalysisSelect) return;
  const current = normalizeCategoryValue(partAnalysisSelect.value || 'all') || 'all';
  const options = buildCategoryOptionList();
  partAnalysisSelect.innerHTML = '';
  options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = getCategoryLabelByValue(value);
    partAnalysisSelect.appendChild(option);
  });
  partAnalysisSelect.value = options.includes(current) ? current : 'all';
}

function renameCustomCategory(oldValue, newValue) {
  const from = normalizeCategoryValue(oldValue);
  const to = normalizeCategoryValue(newValue);
  if (!from || !to || BUILTIN_CATEGORY_KEYS.has(from) || BUILTIN_CATEGORY_KEYS.has(to)) return false;
  if (from === to) return true;
  if (!customLayerCategories.has(from)) return false;

  customLayerCategories.delete(from);
  customLayerCategories.add(to);

  Object.keys(layerMetaStore).forEach((modelKey) => {
    const modelMap = layerMetaStore[modelKey];
    if (!modelMap || typeof modelMap !== 'object') return;
    Object.keys(modelMap).forEach((meshKey) => {
      const meta = modelMap[meshKey];
      if (!meta || typeof meta !== 'object') return;
      if (normalizeCategoryValue(meta.category) === from) {
        meta.category = to;
      }
    });
  });

  writeLayerMetaStore(layerMetaStore);
  writeCustomLayerCategories();
  return true;
}

function deleteCustomCategory(valueToDelete) {
  const target = normalizeCategoryValue(valueToDelete);
  if (!target || BUILTIN_CATEGORY_KEYS.has(target) || !customLayerCategories.has(target)) return false;
  customLayerCategories.delete(target);

  Object.keys(layerMetaStore).forEach((modelKey) => {
    const modelMap = layerMetaStore[modelKey];
    if (!modelMap || typeof modelMap !== 'object') return;
    Object.keys(modelMap).forEach((meshKey) => {
      const meta = modelMap[meshKey];
      if (!meta || typeof meta !== 'object') return;
      if (normalizeCategoryValue(meta.category) === target) {
        meta.category = '';
      }
    });
  });

  writeLayerMetaStore(layerMetaStore);
  writeCustomLayerCategories();
  return true;
}

function readEditedModelPresetsStore() {
  try {
    const raw = localStorage.getItem(EDITED_MODEL_PRESETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return { presets: {}, selected: '' };
    return {
      presets: parsed.presets && typeof parsed.presets === 'object' ? parsed.presets : {},
      selected: String(parsed.selected || ''),
    };
  } catch {
    return { presets: {}, selected: '' };
  }
}

function writeEditedModelPresetsStore() {
  try {
    localStorage.setItem(EDITED_MODEL_PRESETS_STORAGE_KEY, JSON.stringify(editedModelPresetsStore));
  } catch {
    // Ignore storage errors.
  }
}

function normalizeEditedModelPresetName(rawName) {
  const clean = String(rawName || '').replace(/\s+/g, ' ').trim();
  return clean || (currentLang === 'he' ? 'מודל ערוך' : 'Edited Model');
}

function buildEditedModelPresetPayload(name) {
  const resolvedName = normalizeEditedModelPresetName(name);
  saveCurrentStructureState();
  const layerMetaMap = layerMetaStore[currentModelKey] && typeof layerMetaStore[currentModelKey] === 'object'
    ? { ...layerMetaStore[currentModelKey] }
    : {};
  const structureState = readStructureStateForModel(currentModelKey);
  const customComposite = customCompositeStore[currentModelKey] && String(currentModelKey || '').startsWith(CUSTOM_COMPOSITE_PREFIX)
    ? {
      key: currentModelKey,
      labels: { ...customCompositeStore[currentModelKey].labels },
      parts: [...(customCompositeStore[currentModelKey].parts || [])],
    }
    : null;

  return {
    name: resolvedName,
    modelKey: currentModelKey,
    layerMetaMap,
    structureState,
    customComposite,
    savedAt: new Date().toISOString(),
  };
}

function syncEditedModelPresetsUi() {
  if (!editedModelPresetSelect) return;
  editedModelPresetSelect.innerHTML = '';
  const names = Object.keys(editedModelPresetsStore.presets).sort((a, b) => a.localeCompare(b, currentLang === 'he' ? 'he' : 'en'));
  if (!names.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = currentLang === 'he' ? 'אין מודלים ערוכים שמורים' : 'No saved edited models';
    editedModelPresetSelect.appendChild(empty);
    if (editedModelPresetNameInput) editedModelPresetNameInput.value = '';
    return;
  }

  names.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    editedModelPresetSelect.appendChild(option);
  });

  const selected = names.includes(editedModelPresetsStore.selected) ? editedModelPresetsStore.selected : names[0];
  editedModelPresetsStore.selected = selected;
  editedModelPresetSelect.value = selected;
  if (editedModelPresetNameInput) editedModelPresetNameInput.value = selected;
}

function saveEditedModelPreset(name) {
  const payload = buildEditedModelPresetPayload(name);
  editedModelPresetsStore.presets[payload.name] = payload;
  editedModelPresetsStore.selected = payload.name;
  writeEditedModelPresetsStore();
  syncEditedModelPresetsUi();
  return payload.name;
}

function applyEditedModelPresetToCurrentModel(preset) {
  if (!preset || !currentModel) return;
  if (preset.layerMetaMap && typeof preset.layerMetaMap === 'object') {
    layerMetaStore[currentModelKey] = { ...preset.layerMetaMap };
    writeLayerMetaStore(layerMetaStore);
    harvestCustomCategoriesFromLayerMeta();
    writeCustomLayerCategories();
    syncPartAnalysisCategoryOptions();
    syncLayerCategoryInputs();
  }

  if (preset.structureState && typeof preset.structureState === 'object') {
    const store = readStructureVisibilityStore();
    store[currentModelKey] = {
      meshes: preset.structureState.meshes && typeof preset.structureState.meshes === 'object' ? { ...preset.structureState.meshes } : {},
      folders: preset.structureState.folders && typeof preset.structureState.folders === 'object' ? { ...preset.structureState.folders } : {},
    };
    writeStructureVisibilityStore(store);
  }

  populateStructureList(currentModel);
  applyStructureFilter();
  updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
  syncLayerEditorFromSelection();
  saveCurrentStructureState();
}

function loadEditedModelPreset(name) {
  const presetName = String(name || '').trim();
  const preset = editedModelPresetsStore.presets[presetName];
  if (!preset) return false;

  if (preset.customComposite?.key && Array.isArray(preset.customComposite.parts) && preset.customComposite.parts.length) {
    const compositeName = sanitizeCompositeDisplayName(preset.customComposite.labels?.he || preset.customComposite.labels?.en || presetName);
    persistCustomCompositeOption(preset.customComposite.key, compositeName, preset.customComposite.parts);
  }

  editedModelPresetsStore.selected = presetName;
  writeEditedModelPresetsStore();
  syncEditedModelPresetsUi();

  if (preset.modelKey === currentModelKey && currentModel) {
    applyEditedModelPresetToCurrentModel(preset);
    return true;
  }

  pendingEditedModelPreset = preset;
  loadModelByKey(preset.modelKey);
  return true;
}

function resolveEffectiveCategory(baseCategory, customCategory) {
  const custom = normalizeCategoryValue(customCategory);
  if (!custom) return baseCategory;
  return custom;
}

function readCustomCompositeStore() {
  try {
    const raw = localStorage.getItem(CUSTOM_COMPOSITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCustomCompositeStore(store) {
  try {
    localStorage.setItem(CUSTOM_COMPOSITES_STORAGE_KEY, JSON.stringify(store || {}));
  } catch {
    // Ignore storage errors.
  }
}

function clearRegisteredCustomComposites() {
  customCompositeKeys.forEach((key) => {
    delete MODEL_OPTIONS[key];
    delete BASE_MODEL_OPTIONS[key];
  });
  customCompositeKeys.clear();
}

function isValidCompositeParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return false;
  return parts.every((partKey) => {
    const part = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
    return !!part && typeof part.path === 'string' && part.path.length > 0;
  });
}

function registerCustomCompositeOption(key, composite) {
  if (!String(key || '').startsWith(CUSTOM_COMPOSITE_PREFIX)) return;
  const cleanParts = Array.isArray(composite?.parts)
    ? composite.parts.filter((partKey) => {
      const part = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
      return !!part && typeof part.path === 'string' && part.path.length > 0;
    })
    : [];
  if (!cleanParts.length) return;

  const name = sanitizeCompositeDisplayName(composite?.labels?.he || composite?.labels?.en || composite?.name || key.replace(CUSTOM_COMPOSITE_PREFIX, ''));
  const normalized = {
    labels: {
      he: sanitizeCompositeDisplayName(composite?.labels?.he || name),
      en: sanitizeCompositeDisplayName(composite?.labels?.en || name),
    },
    parts: cleanParts,
  };
  MODEL_OPTIONS[key] = normalized;
  BASE_MODEL_OPTIONS[key] = normalized;
  customCompositeKeys.add(key);
}

function loadCustomCompositeModels() {
  clearRegisteredCustomComposites();
  customCompositeStore = readCustomCompositeStore();
  Object.entries(customCompositeStore).forEach(([key, composite]) => {
    registerCustomCompositeOption(key, composite);
  });
}

function persistCustomCompositeOption(key, name, parts) {
  const labels = {
    he: sanitizeCompositeDisplayName(name),
    en: sanitizeCompositeDisplayName(name),
  };
  customCompositeStore[key] = { labels, parts: [...parts] };
  writeCustomCompositeStore(customCompositeStore);
  loadCustomCompositeModels();
}

function deleteCustomCompositeOption(key) {
  if (!key || !customCompositeStore[key]) return false;
  delete customCompositeStore[key];
  writeCustomCompositeStore(customCompositeStore);
  loadCustomCompositeModels();
  return true;
}

function getComposableModelEntries() {
  return Object.entries(MODEL_OPTIONS)
    .filter(([, model]) => typeof model?.path === 'string' && model.path.length > 0)
    .sort((a, b) => getModelLabel(a[1]).localeCompare(getModelLabel(b[1]), currentLang === 'he' ? 'he' : 'en'));
}

function renderModelComposerOptions() {
  if (!composerModelsList) return;
  composerModelsList.innerHTML = '';
  const entries = getComposableModelEntries();
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'composer-model-item';
    empty.textContent = currentLang === 'he' ? 'לא נמצאו מודלים מתאימים להרכבה.' : 'No composable models found.';
    composerModelsList.appendChild(empty);
    return;
  }

  entries.forEach(([key, model]) => {
    const row = document.createElement('div');
    row.className = 'composer-model-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = key;
    checkbox.id = `composer-item-${key.replace(/[^a-z0-9_-]+/gi, '-')}`;
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = getModelLabel(model);
    row.appendChild(checkbox);
    row.appendChild(label);
    composerModelsList.appendChild(row);
  });
}

function openModelComposerDialog() {
  if (!modelComposerDialog) return;
  renderModelComposerOptions();
  syncEditedModelPresetsUi();
  if (composerNameInput) {
    composerNameInput.value = '';
    composerNameInput.placeholder = currentLang === 'he' ? 'לדוגמה: לב בתוך שלד' : 'Example: Heart inside skeleton';
  }
  openDialogNonBlocking(modelComposerDialog);
}

function getCheckedComposerPartKeys() {
  return Array.from(composerModelsList?.querySelectorAll('input[type="checkbox"]:checked') || [])
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
}

function setAllComposerSelections(checked) {
  const inputs = Array.from(composerModelsList?.querySelectorAll('input[type="checkbox"]') || []);
  inputs.forEach((input) => {
    input.checked = !!checked;
  });
}

function exportCurrentModelGlb(filenameBase, onDone) {
  if (!currentModel) return false;
  const exporter = new GLTFExporter();
  const safeBase = String(filenameBase || '').replace(/[^a-z0-9\u0590-\u05ff_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'composite-model';
  exporter.parse(
    currentModel,
    (result) => {
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeBase}.glb`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (typeof onDone === 'function') onDone(true);
    },
    (error) => {
      console.error('Export failed:', error);
      if (typeof onDone === 'function') onDone(false);
    },
    { binary: true, onlyVisible: true },
  );
  return true;
}

function waitForModelReady(expectedModelKey, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      if (currentModel && currentModelKey === expectedModelKey) {
        resolve(true);
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function isFavoriteMesh(mesh) {
  return favoritePartNames.has(getMeshDisplayName(mesh));
}

const uiControlsController = createUiControlsController({
  t,
  getCurrentLang: () => currentLang,
  pickedPartEl,
  hoverPartEl,
  statusTotalEl,
  statusVisibleEl,
  statusSelectedEl,
  favoritesOnlyBtn,
  toggleFavoriteBtn,
  analysisResult,
  partAnalysisSelect,
});

function updateStatusBar() {
  uiControlsController.updateStatusBar(structureEntries, selectedMesh);
}

function updateFavoriteControls() {
  uiControlsController.updateFavoriteControls(selectedMesh, isFavoriteMesh, favoritesOnly);
}

function getCategoryLabelByValue(value) {
  return uiControlsController.getCategoryLabelByValue(value);
}

function updateLanguageUI(reloadModel = false) {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
  populateModelSelector();
  appTitleEl.textContent = t('appTitle');
  structuresTitleEl.textContent = t('structuresTitle');
  modelSelect.setAttribute('aria-label', currentLang === 'he' ? 'בחירת מודל' : 'Choose model');
  if (refreshModelsBtn && !refreshModelsBtn.disabled) refreshModelsBtn.textContent = t('refreshModels');
  if (validateModelsBtn && !validateModelsBtn.disabled) validateModelsBtn.textContent = t('validateModels');
  if (auditFullSystemBtn) auditFullSystemBtn.textContent = currentLang === 'he' ? 'בדיקת Full System' : 'Audit Full System';
  if (fullSystemAuditTitle) fullSystemAuditTitle.textContent = currentLang === 'he' ? 'דוח Full System' : 'Full System Audit';
  if (runFullSystemAuditBtn) runFullSystemAuditBtn.textContent = currentLang === 'he' ? 'הרץ בדיקה' : 'Run Audit';
  if (closeFullSystemAuditBtn) closeFullSystemAuditBtn.textContent = currentLang === 'he' ? 'סגור' : 'Close';
  if (expandFoldersBtn) expandFoldersBtn.textContent = t('expandFolders');
  if (collapseFoldersBtn) collapseFoldersBtn.textContent = t('collapseFolders');
  filterInput.setAttribute('aria-label', currentLang === 'he' ? 'סינון מבנים' : 'Filter structures');
  filterInput.placeholder = t('filterPlaceholder');
  if (advancedSearchModeButtons.length) {
    advancedSearchModeButtons.forEach((btn) => {
      const mode = btn.getAttribute('data-search-mode');
      if (mode === 'contains') btn.textContent = currentLang === 'he' ? 'מכיל' : 'Contains';
      if (mode === 'starts') btn.textContent = currentLang === 'he' ? 'מתחיל ב' : 'Starts With';
      if (mode === 'exact') btn.textContent = currentLang === 'he' ? 'מדויק' : 'Exact';
      if (mode === 'fuzzy') btn.textContent = currentLang === 'he' ? 'חכם' : 'Fuzzy';
      btn.classList.toggle('is-active', mode === advancedSearchMode);
    });
  }
  if (advancedSearchResultsEl && advancedSearchResultsEl.children.length > 0) {
    renderAdvancedSearchResults();
  }
  updateModelClipBadge(false);
  exportBtn.textContent = t('export');
  openDetailsBtn.textContent = t('detailsBtn');
  xrayLabelText.textContent = t('xray');
  proToolsTitle.textContent = t('proToolsTitle');
  proPresetLabel.textContent = t('proPreset');
  applyProPresetBtn.textContent = t('applyPreset');
  realisticModeLabel.textContent = t('realisticMode');
  humanScaleLabel.textContent = t('humanScale');
  activityAnimLabel.textContent = t('activityAnim');
  activitySpeedLabel.textContent = t('activitySpeed');
  activityPlayBtn.textContent = t('activityPlay');
  activityPauseBtn.textContent = t('activityPause');
  activityResetBtn.textContent = t('activityReset');
  timelineStartBtn.textContent = t('timelineStart');
  timelineStopBtn.textContent = t('timelineStop');
  systemDemoLabel.textContent = t('systemDemo');
  systemDemoStartBtn.textContent = t('systemDemoStart');
  systemDemoStopBtn.textContent = t('systemDemoStop');
  performanceModeLabel.textContent = t('performanceMode');
  adaptiveQualityLabel.textContent = t('adaptiveQuality');
  const opacityLabel = document.querySelector('label[for="xrayOpacity"]');
  if (opacityLabel) opacityLabel.textContent = t('opacity');
  analyzePartBtn.textContent = t('analyze');
  isolatePartBtn.textContent = t('isolate');
  resetIsolationBtn.textContent = t('reset');
  showAllBtn.textContent = t('showAll');
  hideAllBtn.textContent = t('hideAll');
  invertVisibilityBtn.textContent = t('invert');
  clearSelectionBtn.textContent = t('clearSelection');
  if (addCategoryBtn) addCategoryBtn.textContent = currentLang === 'he' ? 'הוסף קטגוריה' : 'Add Category';
  if (renameCategoryBtn) renameCategoryBtn.textContent = currentLang === 'he' ? 'ערוך שם קטגוריה' : 'Rename Category';
  if (deleteCategoryBtn) deleteCategoryBtn.textContent = currentLang === 'he' ? 'מחק קטגוריה' : 'Delete Category';
  if (editedModelSaveBtn) editedModelSaveBtn.textContent = currentLang === 'he' ? 'שמור מצב ערוך' : 'Save Edited State';
  if (editedModelLoadBtn) editedModelLoadBtn.textContent = currentLang === 'he' ? 'טען מצב ערוך' : 'Load Edited State';
  if (editedModelRenameBtn) editedModelRenameBtn.textContent = currentLang === 'he' ? 'ערוך שם' : 'Rename';
  if (editedModelDeleteBtn) editedModelDeleteBtn.textContent = currentLang === 'he' ? 'מחק' : 'Delete';
  if (categoryManageNameInput) {
    categoryManageNameInput.placeholder = currentLang === 'he' ? 'שם קטגוריה חדשה או ערוכה' : 'New or renamed category';
  }
  if (editedModelPresetNameInput) {
    editedModelPresetNameInput.placeholder = currentLang === 'he' ? 'לדוגמה: שלד לימודי ללא שרירים' : 'Example: teaching skeleton without muscles';
  }
  const categoryManageSelectLabel = document.querySelector('label[for="categoryManageSelect"]');
  if (categoryManageSelectLabel) categoryManageSelectLabel.textContent = currentLang === 'he' ? 'קטגוריה לעריכה' : 'Category To Edit';
  const categoryManageNameLabel = document.querySelector('label[for="categoryManageNameInput"]');
  if (categoryManageNameLabel) categoryManageNameLabel.textContent = currentLang === 'he' ? 'שם קטגוריה' : 'Category Name';
  const editedPresetSelectLabel = document.querySelector('label[for="editedModelPresetSelect"]');
  if (editedPresetSelectLabel) editedPresetSelectLabel.textContent = currentLang === 'he' ? 'מודל ערוך' : 'Edited Model';
  const editedPresetNameLabel = document.querySelector('label[for="editedModelPresetNameInput"]');
  if (editedPresetNameLabel) editedPresetNameLabel.textContent = currentLang === 'he' ? 'שם מודל ערוך' : 'Edited Model Name';
  if (layerIconExpandBtn) {
    layerIconExpandBtn.title = t('expandFolders');
    layerIconExpandBtn.setAttribute('aria-label', t('expandFolders'));
  }
  if (layerIconCollapseBtn) {
    layerIconCollapseBtn.title = t('collapseFolders');
    layerIconCollapseBtn.setAttribute('aria-label', t('collapseFolders'));
  }
  if (layerIconShowBtn) {
    layerIconShowBtn.title = t('showAll');
    layerIconShowBtn.setAttribute('aria-label', t('showAll'));
  }
  if (layerIconHideBtn) {
    layerIconHideBtn.title = t('hideAll');
    layerIconHideBtn.setAttribute('aria-label', t('hideAll'));
  }
  if (layerIconInvertBtn) {
    layerIconInvertBtn.title = t('invert');
    layerIconInvertBtn.setAttribute('aria-label', t('invert'));
  }
  if (layerIconClearBtn) {
    layerIconClearBtn.title = t('clearSelection');
    layerIconClearBtn.setAttribute('aria-label', t('clearSelection'));
  }
  if (composerSelectAllBtn) {
    composerSelectAllBtn.textContent = currentLang === 'he' ? 'בחר הכל' : 'Select All';
  }
  if (composerClearAllBtn) {
    composerClearAllBtn.textContent = currentLang === 'he' ? 'נקה בחירה' : 'Clear Selection';
  }
  if (composerExportBtn) {
    composerExportBtn.textContent = currentLang === 'he' ? 'ייצא GLB' : 'Export GLB';
  }
  if (xyzFloatingGridStyleBtn) {
    xyzFloatingGridStyleBtn.title = currentLang === 'he' ? 'הגדרות גריד' : 'Grid settings';
    xyzFloatingGridStyleBtn.setAttribute('aria-label', xyzFloatingGridStyleBtn.title);
  }
  if (xyzDebugStateBtn) {
    xyzDebugStateBtn.textContent = currentLang === 'he' ? 'דיבאג XYZ' : 'Debug XYZ';
  }
  syncSafeRenderButtonUi();
  if (xyzUnlockAllBtn) {
    xyzUnlockAllBtn.textContent = currentLang === 'he' ? 'שחרר הכל' : 'Unlock All';
  }
  if (xyzPanicResetBtn) {
    xyzPanicResetBtn.textContent = currentLang === 'he' ? 'איפוס חירום XYZ' : 'Panic Reset XYZ';
  }
  if (xyzHighlightLocksBtn) {
    xyzHighlightLocksBtn.textContent = currentLang === 'he' ? 'הדגש נעילות' : 'Highlight Locks';
    xyzHighlightLocksBtn.classList.toggle('is-active', xyzHighlightLocksEnabled);
  }
  if (xyzAutoUnlockToggle) {
    xyzAutoUnlockToggle.checked = !!xyzAutoUnlockOnMove;
    const labelEl = document.querySelector('label[for="xyzAutoUnlockToggle"] span');
    if (labelEl) labelEl.textContent = currentLang === 'he' ? 'שחרור אוטומטי בזמן תזוזה' : 'Auto Unlock On Move';
  }
  if (xyzVerboseDebugToggle) {
    xyzVerboseDebugToggle.checked = !!xyzVerboseDebugEnabled;
  }
  const verboseLabelEl = document.getElementById('xyzVerboseDebugLabel');
  if (verboseLabelEl) {
    verboseLabelEl.textContent = currentLang === 'he' ? 'דיבאג צפוף' : 'Verbose Debug';
  }
  if (xyzDebugClearBtn) {
    xyzDebugClearBtn.textContent = currentLang === 'he' ? 'נקה לוג' : 'Clear Log';
  }
  if (xyzDebugCopyBtn) {
    xyzDebugCopyBtn.textContent = currentLang === 'he' ? 'העתק לוג' : 'Copy Log';
  }
  if (xyzSaveWorkspaceBtn) {
    xyzSaveWorkspaceBtn.textContent = currentLang === 'he' ? 'שמור תצוגה' : 'Save View';
  }
  if (xyzLoadWorkspaceBtn) {
    xyzLoadWorkspaceBtn.textContent = currentLang === 'he' ? 'טען תצוגה' : 'Load View';
  }
  if (xyzResetWorkspaceBtn) {
    xyzResetWorkspaceBtn.textContent = currentLang === 'he' ? 'אפס שמירה' : 'Reset Saved';
  }
  const profileLabelEl = document.querySelector('label[for="xyzWorkspaceProfileSelect"]');
  if (profileLabelEl) profileLabelEl.textContent = currentLang === 'he' ? 'פרופיל' : 'Profile';
  if (xyzWorkspaceProfileName) {
    xyzWorkspaceProfileName.placeholder = currentLang === 'he' ? 'שם פרופיל' : 'profile name';
  }
  if (xyzWorkspaceSaveAsBtn) {
    xyzWorkspaceSaveAsBtn.textContent = currentLang === 'he' ? 'שמור בשם' : 'Save As';
  }
  if (xyzWorkspaceDeleteBtn) {
    xyzWorkspaceDeleteBtn.textContent = currentLang === 'he' ? 'מחק' : 'Delete';
  }
  if (xyzWorkspaceExportBtn) {
    xyzWorkspaceExportBtn.textContent = currentLang === 'he' ? 'ייצא' : 'Export';
  }
  if (xyzWorkspaceImportBtn) {
    xyzWorkspaceImportBtn.textContent = currentLang === 'he' ? 'ייבא' : 'Import';
  }
  if (xyzWorkspaceAutoSaveSec) {
    const secLabelEl = document.querySelector('label[for="xyzWorkspaceAutoSaveSec"]');
    if (secLabelEl) secLabelEl.textContent = currentLang === 'he' ? 'שנ׳' : 'Sec';
  }
  const autoSaveLabelEl = document.getElementById('xyzWorkspaceAutoSaveLabel');
  if (autoSaveLabelEl) {
    autoSaveLabelEl.textContent = currentLang === 'he' ? 'שמירה אוטומטית לתצוגה' : 'Auto Save View';
  }
  if (xyzBackupAllBtn) {
    xyzBackupAllBtn.textContent = currentLang === 'he' ? 'גיבוי מלא' : 'Backup All';
  }
  if (xyzRestoreAllBtn) {
    xyzRestoreAllBtn.textContent = currentLang === 'he' ? 'שחזור מלא' : 'Restore All';
  }
  if (xyzDebugFab) {
    xyzDebugFab.textContent = currentLang === 'he' ? 'דיבאג' : 'DBG';
    xyzDebugFab.title = currentLang === 'he' ? 'פתח דיבאג XYZ' : 'Open XYZ debug';
    xyzDebugFab.setAttribute('aria-label', xyzDebugFab.title);
  }
  focusSelectedBtn.textContent = t('focusSelected');
  resetViewBtn.textContent = t('resetView');
  zoomInBtn.textContent = t('zoomIn');
  zoomOutBtn.textContent = t('zoomOut');
  angleFrontBtn.textContent = t('angleFront');
  angleSideBtn.textContent = t('angleSide');
  angleTopBtn.textContent = t('angleTop');
  advancedToolsTitle.textContent = t('advancedToolsTitle');
  highlightNeighborsBtn.textContent = t('highlightNeighbors');
  clearNeighborsBtn.textContent = t('clearNeighbors');
  studyModeToggleBtn.textContent = studyModeEnabled ? t('studyModeOn') : t('studyModeOff');
  studyRevealBtn.textContent = t('studyReveal');
  studyNextBtn.textContent = t('studyNext');
  compareModelLabel.textContent = t('compareModel');
  compareToggleBtn.textContent = compareEnabled ? t('compareOff') : t('compareOn');
  compareClearBtn.textContent = t('compareClear');
  layerPresetLabel.textContent = t('layerPreset');
  applyLayerPresetBtn.textContent = t('applyLayer');
  resetLayerPresetBtn.textContent = t('resetLayer');
  bookmarkLabel.textContent = t('bookmarks');
  bookmarkSaveBtn.textContent = t('saveBookmark');
  bookmarkGoBtn.textContent = t('goBookmark');
  clinicalTourStartBtn.textContent = t('clinicalTourStart');
  clinicalTourStopBtn.textContent = t('clinicalTourStop');
  if (!clinicalTourTimer) clinicalTourStatus.textContent = t('clinicalTourReady');
  if (!studyModeEnabled) updateStudyStatus(t('studyIdle'));
  exportImageBtn.textContent = t('exportImage');
  if (!videoRecorder || videoRecorder.state !== 'recording') {
    recordVideoBtn.textContent = t('recordVideo');
  }
  closeDetailsBtn.textContent = t('close');
  langToggleBtn.title = t('langTitle');
  langToggleBtn.setAttribute('aria-label', t('langTitle'));
  langToggleBtn.textContent = `🌐 ${currentLang === 'he' ? 'EN' : 'HE'}`;

  const categoryOptions = Array.from(partAnalysisSelect.options);
  partAnalysisSelect.setAttribute('aria-label', currentLang === 'he' ? 'ניתוח חלק גוף' : 'Analyze body part');
  categoryOptions.forEach((opt) => {
    opt.textContent = getCategoryLabelByValue(opt.value);
  });

  const tablist = document.querySelector('.part-tabs');
  if (tablist) {
    tablist.setAttribute('aria-label', currentLang === 'he' ? 'תוכן מפורט' : 'Detailed content');
  }

  document.getElementById('tabInfoBtn').textContent = t('tabInfo');
  document.getElementById('tabAnimationsBtn').textContent = t('tabAnimations');
  document.getElementById('tabImagesBtn').textContent = t('tabImages');
  document.getElementById('tabVideosBtn').textContent = t('tabVideos');

  const animOptions = Array.from(activityAnimSelect.options);
  const presetOptions = Array.from(proPresetSelect.options);
  const systemOptions = Array.from(systemDemoSelect.options);
  const perfOptions = Array.from(performanceModeSelect.options);
  const labelsByMode = {
    none: t('activityNone'),
    breathing: t('activityBreathing'),
    gait: t('activityGait'),
    presentation: t('activityPresentation'),
    explode: t('activityExplode'),
  };
  animOptions.forEach((opt) => {
    opt.textContent = labelsByMode[opt.value] || opt.value;
  });

  const presetLabels = {
    custom: t('presetCustom'),
    clinical: t('presetClinical'),
    teaching: t('presetTeaching'),
    presentation: t('presetPresentation'),
  };
  presetOptions.forEach((opt) => {
    opt.textContent = presetLabels[opt.value] || opt.value;
  });

  const systemLabels = {
    heart: t('systemHeart'),
    respiratory: t('systemRespiratory'),
    circulatory: t('systemCirculatory'),
    lymphatic: t('systemLymphatic'),
    urinary: t('systemUrinary'),
    head: t('systemHead'),
  };
  systemOptions.forEach((opt) => {
    opt.textContent = systemLabels[opt.value] || opt.value;
  });

  const perfLabels = {
    balanced: t('perfBalanced'),
    max: t('perfMax'),
    quality: t('perfQuality'),
  };
  perfOptions.forEach((opt) => {
    opt.textContent = perfLabels[opt.value] || opt.value;
  });

  const layerLabels = {
    all: t('layerAll'),
    bone: t('layerBone'),
    muscle: t('layerMuscle'),
    nerve: t('layerNerve'),
    vessel: t('layerVessel'),
  };
  Array.from(layerPresetSelect.options).forEach((opt) => {
    opt.textContent = layerLabels[opt.value] || opt.value;
  });

  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  updateTimelineStatusUI();
  updateSystemDemoStatusUI();
  updatePerformanceStatusUI();
  if (!analysisResult.textContent || analysisResult.textContent.includes('Analysis:') || analysisResult.textContent.includes('ניתוח:')) {
    analysisResult.textContent = t('analysisHint');
  }
  footerTextEl.innerHTML = t('footerHtml');

  updatePickedPartName(selectedMesh ? (selectedMesh.userData.listName || formatStructureName(selectedMesh.name)) : '');
  updateHoverPartName(hoveredMesh ? (hoveredMesh.userData.listName || formatStructureName(hoveredMesh.name)) : '');
  updateFavoriteControls();
  updateStatusBar();
  populateCompareModelSelector();
  populateBookmarkSelector();
  updateDirectLibraryLabels();
  renderDirectModelsList();
  renderDirectAnimationsList(directAnimationCatalog);
  renderAnimationsGalleryGrid(directAnimationCatalog);
  renderModelComposerOptions();
  syncPartAnalysisCategoryOptions();
  syncLayerCategoryInputs();
  syncEditedModelPresetsUi();
  updateStructureFoldersVisibility();

  if (selectedMesh && partDetailsDialog.open) {
    openMeshDetails(selectedMesh);
  }
  if (reloadModel) {
    loadModelByKey(currentModelKey);
  }
  updateSelectionAssistBadge();
  syncXyzFloatingFollowButton();
  syncModelPinButton();
  syncRenderProfileButtonsUi();
  updateXyzGridToggleUi();
}

function setAnimationMode(mode) {
  animationMode = mode;
  if (!selectedMesh) return;
  selectedMesh.position.y = selectedMesh.userData._baseY || selectedMesh.position.y;
  selectedMesh.scale.copy(selectedMesh.userData._baseScale || selectedMesh.scale);
  if (mode === 'isolate') {
    structureEntries.forEach((entry) => {
      const show = entry.mesh === selectedMesh;
      entry.mesh.visible = show;
      entry.checkbox.checked = show;
    });
  }
  if (mode === 'none') {
    runPartAnalysis();
  }
}

const detailsDialogController = createDetailsDialogController({
  dialog: partDetailsDialog,
  titleEl: partDetailsTitle,
  openXyzBtn: openXyzFromDetailsBtn,
  openXyzLockBtn: openXyzLockFromDetailsBtn,
  openXyzUnlockBtn: openXyzUnlockFromDetailsBtn,
  tabButtons,
  tabPanels,
  tabPanelInfo,
  tabPanelAnimations,
  tabPanelImages,
  tabPanelVideos,
  getCurrentLang: () => currentLang,
  t,
  setAnimationMode,
  setCameraAutoRotate: (enabled, speed) => {
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = speed;
  },
  getAvailableModelClips: () => getAvailableModelClipNames(),
  playModelClip: (index) => playModelClipByIndex(index),
  stopModelClip: () => stopRealModelClipPlayback(),
  onOpenXyzTool: (mesh) => {
    if (!mesh) return;
    setSelectedMesh(mesh);
    if (!xyzGridVisible) {
      toggleXyzGrid();
    }
    openXyzFloatingDialog();
    focusMesh(mesh);
    setXyzStatusMessage('XYZ: כלי הכיול נפתח לאיבר הנבחר', 'XYZ: calibration tool opened for selected element');
  },
  onOpenXyzLockTool: (mesh) => {
    if (!mesh) return;
    setSelectedMesh(mesh);
    if (!xyzGridVisible) {
      toggleXyzGrid();
    }
    openXyzFloatingDialog();
    focusMesh(mesh);
    const root = getTransformRootFromMesh(mesh);
    if (root) {
      root.userData._xyzLocked = true;
    }
    updateXyzSelectionStatus();
    setXyzStatusMessage('XYZ: הכלי נפתח והאיבר ננעל', 'XYZ: tool opened and element locked');
  },
  onOpenXyzUnlockTool: (mesh) => {
    if (!mesh) return;
    setSelectedMesh(mesh);
    if (!xyzGridVisible) {
      toggleXyzGrid();
    }
    openXyzFloatingDialog();
    focusMesh(mesh);
    const root = getTransformRootFromMesh(mesh);
    if (root) {
      root.userData._xyzLocked = false;
    }
    updateXyzSelectionStatus();
    setXyzStatusMessage('XYZ: הכלי נפתח והנעילה בוטלה', 'XYZ: tool opened and element unlocked');
  },
});

function activateDialogTab(tabName) {
  detailsDialogController.activateDialogTab(tabName);
}

function openMeshDetails(mesh) {
  if (!mesh) return;
  const activeEl = document.activeElement;
  detailsTriggerEl = activeEl && activeEl !== document.body ? activeEl : null;
  detailsDialogController.openMeshDetails(mesh);
}

function getAllMeshes() {
  return structureEntries.map((entry) => entry.mesh);
}

function populateCompareModelSelector() {
  if (!compareModelSelect) return;
  compareModelSelect.innerHTML = '';
  Object.entries(MODEL_OPTIONS).forEach(([key, model]) => {
    if (key === currentModelKey) return;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = getModelLabel(model);
    compareModelSelect.appendChild(option);
  });
}

function populateBookmarkSelector() {
  if (!bookmarkSelect) return;
  bookmarkSelect.innerHTML = '';
  if (!cameraBookmarks.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t('bookmarkDefault');
    bookmarkSelect.appendChild(empty);
    return;
  }
  cameraBookmarks.forEach((bookmark, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = bookmark.label;
    bookmarkSelect.appendChild(option);
  });
}

function getFolderNameByCategory(category) {
  const labels = {
    all: currentLang === 'he' ? 'כללי' : 'General',
    head: t('head'),
    'upper-limb': t('upperLimb'),
    'lower-limb': t('lowerLimb'),
    spine: t('spine'),
    thorax: t('thorax'),
    'internal-organs': t('internalOrgans'),
    'abdomen-pelvis': t('abdomenPelvis'),
    vascular: t('vascular'),
    nervous: t('nervous'),
    other: t('other'),
  };
  return labels[category] || labels.other;
}

function inferStructureFolderName(displayName, category) {
  const rawName = String(displayName || '').trim();
  if (!rawName) {
    if (category && !BUILTIN_CATEGORY_KEYS.has(category)) return category;
    return getFolderNameByCategory(category);
  }

  const withoutTrailingIndex = rawName.replace(/\s+[#-]?\d+$/, '').trim();
  if (withoutTrailingIndex && withoutTrailingIndex !== rawName) {
    return withoutTrailingIndex;
  }

  const figureGeometryMatch = rawName.match(/^(Figure\s*\d+\s*geometry)/i);
  if (figureGeometryMatch?.[1]) {
    return figureGeometryMatch[1];
  }

  if (category && !BUILTIN_CATEGORY_KEYS.has(category)) return category;
  return getFolderNameByCategory(category);
}

function readStructureVisibilityStore() {
  try {
    const raw = localStorage.getItem(STRUCTURE_VISIBILITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStructureVisibilityStore(store) {
  try {
    localStorage.setItem(STRUCTURE_VISIBILITY_STORAGE_KEY, JSON.stringify(store || {}));
  } catch {
    // Ignore storage errors.
  }
}

function getStructureMeshStateKey(mesh, displayName = '') {
  return String(mesh?.userData?.partKey || mesh?.name || displayName || mesh?.uuid || '').trim();
}

function readStructureStateForModel(modelKey = currentModelKey) {
  const store = readStructureVisibilityStore();
  const bucket = store[String(modelKey || '')] || {};
  const meshes = bucket.meshes && typeof bucket.meshes === 'object' ? bucket.meshes : {};
  const folders = bucket.folders && typeof bucket.folders === 'object' ? bucket.folders : {};
  return { meshes, folders };
}

function saveCurrentStructureState() {
  const modelKey = String(currentModelKey || '').trim();
  if (!modelKey) return;

  const store = readStructureVisibilityStore();
  const meshes = {};
  const folders = {};

  structureEntries.forEach((entry) => {
    const meshKey = getStructureMeshStateKey(entry.mesh, entry.displayName || entry.baseDisplayName);
    if (!meshKey) return;
    meshes[meshKey] = !!entry.mesh?.visible;
  });

  structureFolders.forEach((folder) => {
    if (!folder?.name) return;
    folders[folder.name] = !!folder.rootEl?.open;
  });

  store[modelKey] = { meshes, folders };
  writeStructureVisibilityStore(store);
}

function setFolderEntriesVisibility(folder, visible) {
  if (!folder?.name) return;
  structureEntries.forEach((entry) => {
    if (entry.folderName !== folder.name) return;
    entry.mesh.visible = !!visible;
    entry.checkbox.checked = !!visible;
  });
  runPartAnalysis();
  updateStatusBar();
  updateFolderHeader(folder);
  saveCurrentStructureState();
}

function updateFolderHeader(folder) {
  if (!folder?.summaryEl) return;
  const totalCount = folder.items.length;
  const visibleCount = folder.items.filter((item) => item.itemEl.style.display !== 'none').length;
  const activeCount = folder.items.filter((item) => !!item.mesh?.visible).length;
  const countLabel = `${activeCount}/${totalCount}`;
  if (folder.summaryLabelEl) {
    folder.summaryLabelEl.textContent = `${folder.name}`;
  } else {
    folder.summaryEl.textContent = `${folder.name} (${countLabel})`;
  }
  if (folder.summaryCountEl) {
    folder.summaryCountEl.textContent = countLabel;
    folder.summaryCountEl.classList.remove('is-all', 'is-partial', 'is-none');
    if (totalCount <= 0 || activeCount <= 0) {
      folder.summaryCountEl.classList.add('is-none');
    } else if (activeCount >= totalCount) {
      folder.summaryCountEl.classList.add('is-all');
    } else {
      folder.summaryCountEl.classList.add('is-partial');
    }
    folder.summaryCountEl.title = currentLang === 'he'
      ? `שכבות פעילות: ${countLabel}`
      : `Active layers: ${countLabel}`;
  }
  if (folder.selectAllBtn) {
    folder.selectAllBtn.textContent = currentLang === 'he' ? 'בחר הכול' : 'Select All';
  }
  if (folder.closeAllBtn) {
    folder.closeAllBtn.textContent = currentLang === 'he' ? 'סגור הכול' : 'Close All';
  }
}

function updateStructureFoldersVisibility() {
  structureFolders.forEach((folder) => {
    const visibleCount = folder.items.filter((item) => item.itemEl.style.display !== 'none').length;
    folder.rootEl.style.display = visibleCount > 0 ? 'block' : 'none';
    updateFolderHeader(folder);
  });
}

function setAllStructureFoldersOpen(open) {
  structureFolders.forEach((folder) => {
    folder.rootEl.open = !!open;
  });
  saveCurrentStructureState();
}

function clearNeighborHighlight() {
  structureEntries.forEach((entry) => {
    if (entry.item) entry.item.classList.remove('hovered');
    const mat = entry.mesh?.material;
    const mats = Array.isArray(mat) ? mat : (mat ? [mat] : []);
    mats.forEach((m) => {
      if (!m?.emissive || !m.userData?._neighborHighlight) return;
      m.emissive.copy(m.userData._neighborHighlight.originalEmissive);
      m.emissiveIntensity = m.userData._neighborHighlight.originalIntensity;
      delete m.userData._neighborHighlight;
      m.needsUpdate = true;
    });
  });
}

function highlightNearestNeighbors(count = 8) {
  if (!selectedMesh) return;
  clearNeighborHighlight();
  const selectedCenter = selectedMesh.getWorldPosition(new THREE.Vector3());
  const candidates = structureEntries
    .filter((entry) => entry.mesh !== selectedMesh && entry.mesh.visible)
    .map((entry) => {
      const center = entry.mesh.getWorldPosition(new THREE.Vector3());
      return { entry, distance: center.distanceToSquared(selectedCenter) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);

  candidates.forEach(({ entry }) => {
    if (entry.item) entry.item.classList.add('hovered');
    const mat = entry.mesh?.material;
    const mats = Array.isArray(mat) ? mat : (mat ? [mat] : []);
    mats.forEach((m) => {
      if (!m?.emissive) return;
      if (!m.userData._neighborHighlight) {
        m.userData._neighborHighlight = {
          originalEmissive: m.emissive.clone(),
          originalIntensity: typeof m.emissiveIntensity === 'number' ? m.emissiveIntensity : 1,
        };
      }
      m.emissive.setHex(0x34c5f3);
      m.emissiveIntensity = 0.95;
      m.needsUpdate = true;
    });
  });
}

function updateStudyStatus(message = '') {
  if (!studyStatus) return;
  studyStatus.textContent = message || t('studyIdle');
}

function nextStudyQuestion() {
  if (!studyModeEnabled) return;
  const visibleEntries = structureEntries.filter((entry) => entry.mesh.visible);
  if (!visibleEntries.length) {
    updateStudyStatus(t('studyIdle'));
    return;
  }
  const target = visibleEntries[Math.floor(Math.random() * visibleEntries.length)];
  studyCurrentAnswer = getMeshDisplayName(target.mesh);
  studyScoreTotal += 1;
  updateStudyStatus(tf('studyPrompt', studyCurrentAnswer));
}

function toggleStudyMode() {
  studyModeEnabled = !studyModeEnabled;
  studyModeToggleBtn.textContent = studyModeEnabled ? t('studyModeOn') : t('studyModeOff');
  structureEntries.forEach((entry) => {
    const labelEl = entry.item?.querySelector('label');
    if (!labelEl) return;
    labelEl.textContent = studyModeEnabled ? '???' : entry.displayName;
  });
  if (!studyModeEnabled) {
    studyCurrentAnswer = '';
    updateStudyStatus(t('studyIdle'));
    return;
  }
  nextStudyQuestion();
}

function revealStudyAnswer() {
  if (!studyModeEnabled || !studyCurrentAnswer) return;
  updateStudyStatus(tf('studyPrompt', studyCurrentAnswer));
}

function checkStudyAnswer(mesh) {
  if (!studyModeEnabled || !studyCurrentAnswer || !mesh) return;
  const answer = getMeshDisplayName(mesh);
  if (answer === studyCurrentAnswer) {
    studyScoreCorrect += 1;
    updateStudyStatus(tf('studyCorrect', studyScoreCorrect, studyScoreTotal));
    setTimeout(() => {
      if (studyModeEnabled) nextStudyQuestion();
    }, 600);
  } else {
    updateStudyStatus(t('studyWrong'));
  }
}

function applyLayerPreset(preset) {
  const keywordsByPreset = {
    bone: ['bone', 'skull', 'vertebra', 'rib', 'mandible', 'maxilla', 'עצם', 'חוליה', 'גולגולת'],
    muscle: ['muscle', 'pector', 'bicep', 'tricep', 'deltoid', 'שריר'],
    nerve: ['nerve', 'plexus', 'ganglion', 'עצב'],
    vessel: ['arter', 'vein', 'vascular', 'aorta', 'דם', 'עורק', 'וריד'],
  };

  const keywords = keywordsByPreset[preset] || [];
  let visibleCount = 0;
  structureEntries.forEach((entry) => {
    if (preset === 'all') {
      entry.mesh.visible = true;
      entry.checkbox.checked = true;
      visibleCount += 1;
      return;
    }
    const show = keywords.some((keyword) => entry.searchName.includes(keyword));
    entry.mesh.visible = show;
    entry.checkbox.checked = show;
    if (show) visibleCount += 1;
  });

  if (preset !== 'all' && visibleCount === 0) {
    structureEntries.forEach((entry) => {
      entry.mesh.visible = true;
      entry.checkbox.checked = true;
    });
    analysisResult.textContent = t('layerNoMatchFallback');
  }

  updateStatusBar();
}

function saveCameraBookmark() {
  const index = cameraBookmarks.length + 1;
  cameraBookmarks.push({
    label: `${currentLang === 'he' ? 'סימניה' : 'Bookmark'} ${index}`,
    cameraPos: camera.position.toArray(),
    target: controls.target.toArray(),
    model: currentModelKey,
    selectedName: selectedMesh ? getMeshDisplayName(selectedMesh) : '',
  });
  if (cameraBookmarks.length > 8) cameraBookmarks.shift();
  populateBookmarkSelector();
}

function goToCameraBookmark() {
  const idx = Number.parseInt(bookmarkSelect.value || '', 10);
  const bookmark = cameraBookmarks[idx];
  if (!bookmark) return;
  if (bookmark.model !== currentModelKey) {
    pendingBookmark = bookmark;
    modelSelect.value = bookmark.model;
    loadModelByKey(bookmark.model);
    return;
  }
  camera.position.fromArray(bookmark.cameraPos);
  controls.target.fromArray(bookmark.target);
  controls.update();
}

function stopClinicalTour() {
  if (clinicalTourTimer) {
    clearInterval(clinicalTourTimer);
    clinicalTourTimer = null;
  }
  clinicalTourStep = 0;
  clinicalTourStatus.textContent = t('clinicalTourReady');
}

function startClinicalTour() {
  stopClinicalTour();
  const phases = [
    currentLang === 'he' ? 'מיקוד איבר' : 'Focus part',
    currentLang === 'he' ? 'רנטגן' : 'XRAY',
    currentLang === 'he' ? 'שכנים' : 'Neighbors',
    currentLang === 'he' ? 'פרטים מלאים' : 'Open details',
  ];
  clinicalTourStatus.textContent = tf('clinicalTourRunning', phases[0]);
  clinicalTourTimer = setInterval(() => {
    clinicalTourStep += 1;
    const visible = structureEntries.find((entry) => entry.mesh.visible)?.mesh || null;
    if (clinicalTourStep === 1 && visible) {
      setSelectedMesh(visible);
      focusMesh(visible);
    } else if (clinicalTourStep === 2) {
      xrayEnabled = true;
      xrayToggle.checked = true;
      applyXrayToCurrentModel();
    } else if (clinicalTourStep === 3) {
      highlightNearestNeighbors(8);
    } else if (clinicalTourStep === 4 && selectedMesh) {
      openMeshDetails(selectedMesh);
    }
    if (clinicalTourStep >= phases.length) {
      stopClinicalTour();
      return;
    }
    clinicalTourStatus.textContent = tf('clinicalTourRunning', phases[clinicalTourStep]);
  }, 2200);
}

function getExplodeTargets() {
  if (!currentModel) return [];
  if (!currentModel.userData._explodeTargets) {
    const targets = [];
    currentModel.traverse((child) => {
      if (targets.length >= 420) return;
      if (!child.isMesh) return;
      targets.push(child);
    });
    currentModel.userData._explodeTargets = targets;
  }
  return currentModel.userData._explodeTargets;
}

function applyExplodeState(amount) {
  if (!currentModel) return;
  const box = new THREE.Box3().setFromObject(currentModel);
  const center = box.getCenter(new THREE.Vector3());
  const targets = getExplodeTargets();
  targets.forEach((mesh) => {
    if (!mesh.userData._explodeBasePos) {
      mesh.userData._explodeBasePos = mesh.position.clone();
    }
    if (!mesh.userData._explodeDir) {
      const worldPos = mesh.getWorldPosition(new THREE.Vector3());
      const dir = worldPos.sub(center);
      if (dir.lengthSq() < 1e-6) {
        dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      }
      mesh.userData._explodeDir = dir.normalize();
    }
    const dir = mesh.userData._explodeDir;
    mesh.position
      .copy(mesh.userData._explodeBasePos)
      .addScaledVector(dir, amount);
  });
}

function applyHumanScaleMode() {
  if (!currentModel) return;
  if (!currentModel.userData._humanBaseScale) {
    currentModel.userData._humanBaseScale = currentModel.scale.clone();
  }

  const baseScale = currentModel.userData._humanBaseScale;
  currentModel.scale.copy(baseScale);
  if (humanScaleModeEnabled) {
    const box = new THREE.Box3().setFromObject(currentModel);
    const height = Math.max(box.max.y - box.min.y, 0.001);
    const targetHeight = 1.75;
    currentModel.scale.multiplyScalar(targetHeight / height);
  }

  const centeredBox = new THREE.Box3().setFromObject(currentModel);
  const center = centeredBox.getCenter(new THREE.Vector3());
  currentModel.position.sub(center);
  fitCameraToCurrentModel();
}

function applyProfessionalMode() {
  renderer.toneMapping = realisticModeEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = realisticModeEnabled ? 1.15 : 1;
  // Keep viewport background tied to the selected theme palette.
  applyThemePalette(getCurrentThemeName());

  ambientLight.intensity = realisticModeEnabled ? 0.85 : 0.6;
  directionalLight.intensity = realisticModeEnabled ? 1.15 : 0.8;
  fillLight.visible = realisticModeEnabled;

  getAllMeshes().forEach((mesh) => {
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((mat) => {
      if (!mat) return;
      if (!mat.userData._realOriginal) {
        mat.userData._realOriginal = {
          roughness: mat.roughness,
          metalness: mat.metalness,
          envMapIntensity: mat.envMapIntensity,
        };
      }

      if (realisticModeEnabled) {
        if (typeof mat.roughness === 'number') mat.roughness = Math.max(0.08, mat.roughness * 0.8);
        if (typeof mat.metalness === 'number') mat.metalness = Math.min(0.35, mat.metalness + 0.05);
        if (typeof mat.envMapIntensity === 'number') mat.envMapIntensity = Math.max(0.9, mat.envMapIntensity);
      } else {
        const original = mat.userData._realOriginal;
        if (typeof original.roughness === 'number') mat.roughness = original.roughness;
        if (typeof original.metalness === 'number') mat.metalness = original.metalness;
        if (typeof original.envMapIntensity === 'number') mat.envMapIntensity = original.envMapIntensity;
      }
      mat.needsUpdate = true;
    });
  });

  sizeReferenceGroup.visible = humanScaleModeEnabled;
}

function applyProfessionalPresentationState() {
  if (!currentModel) return;

  if (activityPaused) return;

  if (!currentModel.userData._activityBasePos) {
    currentModel.userData._activityBasePos = currentModel.position.clone();
    currentModel.userData._activityBaseRotY = currentModel.rotation.y;
  }

  if (activityAnimMode !== 'presentation') {
    controls.autoRotate = false;
  }

  if (activityAnimMode === 'none') {
    applyExplodeState(0);
    // Keep user-driven XYZ transforms when animation mode is idle.
    return;
  }

  const tNow = performance.now() * 0.001 * activitySpeedValueNumber;
  if (activityAnimMode === 'breathing') {
    applyExplodeState(0);
    currentModel.position.copy(currentModel.userData._activityBasePos);
    currentModel.position.y += 0.018 * Math.sin(tNow * 2.2);
    currentModel.rotation.y = currentModel.userData._activityBaseRotY;
    return;
  }

  if (activityAnimMode === 'gait') {
    applyExplodeState(0);
    currentModel.position.copy(currentModel.userData._activityBasePos);
    currentModel.position.x += 0.06 * Math.sin(tNow * 1.8);
    currentModel.rotation.y = currentModel.userData._activityBaseRotY + 0.12 * Math.sin(tNow * 1.8);
    return;
  }

  if (activityAnimMode === 'presentation') {
    applyExplodeState(0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4 * activitySpeedValueNumber;
    return;
  }

  if (activityAnimMode === 'explode') {
    currentModel.position.copy(currentModel.userData._activityBasePos);
    currentModel.rotation.y = currentModel.userData._activityBaseRotY;
    const amount = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(tNow * 1.4));
    applyExplodeState(amount);
  }
}

function applyProfessionalPreset(preset, persist = true) {
  proPresetMode = preset;

  if (preset === 'clinical') {
    realisticModeEnabled = true;
    humanScaleModeEnabled = true;
    activityAnimMode = 'none';
    activitySpeedValueNumber = 1.0;
    xrayEnabled = true;
    xrayOpacityValueNumber = 0.2;
  } else if (preset === 'teaching') {
    realisticModeEnabled = false;
    humanScaleModeEnabled = true;
    activityAnimMode = 'breathing';
    activitySpeedValueNumber = 0.9;
    xrayEnabled = false;
  } else if (preset === 'presentation') {
    realisticModeEnabled = true;
    humanScaleModeEnabled = false;
    activityAnimMode = 'presentation';
    activitySpeedValueNumber = 1.4;
    xrayEnabled = false;
  }

  realisticModeToggle.checked = realisticModeEnabled;
  humanScaleToggle.checked = humanScaleModeEnabled;
  activityAnimSelect.value = activityAnimMode;
  activitySpeed.value = String(activitySpeedValueNumber);
  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  proPresetSelect.value = proPresetMode;
  xrayToggle.checked = xrayEnabled;
  xrayOpacity.value = String(xrayOpacityValueNumber);
  xrayOpacityValue.textContent = `${Math.round(xrayOpacityValueNumber * 100)}%`;

  applyHumanScaleMode();
  applyProfessionalMode();
  applyXrayToCurrentModel();

  if (persist) saveAppState();
}

function focusMesh(mesh) {
  if (!mesh) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) || 0.2;
  controls.target.copy(center);
  const offset = new THREE.Vector3(0.8, 0.6, 1).normalize().multiplyScalar(radius * 4);
  camera.position.copy(center.clone().add(offset));
  controls.update();
}

function setTimelineIdleUI() {
  timelineStatus.textContent = t('timelineIdle');
  timelineStartBtn.disabled = timelineActive;
  timelineStopBtn.disabled = !timelineActive;
}

function getTimelinePhaseLabel(phaseId) {
  if (phaseId === 'explode') return t('timelinePhaseExplode');
  if (phaseId === 'focus') return t('timelinePhaseFocus');
  if (phaseId === 'xray') return t('timelinePhaseXray');
  if (phaseId === 'restore') return t('timelinePhaseRestore');
  return phaseId;
}

function updateTimelineStatusUI() {
  if (!timelineActive) {
    setTimelineIdleUI();
    return;
  }
  const phase = TIMELINE_PHASES[timelinePhaseIndex];
  if (!phase) {
    setTimelineIdleUI();
    return;
  }
  timelineStatus.textContent = tf('timelineRunning', getTimelinePhaseLabel(phase.id));
  timelineStartBtn.disabled = true;
  timelineStopBtn.disabled = false;
}

function syncProfessionalUiState() {
  activityAnimSelect.value = activityAnimMode;
  activitySpeed.value = String(activitySpeedValueNumber);
  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  xrayToggle.checked = xrayEnabled;
  xrayOpacity.value = String(xrayOpacityValueNumber);
  xrayOpacityValue.textContent = `${Math.round(xrayOpacityValueNumber * 100)}%`;
  applyXrayToCurrentModel();
}

function enterTimelinePhase(index) {
  timelinePhaseIndex = index;
  timelinePhaseElapsed = 0;
  const phase = TIMELINE_PHASES[index];
  if (!phase) return;

  if (phase.id === 'explode') {
    activityPaused = false;
    activityAnimMode = 'explode';
    activitySpeedValueNumber = 1.2;
    controls.autoRotate = false;
    xrayEnabled = false;
  } else if (phase.id === 'focus') {
    activityPaused = false;
    activityAnimMode = 'none';
    controls.autoRotate = false;
    const focusTarget = selectedMesh || structureEntries.find((entry) => entry.mesh.visible)?.mesh || null;
    if (focusTarget) {
      setSelectedMesh(focusTarget);
      focusMesh(focusTarget);
    }
  } else if (phase.id === 'xray') {
    activityPaused = false;
    activityAnimMode = 'none';
    controls.autoRotate = false;
    xrayEnabled = true;
    xrayOpacityValueNumber = 0.18;
  } else if (phase.id === 'restore') {
    activityPaused = false;
    activityAnimMode = 'none';
    controls.autoRotate = false;
    xrayEnabled = false;
    applyExplodeState(0);
  }

  syncProfessionalUiState();
  updateTimelineStatusUI();
}

function stopTimeline(persist = true) {
  timelineActive = false;
  timelinePhaseIndex = 0;
  timelinePhaseElapsed = 0;
  updateTimelineStatusUI();
  if (persist) saveAppState();
}

function startTimeline() {
  timelineActive = true;
  proPresetMode = 'custom';
  proPresetSelect.value = proPresetMode;
  enterTimelinePhase(0);
  saveAppState();
}

function tickTimeline(deltaSec) {
  if (!timelineActive) return;
  const phase = TIMELINE_PHASES[timelinePhaseIndex];
  if (!phase) {
    stopTimeline(true);
    return;
  }
  timelinePhaseElapsed += deltaSec;
  if (timelinePhaseElapsed < phase.durationSec) return;

  const nextIndex = timelinePhaseIndex + 1;
  if (nextIndex >= TIMELINE_PHASES.length) {
    stopTimeline(true);
    return;
  }
  enterTimelinePhase(nextIndex);
  saveAppState();
}

function getSystemLabel(mode) {
  if (mode === 'heart') return t('systemHeart');
  if (mode === 'respiratory') return t('systemRespiratory');
  if (mode === 'circulatory') return t('systemCirculatory');
  if (mode === 'lymphatic') return t('systemLymphatic');
  if (mode === 'urinary') return t('systemUrinary');
  if (mode === 'head') return t('systemHead');
  return mode;
}

function updateSystemDemoStatusUI() {
  if (!systemDemoActive) {
    systemDemoStatus.textContent = t('systemDemoIdle');
    systemDemoStartBtn.disabled = false;
    systemDemoStopBtn.disabled = true;
    return;
  }
  const suffix = systemDemoUsesRealClip
    ? (currentLang === 'he' ? ' (קליפ תלת-ממדי אמיתי)' : ' (real GLB clip)')
    : '';
  systemDemoStatus.textContent = `${tf('systemDemoRunning', getSystemLabel(systemDemoMode))}${suffix}`;
  systemDemoStartBtn.disabled = true;
  systemDemoStopBtn.disabled = false;
}

function getSystemMeshes(mode) {
  const keywords = SYSTEM_KEYWORDS[mode] || [];
  if (!keywords.length) return [];
  return structureEntries
    .filter((entry) => keywords.some((keyword) => entry.searchName.includes(keyword)))
    .map((entry) => entry.mesh);
}

function playRealModelClipForSystem(mode) {
  if (!currentModel || !currentModelClips.length) return false;
  if (!modelAnimationMixer) {
    modelAnimationMixer = new THREE.AnimationMixer(currentModel);
  }

  const preferredKeywords = {
    heart: ['heart', 'cardiac', 'beat', 'pulse'],
    respiratory: ['resp', 'breath', 'lung', 'inhale', 'exhale'],
    circulatory: ['blood', 'flow', 'circul'],
    lymphatic: ['lymph'],
    urinary: ['urinary', 'kidney', 'renal'],
    head: ['head', 'brain', 'skull', 'cranium'],
  };
  const keywords = preferredKeywords[mode] || [];

  let chosenClip = currentModelClips.find((clip) => {
    const name = (clip?.name || '').toLowerCase();
    return keywords.some((keyword) => name.includes(keyword));
  });
  if (!chosenClip) {
    chosenClip = currentModelClips[0];
  }
  if (!chosenClip) return false;

  if (activeModelClipAction) {
    activeModelClipAction.stop();
  }

  const action = modelAnimationMixer.clipAction(chosenClip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.enabled = true;
  action.play();
  activeModelClipAction = action;
  return true;
}

function stopRealModelClipPlayback() {
  if (activeModelClipAction) {
    activeModelClipAction.stop();
    activeModelClipAction = null;
  }
}

function getAvailableModelClipNames() {
  return currentModelClips.map((clip, index) => {
    const name = String(clip?.name || '').trim();
    return name || `Clip ${index + 1}`;
  });
}

function playModelClipByIndex(index) {
  if (!currentModel || !currentModelClips.length) return false;
  const clip = currentModelClips[index];
  if (!clip) return false;

  stopTimeline(false);
  stopSystemDemo(false);
  activityPaused = false;
  controls.autoRotate = false;
  setAnimationMode('none');

  if (!modelAnimationMixer) {
    modelAnimationMixer = new THREE.AnimationMixer(currentModel);
  }

  stopRealModelClipPlayback();
  const action = modelAnimationMixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.enabled = true;
  action.play();
  activeModelClipAction = action;
  return true;
}

function ensureDemoMaterialCache(mesh) {
  if (!mesh?.material) return [];
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((mat) => {
    if (!mat || mat.userData._systemDemoOriginal) return;
    mat.userData._systemDemoOriginal = {
      emissive: mat.emissive ? mat.emissive.clone() : null,
      emissiveIntensity: typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 0,
      opacity: typeof mat.opacity === 'number' ? mat.opacity : 1,
      transparent: !!mat.transparent,
      color: mat.color ? mat.color.clone() : null,
    };
  });
  return mats;
}

function resetSystemDemoVisuals() {
  getAllMeshes().forEach((mesh) => {
    if (mesh.userData._baseScale) {
      mesh.scale.copy(mesh.userData._baseScale);
    }
    if (typeof mesh.userData._baseY === 'number') {
      mesh.position.y = mesh.userData._baseY;
    }

    const mats = ensureDemoMaterialCache(mesh);
    mats.forEach((mat) => {
      const original = mat?.userData?._systemDemoOriginal;
      if (!original) return;
      if (mat.emissive && original.emissive) mat.emissive.copy(original.emissive);
      if (typeof original.emissiveIntensity === 'number') mat.emissiveIntensity = original.emissiveIntensity;
      if (typeof original.opacity === 'number') mat.opacity = original.opacity;
      mat.transparent = original.transparent;
      if (mat.color && original.color) mat.color.copy(original.color);
      mat.needsUpdate = true;
    });
  });
}

function setMeshHighlight(mesh, colorHex, intensity, opacity = null) {
  const mats = ensureDemoMaterialCache(mesh);
  mats.forEach((mat) => {
    if (mat?.emissive) {
      mat.emissive.setHex(colorHex);
      mat.emissiveIntensity = intensity;
    }
    if (typeof opacity === 'number') {
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
    }
    mat.needsUpdate = true;
  });
}

function applySystemDemoFrame(nowMs) {
  if (!systemDemoActive) return;
  const tNow = nowMs * 0.001;
  const systemMeshes = getSystemMeshes(systemDemoMode);
  if (!systemMeshes.length) return;

  resetSystemDemoVisuals();

  if (systemDemoMode === 'heart') {
    const pulse = 0.55 + 0.45 * Math.sin(tNow * 4.4);
    systemMeshes.forEach((mesh) => {
      setMeshHighlight(mesh, 0xcc2222, 0.35 + pulse * 0.9);
      const base = mesh.userData._baseScale || mesh.scale.clone();
      mesh.userData._baseScale = base;
      mesh.scale.copy(base).multiplyScalar(1 + pulse * 0.045);
    });
    return;
  }

  if (systemDemoMode === 'respiratory') {
    const breath = Math.sin(tNow * 2.2);
    systemMeshes.forEach((mesh) => {
      setMeshHighlight(mesh, 0x3e9fd8, 0.22 + (breath + 1) * 0.2);
      const baseY = typeof mesh.userData._baseY === 'number' ? mesh.userData._baseY : mesh.position.y;
      mesh.userData._baseY = baseY;
      mesh.position.y = baseY + 0.008 * breath;
    });
    return;
  }

  if (systemDemoMode === 'circulatory') {
    systemMeshes.forEach((mesh, idx) => {
      const wave = 0.5 + 0.5 * Math.sin(tNow * 6 + idx * 0.22);
      setMeshHighlight(mesh, 0xd81e5b, 0.2 + wave * 1.2);
    });
    return;
  }

  if (systemDemoMode === 'lymphatic') {
    systemMeshes.forEach((mesh, idx) => {
      const wave = 0.5 + 0.5 * Math.sin(tNow * 3 + idx * 0.17);
      setMeshHighlight(mesh, 0x7fcf52, 0.16 + wave * 0.5, 0.35 + wave * 0.45);
    });
    return;
  }

  if (systemDemoMode === 'urinary') {
    systemMeshes.forEach((mesh, idx) => {
      const flow = 0.5 + 0.5 * Math.sin(tNow * 4.5 - idx * 0.25);
      setMeshHighlight(mesh, 0xe9b949, 0.18 + flow * 0.85);
    });
    return;
  }

  if (systemDemoMode === 'head') {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    systemMeshes.forEach((mesh) => {
      setMeshHighlight(mesh, 0xf0e44c, 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(tNow * 2.8)));
    });
  }
}

function stopSystemDemo(persist = true) {
  systemDemoActive = false;
  systemDemoUsesRealClip = false;
  controls.autoRotate = false;
  stopRealModelClipPlayback();
  resetSystemDemoVisuals();
  updateMeshVisualState(selectedMesh, selectedMesh, hoveredMesh);
  updateMeshVisualState(hoveredMesh, selectedMesh, hoveredMesh);
  updateSystemDemoStatusUI();
  if (persist) saveAppState();
}

function startSystemDemo() {
  stopTimeline(false);
  activityPaused = false;
  activityAnimMode = 'none';
  activityAnimSelect.value = activityAnimMode;
  systemDemoUsesRealClip = playRealModelClipForSystem(systemDemoMode);
  systemDemoActive = true;
  updateSystemDemoStatusUI();

  const targets = getSystemMeshes(systemDemoMode);
  const firstTarget = targets[0] || null;
  if (firstTarget) {
    setSelectedMesh(firstTarget);
    focusMesh(firstTarget);
  }
  saveAppState();
}

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().trim();
}

function isFuzzyMatch(text, query) {
  if (!query) return true;
  let idx = 0;
  for (let i = 0; i < text.length && idx < query.length; i += 1) {
    if (text[i] === query[idx]) idx += 1;
  }
  return idx === query.length;
}

function isSearchMatch(text, query) {
  if (!query) return true;
  if (advancedSearchMode === 'exact') return text === query;
  if (advancedSearchMode === 'starts') return text.startsWith(query);
  if (advancedSearchMode === 'fuzzy') return isFuzzyMatch(text, query);
  return text.includes(query);
}

function getSearchScore(entry, query) {
  const text = normalizeSearchText(entry.searchName);
  if (!query) return 999999;
  if (advancedSearchMode === 'exact') return text === query ? 0 : 999999;
  if (advancedSearchMode === 'starts') {
    if (text.startsWith(query)) return 0;
    const idx = text.indexOf(query);
    return idx >= 0 ? 100 + idx : 999999;
  }
  if (advancedSearchMode === 'fuzzy') {
    if (!isFuzzyMatch(text, query)) return 999999;
    let penalty = 0;
    let qPos = 0;
    for (let i = 0; i < text.length && qPos < query.length; i += 1) {
      if (text[i] === query[qPos]) {
        penalty += Math.max(0, i - qPos);
        qPos += 1;
      }
    }
    return penalty;
  }
  const idx = text.indexOf(query);
  return idx >= 0 ? idx : 999999;
}

function jumpToStructureEntry(entry) {
  if (!entry) return;
  const folder = structureFolders.find((item) => item.name === entry.folderName);
  if (folder?.rootEl) folder.rootEl.open = true;

  entry.mesh.visible = true;
  entry.checkbox.checked = true;
  setSelectedMesh(entry.mesh);
  focusMesh(entry.mesh);
  applyStructureFilter();
  updateStatusBar();
  saveCurrentStructureState();

  if (entry.item && typeof entry.item.scrollIntoView === 'function') {
    entry.item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    entry.item.classList.add('is-jump-target');
    setTimeout(() => {
      entry.item?.classList.remove('is-jump-target');
    }, 900);
  }
}

function renderAdvancedSearchResults() {
  if (!advancedSearchResultsEl) return;
  const q = normalizeSearchText(filterInput?.value);
  advancedSearchResultsEl.innerHTML = '';
  if (!q) {
    advancedSearchResultsEl.hidden = true;
    return;
  }

  const candidates = structureEntries
    .map((entry) => ({ entry, score: getSearchScore(entry, q) }))
    .filter((item) => item.score < 999999)
    .sort((a, b) => a.score - b.score)
    .slice(0, 20);

  if (!candidates.length) {
    const empty = document.createElement('div');
    empty.className = 'advanced-search-result-btn';
    empty.textContent = currentLang === 'he' ? 'אין תוצאות' : 'No results';
    advancedSearchResultsEl.appendChild(empty);
    advancedSearchResultsEl.hidden = false;
    return;
  }

  candidates.forEach(({ entry }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'advanced-search-result-btn';
    btn.textContent = `${entry.displayName} | ${entry.folderName}`;
    btn.addEventListener('click', () => {
      jumpToStructureEntry(entry);
    });
    advancedSearchResultsEl.appendChild(btn);
  });
  advancedSearchResultsEl.hidden = false;
}

function applyStructureFilter() {
  const q = normalizeSearchText(filterInput.value);
  structureEntries.forEach((entry) => {
    const text = normalizeSearchText(entry.searchName);
    const textMatch = !q || isSearchMatch(text, q);
    const favMatch = !favoritesOnly || isFavoriteMesh(entry.mesh);
    const visibleInList = textMatch && favMatch;
    entry.item.style.display = visibleInList ? 'flex' : 'none';
  });
  updateStructureFoldersVisibility();
  renderAdvancedSearchResults();
}

function updatePickedPartName(name) {
  uiControlsController.updatePickedPartName(name);
}

function updateHoverPartName(name) {
  uiControlsController.updateHoverPartName(name);
}

function applyXrayToCurrentModel() {
  applyXrayToMeshes(getAllMeshes(), selectedMesh, hoveredMesh, xrayEnabled, xrayOpacityValueNumber);
}

function getHoverPickIntervalMs() {
  if (performanceMode === 'max') return 90;
  if (performanceMode === 'quality') return 28;
  return 45;
}

function getTargetPixelRatio(isInteracting) {
  const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
  const interacting = adaptiveQualityEnabled && isInteracting;

  if (performanceMode === 'max') {
    return Math.max(0.65, Math.min(deviceRatio, interacting ? 0.7 : 0.9));
  }
  if (performanceMode === 'quality') {
    return Math.max(0.9, Math.min(deviceRatio, interacting ? 1.0 : deviceRatio));
  }
  return Math.max(0.75, Math.min(deviceRatio, interacting ? 0.82 : 1.25));
}

function applyPerformanceSettings(isInteracting, force = false) {
  const nextRatio = getTargetPixelRatio(isInteracting);
  const currentRatio = renderer.getPixelRatio();
  if (!force && Math.abs(currentRatio - nextRatio) < 0.04) return;
  renderer.setPixelRatio(nextRatio);
  onResize();
}

function updatePerformanceStatusUI() {
  const labelByMode = {
    balanced: t('perfBalanced'),
    max: t('perfMax'),
    quality: t('perfQuality'),
  };
  performanceStatus.textContent = tf('performanceStatus', labelByMode[performanceMode] || performanceMode);
}

function setSelectedMesh(mesh) {
  if (selectedMesh === mesh) return;
  const prevSelected = selectedMesh;
  selectedMesh = mesh || null;
  updateMeshVisualState(prevSelected, selectedMesh, hoveredMesh);
  updateMeshVisualState(selectedMesh, selectedMesh, hoveredMesh);
  const name = getMeshDisplayName(selectedMesh);
  updatePickedPartName(name);
  openDetailsBtn.disabled = !selectedMesh;
  updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
  updateFavoriteControls();
  updateStatusBar();
  checkStudyAnswer(selectedMesh);
  updateXyzSelectionStatus();
  updateSelectionAssistBadge();
  syncLayerEditorFromSelection();
}

function setHoveredMesh(mesh) {
  if (hoveredMesh === mesh) return;
  const prevHovered = hoveredMesh;
  hoveredMesh = mesh || null;
  updateMeshVisualState(prevHovered, selectedMesh, hoveredMesh);
  updateMeshVisualState(hoveredMesh, selectedMesh, hoveredMesh);
  const name = getMeshDisplayName(hoveredMesh);
  updateHoverPartName(name);
  updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
}

filterInput.addEventListener('input', () => {
  applyStructureFilter();
  saveAppState();
});

if (advancedSearchModesEl && advancedSearchModeButtons.length) {
  advancedSearchModesEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-search-mode]');
    if (!btn) return;
    const mode = String(btn.getAttribute('data-search-mode') || '').trim();
    if (!['contains', 'starts', 'exact', 'fuzzy'].includes(mode)) return;
    advancedSearchMode = mode;
    advancedSearchModeButtons.forEach((item) => {
      item.classList.toggle('is-active', item === btn);
    });
    applyStructureFilter();
  });
}

if (openModelComposerBtn) {
  openModelComposerBtn.addEventListener('click', () => {
    openModelComposerDialog();
  });
}

if (composerCloseBtn && modelComposerDialog) {
  composerCloseBtn.addEventListener('click', () => {
    if (typeof modelComposerDialog.close === 'function') {
      modelComposerDialog.close();
    } else {
      modelComposerDialog.removeAttribute('open');
    }
  });
}

if (composerBuildBtn) {
  composerBuildBtn.addEventListener('click', () => {
    const selectedPartKeys = getCheckedComposerPartKeys();

    if (!isValidCompositeParts(selectedPartKeys)) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'קומפוזר: בחר לפחות מודל GLB אחד תקין.'
          : 'Composer: select at least one valid GLB model.';
      }
      return;
    }

    const name = sanitizeCompositeDisplayName(composerNameInput?.value || '');
    const key = buildCompositeKeyFromName(name);
    persistCustomCompositeOption(key, name, selectedPartKeys);

    ensureCurrentModelKeyExists();
    populateModelSelector();
    populateCompareModelSelector();
    renderDirectModelsList();
    renderModelComposerOptions();
    modelSelect.value = key;
    loadModelByKey(key);
    saveAppState();

    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `קומפוזר: נשמר המודל "${name}" (${selectedPartKeys.length} חלקים).`
        : `Composer: saved model "${name}" (${selectedPartKeys.length} parts).`;
    }
  });
}

if (composerSelectAllBtn) {
  composerSelectAllBtn.addEventListener('click', () => {
    setAllComposerSelections(true);
  });
}

if (composerClearAllBtn) {
  composerClearAllBtn.addEventListener('click', () => {
    setAllComposerSelections(false);
  });
}

if (composerExportBtn) {
  composerExportBtn.addEventListener('click', async () => {
    composerExportBtn.disabled = true;
    const previousLabel = composerExportBtn.textContent;
    composerExportBtn.textContent = currentLang === 'he' ? 'מייצא...' : 'Exporting...';
    const selectedPartKeys = getCheckedComposerPartKeys();
    if (!selectedPartKeys.length) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'קומפוזר: בחר מודלים לפני ייצוא.'
          : 'Composer: select models before export.';
      }
      composerExportBtn.disabled = false;
      composerExportBtn.textContent = previousLabel || (currentLang === 'he' ? 'ייצא GLB' : 'Export GLB');
      return;
    }

    const name = sanitizeCompositeDisplayName(composerNameInput?.value || '');
    const key = buildCompositeKeyFromName(name);
    persistCustomCompositeOption(key, name, selectedPartKeys);
    ensureCurrentModelKeyExists();
    populateModelSelector();
    populateCompareModelSelector();
    renderDirectModelsList();
    renderModelComposerOptions();
    modelSelect.value = key;
    loadModelByKey(key);
    saveAppState();

    const ready = await waitForModelReady(key, 9000);
    const ok = ready && exportCurrentModelGlb(`${key.replace(CUSTOM_COMPOSITE_PREFIX, '')}-export`);
    if (analysisResult) {
      analysisResult.textContent = ok
        ? (currentLang === 'he' ? 'קומפוזר: ייצוא GLB בוצע.' : 'Composer: GLB export completed.')
        : (currentLang === 'he' ? 'קומפוזר: טעינת המודל לייצוא נכשלה או ארכה יותר מדי.' : 'Composer: model loading for export failed or timed out.');
    }
    composerExportBtn.disabled = false;
    composerExportBtn.textContent = previousLabel || (currentLang === 'he' ? 'ייצא GLB' : 'Export GLB');
  });
}

if (editedModelPresetSelect) {
  editedModelPresetSelect.addEventListener('change', () => {
    editedModelPresetsStore.selected = String(editedModelPresetSelect.value || '');
    if (editedModelPresetNameInput) editedModelPresetNameInput.value = editedModelPresetsStore.selected;
    writeEditedModelPresetsStore();
  });
}

if (editedModelSaveBtn) {
  editedModelSaveBtn.addEventListener('click', () => {
    const name = normalizeEditedModelPresetName(editedModelPresetNameInput?.value || editedModelPresetSelect?.value || currentModelKey);
    const savedName = saveEditedModelPreset(name);
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `מודל ערוך נשמר: ${savedName}`
        : `Edited model saved: ${savedName}`;
    }
  });
}

if (editedModelLoadBtn) {
  editedModelLoadBtn.addEventListener('click', () => {
    const name = String(editedModelPresetSelect?.value || '').trim();
    const ok = loadEditedModelPreset(name);
    if (analysisResult) {
      analysisResult.textContent = ok
        ? (currentLang === 'he' ? `מודל ערוך נטען: ${name}` : `Edited model loaded: ${name}`)
        : (currentLang === 'he' ? 'לא נמצא מודל ערוך לטעינה.' : 'Edited model not found.');
    }
  });
}

if (editedModelRenameBtn) {
  editedModelRenameBtn.addEventListener('click', () => {
    const selected = String(editedModelPresetSelect?.value || '').trim();
    const next = normalizeEditedModelPresetName(editedModelPresetNameInput?.value || '');
    if (!selected || !editedModelPresetsStore.presets[selected]) return;
    const payload = { ...editedModelPresetsStore.presets[selected], name: next };
    delete editedModelPresetsStore.presets[selected];
    editedModelPresetsStore.presets[next] = payload;
    editedModelPresetsStore.selected = next;
    writeEditedModelPresetsStore();
    syncEditedModelPresetsUi();
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `שם מודל ערוך עודכן: ${next}`
        : `Edited model renamed: ${next}`;
    }
  });
}

if (editedModelDeleteBtn) {
  editedModelDeleteBtn.addEventListener('click', () => {
    const selected = String(editedModelPresetSelect?.value || '').trim();
    if (!selected || !editedModelPresetsStore.presets[selected]) return;
    delete editedModelPresetsStore.presets[selected];
    editedModelPresetsStore.selected = '';
    writeEditedModelPresetsStore();
    syncEditedModelPresetsUi();
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `מודל ערוך נמחק: ${selected}`
        : `Edited model deleted: ${selected}`;
    }
  });
}

if (composerDeleteBtn) {
  composerDeleteBtn.addEventListener('click', () => {
    const typedKey = buildCompositeKeyFromName(composerNameInput?.value || '');
    const targetKey = String(currentModelKey || '').startsWith(CUSTOM_COMPOSITE_PREFIX)
      ? currentModelKey
      : typedKey;
    const deleted = deleteCustomCompositeOption(targetKey);
    if (!deleted) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'קומפוזר: לא נמצא מודל מורכב למחיקה.'
          : 'Composer: composite model not found for deletion.';
      }
      return;
    }

    if (currentModelKey === targetKey) {
      const fallbackKey = Object.keys(MODEL_OPTIONS)[0];
      if (fallbackKey) {
        currentModelKey = fallbackKey;
        loadModelByKey(currentModelKey);
      }
    }

    ensureCurrentModelKeyExists();
    populateModelSelector();
    populateCompareModelSelector();
    renderDirectModelsList();
    renderModelComposerOptions();
    saveAppState();

    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? 'קומפוזר: המודל המורכב נמחק.'
        : 'Composer: composite model deleted.';
    }
  });
}

if (applyLayerMetaBtn) {
  applyLayerMetaBtn.addEventListener('click', () => {
    if (!selectedMesh || !currentModel) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'Layer Manager: בחר שכבה לפני שמירה.'
          : 'Layer Manager: select a layer before saving.';
      }
      return;
    }

    const nextName = normalizeLayerMetaText(layerEditNameInput?.value || '');
    const nextCategory = normalizeLayerMetaText(layerEditCategoryInput?.value || '');
    if (nextCategory) {
      registerCustomCategory(nextCategory);
      syncPartAnalysisCategoryOptions();
      syncLayerCategoryInputs();
    }
    setLayerMetaForMesh(selectedMesh, { name: nextName, category: nextCategory });
    populateStructureList(currentModel);
    applyStructureFilter();
    updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
    syncLayerEditorFromSelection();

    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? 'Layer Manager: נשמר שם/קטגוריה, והחיפוש עודכן.'
        : 'Layer Manager: name/category saved and search updated.';
    }
  });
}

if (categoryManageSelect) {
  categoryManageSelect.addEventListener('change', () => {
    if (categoryManageNameInput) categoryManageNameInput.value = String(categoryManageSelect.value || '');
  });
}

if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    const raw = String(categoryManageNameInput?.value || '').trim();
    const added = registerCustomCategory(raw);
    if (!added) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'קטגוריה לא נוספה (ייתכן שכבר קיימת או לא תקינה).'
          : 'Category was not added (already exists or invalid).';
      }
      return;
    }
    syncPartAnalysisCategoryOptions();
    syncLayerCategoryInputs();
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `קטגוריה נוספה: ${normalizeCategoryValue(raw)}`
        : `Category added: ${normalizeCategoryValue(raw)}`;
    }
  });
}

if (renameCategoryBtn) {
  renameCategoryBtn.addEventListener('click', () => {
    const from = String(categoryManageSelect?.value || '').trim();
    const to = String(categoryManageNameInput?.value || '').trim();
    const renamed = renameCustomCategory(from, to);
    if (!renamed) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'לא ניתן לעדכן שם קטגוריה.'
          : 'Unable to rename category.';
      }
      return;
    }
    syncPartAnalysisCategoryOptions();
    syncLayerCategoryInputs();
    if (currentModel) {
      populateStructureList(currentModel);
      applyStructureFilter();
    }
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `קטגוריה עודכנה: ${normalizeCategoryValue(from)} -> ${normalizeCategoryValue(to)}`
        : `Category renamed: ${normalizeCategoryValue(from)} -> ${normalizeCategoryValue(to)}`;
    }
  });
}

if (deleteCategoryBtn) {
  deleteCategoryBtn.addEventListener('click', () => {
    const target = String(categoryManageSelect?.value || '').trim();
    const deleted = deleteCustomCategory(target);
    if (!deleted) {
      if (analysisResult) {
        analysisResult.textContent = currentLang === 'he'
          ? 'לא ניתן למחוק קטגוריה (כנראה קטגוריית מערכת).'
          : 'Unable to delete category (likely built-in).';
      }
      return;
    }
    syncPartAnalysisCategoryOptions();
    syncLayerCategoryInputs();
    if (currentModel) {
      populateStructureList(currentModel);
      applyStructureFilter();
    }
    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? `קטגוריה נמחקה: ${normalizeCategoryValue(target)}`
        : `Category deleted: ${normalizeCategoryValue(target)}`;
    }
  });
}

if (clearLayerMetaBtn) {
  clearLayerMetaBtn.addEventListener('click', () => {
    if (!selectedMesh || !currentModel) return;
    clearLayerMetaForMesh(selectedMesh);
    populateStructureList(currentModel);
    applyStructureFilter();
    updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
    syncLayerEditorFromSelection();

    if (analysisResult) {
      analysisResult.textContent = currentLang === 'he'
        ? 'Layer Manager: בוטלו ההתאמות לשכבה הנבחרת.'
        : 'Layer Manager: cleared custom metadata for selected layer.';
    }
  });
}

realisticModeToggle.addEventListener('change', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  realisticModeEnabled = realisticModeToggle.checked;
  proPresetMode = 'custom';
  proPresetSelect.value = proPresetMode;
  applyProfessionalMode();
  saveAppState();
});

humanScaleToggle.addEventListener('change', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  humanScaleModeEnabled = humanScaleToggle.checked;
  proPresetMode = 'custom';
  proPresetSelect.value = proPresetMode;
  applyHumanScaleMode();
  sizeReferenceGroup.visible = humanScaleModeEnabled;
  saveAppState();
});

activityAnimSelect.addEventListener('change', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  activityAnimMode = activityAnimSelect.value;
  activityPaused = false;
  proPresetMode = 'custom';
  proPresetSelect.value = proPresetMode;
  saveAppState();
});

activitySpeed.addEventListener('input', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  activitySpeedValueNumber = Number.parseFloat(activitySpeed.value) || 1;
  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  activityPaused = false;
  proPresetMode = 'custom';
  proPresetSelect.value = proPresetMode;
  saveAppState();
});

activityPlayBtn.addEventListener('click', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  activityPaused = false;
});

activityPauseBtn.addEventListener('click', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  activityPaused = true;
  controls.autoRotate = false;
});

activityResetBtn.addEventListener('click', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  activityPaused = false;
  activityAnimMode = 'none';
  activitySpeedValueNumber = 1;
  proPresetMode = 'custom';
  activityAnimSelect.value = activityAnimMode;
  activitySpeed.value = String(activitySpeedValueNumber);
  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  proPresetSelect.value = proPresetMode;
  applyProfessionalPresentationState();
  saveAppState();
});

applyProPresetBtn.addEventListener('click', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  applyProfessionalPreset(proPresetSelect.value, true);
});

proPresetSelect.addEventListener('change', () => {
  stopTimeline(false);
  stopSystemDemo(false);
  proPresetMode = proPresetSelect.value;
  saveAppState();
});

timelineStartBtn.addEventListener('click', () => {
  stopSystemDemo(false);
  startTimeline();
});

timelineStopBtn.addEventListener('click', () => {
  stopTimeline(true);
});

systemDemoSelect.addEventListener('change', () => {
  systemDemoMode = systemDemoSelect.value;
  updateSystemDemoStatusUI();
  saveAppState();
});

systemDemoStartBtn.addEventListener('click', () => {
  startSystemDemo();
});

systemDemoStopBtn.addEventListener('click', () => {
  stopSystemDemo(true);
});

performanceModeSelect.addEventListener('change', () => {
  performanceMode = performanceModeSelect.value;
  updatePerformanceStatusUI();
  applyPerformanceSettings(viewerInteracting, true);
  saveAppState();
});

adaptiveQualityToggle.addEventListener('change', () => {
  adaptiveQualityEnabled = adaptiveQualityToggle.checked;
  applyPerformanceSettings(viewerInteracting, true);
  saveAppState();
});

highlightNeighborsBtn.addEventListener('click', () => {
  highlightNearestNeighbors(8);
});

clearNeighborsBtn.addEventListener('click', () => {
  clearNeighborHighlight();
});

studyModeToggleBtn.addEventListener('click', () => {
  toggleStudyMode();
});

studyRevealBtn.addEventListener('click', () => {
  revealStudyAnswer();
});

studyNextBtn.addEventListener('click', () => {
  nextStudyQuestion();
});

compareToggleBtn.addEventListener('click', async () => {
  if (compareEnabled) {
    clearCompareOverlay();
    return;
  }
  const key = compareModelSelect.value;
  if (!key) return;
  try {
    await loadCompareOverlayByKey(key);
  } catch {
    clearCompareOverlay();
  }
});

compareClearBtn.addEventListener('click', () => {
  clearCompareOverlay();
});

applyLayerPresetBtn.addEventListener('click', () => {
  applyLayerPreset(layerPresetSelect.value);
});

resetLayerPresetBtn.addEventListener('click', () => {
  layerPresetSelect.value = 'all';
  applyLayerPreset('all');
});

bookmarkSaveBtn.addEventListener('click', () => {
  saveCameraBookmark();
});

bookmarkGoBtn.addEventListener('click', () => {
  goToCameraBookmark();
});

clinicalTourStartBtn.addEventListener('click', () => {
  startClinicalTour();
});

clinicalTourStopBtn.addEventListener('click', () => {
  stopClinicalTour();
});

exportImageBtn.addEventListener('click', () => {
  exportScreenshotImage();
});

recordVideoBtn.addEventListener('click', () => {
  recordShortViewerVideo(8000);
});

if (expandFoldersBtn) {
  expandFoldersBtn.addEventListener('click', () => {
    setAllStructureFoldersOpen(true);
  });
}

if (collapseFoldersBtn) {
  collapseFoldersBtn.addEventListener('click', () => {
    setAllStructureFoldersOpen(false);
  });
}

if (layerIconExpandBtn) {
  layerIconExpandBtn.addEventListener('click', () => {
    if (expandFoldersBtn) {
      expandFoldersBtn.click();
      return;
    }
    setAllStructureFoldersOpen(true);
  });
}

if (layerIconCollapseBtn) {
  layerIconCollapseBtn.addEventListener('click', () => {
    if (collapseFoldersBtn) {
      collapseFoldersBtn.click();
      return;
    }
    setAllStructureFoldersOpen(false);
  });
}

if (layerIconShowBtn) {
  layerIconShowBtn.addEventListener('click', () => {
    if (showAllBtn) showAllBtn.click();
  });
}

if (layerIconHideBtn) {
  layerIconHideBtn.addEventListener('click', () => {
    if (hideAllBtn) hideAllBtn.click();
  });
}

if (layerIconInvertBtn) {
  layerIconInvertBtn.addEventListener('click', () => {
    if (invertVisibilityBtn) invertVisibilityBtn.click();
  });
}

if (layerIconClearBtn) {
  layerIconClearBtn.addEventListener('click', () => {
    if (clearSelectionBtn) clearSelectionBtn.click();
  });
}

refreshModelsBtn.addEventListener('click', async () => {
  await refreshModelsCatalog();
});

validateModelsBtn.addEventListener('click', async () => {
  await validateModelsCatalog();
});

if (auditFullSystemBtn) {
  auditFullSystemBtn.addEventListener('click', () => {
    runFullSystemAudit(true);
  });
}

if (runFullSystemAuditBtn) {
  runFullSystemAuditBtn.addEventListener('click', () => {
    runFullSystemAudit(false);
  });
}

if (closeFullSystemAuditBtn && fullSystemAuditDialog) {
  closeFullSystemAuditBtn.addEventListener('click', () => {
    if (typeof fullSystemAuditDialog.close === 'function') {
      fullSystemAuditDialog.close();
      return;
    }
    fullSystemAuditDialog.removeAttribute('open');
  });
}

if (directLibraryRefreshBtn) {
  directLibraryRefreshBtn.addEventListener('click', async () => {
    const text = getDirectLibraryText();
    directLibraryRefreshBtn.disabled = true;
    const oldLabel = directLibraryRefreshBtn.textContent;
    directLibraryRefreshBtn.textContent = text.refreshBusy;
    try {
      await loadDynamicModelsManifest();
      ensureCurrentModelKeyExists();
      populateModelSelector();
      populateCompareModelSelector();
      await refreshDirectLibrary();
    } finally {
      directLibraryRefreshBtn.disabled = false;
      directLibraryRefreshBtn.textContent = oldLabel || text.refresh;
    }
  });
}

if (openAnimationsGalleryBtn && animationsGalleryDialog) {
  openAnimationsGalleryBtn.addEventListener('click', () => {
    renderAnimationsGalleryGrid(directAnimationCatalog);
    openDialogNonBlocking(animationsGalleryDialog);
  });
}

if (themeSettingsBtn && themeSettingsDialog) {
  themeSettingsBtn.addEventListener('click', () => {
    syncThemeControlsFromCurrentTheme();
    openDialogNonBlocking(themeSettingsDialog);
  });
}

if (themeOptionButtons.length) {
  themeOptionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      applyTheme(theme || 'ocean-pro');
    });
  });
}

[
  themeFrameBorderColor,
  themeModelBgColor,
  themeModelBgMode,
  themeModelBgSecondaryColor,
  themeModelBgAngle,
  themeControlBgColor,
  themeControlBorderColor,
  themeControlTextColor,
  themeTabActiveBgColor,
  themeTabActiveTextColor,
].forEach((inputEl) => {
  if (!inputEl) return;
  const handle = () => {
    saveThemePaletteFromControls();
  };
  inputEl.addEventListener('input', handle);
  inputEl.addEventListener('change', handle);
});

if (themeResetColorsBtn) {
  themeResetColorsBtn.addEventListener('click', () => {
    resetCurrentThemePalette();
  });
}

if (themeExportPaletteBtn) {
  themeExportPaletteBtn.addEventListener('click', () => {
    exportCurrentThemePalette();
  });
}

if (themeImportPaletteBtn && themeImportPaletteInput) {
  themeImportPaletteBtn.addEventListener('click', () => {
    themeImportPaletteInput.value = '';
    themeImportPaletteInput.click();
  });

  themeImportPaletteInput.addEventListener('change', async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    await importThemePaletteFromFile(file);
  });
}

if (xyzGridToggleBtn) {
  xyzGridToggleBtn.addEventListener('click', () => {
    toggleXyzGrid();
  });
}

if (xyzCalibrationPanel) {
  xyzCalibrationPanel.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-axis][data-dir]');
    if (btn) {
      const axis = btn.getAttribute('data-axis');
      const direction = Number(btn.getAttribute('data-dir') || 0);
      if (!axis || !Number.isFinite(direction) || direction === 0) return;
      nudgeSelectedElement(axis, direction);
      return;
    }

    const rotBtn = event.target.closest('button[data-rot-axis][data-rot-dir]');
    if (rotBtn) {
      const axis = rotBtn.getAttribute('data-rot-axis');
      const direction = Number(rotBtn.getAttribute('data-rot-dir') || 0);
      if (!axis || !Number.isFinite(direction) || direction === 0) return;
      rotateSelectedElement(axis, direction);
    }
  });
}

if (xyzResetPlacementBtn) {
  xyzResetPlacementBtn.addEventListener('click', () => {
    resetSelectedElementPlacement();
  });
}

if (xyzScaleUpBtn) {
  xyzScaleUpBtn.addEventListener('click', () => {
    scaleSelectedElement(1);
  });
}

if (xyzScaleDownBtn) {
  xyzScaleDownBtn.addEventListener('click', () => {
    scaleSelectedElement(-1);
  });
}

if (xyzAutoSaveToggle) {
  xyzAutoSaveToggle.addEventListener('change', () => {
    xyzAutoSaveEnabled = !!xyzAutoSaveToggle.checked;
    saveXyzPanelSettings();
    setXyzStatusMessage(
      xyzAutoSaveEnabled ? 'XYZ: שמירה אוטומטית פעילה' : 'XYZ: שמירה אוטומטית כבויה',
      xyzAutoSaveEnabled ? 'XYZ: auto-save enabled' : 'XYZ: auto-save disabled',
    );
  });
}

if (xyzSymmetryToggle) {
  xyzSymmetryToggle.addEventListener('change', () => {
    xyzSymmetryEnabled = !!xyzSymmetryToggle.checked;
    saveXyzPanelSettings();
    setXyzStatusMessage(
      xyzSymmetryEnabled ? 'XYZ: מצב סימטריה פעיל' : 'XYZ: מצב סימטריה כבוי',
      xyzSymmetryEnabled ? 'XYZ: symmetry mode enabled' : 'XYZ: symmetry mode disabled',
    );
  });
}

if (xyzLockSelectedBtn) {
  xyzLockSelectedBtn.addEventListener('click', () => {
    toggleSelectedRootLock();
  });
}

if (xyzPrevPartBtn) {
  xyzPrevPartBtn.addEventListener('click', () => {
    selectAdjacentTransformRoot(-1);
  });
}

if (xyzNextPartBtn) {
  xyzNextPartBtn.addEventListener('click', () => {
    selectAdjacentTransformRoot(1);
  });
}

if (xyzSaveSlotBtn) {
  xyzSaveSlotBtn.addEventListener('click', () => {
    saveSelectedElementToSlot();
  });
}

if (xyzLoadSlotBtn) {
  xyzLoadSlotBtn.addEventListener('click', () => {
    loadSelectedElementFromSlot();
  });
}

if (xyzClearSlotBtn) {
  xyzClearSlotBtn.addEventListener('click', () => {
    clearSelectedElementSlot();
  });
}

if (xyzSavePlacementBtn) {
  xyzSavePlacementBtn.addEventListener('click', () => {
    saveSelectedElementPlacement();
  });
}

if (xyzResetToSavedBtn) {
  xyzResetToSavedBtn.addEventListener('click', () => {
    resetSelectedElementToSavedPlacement();
  });
}

if (xyzClearPlacementBtn) {
  xyzClearPlacementBtn.addEventListener('click', () => {
    clearSelectedElementPlacement();
  });
}

if (xyzAlignCenterXBtn) {
  xyzAlignCenterXBtn.addEventListener('click', () => {
    alignSelectedElementToBodyCenterX();
  });
}

if (xyzUndoBtn) {
  xyzUndoBtn.addEventListener('click', () => {
    undoXyzTransform();
  });
}

if (xyzRedoBtn) {
  xyzRedoBtn.addEventListener('click', () => {
    redoXyzTransform();
  });
}

if (xyzExportCalibrationsBtn) {
  xyzExportCalibrationsBtn.addEventListener('click', () => {
    exportXyzCalibrations();
  });
}

if (xyzImportCalibrationsBtn && xyzImportCalibrationsInput) {
  xyzImportCalibrationsBtn.addEventListener('click', () => {
    xyzImportCalibrationsInput.value = '';
    xyzImportCalibrationsInput.click();
  });

  xyzImportCalibrationsInput.addEventListener('change', async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;
    await importXyzCalibrations(file);
  });
}

if (xyzFloatingDialog) {
  xyzFloatingDialog.addEventListener('click', (event) => {
    const moveBtn = event.target.closest('button[data-float-axis][data-float-dir]');
    if (moveBtn) {
      const axis = moveBtn.getAttribute('data-float-axis');
      const direction = Number(moveBtn.getAttribute('data-float-dir') || 0);
      if (axis && direction) {
        nudgeSelectedElement(axis, direction);
      }
      return;
    }
    const rotBtn = event.target.closest('button[data-float-rot-axis][data-float-rot-dir]');
    if (rotBtn) {
      const axis = rotBtn.getAttribute('data-float-rot-axis');
      const direction = Number(rotBtn.getAttribute('data-float-rot-dir') || 0);
      if (axis && direction) {
        rotateSelectedElement(axis, direction);
      }
      return;
    }
    const joyBtn = event.target.closest('button[data-float-joy-axis][data-float-joy-dir]');
    if (joyBtn) {
      const axis = joyBtn.getAttribute('data-float-joy-axis');
      const direction = Number(joyBtn.getAttribute('data-float-joy-dir') || 0);
      if (axis && axis !== 'none' && direction) {
        nudgeSelectedElement(axis, direction);
      }
    }
  });
}

if (xyzFloatingScaleUpBtn) xyzFloatingScaleUpBtn.addEventListener('click', () => scaleSelectedElement(1));
if (xyzFloatingScaleDownBtn) xyzFloatingScaleDownBtn.addEventListener('click', () => scaleSelectedElement(-1));
if (xyzFloatingUndoBtn) xyzFloatingUndoBtn.addEventListener('click', () => undoXyzTransform());
if (xyzFloatingRedoBtn) xyzFloatingRedoBtn.addEventListener('click', () => redoXyzTransform());
if (xyzFloatingLockBtn) xyzFloatingLockBtn.addEventListener('click', () => toggleSelectedRootLock());
if (xyzFloatingSaveBtn) xyzFloatingSaveBtn.addEventListener('click', () => saveSelectedElementPlacement());
if (xyzFloatingResetSavedBtn) xyzFloatingResetSavedBtn.addEventListener('click', () => resetSelectedElementToSavedPlacement());
if (xyzFloatingResetBaseBtn) xyzFloatingResetBaseBtn.addEventListener('click', () => resetSelectedElementPlacement());

if (xyzFloatingMoveStep) {
  const syncMoveStep = () => {
    syncMoveStepControls(xyzFloatingMoveStep.value);
  };
  xyzFloatingMoveStep.addEventListener('input', syncMoveStep);
  xyzFloatingMoveStep.addEventListener('change', syncMoveStep);
}
if (xyzFloatingRotateStep) {
  const syncRotateStep = () => {
    const next = String(xyzFloatingRotateStep.value).replace(',', '.');
    xyzFloatingRotateStep.value = next;
    xyzRotateStepInput.value = next;
  };
  xyzFloatingRotateStep.addEventListener('input', syncRotateStep);
  xyzFloatingRotateStep.addEventListener('change', syncRotateStep);
}
if (xyzFloatingScaleStep) {
  const syncScaleStep = () => {
    const next = String(xyzFloatingScaleStep.value).replace(',', '.');
    xyzFloatingScaleStep.value = next;
    xyzScaleStepInput.value = next;
  };
  xyzFloatingScaleStep.addEventListener('input', syncScaleStep);
  xyzFloatingScaleStep.addEventListener('change', syncScaleStep);
}
if (xyzFloatingSnapToggle) {
  xyzFloatingSnapToggle.addEventListener('change', () => {
    xyzSnapToggle.checked = !!xyzFloatingSnapToggle.checked;
  });
}
if (xyzFloatingAutoSaveToggle) {
  xyzFloatingAutoSaveToggle.addEventListener('change', () => {
    xyzAutoSaveToggle.checked = !!xyzFloatingAutoSaveToggle.checked;
    xyzAutoSaveToggle.dispatchEvent(new Event('change'));
  });
}
if (xyzFloatingSymmetryToggle) {
  xyzFloatingSymmetryToggle.addEventListener('change', () => {
    xyzSymmetryToggle.checked = !!xyzFloatingSymmetryToggle.checked;
    xyzSymmetryToggle.dispatchEvent(new Event('change'));
  });
}

if (xyzMoveStepInput && xyzFloatingMoveStep) {
  const syncMainMoveStep = () => {
    syncMoveStepControls(xyzMoveStepInput.value);
  };
  xyzMoveStepInput.addEventListener('input', syncMainMoveStep);
  xyzMoveStepInput.addEventListener('change', syncMainMoveStep);
}

if (xyzStepSlider) {
  const syncFromSlider = () => {
    syncMoveStepControls(xyzStepSlider.value);
  };
  xyzStepSlider.addEventListener('input', syncFromSlider);
  xyzStepSlider.addEventListener('change', syncFromSlider);
}

syncMoveStepControls(xyzMoveStepInput?.value || '0.02');

if (xyzRotateStepInput && xyzFloatingRotateStep) {
  xyzRotateStepInput.addEventListener('change', () => {
    xyzFloatingRotateStep.value = String(xyzRotateStepInput.value).replace(',', '.');
  });
}

if (xyzScaleStepInput && xyzFloatingScaleStep) {
  xyzScaleStepInput.addEventListener('change', () => {
    xyzFloatingScaleStep.value = String(xyzScaleStepInput.value).replace(',', '.');
  });
}

if (xyzAxisLockXToggle) {
  xyzAxisLockXToggle.addEventListener('change', () => {
    xyzAxisLockX = !!xyzAxisLockXToggle.checked;
    saveXyzPanelSettings();
    updateXyzSelectionStatus();
  });
}

if (xyzAxisLockYToggle) {
  xyzAxisLockYToggle.addEventListener('change', () => {
    xyzAxisLockY = !!xyzAxisLockYToggle.checked;
    saveXyzPanelSettings();
    updateXyzSelectionStatus();
  });
}

if (xyzAxisLockZToggle) {
  xyzAxisLockZToggle.addEventListener('change', () => {
    xyzAxisLockZ = !!xyzAxisLockZToggle.checked;
    saveXyzPanelSettings();
    updateXyzSelectionStatus();
  });
}

if (xyzApplyNumbersBtn) {
  xyzApplyNumbersBtn.addEventListener('click', () => {
    applyNumericPositionInputs();
  });
}

bindNumericInputInteractions(xyzPosXInput, 'x');
bindNumericInputInteractions(xyzPosYInput, 'y');
bindNumericInputInteractions(xyzPosZInput, 'z');

if (modelPinBtn) {
  modelPinBtn.addEventListener('click', () => {
    modelViewportPinned = !modelViewportPinned;
    applyModelViewportPinState();
    saveXyzPanelSettings();
  });
}

if (xyzAnalogPad) {
  xyzAnalogPad.addEventListener('pointerdown', (event) => {
    beginAnalogJoystick(event);
  });
  xyzAnalogPad.addEventListener('pointermove', (event) => {
    updateAnalogJoystickFromEvent(event);
  });
  xyzAnalogPad.addEventListener('pointerup', (event) => {
    endAnalogJoystick(event);
  });
  xyzAnalogPad.addEventListener('pointercancel', (event) => {
    endAnalogJoystick(event);
  });
}

if (xyzFloatingFollowBtn) {
  xyzFloatingFollowBtn.addEventListener('click', () => {
    xyzFloatingFollowSelection = !xyzFloatingFollowSelection;
    syncXyzFloatingFollowButton();
    saveXyzPanelSettings();
    if (xyzFloatingFollowSelection) {
      positionXyzFloatingNearSelection();
    }
  });
}

function setPlaceholder(message) {
  listEl.innerHTML = '';
  const msg = document.createElement('p');
  msg.className = 'placeholder';
  msg.textContent = message;
  listEl.appendChild(msg);
}

function setModelLoadingState(isLoading) {
  listEl.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  updateModelClipBadge(isLoading);
}

function populateModelSelector() {
  modelSelect.innerHTML = '';
  Object.entries(MODEL_OPTIONS)
    .sort((a, b) => getModelLabel(a[1]).localeCompare(getModelLabel(b[1]), currentLang === 'he' ? 'he' : 'en'))
    .forEach(([key, model]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = getModelLabel(model);
      modelSelect.appendChild(option);
    });
  modelSelect.value = currentModelKey;
}

function ensureCurrentModelKeyExists() {
  if (MODEL_OPTIONS[currentModelKey]) return;
  const firstKey = Object.keys(MODEL_OPTIONS)[0];
  if (firstKey) {
    currentModelKey = firstKey;
  }
}

async function refreshModelsCatalog() {
  if (!refreshModelsBtn || !validateModelsBtn) return;
  refreshModelsBtn.disabled = true;
  validateModelsBtn.disabled = true;
  const previousLabel = refreshModelsBtn.textContent;
  refreshModelsBtn.textContent = t('refreshingModels');

  try {
    await loadDynamicModelsManifest();
    loadCustomCompositeModels();
    ensureCurrentModelKeyExists();
    populateModelSelector();
    populateCompareModelSelector();
    renderModelComposerOptions();
    renderDirectModelsList();
    modelSelect.value = currentModelKey;
    if (analysisResult) {
      analysisResult.textContent = t('manifestRefreshed');
    }
    saveAppState();
  } finally {
    refreshModelsBtn.textContent = previousLabel || t('refreshModels');
    refreshModelsBtn.disabled = false;
    validateModelsBtn.disabled = false;
  }
}

function collectModelPathsForValidation() {
  const uniquePaths = new Set();
  Object.values(MODEL_OPTIONS).forEach((model) => {
    if (typeof model?.path === 'string' && model.path) {
      uniquePaths.add(model.path);
    }
    if (!Array.isArray(model?.parts)) return;
    model.parts.forEach((partKey) => {
      const partModel = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
      if (typeof partModel?.path === 'string' && partModel.path) {
        uniquePaths.add(partModel.path);
      }
    });
  });
  return Array.from(uniquePaths).sort((a, b) => a.localeCompare(b));
}

async function validateModelsCatalog() {
  if (!refreshModelsBtn || !validateModelsBtn) return;
  const paths = collectModelPathsForValidation();
  if (!paths.length) return;

  refreshModelsBtn.disabled = true;
  validateModelsBtn.disabled = true;
  const previousLabel = validateModelsBtn.textContent;
  const failedPaths = [];
  let passedCount = 0;

  try {
    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];
      if (analysisResult) {
        analysisResult.textContent = tf('validatingModels', i + 1, paths.length);
      }
      try {
        const response = await fetch(`${path}?validate=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        passedCount += 1;
      } catch {
        failedPaths.push(path);
      }
    }

    if (!failedPaths.length) {
      if (analysisResult) analysisResult.textContent = tf('validationOk', passedCount);
    } else {
      if (analysisResult) analysisResult.textContent = tf('validationFail', passedCount, failedPaths.length);
      console.warn('Model catalog validation failed paths:', failedPaths);
    }
  } finally {
    validateModelsBtn.textContent = previousLabel || t('validateModels');
    refreshModelsBtn.disabled = false;
    validateModelsBtn.disabled = false;
  }
}

function removeCurrentModel() {
  if (!currentModel) return;
  setSelectedMesh(null);
  setHoveredMesh(null);
  pickableMeshes = [];
  scene.remove(currentModel);
  currentModel.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
  });
  currentModel = null;
}


function populateStructureList(model) {
  listEl.innerHTML = '';
  const meshItems = [];
  structureEntries = [];
  structureFolders = [];
  const folderMap = new Map();
  const persistedStructureState = readStructureStateForModel(currentModelKey);
  const persistedMeshVisibility = persistedStructureState.meshes;
  const persistedFolderOpen = persistedStructureState.folders;

  const getOrCreateFolder = (folderName) => {
    if (folderMap.has(folderName)) return folderMap.get(folderName);

    const rootEl = document.createElement('details');
    rootEl.className = 'structure-folder';
    rootEl.open = Object.prototype.hasOwnProperty.call(persistedFolderOpen, folderName)
      ? !!persistedFolderOpen[folderName]
      : true;

    const summaryEl = document.createElement('summary');
    summaryEl.className = 'structure-folder-summary';

    const summaryLabelEl = document.createElement('span');
    summaryLabelEl.className = 'structure-folder-summary-main';

    const summaryActionsEl = document.createElement('span');
    summaryActionsEl.className = 'structure-folder-summary-actions';

    const summaryCountEl = document.createElement('span');
    summaryCountEl.className = 'structure-folder-count';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'structure-folder-action';

    const closeAllBtn = document.createElement('button');
    closeAllBtn.type = 'button';
    closeAllBtn.className = 'structure-folder-action';

    const blockSummaryToggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    [selectAllBtn, closeAllBtn].forEach((btn) => {
      btn.addEventListener('mousedown', blockSummaryToggle);
      btn.addEventListener('click', blockSummaryToggle);
    });

    const itemsEl = document.createElement('div');
    itemsEl.className = 'structure-folder-items';

    summaryActionsEl.appendChild(summaryCountEl);
    summaryActionsEl.appendChild(selectAllBtn);
    summaryActionsEl.appendChild(closeAllBtn);
    summaryEl.appendChild(summaryLabelEl);
    summaryEl.appendChild(summaryActionsEl);

    rootEl.appendChild(summaryEl);
    rootEl.appendChild(itemsEl);
    listEl.appendChild(rootEl);

    const folder = {
      name: folderName,
      rootEl,
      summaryEl,
      summaryLabelEl,
      summaryCountEl,
      selectAllBtn,
      closeAllBtn,
      itemsEl,
      items: [],
    };
    selectAllBtn.addEventListener('click', () => {
      setFolderEntriesVisibility(folder, true);
    });
    closeAllBtn.addEventListener('click', () => {
      setFolderEntriesVisibility(folder, false);
    });
    rootEl.addEventListener('toggle', () => {
      saveCurrentStructureState();
    });
    folderMap.set(folderName, folder);
    structureFolders.push(folder);
    updateFolderHeader(folder);
    return folder;
  };

  model.traverse((child) => {
    if (child.isMesh) {
      meshItems.push(child);
    }
  });

  meshItems.sort((a, b) => {
    const nameA = (a.userData.listName || a.name || '').toLowerCase();
    const nameB = (b.userData.listName || b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  pickableMeshes = meshItems;

  const batchSize = 120;
  let index = 0;

  const renderBatch = () => {
    const end = Math.min(index + batchSize, meshItems.length);

    for (; index < end; index += 1) {
      const mesh = meshItems[index];
      const item = document.createElement('div');
      item.className = 'structure-item';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.id = `chk-${mesh.uuid}`;
      checkbox.addEventListener('change', () => {
        mesh.visible = checkbox.checked;
        updateStatusBar();
        saveCurrentStructureState();
      });

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      const baseDisplayName = mesh.userData.listName || formatStructureName(mesh.name);
      const baseCategory = classifyBodyPart(baseDisplayName);
      const customMeta = getLayerMetaForMesh(mesh);
      const displayName = customMeta?.name || baseDisplayName;
      const category = resolveEffectiveCategory(baseCategory, customMeta?.category || '');
      const categorySearchText = BUILTIN_CATEGORY_KEYS.has(category)
        ? getFolderNameByCategory(category)
        : category;
      label.textContent = displayName;

      item.appendChild(checkbox);
      item.appendChild(label);

      const actions = document.createElement('span');
      actions.className = 'structure-item-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'structure-item-action';
      editBtn.textContent = 'E';
      editBtn.title = currentLang === 'he' ? 'ערוך שם שכבה' : 'Edit layer name';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'structure-item-action is-delete';
      deleteBtn.textContent = 'X';
      deleteBtn.title = currentLang === 'he' ? 'הסתר שכבה' : 'Hide layer';

      editBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const promptText = currentLang === 'he' ? 'שם חדש לשכבה:' : 'New layer name:';
        const inputName = window.prompt(promptText, displayName);
        if (inputName === null) return;
        const nextName = normalizeLayerMetaText(inputName);
        setLayerMetaForMesh(mesh, { name: nextName });
        populateStructureList(currentModel);
        applyStructureFilter();
        updateStructureRowsState(structureEntries, selectedMesh, hoveredMesh);
        syncLayerEditorFromSelection();
        saveAppState();
      });

      deleteBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        mesh.visible = false;
        checkbox.checked = false;
        if (selectedMesh === mesh) {
          setSelectedMesh(null);
        }
        updateStatusBar();
        runPartAnalysis();
        saveCurrentStructureState();
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(actions);

      label.addEventListener('click', () => {
        setSelectedMesh(mesh);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setSelectedMesh(mesh);
        openMeshDetails(mesh);
      });

      const folderName = inferStructureFolderName(displayName, category);
      const folder = getOrCreateFolder(folderName);
      const meshStateKey = getStructureMeshStateKey(mesh, displayName);
      if (meshStateKey && Object.prototype.hasOwnProperty.call(persistedMeshVisibility, meshStateKey)) {
        const visible = !!persistedMeshVisibility[meshStateKey];
        checkbox.checked = visible;
        mesh.visible = visible;
      }

      folder.items.push({ itemEl: item, mesh });
      folder.itemsEl.appendChild(item);
      updateFolderHeader(folder);

      structureEntries.push({
        mesh,
        item,
        checkbox,
        baseDisplayName,
        baseCategory,
        displayName,
        category,
        searchName: `${displayName} ${String(categorySearchText || '')} ${String(folderName || '')}`.toLowerCase(),
        folderName,
      });
    }

    if (index < meshItems.length) {
      requestAnimationFrame(renderBatch);
      return;
    }

    applyStructureFilter();
    updateStructureFoldersVisibility();
    saveCurrentStructureState();
    applyXrayToCurrentModel();
    updateStatusBar();
    updateFavoriteControls();
    if (studyModeEnabled) {
      structureEntries.forEach((entry) => {
        const labelEl = entry.item?.querySelector('label');
        if (labelEl) labelEl.textContent = '???';
      });
    }
  };

  renderBatch();
}

function runPartAnalysis() {
  uiControlsController.runPartAnalysis(structureEntries);
}

function isolateCategory(category) {
  uiControlsController.isolateCategory(category, structureEntries);
}

exportBtn.addEventListener('click', () => {
  if (!currentModel) return;

  exportBtn.disabled = true;
  exportBtn.textContent = t('exporting');

  const filename = currentModelKey === 'full-system'
    ? 'full-system-unified'
    : `${currentModelKey}-export`;
  exportCurrentModelGlb(filename, () => {
    exportBtn.disabled = false;
    exportBtn.textContent = t('export');
  });
});

// three.js essentials
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 1, 3);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.tabIndex = 0;
containerEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.zoomSpeed = 1.05;
controls.panSpeed = 0.9;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;
controls.minDistance = 0.1;
controls.maxDistance = 120;
controls.addEventListener('start', () => {
  viewerInteracting = true;
  applyPerformanceSettings(true);
});
controls.addEventListener('end', () => {
  viewerInteracting = false;
  applyPerformanceSettings(false, true);
});
applyModelViewportPinState();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function createTextSprite(text, color = '#0b2f77', options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(200,155,43,0.9)';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  const fontWeight = options.bold ? '900' : '700';
  const fontSize = Math.round(64 * THREE.MathUtils.clamp(Number(options.sizeScale) || 1, 0.7, 2.4));
  ctx.font = `${fontWeight} ${fontSize}px Assistant, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.12, 0.06, 1);
  return sprite;
}

function addAxisNumbers(group, size = 2, step = 0.2, options = {}) {
  const half = size / 2;
  for (let v = -half; v <= half + 1e-6; v += step) {
    const rounded = Math.round(v * 10) / 10;
    if (Math.abs(rounded) < 1e-6) continue;

    const xLabel = createTextSprite(rounded.toFixed(1), '#8b1d1d', options);
    if (xLabel) {
      xLabel.position.set(rounded, -half - 0.05, 0);
      group.add(xLabel);
    }

    const yLabel = createTextSprite(rounded.toFixed(1), '#1c6f2a', options);
    if (yLabel) {
      yLabel.position.set(-half - 0.06, rounded, 0);
      group.add(yLabel);
    }

    const zLabel = createTextSprite(rounded.toFixed(1), '#1e3f92', options);
    if (zLabel) {
      zLabel.position.set(0, -half - 0.05, rounded);
      group.add(zLabel);
    }
  }
}

function getGridStyleConfig(styleName) {
  if (styleName === 'custom') {
    const centerHex = Number.parseInt(String(xyzGridCustomCenterColor || '#c89b2b').replace('#', ''), 16);
    const planeHex = Number.parseInt(String(xyzGridCustomPlaneColor || '#5273ad').replace('#', ''), 16);
    const boldness = THREE.MathUtils.clamp(Number(xyzGridLineBoldness) || 1, 0.6, 8);
    const opacityMain = THREE.MathUtils.clamp(0.28 * boldness, 0.12, 0.92);
    const opacitySide = THREE.MathUtils.clamp(0.18 * boldness, 0.08, 0.72);
    const axisScale = THREE.MathUtils.clamp(0.5 + 0.08 * boldness, 0.45, 0.9);
    return {
      center: Number.isFinite(centerHex) ? centerHex : 0xc89b2b,
      plane: Number.isFinite(planeHex) ? planeHex : 0x5273ad,
      opacityMain,
      opacitySide,
      axisScale,
    };
  }
  if (styleName === 'surgical') {
    return { center: 0x13b39a, plane: 0x78d5c8, opacityMain: 0.5, opacitySide: 0.28, axisScale: 0.62 };
  }
  if (styleName === 'neon') {
    return { center: 0x7f5cff, plane: 0x4ea3ff, opacityMain: 0.58, opacitySide: 0.34, axisScale: 0.65 };
  }
  return { center: 0xc89b2b, plane: 0x5273ad, opacityMain: 0.42, opacitySide: 0.25, axisScale: 0.55 };
}

function createGridPlane(size, divisions, centerColor, planeColor, opacity, boldness = 1) {
  const group = new THREE.Group();
  const safeDiv = Math.max(2, Math.round(divisions));
  const step = size / safeDiv;
  const half = size * 0.5;
  const bold = THREE.MathUtils.clamp(Number(boldness) || 1, 0.6, 8);
  // Keep thickness visible even with dense divisions by using a size-based floor.
  const lineThickness = Math.max(size * 0.0045, size * 0.0045 * bold * bold);
  const centerThickness = lineThickness * 1.9;

  const minorMat = new THREE.MeshBasicMaterial({
    color: planeColor,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const centerMat = new THREE.MeshBasicMaterial({
    color: centerColor,
    transparent: true,
    opacity: Math.min(1, opacity + 0.18),
    depthWrite: false,
  });

  for (let i = 0; i <= safeDiv; i += 1) {
    const p = -half + i * step;
    const isCenter = Math.abs(p) < (step * 0.5);

    const hThickness = isCenter ? centerThickness : lineThickness;
    const hGeom = new THREE.BoxGeometry(size, hThickness, hThickness);
    const hLine = new THREE.Mesh(hGeom, isCenter ? centerMat : minorMat);
    hLine.position.set(0, 0, p);
    group.add(hLine);

    const vThickness = isCenter ? centerThickness : lineThickness;
    const vGeom = new THREE.BoxGeometry(vThickness, vThickness, size);
    const vLine = new THREE.Mesh(vGeom, isCenter ? centerMat : minorMat);
    vLine.position.set(p, 0, 0);
    group.add(vLine);
  }

  return group;
}

function createXyzGridHelper(size = 2.6, divisions = 26, mode = 'all', style = 'classic') {
  const helperGroup = new THREE.Group();
  const palette = getGridStyleConfig(style);
  const showXY = mode === 'all' || mode === 'xy';
  const showXZ = mode === 'all' || mode === 'xz';
  const showYZ = mode === 'all' || mode === 'yz';
  const showZOnly = mode === 'z-only';

  if (showXZ) {
    const xz = createGridPlane(size, divisions, palette.center, palette.plane, palette.opacityMain, xyzGridLineBoldness);
    helperGroup.add(xz);
  }

  if (showXY) {
    const xy = createGridPlane(size, divisions, palette.center, palette.plane, palette.opacitySide, xyzGridLineBoldness);
    xy.rotation.x = Math.PI / 2;
    helperGroup.add(xy);
  }

  if (showYZ) {
    const yz = createGridPlane(size, divisions, palette.center, palette.plane, palette.opacitySide, xyzGridLineBoldness);
    yz.rotation.z = Math.PI / 2;
    helperGroup.add(yz);
  }

  if (showZOnly) {
    const half = size * 0.5;
    const zBold = THREE.MathUtils.clamp(Number(xyzGridLineBoldness) || 1, 0.6, 8);
    const zThickness = Math.max(size * 0.005, size * 0.005 * zBold * zBold);
    const geometry = new THREE.BoxGeometry(zThickness, zThickness, size);
    const color = style === 'custom' ? palette.center : 0x1e3f92;
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false });
    const zLine = new THREE.Mesh(geometry, material);
    helperGroup.add(zLine);
  }

  if (!showZOnly) {
    const axes = new THREE.AxesHelper(size * palette.axisScale);
    helperGroup.add(axes);
  }

  const labelOptions = { bold: !!xyzGridNumbersBold, sizeScale: xyzGridNumberScale };
  const axisX = !showZOnly ? createTextSprite('X', '#8b1d1d', labelOptions) : null;
  const axisY = !showZOnly ? createTextSprite('Y', '#1c6f2a', labelOptions) : null;
  const axisZ = createTextSprite('Z', '#1e3f92', labelOptions);
  const half = size / 2;
  if (axisX) {
    axisX.position.set(half + 0.12, 0, 0);
    axisX.scale.set(0.16, 0.08, 1);
    helperGroup.add(axisX);
  }
  if (axisY) {
    axisY.position.set(0, half + 0.12, 0);
    axisY.scale.set(0.16, 0.08, 1);
    helperGroup.add(axisY);
  }
  if (axisZ) {
    axisZ.position.set(0, 0, half + 0.12);
    axisZ.scale.set(0.16, 0.08, 1);
    helperGroup.add(axisZ);
  }

  if (!showZOnly) {
    addAxisNumbers(helperGroup, size, 0.2, labelOptions);
  } else {
    const half = size / 2;
    for (let v = -half; v <= half + 1e-6; v += 0.2) {
      const rounded = Math.round(v * 10) / 10;
      if (Math.abs(rounded) < 1e-6) continue;
      const zLabel = createTextSprite(rounded.toFixed(1), '#1e3f92', labelOptions);
      if (!zLabel) continue;
      zLabel.position.set(0, -half - 0.05, rounded);
      helperGroup.add(zLabel);
    }
  }
  return helperGroup;
}

function getSelectedTransformRoot() {
  if (!selectedMesh) return currentModel || null;
  let current = selectedMesh;
  while (current) {
    if (current.userData?.partKey) return current;
    current = current.parent;
  }
  return selectedMesh || currentModel || null;
}

function cloneTransformState(root) {
  return {
    position: root.position.clone(),
    rotation: root.rotation.clone(),
    scale: root.scale.clone(),
  };
}

function ensureBaseTransformState(root) {
  if (!root) return;
  if (!root.userData._xyzBaseTransform) {
    root.userData._xyzBaseTransform = cloneTransformState(root);
  }
}

function getTransformRootFromMesh(mesh) {
  if (!mesh) return null;
  let current = mesh;
  while (current) {
    if (current.userData?.partKey) return current;
    current = current.parent;
  }
  return mesh;
}

function readXyzPanelSettings() {
  try {
    const raw = localStorage.getItem(XYZ_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveXyzPanelSettings() {
  try {
    localStorage.setItem(XYZ_SETTINGS_STORAGE_KEY, JSON.stringify({
      autoSave: !!xyzAutoSaveEnabled,
      symmetry: !!xyzSymmetryEnabled,
      floatingFollow: !!xyzFloatingFollowSelection,
      gridMode: xyzGridPlaneMode,
      gridStyle: xyzGridStyle,
      gridSize: xyzGridSize,
      gridDivisions: xyzGridDivisions,
      gridCenterColor: xyzGridCustomCenterColor,
      gridPlaneColor: xyzGridCustomPlaneColor,
      gridLineBoldness: xyzGridLineBoldness,
      gridNumbersBold: !!xyzGridNumbersBold,
      gridNumberScale: xyzGridNumberScale,
      snapSource: xyzSnapSource,
      snapMultiplier: xyzSnapMultiplier,
      highlightLocks: !!xyzHighlightLocksEnabled,
      autoUnlockOnMove: !!xyzAutoUnlockOnMove,
      verboseDebug: !!xyzVerboseDebugEnabled,
      safeRenderMode: !!xyzSafeRenderModeEnabled,
      renderProfile: xyzRenderProfile,
      gridMiniPanelOpen: !!(xyzFloatingGridMiniPanel && !xyzFloatingGridMiniPanel.hidden),
      modelPinned: !!modelViewportPinned,
    }));
  } catch {
    // Ignore storage errors.
  }
}

function loadXyzPanelSettings() {
  const settings = readXyzPanelSettings();
  xyzAutoSaveEnabled = settings.autoSave !== false;
  xyzSymmetryEnabled = settings.symmetry === true;
  xyzFloatingFollowSelection = settings.floatingFollow !== false;
  xyzGridPlaneMode = ['all', 'xy', 'xz', 'yz', 'z-only'].includes(settings.gridMode) ? settings.gridMode : 'all';
  xyzGridStyle = ['classic', 'surgical', 'neon', 'custom'].includes(settings.gridStyle) ? settings.gridStyle : 'classic';
  xyzGridSize = THREE.MathUtils.clamp(Number(settings.gridSize) || 2.6, 1.2, 6);
  xyzGridDivisions = THREE.MathUtils.clamp(Math.round(Number(settings.gridDivisions) || 26), 8, 80);
  xyzGridCustomCenterColor = String(settings.gridCenterColor || '#c89b2b');
  xyzGridCustomPlaneColor = String(settings.gridPlaneColor || '#5273ad');
  xyzGridLineBoldness = THREE.MathUtils.clamp(Number(settings.gridLineBoldness) || 1, 0.6, 8);
  xyzGridNumbersBold = settings.gridNumbersBold === true;
  xyzGridNumberScale = THREE.MathUtils.clamp(Number(settings.gridNumberScale) || 1, 0.8, 2);
  xyzSnapSource = ['step', 'grid'].includes(settings.snapSource) ? settings.snapSource : 'step';
  xyzSnapMultiplier = THREE.MathUtils.clamp(Number(settings.snapMultiplier) || 1, 0.25, 4);
  xyzHighlightLocksEnabled = settings.highlightLocks === true;
  xyzAutoUnlockOnMove = settings.autoUnlockOnMove === true;
  xyzVerboseDebugEnabled = settings.verboseDebug === true;
  xyzSafeRenderModeEnabled = settings.safeRenderMode === true;
  xyzRenderProfile = ['normal', 'safe', 'ultra'].includes(settings.renderProfile) ? settings.renderProfile : 'normal';
  const gridMiniPanelOpen = settings.gridMiniPanelOpen === true;
  xyzAxisLockX = false;
  xyzAxisLockY = false;
  xyzAxisLockZ = false;
  modelViewportPinned = settings.modelPinned === true;
  if (xyzAutoSaveToggle) {
    xyzAutoSaveToggle.checked = xyzAutoSaveEnabled;
  }
  if (xyzSymmetryToggle) {
    xyzSymmetryToggle.checked = xyzSymmetryEnabled;
  }
  if (xyzAxisLockXToggle) xyzAxisLockXToggle.checked = xyzAxisLockX;
  if (xyzAxisLockYToggle) xyzAxisLockYToggle.checked = xyzAxisLockY;
  if (xyzAxisLockZToggle) xyzAxisLockZToggle.checked = xyzAxisLockZ;
  if (xyzGridModeSelect) xyzGridModeSelect.value = xyzGridPlaneMode;
  if (xyzGridStyleSelect) xyzGridStyleSelect.value = xyzGridStyle;
  if (xyzFloatingGridModeSelect) xyzFloatingGridModeSelect.value = xyzGridPlaneMode;
  if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = xyzGridStyle;
  if (xyzGridCenterColorInput) xyzGridCenterColorInput.value = xyzGridCustomCenterColor;
  if (xyzGridPlaneColorInput) xyzGridPlaneColorInput.value = xyzGridCustomPlaneColor;
  if (xyzGridLineBoldnessRange) xyzGridLineBoldnessRange.value = xyzGridLineBoldness.toFixed(1);
  if (xyzGridLineBoldnessValue) xyzGridLineBoldnessValue.textContent = xyzGridLineBoldness.toFixed(1);
  if (xyzGridNumbersBoldToggle) xyzGridNumbersBoldToggle.checked = !!xyzGridNumbersBold;
  if (xyzGridNumberScaleRange) xyzGridNumberScaleRange.value = xyzGridNumberScale.toFixed(1);
  if (xyzGridNumberScaleValue) xyzGridNumberScaleValue.textContent = xyzGridNumberScale.toFixed(1);
  if (xyzGridSizeRange) xyzGridSizeRange.value = String(xyzGridSize.toFixed(1));
  if (xyzGridSizeValue) xyzGridSizeValue.textContent = xyzGridSize.toFixed(1);
  if (xyzFloatingGridSizeRange) xyzFloatingGridSizeRange.value = String(xyzGridSize.toFixed(1));
  if (xyzFloatingGridSizeValue) xyzFloatingGridSizeValue.textContent = xyzGridSize.toFixed(1);
  if (xyzGridDivisionsRange) xyzGridDivisionsRange.value = String(xyzGridDivisions);
  if (xyzGridDivisionsValue) xyzGridDivisionsValue.textContent = String(xyzGridDivisions);
  if (xyzFloatingGridDivisionsRange) xyzFloatingGridDivisionsRange.value = String(xyzGridDivisions);
  if (xyzFloatingGridDivisionsValue) xyzFloatingGridDivisionsValue.textContent = String(xyzGridDivisions);
  if (xyzSnapSourceSelect) xyzSnapSourceSelect.value = xyzSnapSource;
  if (xyzSnapMultiplierRange) xyzSnapMultiplierRange.value = xyzSnapMultiplier.toFixed(2);
  if (xyzSnapMultiplierValue) xyzSnapMultiplierValue.textContent = `${xyzSnapMultiplier.toFixed(2)}x`;
  if (xyzAutoUnlockToggle) xyzAutoUnlockToggle.checked = !!xyzAutoUnlockOnMove;
  if (xyzVerboseDebugToggle) xyzVerboseDebugToggle.checked = !!xyzVerboseDebugEnabled;
  if (xyzDebugConsole) {
    xyzDebugConsole.textContent = xyzDebugLines.length ? xyzDebugLines.join('\n') : '[XYZ Debug] ready';
  }
  if (xyzFloatingGridMiniPanel) xyzFloatingGridMiniPanel.hidden = !gridMiniPanelOpen;
  if (xyzFloatingGridStyleBtn) xyzFloatingGridStyleBtn.classList.toggle('is-active', gridMiniPanelOpen);
  syncSafeRenderButtonUi();
  syncRenderProfileButtonsUi();
  applyRenderProfile(xyzRenderProfile, false);
  applyModelViewportPinState();
  syncXyzFloatingFollowButton();
  updateXyzGridToggleUi();
}

function syncAdvancedGridControlsUi() {
  if (xyzGridModeSelect) xyzGridModeSelect.value = xyzGridPlaneMode;
  if (xyzFloatingGridModeSelect) xyzFloatingGridModeSelect.value = xyzGridPlaneMode;
  if (xyzGridStyleSelect) xyzGridStyleSelect.value = xyzGridStyle;
  if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = xyzGridStyle;
  if (xyzGridCenterColorInput) xyzGridCenterColorInput.value = xyzGridCustomCenterColor;
  if (xyzGridPlaneColorInput) xyzGridPlaneColorInput.value = xyzGridCustomPlaneColor;
  if (xyzGridLineBoldnessRange) xyzGridLineBoldnessRange.value = xyzGridLineBoldness.toFixed(1);
  if (xyzGridLineBoldnessValue) xyzGridLineBoldnessValue.textContent = xyzGridLineBoldness.toFixed(1);
  if (xyzGridNumbersBoldToggle) xyzGridNumbersBoldToggle.checked = !!xyzGridNumbersBold;
  if (xyzGridNumberScaleRange) xyzGridNumberScaleRange.value = xyzGridNumberScale.toFixed(1);
  if (xyzGridNumberScaleValue) xyzGridNumberScaleValue.textContent = xyzGridNumberScale.toFixed(1);
  if (xyzGridSizeRange) xyzGridSizeRange.value = String(xyzGridSize.toFixed(1));
  if (xyzGridSizeValue) xyzGridSizeValue.textContent = xyzGridSize.toFixed(1);
  if (xyzFloatingGridSizeRange) xyzFloatingGridSizeRange.value = String(xyzGridSize.toFixed(1));
  if (xyzFloatingGridSizeValue) xyzFloatingGridSizeValue.textContent = xyzGridSize.toFixed(1);
  if (xyzGridDivisionsRange) xyzGridDivisionsRange.value = String(xyzGridDivisions);
  if (xyzGridDivisionsValue) xyzGridDivisionsValue.textContent = String(xyzGridDivisions);
  if (xyzFloatingGridDivisionsRange) xyzFloatingGridDivisionsRange.value = String(xyzGridDivisions);
  if (xyzFloatingGridDivisionsValue) xyzFloatingGridDivisionsValue.textContent = String(xyzGridDivisions);
  if (xyzSnapSourceSelect) xyzSnapSourceSelect.value = xyzSnapSource;
  if (xyzSnapMultiplierRange) xyzSnapMultiplierRange.value = xyzSnapMultiplier.toFixed(2);
  if (xyzSnapMultiplierValue) xyzSnapMultiplierValue.textContent = `${xyzSnapMultiplier.toFixed(2)}x`;
  if (xyzAutoUnlockToggle) xyzAutoUnlockToggle.checked = !!xyzAutoUnlockOnMove;
  if (xyzVerboseDebugToggle) xyzVerboseDebugToggle.checked = !!xyzVerboseDebugEnabled;
  syncSafeRenderButtonUi();
}

function applyXyzGridPreset(preset) {
  if (preset === 'clinical') {
    xyzGridPlaneMode = 'all';
    xyzGridStyle = 'custom';
    xyzGridCustomCenterColor = '#13b39a';
    xyzGridCustomPlaneColor = '#78d5c8';
    xyzGridLineBoldness = 1.6;
    xyzGridNumbersBold = true;
    xyzGridNumberScale = 1.2;
  } else if (preset === 'contrast') {
    xyzGridPlaneMode = 'xy';
    xyzGridStyle = 'custom';
    xyzGridCustomCenterColor = '#111111';
    xyzGridCustomPlaneColor = '#005eff';
    xyzGridLineBoldness = 2.4;
    xyzGridNumbersBold = true;
    xyzGridNumberScale = 1.5;
  } else if (preset === 'teaching') {
    xyzGridPlaneMode = 'all';
    xyzGridStyle = 'custom';
    xyzGridCustomCenterColor = '#c89b2b';
    xyzGridCustomPlaneColor = '#5273ad';
    xyzGridLineBoldness = 2.0;
    xyzGridNumbersBold = true;
    xyzGridNumberScale = 1.8;
  } else {
    return;
  }

  syncAdvancedGridControlsUi();
  saveXyzPanelSettings();
  rebuildXyzGridHelper();
}

function getTransformStorage() {
  try {
    const raw = localStorage.getItem(XYZ_TRANSFORM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getSlotStorage() {
  try {
    const raw = localStorage.getItem(XYZ_SLOT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setSlotStorage(data) {
  try {
    localStorage.setItem(XYZ_SLOT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

function setTransformStorage(data) {
  try {
    localStorage.setItem(XYZ_TRANSFORM_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

function getTransformStorageKey(root) {
  if (!root) return '';
  const partKey = root.userData?.partKey || root.name || 'selected-root';
  return `${currentModelKey}::${partKey}`;
}

function normalizePartKeyForMirror(partKey) {
  return String(partKey || '')
    .toLowerCase()
    .replace(/[\s_.-]+/g, ' ')
    .replace(/\b(left|right)\b/g, '')
    .replace(/\b(l|r)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPartSide(partKey) {
  const key = String(partKey || '').toLowerCase();
  if (/(^|[\s_.-])(left|l)([\s_.-]|$)/.test(key)) return 'left';
  if (/(^|[\s_.-])(right|r)([\s_.-]|$)/.test(key)) return 'right';
  return null;
}

function getMirrorRootForRoot(root) {
  if (!xyzSymmetryEnabled || !root?.userData?.partKey) return null;
  const partKey = String(root.userData.partKey);
  const side = detectPartSide(partKey);
  if (!side) return null;
  const opposite = side === 'left' ? 'right' : 'left';
  const base = normalizePartKeyForMirror(partKey);
  const roots = getTransformRootsInOrder();
  return roots.find((candidate) => {
    if (!candidate || candidate === root || !candidate.userData?.partKey) return false;
    const candidatePartKey = String(candidate.userData.partKey);
    const candidateSide = detectPartSide(candidatePartKey);
    if (candidateSide !== opposite) return false;
    return normalizePartKeyForMirror(candidatePartKey) === base;
  }) || null;
}

function getSelectedSlotNumber() {
  const slot = Number.parseInt(xyzSlotSelect?.value || '1', 10);
  if (!Number.isFinite(slot)) return 1;
  return THREE.MathUtils.clamp(slot, 1, 3);
}

function getSlotStorageKey(root, slotNumber) {
  const baseKey = getTransformStorageKey(root);
  if (!baseKey) return '';
  return `${baseKey}::slot${slotNumber}`;
}

function applyOperationToRootAndMirror(root, operation) {
  if (!root || typeof operation !== 'function') return;
  operation(root, false);
  const mirror = getMirrorRootForRoot(root);
  if (!mirror || isRootLocked(mirror)) return;
  operation(mirror, true);
}

function applyStoredTransformToRoot(root, stored) {
  if (!root || !stored) return;
  if (Array.isArray(stored.position) && stored.position.length === 3) {
    root.position.set(stored.position[0], stored.position[1], stored.position[2]);
  }
  if (Array.isArray(stored.rotation) && stored.rotation.length === 3) {
    root.rotation.set(stored.rotation[0], stored.rotation[1], stored.rotation[2]);
  }
  if (Array.isArray(stored.scale) && stored.scale.length === 3) {
    root.scale.set(stored.scale[0], stored.scale[1], stored.scale[2]);
  }
}

function makeRootSnapshot(root) {
  if (!root) return null;
  return {
    position: root.position.toArray(),
    rotation: [root.rotation.x, root.rotation.y, root.rotation.z],
    scale: root.scale.toArray(),
  };
}

function isSameSnapshot(a, b) {
  if (!a || !b) return false;
  const valuesA = [...a.position, ...a.rotation, ...a.scale];
  const valuesB = [...b.position, ...b.rotation, ...b.scale];
  if (valuesA.length !== valuesB.length) return false;
  for (let i = 0; i < valuesA.length; i += 1) {
    if (Math.abs(valuesA[i] - valuesB[i]) > 1e-7) return false;
  }
  return true;
}

function updateXyzHistoryButtons() {
  if (xyzUndoBtn) xyzUndoBtn.disabled = xyzUndoStack.length === 0;
  if (xyzRedoBtn) xyzRedoBtn.disabled = xyzRedoStack.length === 0;
}

function createHistoryEntry(root) {
  if (!root) return null;
  const key = getTransformStorageKey(root);
  if (!key) return null;
  return {
    key,
    snapshot: makeRootSnapshot(root),
  };
}

function pushUndoEntry(root) {
  const entry = createHistoryEntry(root);
  if (!entry) return;
  const last = xyzUndoStack[xyzUndoStack.length - 1];
  if (last && last.key === entry.key && isSameSnapshot(last.snapshot, entry.snapshot)) {
    return;
  }
  xyzUndoStack.push(entry);
  if (xyzUndoStack.length > XYZ_HISTORY_LIMIT) {
    xyzUndoStack.shift();
  }
  xyzRedoStack.length = 0;
  updateXyzHistoryButtons();
}

function findRootByHistoryKey(historyKey) {
  if (!historyKey || !currentModel) return null;
  const separatorIndex = historyKey.indexOf('::');
  if (separatorIndex === -1) return null;
  const modelKey = historyKey.slice(0, separatorIndex);
  const partKey = historyKey.slice(separatorIndex + 2);
  if (!modelKey || !partKey || modelKey !== currentModelKey) return null;

  let found = null;
  currentModel.traverse((child) => {
    if (found) return;
    if (!child.userData?.partKey) return;
    if (String(child.userData.partKey) === partKey) {
      found = child;
    }
  });
  return found;
}

function applyHistoryEntry(entry, targetStack) {
  if (!entry) return;
  const root = findRootByHistoryKey(entry.key);
  if (!root) return;
  ensureBaseTransformState(root);

  const currentEntry = createHistoryEntry(root);
  if (currentEntry) {
    targetStack.push(currentEntry);
    if (targetStack.length > XYZ_HISTORY_LIMIT) {
      targetStack.shift();
    }
  }

  applyStoredTransformToRoot(root, entry.snapshot);
  updateXyzSelectionStatus();
  updateXyzHistoryButtons();
}

function undoXyzTransform() {
  const entry = xyzUndoStack.pop();
  if (!entry) {
    updateXyzHistoryButtons();
    return;
  }
  applyHistoryEntry(entry, xyzRedoStack);
}

function redoXyzTransform() {
  const entry = xyzRedoStack.pop();
  if (!entry) {
    updateXyzHistoryButtons();
    return;
  }
  applyHistoryEntry(entry, xyzUndoStack);
}

function safeParseImportedCalibrations(text) {
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === 'object' && parsed.transforms && typeof parsed.transforms === 'object') {
    return parsed.transforms;
  }
  if (parsed && typeof parsed === 'object') {
    return parsed;
  }
  return null;
}

function setXyzStatusMessage(heText, enText) {
  if (!xyzSelectionStatus) return;
  xyzSelectionStatus.textContent = currentLang === 'he' ? heText : enText;
}

function isRootLocked(root) {
  return !!root?.userData?._xyzLocked;
}

function updateXyzLockButton() {
  if (!xyzLockSelectedBtn) return;
  const root = getSelectedTransformRoot();
  const locked = !!root && isRootLocked(root);
  xyzLockSelectedBtn.classList.toggle('is-locked', locked);
  xyzLockSelectedBtn.textContent = locked
    ? (currentLang === 'he' ? 'שחרר נעילה' : 'Unlock selected')
    : (currentLang === 'he' ? 'נעל איבר נבחר' : 'Lock selected');
}

function getTransformRootsInOrder() {
  const seen = new Set();
  const roots = [];
  structureEntries.forEach((entry) => {
    const root = getTransformRootFromMesh(entry.mesh);
    if (!root?.userData?.partKey) return;
    const key = getTransformStorageKey(root);
    if (!key || seen.has(key)) return;
    seen.add(key);
    roots.push(root);
  });
  return roots;
}

function clearLockHighlights() {
  if (!currentModel) return;
  currentModel.traverse((child) => {
    if (!child?.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat?.userData?._xyzLockOriginal) return;
      const original = mat.userData._xyzLockOriginal;
      if (mat.emissive && original.emissive) mat.emissive.copy(original.emissive);
      if (typeof original.emissiveIntensity === 'number') mat.emissiveIntensity = original.emissiveIntensity;
      delete mat.userData._xyzLockOriginal;
      mat.needsUpdate = true;
    });
  });
}

function applyLockHighlights() {
  clearLockHighlights();
  if (!xyzHighlightLocksEnabled || !currentModel) return;
  const roots = getTransformRootsInOrder().filter((root) => isRootLocked(root));
  roots.forEach((root) => {
    root.traverse((child) => {
      if (!child?.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if (!mat.userData._xyzLockOriginal) {
          mat.userData._xyzLockOriginal = {
            emissive: mat.emissive ? mat.emissive.clone() : null,
            emissiveIntensity: typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 0,
          };
        }
        if (mat.emissive) mat.emissive.setHex(0xc47d1c);
        mat.emissiveIntensity = 0.52;
        mat.needsUpdate = true;
      });
    });
  });
}

function findRepresentativeMeshForRoot(root) {
  if (!root) return null;
  const match = structureEntries.find((entry) => getTransformRootFromMesh(entry.mesh) === root);
  return match?.mesh || null;
}

function selectAdjacentTransformRoot(direction = 1) {
  const roots = getTransformRootsInOrder();
  if (!roots.length) return;
  const currentRoot = getSelectedTransformRoot();
  let index = roots.findIndex((root) => root === currentRoot);
  if (index === -1) index = 0;
  const nextIndex = (index + direction + roots.length) % roots.length;
  const nextRoot = roots[nextIndex];
  const mesh = findRepresentativeMeshForRoot(nextRoot);
  if (mesh) {
    setSelectedMesh(mesh);
    focusMesh(mesh);
  }
}

function canEditSelectedRoot() {
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzDebug('edit-blocked', { reason: 'no-root' });
    return false;
  }
  if (root === currentModel && isRootLocked(root)) {
    root.userData._xyzLocked = false;
    updateXyzSelectionStatus();
    setXyzStatusMessage('XYZ: נעילת מודל כללי הוסרה', 'XYZ: full-model lock cleared');
    xyzDebug('auto-unlock', { reason: 'full-model-lock' });
    return true;
  }
  if (isRootLocked(root)) {
    if (xyzAutoUnlockOnMove) {
      root.userData._xyzLocked = false;
      updateXyzSelectionStatus();
      setXyzStatusMessage('XYZ: נעילה הוסרה אוטומטית', 'XYZ: lock auto-cleared for movement');
      xyzDebug('auto-unlock', { reason: 'root-lock', root: root.userData?.partKey || root.name || 'unknown' });
      return true;
    }
    setXyzStatusMessage('XYZ: איבר נעול. לחץ Unlock או Unlock All', 'XYZ: selected element is locked. Use Unlock or Unlock All');
    xyzDebug('edit-blocked', { reason: 'root-locked', root: root.userData?.partKey || root.name || 'unknown' });
    return false;
  }
  return true;
}

function unlockAllXyzLocks() {
  xyzAxisLockX = false;
  xyzAxisLockY = false;
  xyzAxisLockZ = false;
  if (xyzAxisLockXToggle) xyzAxisLockXToggle.checked = false;
  if (xyzAxisLockYToggle) xyzAxisLockYToggle.checked = false;
  if (xyzAxisLockZToggle) xyzAxisLockZToggle.checked = false;
  if (currentModel) {
    currentModel.traverse((child) => {
      if (child?.userData && child.userData._xyzLocked) {
        child.userData._xyzLocked = false;
      }
    });
  }
  saveXyzPanelSettings();
  updateXyzSelectionStatus();
  applyLockHighlights();
  setXyzStatusMessage('XYZ: כל הנעילות בוטלו', 'XYZ: all locks cleared');
}

function panicResetXyzSystem() {
  unlockAllXyzLocks();
  xyzGridPlaneMode = 'all';
  xyzGridStyle = 'classic';
  xyzGridSize = 2.6;
  xyzGridDivisions = 26;
  xyzGridLineBoldness = 1;
  xyzGridNumbersBold = false;
  xyzGridNumberScale = 1;
  xyzSnapSource = 'step';
  xyzSnapMultiplier = 1;
  if (xyzSnapToggle) xyzSnapToggle.checked = true;
  syncMoveStepControls('0.02');
  syncAdvancedGridControlsUi();
  saveXyzPanelSettings();
  rebuildXyzGridHelper();
  updateXyzSelectionStatus();
  setXyzStatusMessage(
    'XYZ: איפוס חירום הושלם (נעילות/גריד/סנאפ/צעד)',
    'XYZ: panic reset completed (locks/grid/snap/step)'
  );
}

function maybeAutoSaveSelectedRoot() {
  if (!xyzAutoSaveEnabled) return;
  saveSelectedElementPlacement(false);
}

function toggleSelectedRootLock() {
  if (!selectedMesh) {
    setXyzStatusMessage('XYZ: בחר איבר לפני נעילה', 'XYZ: select an element before locking');
    return;
  }
  const root = getSelectedTransformRoot();
  if (!root) return;
  root.userData._xyzLocked = !root.userData._xyzLocked;
  updateXyzLockButton();
  setXyzStatusMessage(
    root.userData._xyzLocked ? 'XYZ: איבר נעול לעריכה' : 'XYZ: הנעילה הוסרה',
    root.userData._xyzLocked ? 'XYZ: element locked for editing' : 'XYZ: element unlocked',
  );
  updateXyzSelectionStatus();
  applyLockHighlights();
}

function exportXyzCalibrations() {
  const transforms = getTransformStorage();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transforms,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'open3dviewer-calibrations.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  setXyzStatusMessage('XYZ: קובץ כיולים יוצא', 'XYZ: calibrations exported');
}

async function importXyzCalibrations(file) {
  try {
    const text = await file.text();
    const imported = safeParseImportedCalibrations(text);
    if (!imported) {
      setXyzStatusMessage('XYZ: קובץ כיולים לא תקין', 'XYZ: invalid calibration file');
      return;
    }
    const current = getTransformStorage();
    const merged = { ...current, ...imported };
    setTransformStorage(merged);
    applyStoredTransformsToCurrentModel();
    xyzUndoStack.length = 0;
    xyzRedoStack.length = 0;
    updateXyzHistoryButtons();
    updateXyzSelectionStatus();
    setXyzStatusMessage('XYZ: כיולים יובאו בהצלחה', 'XYZ: calibrations imported');
  } catch {
    setXyzStatusMessage('XYZ: שגיאה בייבוא כיולים', 'XYZ: failed to import calibrations');
  }
}

function applyStoredTransformsToCurrentModel() {
  if (!currentModel) return;
  const store = getTransformStorage();
  xyzUndoStack.length = 0;
  xyzRedoStack.length = 0;
  updateXyzHistoryButtons();
  currentModel.traverse((child) => {
    if (!child.userData?.partKey) return;
    if (child === currentModel) return;
    const key = getTransformStorageKey(child);
    const stored = store[key];
    if (!stored) return;
    ensureBaseTransformState(child);
    applyStoredTransformToRoot(child, stored);
  });
  applyLockHighlights();
}

function updateXyzSelectionStatus() {
  if (!xyzSelectionStatus) return;
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzSelectionStatus.textContent = currentLang === 'he' ? 'XYZ: בחר איבר להזזה' : 'XYZ: select an element to move';
    xyzSelectionStatus.classList.remove('is-warning');
    updateXyzLockButton();
    syncNumericPositionControls();
    syncXyzMovementControlsState();
    return;
  }
  ensureBaseTransformState(root);
  const name = root.userData?.partKey || formatStructureName(root.name || 'element');
  const rx = THREE.MathUtils.radToDeg(root.rotation.x).toFixed(1);
  const ry = THREE.MathUtils.radToDeg(root.rotation.y).toFixed(1);
  const rz = THREE.MathUtils.radToDeg(root.rotation.z).toFixed(1);
  const s = root.scale.x.toFixed(3);
  const rootIsLocked = isRootLocked(root);
  const lockTag = rootIsLocked ? (currentLang === 'he' ? ' | איבר נעול' : ' | ELEMENT LOCKED') : '';
  const axisLocks = [
    xyzAxisLockX ? 'X' : '',
    xyzAxisLockY ? 'Y' : '',
    xyzAxisLockZ ? 'Z' : '',
  ].filter(Boolean);
  const axisLockTag = axisLocks.length
    ? (currentLang === 'he' ? ` | צירים נעולים: ${axisLocks.join(',')}` : ` | AXIS LOCK: ${axisLocks.join(',')}`)
    : '';
  const snapTag = xyzSnapToggle?.checked
    ? (currentLang === 'he'
      ? ` | Snap:${getCurrentSnapIncrement().toFixed(3)}`
      : ` | Snap:${getCurrentSnapIncrement().toFixed(3)}`)
    : '';
  const autoTag = xyzAutoSaveEnabled ? ' | AUTO' : '';
  const symmetryTag = xyzSymmetryEnabled ? ' | SYM' : '';
  xyzSelectionStatus.textContent = `XYZ: ${name} | x:${root.position.x.toFixed(3)} y:${root.position.y.toFixed(3)} z:${root.position.z.toFixed(3)} | r:${rx}/${ry}/${rz} | s:${s}${lockTag}${axisLockTag}${snapTag}${autoTag}${symmetryTag}`;
  xyzSelectionStatus.classList.toggle('is-warning', rootIsLocked || axisLocks.length > 0);
  updateXyzLockButton();
  syncXyzFloatingControls();
  syncNumericPositionControls();
  syncXyzMovementControlsState();
  positionXyzFloatingNearSelection();
}

function syncXyzFloatingControls() {
  if (!xyzFloatingDialog) return;
  if (xyzFloatingMoveStep && xyzMoveStepInput) xyzFloatingMoveStep.value = xyzMoveStepInput.value;
  if (xyzFloatingRotateStep && xyzRotateStepInput) xyzFloatingRotateStep.value = xyzRotateStepInput.value;
  if (xyzFloatingScaleStep && xyzScaleStepInput) xyzFloatingScaleStep.value = xyzScaleStepInput.value;
  if (xyzFloatingSnapToggle && xyzSnapToggle) xyzFloatingSnapToggle.checked = !!xyzSnapToggle.checked;
  if (xyzFloatingAutoSaveToggle && xyzAutoSaveToggle) xyzFloatingAutoSaveToggle.checked = !!xyzAutoSaveToggle.checked;
  if (xyzFloatingSymmetryToggle && xyzSymmetryToggle) xyzFloatingSymmetryToggle.checked = !!xyzSymmetryToggle.checked;
  if (xyzAxisLockXToggle) xyzAxisLockXToggle.checked = !!xyzAxisLockX;
  if (xyzAxisLockYToggle) xyzAxisLockYToggle.checked = !!xyzAxisLockY;
  if (xyzAxisLockZToggle) xyzAxisLockZToggle.checked = !!xyzAxisLockZ;
  if (xyzFloatingLockBtn) {
    const root = getSelectedTransformRoot();
    const locked = !!root && isRootLocked(root);
    xyzFloatingLockBtn.textContent = locked ? 'Unlock' : 'Lock';
  }
  syncXyzFloatingFollowButton();
  syncModelPinButton();
}

function syncXyzMovementControlsState() {
  const root = getSelectedTransformRoot();
  const hasRoot = !!root;
  const rootLocked = hasRoot && root !== currentModel && isRootLocked(root);
  const disableAll = !hasRoot || rootLocked;
  const axisBlocked = {
    x: disableAll || isAxisLocked('x'),
    y: disableAll || isAxisLocked('y'),
    z: disableAll || isAxisLocked('z'),
  };

  const panelAxisButtons = Array.from(xyzCalibrationPanel?.querySelectorAll('button[data-axis][data-dir]') || []);
  panelAxisButtons.forEach((btn) => {
    const axis = String(btn.getAttribute('data-axis') || '').toLowerCase();
    const blocked = !!axisBlocked[axis];
    btn.disabled = blocked;
    btn.classList.toggle('is-axis-locked', blocked && hasRoot && !rootLocked && isAxisLocked(axis));
  });

  const floatingAxisButtons = Array.from(xyzFloatingDialog?.querySelectorAll('button[data-float-axis][data-float-dir]') || []);
  floatingAxisButtons.forEach((btn) => {
    const axis = String(btn.getAttribute('data-float-axis') || '').toLowerCase();
    const blocked = !!axisBlocked[axis];
    btn.disabled = blocked;
    btn.classList.toggle('is-axis-locked', blocked && hasRoot && !rootLocked && isAxisLocked(axis));
  });

  if (xyzApplyNumbersBtn) xyzApplyNumbersBtn.disabled = disableAll;
  if (xyzPosXInput) xyzPosXInput.disabled = axisBlocked.x;
  if (xyzPosYInput) xyzPosYInput.disabled = axisBlocked.y;
  if (xyzPosZInput) xyzPosZInput.disabled = axisBlocked.z;

  if (xyzAnalogPad) {
    xyzAnalogPad.classList.toggle('is-disabled', disableAll);
  }
}

function syncXyzFloatingFollowButton() {
  if (!xyzFloatingFollowBtn) return;
  const he = currentLang === 'he';
  xyzFloatingFollowBtn.textContent = xyzFloatingFollowSelection
    ? (he ? 'עקיבה: פעילה' : 'Follow: ON')
    : (he ? 'עקיבה: כבויה (Pin)' : 'Follow: OFF (Pin)');
  xyzFloatingFollowBtn.classList.toggle('is-active', xyzFloatingFollowSelection);
}

function positionXyzFloatingNearSelection() {
  if (!xyzFloatingDialog || !xyzFloatingDialog.open || !currentModel) return;
  if (!xyzFloatingFollowSelection) return;
  const root = getSelectedTransformRoot();
  if (!root) return;

  const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  const projected = center.clone().project(camera);
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return;

  const viewRect = renderer.domElement.getBoundingClientRect();
  const px = viewRect.left + ((projected.x + 1) * 0.5 * viewRect.width);
  const py = viewRect.top + ((1 - projected.y) * 0.5 * viewRect.height);

  const dialogRect = xyzFloatingDialog.getBoundingClientRect();
  const desiredLeft = px + 24;
  const desiredTop = py - Math.min(80, dialogRect.height * 0.3);
  const maxLeft = Math.max(8, window.innerWidth - dialogRect.width - 8);
  const maxTop = Math.max(8, window.innerHeight - dialogRect.height - 8);

  xyzFloatingDialog.style.position = 'fixed';
  xyzFloatingDialog.style.margin = '0';
  xyzFloatingDialog.style.right = 'auto';
  xyzFloatingDialog.style.bottom = 'auto';
  xyzFloatingDialog.style.left = `${Math.min(maxLeft, Math.max(8, desiredLeft))}px`;
  xyzFloatingDialog.style.top = `${Math.min(maxTop, Math.max(8, desiredTop))}px`;
}

function isXyzInteractionActive() {
  return !!xyzGridVisible && (!xyzCalibrationPanel?.hidden || !!xyzFloatingDialog?.open);
}

function updateXyzGridToggleUi() {
  if (!xyzGridToggleBtn) return;
  const isOn = !!xyzGridVisible;
  const he = currentLang === 'he';
  xyzGridToggleBtn.textContent = isOn ? '🧭 ▦ XYZ ON' : '🧭 ▦ XYZ OFF';
  xyzGridToggleBtn.classList.toggle('is-active', isOn);
  xyzGridToggleBtn.classList.toggle('is-inactive', !isOn);
  xyzGridToggleBtn.title = he
    ? (isOn ? 'כבה גריד XYZ' : 'הפעל גריד XYZ')
    : (isOn ? 'Turn off XYZ grid' : 'Turn on XYZ grid');
}

function openXyzFloatingDialog() {
  if (!xyzFloatingDialog) return;
  openDialogNonBlocking(xyzFloatingDialog);
  syncXyzFloatingControls();
  positionXyzFloatingNearSelection();
}

function closeXyzFloatingDialog() {
  if (!xyzFloatingDialog || !xyzFloatingDialog.open) return;
  xyzFloatingDialog.close();
}

function rebuildXyzGridHelper() {
  if (!xyzGridVisible) return;
  if (xyzGridGroup) {
    scene.remove(xyzGridGroup);
    xyzGridGroup.traverse((obj) => {
      if (obj.material?.map) obj.material.map.dispose?.();
      obj.material?.dispose?.();
      obj.geometry?.dispose?.();
    });
    xyzGridGroup = null;
  }
  xyzGridGroup = createXyzGridHelper(xyzGridSize, xyzGridDivisions, xyzGridPlaneMode, xyzGridStyle);
  scene.add(xyzGridGroup);
}

function toggleXyzGrid() {
  xyzGridVisible = !xyzGridVisible;
  if (xyzGridVisible) {
    xyzAxisLockX = false;
    xyzAxisLockY = false;
    xyzAxisLockZ = false;
    if (xyzAxisLockXToggle) xyzAxisLockXToggle.checked = false;
    if (xyzAxisLockYToggle) xyzAxisLockYToggle.checked = false;
    if (xyzAxisLockZToggle) xyzAxisLockZToggle.checked = false;
    xyzGridGroup = createXyzGridHelper(xyzGridSize, xyzGridDivisions, xyzGridPlaneMode, xyzGridStyle);
    scene.add(xyzGridGroup);
    xyzCalibrationPanel.hidden = false;
    updateXyzGridToggleUi();
    openXyzFloatingDialog();
    updateXyzSelectionStatus();
    updateSelectionAssistBadge();
    return;
  }

  if (xyzGridGroup) {
    scene.remove(xyzGridGroup);
    xyzGridGroup.traverse((obj) => {
      if (obj.material?.map) obj.material.map.dispose?.();
      obj.material?.dispose?.();
      obj.geometry?.dispose?.();
    });
    xyzGridGroup = null;
  }
  xyzCalibrationPanel.hidden = true;
  closeXyzFloatingDialog();
  updateXyzGridToggleUi();
  updateSelectionAssistBadge();
}

if (xyzGridModeSelect) {
  xyzGridModeSelect.addEventListener('change', () => {
    xyzGridPlaneMode = xyzGridModeSelect.value;
    if (xyzFloatingGridModeSelect) xyzFloatingGridModeSelect.value = xyzGridPlaneMode;
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzFloatingGridModeSelect) {
  xyzFloatingGridModeSelect.addEventListener('change', () => {
    xyzGridPlaneMode = xyzFloatingGridModeSelect.value;
    if (xyzGridModeSelect) xyzGridModeSelect.value = xyzGridPlaneMode;
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzGridStyleSelect) {
  xyzGridStyleSelect.addEventListener('change', () => {
    xyzGridStyle = xyzGridStyleSelect.value;
    if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = xyzGridStyle;
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzFloatingGridStyleSelect) {
  xyzFloatingGridStyleSelect.addEventListener('change', () => {
    xyzGridStyle = xyzFloatingGridStyleSelect.value;
    if (xyzGridStyleSelect) xyzGridStyleSelect.value = xyzGridStyle;
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzGridCenterColorInput) {
  xyzGridCenterColorInput.addEventListener('input', () => {
    xyzGridCustomCenterColor = xyzGridCenterColorInput.value || '#c89b2b';
    if (xyzGridStyle !== 'custom') {
      xyzGridStyle = 'custom';
      if (xyzGridStyleSelect) xyzGridStyleSelect.value = 'custom';
      if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = 'custom';
    }
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzGridPlaneColorInput) {
  xyzGridPlaneColorInput.addEventListener('input', () => {
    xyzGridCustomPlaneColor = xyzGridPlaneColorInput.value || '#5273ad';
    if (xyzGridStyle !== 'custom') {
      xyzGridStyle = 'custom';
      if (xyzGridStyleSelect) xyzGridStyleSelect.value = 'custom';
      if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = 'custom';
    }
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzGridLineBoldnessRange) {
  const onLineBoldness = () => {
    xyzGridLineBoldness = THREE.MathUtils.clamp(Number(xyzGridLineBoldnessRange.value) || 1, 0.6, 8);
    if (xyzGridLineBoldnessValue) xyzGridLineBoldnessValue.textContent = xyzGridLineBoldness.toFixed(1);
    if (xyzGridStyle !== 'custom') {
      xyzGridStyle = 'custom';
      if (xyzGridStyleSelect) xyzGridStyleSelect.value = 'custom';
      if (xyzFloatingGridStyleSelect) xyzFloatingGridStyleSelect.value = 'custom';
    }
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  };
  xyzGridLineBoldnessRange.addEventListener('input', onLineBoldness);
  xyzGridLineBoldnessRange.addEventListener('change', onLineBoldness);
}

if (xyzGridNumbersBoldToggle) {
  xyzGridNumbersBoldToggle.addEventListener('change', () => {
    xyzGridNumbersBold = !!xyzGridNumbersBoldToggle.checked;
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  });
}

if (xyzGridNumberScaleRange) {
  const onNumberScale = () => {
    xyzGridNumberScale = THREE.MathUtils.clamp(Number(xyzGridNumberScaleRange.value) || 1, 0.8, 2);
    if (xyzGridNumberScaleValue) xyzGridNumberScaleValue.textContent = xyzGridNumberScale.toFixed(1);
    saveXyzPanelSettings();
    rebuildXyzGridHelper();
  };
  xyzGridNumberScaleRange.addEventListener('input', onNumberScale);
  xyzGridNumberScaleRange.addEventListener('change', onNumberScale);
}

if (xyzGridPresetClinicalBtn) {
  xyzGridPresetClinicalBtn.addEventListener('click', () => {
    applyXyzGridPreset('clinical');
  });
}

if (xyzGridPresetContrastBtn) {
  xyzGridPresetContrastBtn.addEventListener('click', () => {
    applyXyzGridPreset('contrast');
  });
}

if (xyzGridPresetTeachingBtn) {
  xyzGridPresetTeachingBtn.addEventListener('click', () => {
    applyXyzGridPreset('teaching');
  });
}

if (xyzDebugStateBtn) {
  xyzDebugStateBtn.addEventListener('click', () => {
    const summary = buildXyzDebugSummary();
    setXyzStatusMessage(summary.he, summary.en);
    pushXyzDebugLine('snapshot', summary);
  });
}

if (xyzSafeRenderBtn) {
  xyzSafeRenderBtn.addEventListener('click', () => {
    applyRenderProfile(xyzSafeRenderModeEnabled ? 'normal' : 'safe');
  });
}

if (xyzRenderNormalBtn) {
  xyzRenderNormalBtn.addEventListener('click', () => {
    applyRenderProfile('normal');
  });
}

if (xyzRenderSafeBtn) {
  xyzRenderSafeBtn.addEventListener('click', () => {
    applyRenderProfile('safe');
  });
}

if (xyzRenderUltraBtn) {
  xyzRenderUltraBtn.addEventListener('click', () => {
    applyRenderProfile('ultra');
  });
}

if (xyzSaveWorkspaceBtn) {
  xyzSaveWorkspaceBtn.addEventListener('click', () => {
    saveWorkspaceSnapshot();
  });
}

if (xyzLoadWorkspaceBtn) {
  xyzLoadWorkspaceBtn.addEventListener('click', () => {
    loadWorkspaceSnapshot();
  });
}

if (xyzResetWorkspaceBtn) {
  xyzResetWorkspaceBtn.addEventListener('click', () => {
    resetWorkspaceSnapshot();
  });
}

if (xyzWorkspaceProfileSelect) {
  xyzWorkspaceProfileSelect.addEventListener('change', () => {
    workspaceProfileStore.selectedProfile = sanitizeWorkspaceProfileName(xyzWorkspaceProfileSelect.value || 'default');
    writeWorkspaceProfilesStore();
    syncWorkspaceProfilesUi();
  });
}

if (xyzWorkspaceSaveAsBtn) {
  xyzWorkspaceSaveAsBtn.addEventListener('click', () => {
    const name = sanitizeWorkspaceProfileName(xyzWorkspaceProfileName?.value || workspaceProfileStore.selectedProfile || 'default');
    saveWorkspaceSnapshot(name);
  });
}

if (xyzWorkspaceDeleteBtn) {
  xyzWorkspaceDeleteBtn.addEventListener('click', () => {
    const name = sanitizeWorkspaceProfileName(xyzWorkspaceProfileSelect?.value || workspaceProfileStore.selectedProfile || 'default');
    if (name === 'default') {
      setXyzStatusMessage('XYZ: לא ניתן למחוק את ברירת המחדל', 'XYZ: default profile cannot be deleted');
      return;
    }
    resetWorkspaceSnapshot(name);
  });
}

if (xyzWorkspaceExportBtn) {
  xyzWorkspaceExportBtn.addEventListener('click', () => {
    exportWorkspaceProfiles();
  });
}

if (xyzWorkspaceImportBtn && xyzWorkspaceImportInput) {
  xyzWorkspaceImportBtn.addEventListener('click', () => {
    xyzWorkspaceImportInput.value = '';
    xyzWorkspaceImportInput.click();
  });

  xyzWorkspaceImportInput.addEventListener('change', async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    await importWorkspaceProfiles(file);
  });
}

if (xyzWorkspaceAutoSaveToggle) {
  xyzWorkspaceAutoSaveToggle.addEventListener('change', () => {
    workspaceProfileStore.autoSaveEnabled = !!xyzWorkspaceAutoSaveToggle.checked;
    writeWorkspaceProfilesStore();
    restartWorkspaceAutoSaveTimer();
    setXyzStatusMessage(
      workspaceProfileStore.autoSaveEnabled ? 'XYZ: שמירה אוטומטית פעילה' : 'XYZ: שמירה אוטומטית כבויה',
      workspaceProfileStore.autoSaveEnabled ? 'XYZ: auto save enabled' : 'XYZ: auto save disabled',
    );
  });
}

if (xyzWorkspaceAutoSaveSec) {
  const onAutoSaveSec = () => {
    workspaceProfileStore.autoSaveSeconds = THREE.MathUtils.clamp(Number(xyzWorkspaceAutoSaveSec.value) || 10, 3, 120);
    xyzWorkspaceAutoSaveSec.value = String(workspaceProfileStore.autoSaveSeconds);
    writeWorkspaceProfilesStore();
    restartWorkspaceAutoSaveTimer();
  };
  xyzWorkspaceAutoSaveSec.addEventListener('input', onAutoSaveSec);
  xyzWorkspaceAutoSaveSec.addEventListener('change', onAutoSaveSec);
}

if (xyzBackupAllBtn) {
  xyzBackupAllBtn.addEventListener('click', () => {
    exportAllOpen3dState();
  });
}

if (xyzRestoreAllBtn && xyzRestoreAllInput) {
  xyzRestoreAllBtn.addEventListener('click', () => {
    xyzRestoreAllInput.value = '';
    xyzRestoreAllInput.click();
  });

  xyzRestoreAllInput.addEventListener('change', async (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    await importAllOpen3dState(file);
  });
}

if (xyzVerboseDebugToggle) {
  xyzVerboseDebugToggle.addEventListener('change', () => {
    xyzVerboseDebugEnabled = !!xyzVerboseDebugToggle.checked;
    saveXyzPanelSettings();
    setXyzStatusMessage(
      xyzVerboseDebugEnabled ? 'XYZ: דיבאג צפוף פעיל' : 'XYZ: דיבאג צפוף כבוי',
      xyzVerboseDebugEnabled ? 'XYZ: verbose debug enabled' : 'XYZ: verbose debug disabled',
    );
    pushXyzDebugLine('debug-toggle', { enabled: xyzVerboseDebugEnabled });
  });
}

if (xyzDebugClearBtn) {
  xyzDebugClearBtn.addEventListener('click', () => {
    xyzDebugLines.length = 0;
    if (xyzDebugConsole) xyzDebugConsole.textContent = '[XYZ Debug] cleared';
    setXyzStatusMessage('XYZ: לוג דיבאג נוקה', 'XYZ: debug log cleared');
  });
}

if (xyzDebugCopyBtn) {
  xyzDebugCopyBtn.addEventListener('click', async () => {
    const ok = await copyXyzDebugLog();
    setXyzStatusMessage(
      ok ? 'XYZ: הלוג הועתק' : 'XYZ: העתקה נכשלה',
      ok ? 'XYZ: debug log copied' : 'XYZ: failed to copy debug log',
    );
  });
}

if (xyzDebugFab) {
  xyzDebugFab.addEventListener('click', () => {
    if (!xyzGridVisible) toggleXyzGrid();
    openXyzFloatingDialog();
    if (xyzFloatingGridMiniPanel) {
      xyzFloatingGridMiniPanel.hidden = false;
    }
    if (xyzVerboseDebugToggle && !xyzVerboseDebugToggle.checked) {
      xyzVerboseDebugToggle.checked = true;
      xyzVerboseDebugToggle.dispatchEvent(new Event('change'));
    }
    pushXyzDebugLine('debug-open', { source: 'fab' });
  });
}

if (xyzUnlockAllBtn) {
  xyzUnlockAllBtn.addEventListener('click', () => {
    unlockAllXyzLocks();
  });
}

if (xyzHighlightLocksBtn) {
  xyzHighlightLocksBtn.addEventListener('click', () => {
    xyzHighlightLocksEnabled = !xyzHighlightLocksEnabled;
    xyzHighlightLocksBtn.classList.toggle('is-active', xyzHighlightLocksEnabled);
    saveXyzPanelSettings();
    applyLockHighlights();
    setXyzStatusMessage(
      xyzHighlightLocksEnabled ? 'XYZ: הדגשת נעילות פעילה' : 'XYZ: הדגשת נעילות כבויה',
      xyzHighlightLocksEnabled ? 'XYZ: lock highlighting enabled' : 'XYZ: lock highlighting disabled',
    );
  });
}

if (xyzAutoUnlockToggle) {
  xyzAutoUnlockToggle.addEventListener('change', () => {
    xyzAutoUnlockOnMove = !!xyzAutoUnlockToggle.checked;
    saveXyzPanelSettings();
    setXyzStatusMessage(
      xyzAutoUnlockOnMove ? 'XYZ: ביטול נעילה אוטומטי פעיל' : 'XYZ: ביטול נעילה אוטומטי כבוי',
      xyzAutoUnlockOnMove ? 'XYZ: auto-unlock on move enabled' : 'XYZ: auto-unlock on move disabled',
    );
  });
}

if (xyzPanicResetBtn) {
  xyzPanicResetBtn.addEventListener('click', () => {
    panicResetXyzSystem();
  });
}

if (xyzFloatingGridStyleBtn && xyzFloatingGridMiniPanel) {
  xyzFloatingGridStyleBtn.addEventListener('click', () => {
    xyzFloatingGridMiniPanel.hidden = !xyzFloatingGridMiniPanel.hidden;
    xyzFloatingGridStyleBtn.classList.toggle('is-active', !xyzFloatingGridMiniPanel.hidden);
    saveXyzPanelSettings();
  });
}

const applyGridSizeFromValue = (rawValue) => {
  xyzGridSize = THREE.MathUtils.clamp(Number(rawValue) || 2.6, 1.2, 6);
  syncAdvancedGridControlsUi();
  saveXyzPanelSettings();
  rebuildXyzGridHelper();
};

if (xyzGridSizeRange) {
  xyzGridSizeRange.addEventListener('input', () => applyGridSizeFromValue(xyzGridSizeRange.value));
  xyzGridSizeRange.addEventListener('change', () => applyGridSizeFromValue(xyzGridSizeRange.value));
}

if (xyzFloatingGridSizeRange) {
  xyzFloatingGridSizeRange.addEventListener('input', () => applyGridSizeFromValue(xyzFloatingGridSizeRange.value));
  xyzFloatingGridSizeRange.addEventListener('change', () => applyGridSizeFromValue(xyzFloatingGridSizeRange.value));
}

const applyGridDivisionsFromValue = (rawValue) => {
  xyzGridDivisions = THREE.MathUtils.clamp(Math.round(Number(rawValue) || 26), 8, 80);
  syncAdvancedGridControlsUi();
  saveXyzPanelSettings();
  rebuildXyzGridHelper();
};

if (xyzGridDivisionsRange) {
  xyzGridDivisionsRange.addEventListener('input', () => applyGridDivisionsFromValue(xyzGridDivisionsRange.value));
  xyzGridDivisionsRange.addEventListener('change', () => applyGridDivisionsFromValue(xyzGridDivisionsRange.value));
}

if (xyzFloatingGridDivisionsRange) {
  xyzFloatingGridDivisionsRange.addEventListener('input', () => applyGridDivisionsFromValue(xyzFloatingGridDivisionsRange.value));
  xyzFloatingGridDivisionsRange.addEventListener('change', () => applyGridDivisionsFromValue(xyzFloatingGridDivisionsRange.value));
}

if (xyzSnapSourceSelect) {
  xyzSnapSourceSelect.addEventListener('change', () => {
    xyzSnapSource = xyzSnapSourceSelect.value === 'grid' ? 'grid' : 'step';
    syncAdvancedGridControlsUi();
    saveXyzPanelSettings();
  });
}

if (xyzSnapMultiplierRange) {
  const onSnapMultiplier = () => {
    xyzSnapMultiplier = THREE.MathUtils.clamp(Number(xyzSnapMultiplierRange.value) || 1, 0.25, 4);
    syncAdvancedGridControlsUi();
    saveXyzPanelSettings();
  };
  xyzSnapMultiplierRange.addEventListener('input', onSnapMultiplier);
  xyzSnapMultiplierRange.addEventListener('change', onSnapMultiplier);
}

function nudgeSelectedElement(axis, direction) {
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzDebug('move-blocked', { source: 'nudge', axis, direction, reason: 'no-root' });
    return;
  }
  if (!canEditSelectedRoot()) {
    xyzDebug('move-blocked', { source: 'nudge', axis, direction, reason: 'cannot-edit-root' });
    return;
  }
  if (isAxisLocked(axis)) {
    setXyzStatusMessage(`XYZ: ציר ${axis.toUpperCase()} נעול`, `XYZ: axis ${axis.toUpperCase()} is locked`);
    xyzDebug('move-blocked', { source: 'nudge', axis, direction, reason: 'axis-locked' });
    return;
  }
  const step = readNumericStep(xyzMoveStepInput, 0.02, 0.001);
  const snapStep = xyzSnapToggle?.checked ? getCurrentSnapIncrement() : step;
  const delta = snapStep * direction;
  const before = root.position.clone();
  applyOperationToRootAndMirror(root, (targetRoot, isMirror) => {
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    const signedDelta = isMirror && axis === 'x' ? -delta : delta;
    targetRoot.position[axis] += signedDelta;

    if (xyzSnapToggle?.checked) {
      targetRoot.position.x = Math.round(targetRoot.position.x / snapStep) * snapStep;
      targetRoot.position.y = Math.round(targetRoot.position.y / snapStep) * snapStep;
      targetRoot.position.z = Math.round(targetRoot.position.z / snapStep) * snapStep;
    }
  });
  const actual = root.position.clone().sub(before);
  xyzDebug('move-applied', {
    source: 'nudge',
    axis,
    direction,
    delta: [actual.x.toFixed(4), actual.y.toFixed(4), actual.z.toFixed(4)],
  });
  showMoveDeltaPopup(actual.x, actual.y, actual.z, 'Nudge');
  maybeAutoSaveSelectedRoot();
  updateXyzSelectionStatus();
}

function syncNumericPositionControls() {
  const root = getSelectedTransformRoot();
  const inputs = [xyzPosXInput, xyzPosYInput, xyzPosZInput].filter(Boolean);
  const disabled = !root;
  inputs.forEach((inputEl) => {
    inputEl.disabled = disabled;
  });
  if (!root) {
    if (xyzPosXInput) xyzPosXInput.value = '';
    if (xyzPosYInput) xyzPosYInput.value = '';
    if (xyzPosZInput) xyzPosZInput.value = '';
    return;
  }
  if (xyzPosXInput) xyzPosXInput.value = root.position.x.toFixed(3);
  if (xyzPosYInput) xyzPosYInput.value = root.position.y.toFixed(3);
  if (xyzPosZInput) xyzPosZInput.value = root.position.z.toFixed(3);
}

function applyNumericPositionInputs() {
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzDebug('move-blocked', { source: 'numeric', reason: 'no-root' });
    return;
  }
  if (!canEditSelectedRoot()) {
    xyzDebug('move-blocked', { source: 'numeric', reason: 'cannot-edit-root' });
    return;
  }
  const before = root.position.clone();
  ensureBaseTransformState(root);
  pushUndoEntry(root);

  const nextX = readNumericStep(xyzPosXInput, root.position.x, -9999);
  const nextY = readNumericStep(xyzPosYInput, root.position.y, -9999);
  const nextZ = readNumericStep(xyzPosZInput, root.position.z, -9999);

  if (!isAxisLocked('x')) root.position.x = nextX;
  if (!isAxisLocked('y')) root.position.y = nextY;
  if (!isAxisLocked('z')) root.position.z = nextZ;

  const step = readNumericStep(xyzMoveStepInput, 0.02, 0.001);
  if (xyzSnapToggle?.checked) {
    const snapStep = getCurrentSnapIncrement();
    if (!isAxisLocked('x')) root.position.x = Math.round(root.position.x / snapStep) * snapStep;
    if (!isAxisLocked('y')) root.position.y = Math.round(root.position.y / snapStep) * snapStep;
    if (!isAxisLocked('z')) root.position.z = Math.round(root.position.z / snapStep) * snapStep;
  }

  maybeAutoSaveSelectedRoot();
  const actual = root.position.clone().sub(before);
  xyzDebug('move-applied', {
    source: 'numeric',
    delta: [actual.x.toFixed(4), actual.y.toFixed(4), actual.z.toFixed(4)],
  });
  showMoveDeltaPopup(actual.x, actual.y, actual.z, 'Apply');
  updateXyzSelectionStatus();
  syncNumericPositionControls();
}

function bindNumericInputInteractions(inputEl, axis) {
  if (!inputEl) return;
  inputEl.addEventListener('change', () => {
    applyNumericPositionInputs();
  });

  inputEl.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    nudgeSelectedElement(axis, direction);
    syncNumericPositionControls();
  }, { passive: false });

  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudgeSelectedElement(axis, 1);
      syncNumericPositionControls();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudgeSelectedElement(axis, -1);
      syncNumericPositionControls();
    }
  });
}

function rotateSelectedElement(axis, direction) {
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzDebug('rotate-blocked', { axis, direction, reason: 'no-root' });
    return;
  }
  if (!canEditSelectedRoot()) {
    xyzDebug('rotate-blocked', { axis, direction, reason: 'cannot-edit-root' });
    return;
  }
  const stepDeg = readNumericStep(xyzRotateStepInput, 5, 1);
  const stepRad = THREE.MathUtils.degToRad(stepDeg) * direction;
  applyOperationToRootAndMirror(root, (targetRoot, isMirror) => {
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    const mirrorFactor = isMirror && axis !== 'x' ? -1 : 1;
    targetRoot.rotation[axis] += stepRad * mirrorFactor;
  });
  maybeAutoSaveSelectedRoot();
  xyzDebug('rotate-applied', {
    axis,
    direction,
    value: THREE.MathUtils.radToDeg(root.rotation[axis]).toFixed(3),
  });
  updateXyzSelectionStatus();
}

function scaleSelectedElement(direction) {
  const root = getSelectedTransformRoot();
  if (!root) {
    xyzDebug('scale-blocked', { direction, reason: 'no-root' });
    return;
  }
  if (!canEditSelectedRoot()) {
    xyzDebug('scale-blocked', { direction, reason: 'cannot-edit-root' });
    return;
  }
  const step = readNumericStep(xyzScaleStepInput, 0.05, 0.01);
  const factor = direction > 0 ? 1 + step : 1 - step;
  applyOperationToRootAndMirror(root, (targetRoot) => {
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    const next = THREE.MathUtils.clamp(targetRoot.scale.x * factor, 0.05, 8);
    targetRoot.scale.set(next, next, next);
  });
  maybeAutoSaveSelectedRoot();
  xyzDebug('scale-applied', { direction, scale: root.scale.x.toFixed(4) });
  updateXyzSelectionStatus();
}

function saveSelectedElementPlacement(includeMirror = true) {
  const root = getSelectedTransformRoot();
  if (!root) return;
  const store = getTransformStorage();
  applyOperationToRootAndMirror(root, (targetRoot, isMirror) => {
    if (isMirror && !includeMirror) return;
    const key = getTransformStorageKey(targetRoot);
    if (!key) return;
    store[key] = {
      position: targetRoot.position.toArray(),
      rotation: [targetRoot.rotation.x, targetRoot.rotation.y, targetRoot.rotation.z],
      scale: targetRoot.scale.toArray(),
    };
  });
  setTransformStorage(store);
  updateXyzSelectionStatus();
}

function resetSelectedElementToSavedPlacement() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  if (!canEditSelectedRoot()) return;
  const store = getTransformStorage();
  const key = getTransformStorageKey(root);
  const saved = key ? store[key] : null;
  if (!saved) {
    setXyzStatusMessage('XYZ: אין כיול שמור לאיבר זה', 'XYZ: no saved calibration for this element');
    return;
  }
  applyOperationToRootAndMirror(root, (targetRoot) => {
    const targetKey = getTransformStorageKey(targetRoot);
    const targetSaved = targetKey ? store[targetKey] : null;
    if (!targetSaved) return;
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    applyStoredTransformToRoot(targetRoot, targetSaved);
  });
  updateXyzSelectionStatus();
}

function clearSelectedElementPlacement() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  if (!canEditSelectedRoot()) return;
  const store = getTransformStorage();
  applyOperationToRootAndMirror(root, (targetRoot) => {
    const key = getTransformStorageKey(targetRoot);
    if (!key) return;
    delete store[key];
  });
  setTransformStorage(store);
  resetSelectedElementPlacement();
}

function alignSelectedElementToBodyCenterX() {
  const root = getSelectedTransformRoot();
  if (!root || !currentModel) return;
  if (!canEditSelectedRoot()) return;
  const modelCenter = new THREE.Box3().setFromObject(currentModel).getCenter(new THREE.Vector3());
  applyOperationToRootAndMirror(root, (targetRoot, isMirror) => {
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    const rootCenter = new THREE.Box3().setFromObject(targetRoot).getCenter(new THREE.Vector3());
    const delta = modelCenter.x - rootCenter.x;
    targetRoot.position.x += isMirror ? -delta : delta;
  });
  maybeAutoSaveSelectedRoot();
  updateXyzSelectionStatus();
}

function resetSelectedElementPlacement() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  if (!canEditSelectedRoot()) return;
  applyOperationToRootAndMirror(root, (targetRoot) => {
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    const base = targetRoot.userData._xyzBaseTransform;
    if (!base) return;
    targetRoot.position.copy(base.position);
    targetRoot.rotation.copy(base.rotation);
    targetRoot.scale.copy(base.scale);
  });
  maybeAutoSaveSelectedRoot();
  updateXyzSelectionStatus();
}

function saveSelectedElementToSlot() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  const slotNumber = getSelectedSlotNumber();
  const slotStore = getSlotStorage();
  applyOperationToRootAndMirror(root, (targetRoot) => {
    const slotKey = getSlotStorageKey(targetRoot, slotNumber);
    if (!slotKey) return;
    slotStore[slotKey] = makeRootSnapshot(targetRoot);
  });
  setSlotStorage(slotStore);
  setXyzStatusMessage(`XYZ: נשמר לסלוט ${slotNumber}`, `XYZ: saved to slot ${slotNumber}`);
}

function loadSelectedElementFromSlot() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  if (!canEditSelectedRoot()) return;
  const slotNumber = getSelectedSlotNumber();
  const slotStore = getSlotStorage();
  const slotKey = getSlotStorageKey(root, slotNumber);
  const selectedSaved = slotKey ? slotStore[slotKey] : null;
  if (!selectedSaved) {
    setXyzStatusMessage(`XYZ: סלוט ${slotNumber} ריק`, `XYZ: slot ${slotNumber} is empty`);
    return;
  }

  applyOperationToRootAndMirror(root, (targetRoot) => {
    const targetKey = getSlotStorageKey(targetRoot, slotNumber);
    const saved = targetKey ? slotStore[targetKey] : null;
    if (!saved) return;
    ensureBaseTransformState(targetRoot);
    pushUndoEntry(targetRoot);
    applyStoredTransformToRoot(targetRoot, saved);
  });
  maybeAutoSaveSelectedRoot();
  updateXyzSelectionStatus();
}

function clearSelectedElementSlot() {
  const root = getSelectedTransformRoot();
  if (!root) return;
  const slotNumber = getSelectedSlotNumber();
  const slotStore = getSlotStorage();
  applyOperationToRootAndMirror(root, (targetRoot) => {
    const slotKey = getSlotStorageKey(targetRoot, slotNumber);
    if (!slotKey) return;
    delete slotStore[slotKey];
  });
  setSlotStorage(slotStore);
  setXyzStatusMessage(`XYZ: סלוט ${slotNumber} נוקה`, `XYZ: slot ${slotNumber} cleared`);
}

function fitCameraToCurrentModel() {
  if (!currentModel) return;

  const box = new THREE.Box3().setFromObject(currentModel);
  if (box.isEmpty()) return;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.15);
  const center = sphere.center;
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius * 1.35) / Math.tan(fovRad * 0.5);

  const viewDirection = camera.position.clone().sub(controls.target);
  if (viewDirection.lengthSq() < 1e-6) {
    viewDirection.set(1, 0.65, 1);
  }
  viewDirection.normalize();

  controls.target.copy(center);
  camera.position.copy(center.clone().add(viewDirection.multiplyScalar(distance)));
  controls.minDistance = Math.max(radius * 0.25, 0.05);
  controls.maxDistance = Math.max(radius * 40, controls.minDistance + 2);
  camera.near = Math.max(distance / 600, 0.01);
  camera.far = Math.max(distance * 240, 200);
  camera.updateProjectionMatrix();
  controls.update();
}

function stabilizeCameraDistance() {
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  if (!Number.isFinite(distance) || distance < 1e-8) return;

  const minDistance = Math.max(controls.minDistance || 0.05, 0.03);
  const maxDistance = Math.max(controls.maxDistance || 500, minDistance + 0.2);
  const clamped = THREE.MathUtils.clamp(distance, minDistance, maxDistance);
  if (Math.abs(clamped - distance) < 1e-5) return;

  offset.setLength(clamped);
  camera.position.copy(controls.target.clone().add(offset));
}

function pickMeshAt(clientX, clientY) {
  if (!currentModel || !pickableMeshes.length) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(pickableMeshes, false);
  const hit = intersections.find((i) => i.object && i.object.isMesh && i.object.visible);
  return hit ? hit.object : null;
}

function intersectPointerWithPlane(clientX, clientY, plane, outTarget = new THREE.Vector3()) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(plane, hit);
  if (!ok) return null;
  outTarget.copy(hit);
  return outTarget;
}

function startMouseTransformDrag(event) {
  if (!isXyzInteractionActive()) {
    xyzDebug('drag-blocked', { reason: 'xyz-inactive' });
    return false;
  }
  if (event.button !== 0) {
    xyzDebug('drag-blocked', { reason: 'non-left-button', button: event.button });
    return false;
  }
  const hitMesh = pickMeshAt(event.clientX, event.clientY);
  if (!hitMesh) {
    xyzDebug('drag-blocked', { reason: 'no-hit' });
    return false;
  }

  const root = getTransformRootFromMesh(hitMesh);
  const selectedRoot = getSelectedTransformRoot();
  const draggingSelectedRoot = !!selectedRoot && selectedRoot === root;
  if (!event.shiftKey && !draggingSelectedRoot) {
    xyzDebug('drag-blocked', { reason: 'not-selected-and-no-shift' });
    return false;
  }
  if (!root) {
    xyzDebug('drag-blocked', { reason: 'no-root' });
    return false;
  }
  if (isRootLocked(root)) {
    xyzDebug('drag-blocked', { reason: 'root-locked', root: root.userData?.partKey || root.name || 'unknown' });
    return false;
  }

  setSelectedMesh(hitMesh);
  ensureBaseTransformState(root);

  const rootWorld = root.getWorldPosition(new THREE.Vector3());
  const cameraDir = camera.getWorldDirection(new THREE.Vector3()).normalize();
  mouseTransformPlane.setFromNormalAndCoplanarPoint(cameraDir, rootWorld);

  const hitPoint = intersectPointerWithPlane(event.clientX, event.clientY, mouseTransformPlane);
  if (!hitPoint) {
    xyzDebug('drag-blocked', { reason: 'plane-no-hit' });
    return false;
  }

  const localPoint = root.parent ? root.parent.worldToLocal(hitPoint.clone()) : hitPoint.clone();
  mouseTransformDragOffset.copy(root.position).sub(localPoint);
  mouseTransformRoot = root;
  mouseTransformDragging = true;
  mouseTransformPointerId = event.pointerId;
  mouseTransformMoved = false;
  selectionAssistBadgeEl.classList.add('is-dragging');

  renderer.domElement.setPointerCapture?.(event.pointerId);
  controls.enabled = false;
  pushUndoEntry(root);
  setXyzStatusMessage('XYZ: גרירה עם העכבר פעילה', 'XYZ: mouse drag is active');
  xyzDebug('drag-start', { root: root.userData?.partKey || root.name || 'unknown' });
  updateSelectionAssistBadge();
  return true;
}

function moveMouseTransformDrag(event) {
  if (!mouseTransformDragging || !mouseTransformRoot) return;
  if (mouseTransformPointerId !== null && event.pointerId !== mouseTransformPointerId) return;

  const worldPoint = intersectPointerWithPlane(event.clientX, event.clientY, mouseTransformPlane);
  if (!worldPoint) return;
  const root = mouseTransformRoot;
  const localPoint = root.parent ? root.parent.worldToLocal(worldPoint.clone()) : worldPoint.clone();

  const nextPosition = localPoint.add(mouseTransformDragOffset);
  const step = readNumericStep(xyzMoveStepInput, 0.02, 0.001);
  if (xyzSnapToggle?.checked) {
    const snapStep = getCurrentSnapIncrement();
    nextPosition.x = Math.round(nextPosition.x / snapStep) * snapStep;
    nextPosition.y = Math.round(nextPosition.y / snapStep) * snapStep;
    nextPosition.z = Math.round(nextPosition.z / snapStep) * snapStep;
  }

  if (nextPosition.distanceToSquared(root.position) < 1e-10) return;
  const before = root.position.clone();
  if (isAxisLocked('x')) nextPosition.x = root.position.x;
  if (isAxisLocked('y')) nextPosition.y = root.position.y;
  if (isAxisLocked('z')) nextPosition.z = root.position.z;
  root.position.copy(nextPosition);
  const actual = root.position.clone().sub(before);
  const now = performance.now();
  if (now - xyzDebugLastDragLogAt > 110) {
    xyzDebugLastDragLogAt = now;
    xyzDebug('drag-step', {
      delta: [actual.x.toFixed(4), actual.y.toFixed(4), actual.z.toFixed(4)],
      pos: [root.position.x.toFixed(4), root.position.y.toFixed(4), root.position.z.toFixed(4)],
    });
  }
  showMoveDeltaPopup(actual.x, actual.y, actual.z, 'Drag');
  mouseTransformMoved = true;
  updateXyzSelectionStatus();
}

function endMouseTransformDrag(event) {
  if (!mouseTransformDragging) return;
  if (mouseTransformPointerId !== null && event.pointerId !== mouseTransformPointerId) return;

  if (mouseTransformMoved) {
    maybeAutoSaveSelectedRoot();
    setXyzStatusMessage('XYZ: גרירה הושלמה', 'XYZ: drag completed');
    xyzDebug('drag-end', { moved: true });
  } else {
    xyzDebug('drag-end', { moved: false });
  }

  mouseTransformDragging = false;
  mouseTransformPointerId = null;
  mouseTransformRoot = null;
  mouseTransformMoved = false;
  selectionAssistBadgeEl.classList.remove('is-dragging');
  controls.enabled = !modelViewportPinned;
  updateSelectionAssistBadge();
}

function resetAnalogJoystickVisual() {
  analogJoystickVector.set(0, 0);
  if (xyzAnalogStick) {
    xyzAnalogStick.style.transform = 'translate(-50%, -50%)';
  }
}

function beginAnalogJoystick(event) {
  if (!xyzAnalogPad || !xyzAnalogStick) return;
  if (event.button !== 0) return;
  analogJoystickActive = true;
  analogJoystickPointerId = event.pointerId;
  analogJoystickLastStepAt = 0;
  xyzAnalogPad.setPointerCapture?.(event.pointerId);
  updateAnalogJoystickFromEvent(event);
}

function updateAnalogJoystickFromEvent(event) {
  if (!analogJoystickActive || !xyzAnalogPad || !xyzAnalogStick) return;
  if (analogJoystickPointerId !== null && event.pointerId !== analogJoystickPointerId) return;
  const rect = xyzAnalogPad.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const radius = Math.max(24, rect.width * 0.5 - 14);
  const len = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, radius / len);
  const clampedX = dx * scale;
  const clampedY = dy * scale;
  analogJoystickVector.set(clampedX / radius, clampedY / radius);
  xyzAnalogStick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
}

function endAnalogJoystick(event) {
  if (!analogJoystickActive) return;
  if (analogJoystickPointerId !== null && event.pointerId !== analogJoystickPointerId) return;
  analogJoystickActive = false;
  analogJoystickPointerId = null;
  resetAnalogJoystickVisual();
  maybeAutoSaveSelectedRoot();
}

function applyAnalogJoystickStep(now) {
  if (!analogJoystickActive) return;
  const root = getSelectedTransformRoot();
  if (!root || !canEditSelectedRoot()) return;
  if (now - analogJoystickLastStepAt < 35) return;
  analogJoystickLastStepAt = now;

  const strength = Math.min(1, analogJoystickVector.length());
  if (strength < 0.04) return;
  const step = readNumericStep(xyzMoveStepInput, 0.02, 0.001);
  const deltaFactor = Math.max(0.15, strength) * 0.55;
  const dx = analogJoystickVector.x * step * deltaFactor;
  const dy = -analogJoystickVector.y * step * deltaFactor;

  pushUndoEntry(root);
  const before = root.position.clone();
  if (!isAxisLocked('x')) root.position.x += dx;
  if (!isAxisLocked('y')) root.position.y += dy;

  if (xyzSnapToggle?.checked) {
    const snapStep = getCurrentSnapIncrement();
    if (!isAxisLocked('x')) root.position.x = Math.round(root.position.x / snapStep) * snapStep;
    if (!isAxisLocked('y')) root.position.y = Math.round(root.position.y / snapStep) * snapStep;
  }
  const actual = root.position.clone().sub(before);
  showMoveDeltaPopup(actual.x, actual.y, actual.z, 'Joystick');
  updateXyzSelectionStatus();
}

function zoomByFactor(factor) {
  const offset = camera.position.clone().sub(controls.target);
  const currentDistance = offset.length();
  if (!Number.isFinite(currentDistance) || currentDistance < 1e-5) return;

  const minDistance = controls.minDistance || 0.05;
  const maxDistance = controls.maxDistance || 1000;
  const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, minDistance, maxDistance);

  offset.setLength(nextDistance);
  camera.position.copy(controls.target.clone().add(offset));
  controls.update();
}

function setCameraAngle(direction) {
  const baseDirection = direction.clone().normalize();
  const offset = camera.position.clone().sub(controls.target);
  const distance = Math.max(offset.length(), controls.minDistance || 0.2);
  camera.position.copy(controls.target.clone().add(baseDirection.multiplyScalar(distance)));

  // Keep top view stable and avoid sudden upside-down flips.
  if (Math.abs(direction.y) > 0.95) {
    camera.up.set(0, 0, -1);
  } else {
    camera.up.set(0, 1, 0);
  }
  camera.lookAt(controls.target);
  controls.update();
}

registerEventBindings({
  windowObj: window,
  tabButtons,
  elements: {
    canvasEl: renderer.domElement,
    showAllBtn,
    hideAllBtn,
    invertVisibilityBtn,
    clearSelectionBtn,
    focusSelectedBtn,
    resetViewBtn,
    zoomInBtn,
    zoomOutBtn,
    angleFrontBtn,
    angleSideBtn,
    angleTopBtn,
    toggleFavoriteBtn,
    favoritesOnlyBtn,
    openDetailsBtn,
    langToggleBtn,
    partDetailsDialog,
    xrayToggle,
    xrayOpacity,
    analyzePartBtn,
    partAnalysisSelect,
    isolatePartBtn,
    resetIsolationBtn,
  },
  handlers: {
    onCanvasClick: (event) => {
      renderer.domElement.focus();
      if (isXyzInteractionActive()) {
        const hitMesh = pickMeshAt(event.clientX, event.clientY);
        setSelectedMesh(hitMesh);
        if (hitMesh) {
          openXyzFloatingDialog();
        }
      }
    },
    onCanvasDoubleClick: (event) => {
      renderer.domElement.focus();
      const hitMesh = pickMeshAt(event.clientX, event.clientY);
      setSelectedMesh(hitMesh);
      if (hitMesh) {
        openMeshDetails(hitMesh);
      }
    },
    onCanvasMove: (event) => {
      pendingPointerEvent = event;
    },
    onCanvasLeave: () => {
      setHoveredMesh(null);
    },
    onShowAll: () => {
      structureEntries.forEach((entry) => {
        entry.checkbox.checked = true;
        entry.mesh.visible = true;
      });
      runPartAnalysis();
      updateStatusBar();
      saveCurrentStructureState();
    },
    onHideAll: () => {
      structureEntries.forEach((entry) => {
        entry.checkbox.checked = false;
        entry.mesh.visible = false;
      });
      runPartAnalysis();
      updateStatusBar();
      saveCurrentStructureState();
    },
    onInvertVisibility: () => {
      structureEntries.forEach((entry) => {
        entry.mesh.visible = !entry.mesh.visible;
        entry.checkbox.checked = entry.mesh.visible;
      });
      runPartAnalysis();
      updateStatusBar();
      saveCurrentStructureState();
    },
    onClearSelection: () => {
      setSelectedMesh(null);
      controls.autoRotate = false;
      setAnimationMode('none');
    },
    onFocusSelected: () => {
      if (!selectedMesh) return;
      focusMesh(selectedMesh);
    },
    onResetView: () => {
      controls.autoRotate = false;
      fitCameraToCurrentModel();
    },
    onZoomIn: () => {
      zoomByFactor(0.82);
    },
    onZoomOut: () => {
      zoomByFactor(1.22);
    },
    onAngleFront: () => {
      setCameraAngle(new THREE.Vector3(0, 0.25, 1));
    },
    onAngleSide: () => {
      setCameraAngle(new THREE.Vector3(1, 0.2, 0));
    },
    onAngleTop: () => {
      setCameraAngle(new THREE.Vector3(0.001, 1, 0.001));
    },
    onToggleFavorite: () => {
      if (!selectedMesh) return;
      const key = getMeshDisplayName(selectedMesh);
      if (favoritePartNames.has(key)) {
        favoritePartNames.delete(key);
      } else {
        favoritePartNames.add(key);
      }
      updateFavoriteControls();
      applyStructureFilter();
      saveAppState();
    },
    onToggleFavoritesOnly: () => {
      favoritesOnly = !favoritesOnly;
      updateFavoriteControls();
      applyStructureFilter();
      saveAppState();
    },
    onOpenDetails: () => {
      if (!selectedMesh) return;
      openMeshDetails(selectedMesh);
    },
    onToggleLanguage: () => {
      currentLang = currentLang === 'he' ? 'en' : 'he';
      updateLanguageUI(true);
      saveAppState();
    },
    onTabClick: (tabName) => {
      activateDialogTab(tabName);
    },
    onDialogClose: () => {
      controls.autoRotate = false;
      setAnimationMode('none');
      if (detailsTriggerEl && typeof detailsTriggerEl.focus === 'function') {
        detailsTriggerEl.focus();
      } else {
        openDetailsBtn.focus();
      }
      detailsTriggerEl = null;
    },
    onWindowKeydown: (event) => {
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      const key = event.key.toLowerCase();
      if (isXyzInteractionActive()) {
        if (event.ctrlKey && key === 'z') {
          event.preventDefault();
          undoXyzTransform();
          return;
        }
        if ((event.ctrlKey && key === 'y') || (event.ctrlKey && event.shiftKey && key === 'z')) {
          event.preventDefault();
          redoXyzTransform();
          return;
        }
        if (key === '[') {
          event.preventDefault();
          selectAdjacentTransformRoot(-1);
          return;
        }
        if (key === ']') {
          event.preventDefault();
          selectAdjacentTransformRoot(1);
          return;
        }
        if (key === 'l') {
          event.preventDefault();
          toggleSelectedRootLock();
          return;
        }
        if (key === 's') {
          event.preventDefault();
          xyzSymmetryEnabled = !xyzSymmetryEnabled;
          if (xyzSymmetryToggle) xyzSymmetryToggle.checked = xyzSymmetryEnabled;
          saveXyzPanelSettings();
          updateXyzSelectionStatus();
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          nudgeSelectedElement('x', -1);
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          nudgeSelectedElement('x', 1);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          nudgeSelectedElement('y', 1);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          nudgeSelectedElement('y', -1);
          return;
        }
        if (event.key === 'PageUp') {
          event.preventDefault();
          nudgeSelectedElement('z', 1);
          return;
        }
        if (event.key === 'PageDown') {
          event.preventDefault();
          nudgeSelectedElement('z', -1);
          return;
        }
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          scaleSelectedElement(1);
          return;
        }
        if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          scaleSelectedElement(-1);
          return;
        }
      }

      if (key === 'f') {
        focusSelectedBtn.click();
      } else if (key === 'r') {
        resetViewBtn.click();
      } else if (key === 'x') {
        xrayToggle.click();
      } else if (key === 'd') {
        openDetailsBtn.click();
      }
    },
    onXrayToggle: () => {
      if (xyzSafeRenderModeEnabled && xrayToggle.checked) {
        xrayToggle.checked = false;
        setXyzStatusMessage(
          'XYZ: Safe Render פעיל, XRAY חסום זמנית',
          'XYZ: Safe Render is active, XRAY is temporarily blocked',
        );
        pushXyzDebugLine('safe-render-block', { action: 'xray-toggle' });
        return;
      }
      stopTimeline(false);
      stopSystemDemo(false);
      xrayEnabled = xrayToggle.checked;
      applyXrayToCurrentModel();
      saveAppState();
    },
    onXrayOpacityInput: () => {
      stopTimeline(false);
      stopSystemDemo(false);
      xrayOpacityValueNumber = Number.parseFloat(xrayOpacity.value) || 0.35;
      xrayOpacityValue.textContent = `${Math.round(xrayOpacityValueNumber * 100)}%`;
      if (xrayEnabled) {
        applyXrayToCurrentModel();
      }
      saveAppState();
    },
    onAnalyze: () => {
      runPartAnalysis();
      saveAppState();
    },
    onAnalysisCategoryChange: () => {
      runPartAnalysis();
      saveAppState();
    },
    onIsolate: () => {
      isolateCategory(partAnalysisSelect.value);
    },
    onResetIsolation: () => {
      isolateCategory('all');
    },
    onResize,
  },
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (startMouseTransformDrag(event)) {
    event.preventDefault();
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!mouseTransformDragging) return;
  moveMouseTransformDrag(event);
});

renderer.domElement.addEventListener('pointerup', (event) => {
  endMouseTransformDrag(event);
  if (event.button === 1) {
    const now = performance.now();
    if (now - middleMouseLastClickAt <= 360) {
      middleMouseLastClickAt = 0;
      event.preventDefault();
      controls.autoRotate = false;
      fitCameraToCurrentModel();
      setXyzStatusMessage('XYZ: דאבל-קליק גלגלת -> חזרה למרכז', 'XYZ: middle double-click -> recentered');
      return;
    }
    middleMouseLastClickAt = now;
  }
});

renderer.domElement.addEventListener('pointercancel', (event) => {
  endMouseTransformDrag(event);
});

// Resize handling
function onResize() {
  const width = containerEl.clientWidth;
  const height = containerEl.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
onResize();
applyPerformanceSettings(false, true);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);
const fillLight = new THREE.HemisphereLight(0xddeeff, 0x1b1b1b, 0.35);
fillLight.visible = false;
scene.add(fillLight);

const sizeReferenceGroup = new THREE.Group();
const refMat = new THREE.LineBasicMaterial({ color: 0x3bb3ff });
const refPoints = [
  new THREE.Vector3(-1.35, 0, 0),
  new THREE.Vector3(-1.35, 1.75, 0),
];
const refGeom = new THREE.BufferGeometry().setFromPoints(refPoints);
sizeReferenceGroup.add(new THREE.Line(refGeom, refMat));
const headMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0x3bb3ff })
);
headMarker.position.set(-1.35, 1.75, 0);
sizeReferenceGroup.add(headMarker);
sizeReferenceGroup.visible = false;
scene.add(sizeReferenceGroup);

// Load model
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

const modelLoaderController = createModelLoaderController({
  THREE,
  loader,
  baseModelOptions: BASE_MODEL_OPTIONS,
  mirroredPartKeys: MIRRORED_PART_KEYS,
  formatStructureName,
  getModelLabel,
  getCurrentLang: () => currentLang,
  getActiveRequestId: () => loadRequestId,
  setPlaceholder,
  tf,
  loadingListElement: listEl,
});

function clearCompareOverlay() {
  if (!compareOverlayModel) return;
  scene.remove(compareOverlayModel);
  compareOverlayModel.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
  });
  compareOverlayModel = null;
  compareEnabled = false;
  compareToggleBtn.textContent = t('compareOn');
}

function isAtomicModelOption(key, model) {
  if (!model || typeof model !== 'object') return false;
  if (Array.isArray(model.parts)) return false;
  if (typeof model.path !== 'string' || !model.path.trim()) return false;
  if (String(key || '').startsWith(CUSTOM_COMPOSITE_PREFIX)) return false;
  return true;
}

function getUnifiedModelPriority(key) {
  const priorities = [
    'overview-skeleton',
    'vertebrae',
    'upper-limb',
    'lower-limb',
    'hand',
    'heart-human-organ3d',
    'lungs-human-organ3d',
    'kidneys-human-organ3d',
    'exploded-skull',
    'overview-colored-skull',
    'colored-skull-base',
  ];
  const idx = priorities.indexOf(String(key || ''));
  return idx >= 0 ? idx : 999;
}

function isHumanAnatomyModelKey(key, model) {
  const text = [
    String(key || '').toLowerCase(),
    String(model?.path || '').toLowerCase(),
    String(model?.labels?.he || '').toLowerCase(),
    String(model?.labels?.en || '').toLowerCase(),
  ].join(' ');

  const excluded = [
    'drone',
    'vehicle',
    'helmet',
    'fox',
    'cesium',
    'air',
    'ground',
  ];
  if (excluded.some((token) => text.includes(token))) return false;

  const included = [
    'open3dmodel',
    'human',
    'organ',
    'skeleton',
    'skull',
    'limb',
    'hand',
    'vertebra',
    'heart',
    'lung',
    'kidney',
    'body',
    'anat',
    'גולגולת',
    'שלד',
    'גפה',
    'חוליות',
    'לב',
    'ריאה',
    'כליה',
    'איבר',
  ];
  return included.some((token) => text.includes(token));
}

function buildUnifiedFullSystemSelection() {
  const base = MODEL_OPTIONS['full-system'] || BASE_MODEL_OPTIONS['full-system'] || {
    labels: { he: 'מערכת גוף אחודה', en: 'Unified Full System' },
    parts: [],
  };

  const entries = Object.entries(MODEL_OPTIONS)
    .filter(([key, model]) => isAtomicModelOption(key, model))
    .filter(([key, model]) => isHumanAnatomyModelKey(key, model))
    .filter(([key]) => key !== 'open3dmodel-main')
    .sort((a, b) => {
      const p = getUnifiedModelPriority(a[0]) - getUnifiedModelPriority(b[0]);
      if (p !== 0) return p;
      return getModelLabel(a[1]).localeCompare(getModelLabel(b[1]), currentLang === 'he' ? 'he' : 'en');
    });

  const parts = [];
  const seenPaths = new Set();
  entries.forEach(([key, model]) => {
    const pathKey = String(model.path || '').toLowerCase();
    if (!pathKey || seenPaths.has(pathKey)) return;
    seenPaths.add(pathKey);
    parts.push(key);
  });

  const fallbackParts = Array.isArray(base.parts) ? [...base.parts] : [];
  return {
    labels: base.labels || { he: 'מערכת גוף אחודה', en: 'Unified Full System' },
    parts: parts.length ? parts : fallbackParts,
  };
}

function resolveModelSelection(modelKey) {
  const selected = MODEL_OPTIONS[modelKey];
  if (!selected) return null;
  if (modelKey === 'full-system') {
    return buildUnifiedFullSystemSelection();
  }
  return selected;
}

function reportUnifiedSystemDiagnostics(selection) {
  if (!selection || !Array.isArray(selection.parts)) return;
  const missing = selection.parts.filter((partKey) => {
    const part = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
    return !part || typeof part.path !== 'string' || !part.path;
  });
  console.info('[Unified Full System] parts:', selection.parts.length);
  if (missing.length) {
    console.warn('[Unified Full System] missing parts:', missing);
  }
  if (analysisResult && currentModelKey === 'full-system') {
    analysisResult.textContent = currentLang === 'he'
      ? `Full System: חוברו ${selection.parts.length} מודלים עם שמות שכבות.`
      : `Full System: connected ${selection.parts.length} models with named layers.`;
  }
}

function buildFullSystemAuditReport() {
  const selection = buildUnifiedFullSystemSelection();
  const now = new Date().toLocaleString();
  const allAtomic = Object.entries(MODEL_OPTIONS)
    .filter(([key, model]) => isAtomicModelOption(key, model));

  const includedSet = new Set(selection.parts || []);
  const duplicates = [];
  const pathByPart = new Map();

  (selection.parts || []).forEach((partKey) => {
    const part = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
    const path = String(part?.path || '').toLowerCase();
    if (!path) return;
    if (pathByPart.has(path)) {
      duplicates.push(`${pathByPart.get(path)} <-> ${partKey}`);
      return;
    }
    pathByPart.set(path, partKey);
  });

  const excluded = allAtomic
    .filter(([key]) => !includedSet.has(key))
    .map(([key, model]) => {
      const reasons = [];
      if (String(key).startsWith(CUSTOM_COMPOSITE_PREFIX)) reasons.push('custom-composite');
      if (!isHumanAnatomyModelKey(key, model)) reasons.push('non-anatomy');
      return `${key} (${reasons.join(', ') || 'filtered'})`;
    });

  const missing = (selection.parts || []).filter((partKey) => {
    const part = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
    return !part || typeof part.path !== 'string' || !part.path;
  });

  const includedLines = (selection.parts || []).map((partKey, index) => {
    const model = MODEL_OPTIONS[partKey] || BASE_MODEL_OPTIONS[partKey];
    const label = getModelLabel(model) || partKey;
    return `${index + 1}. ${partKey} | ${label} | ${model?.path || '-'}`;
  });

  const liveMeshCount = currentModelKey === 'full-system' ? getAllMeshes().length : 0;
  const reportLines = [
    `Full System Audit - ${now}`,
    `Modeled parts included: ${(selection.parts || []).length}`,
    `Atomic models discovered: ${allAtomic.length}`,
    `Current loaded mesh rows (if full-system loaded): ${liveMeshCount}`,
    '',
    'Included parts:',
    ...(includedLines.length ? includedLines : ['(none)']),
    '',
    `Excluded atomic models: ${excluded.length}`,
    ...(excluded.length ? excluded : ['(none)']),
    '',
    `Duplicate model paths in included set: ${duplicates.length}`,
    ...(duplicates.length ? duplicates : ['(none)']),
    '',
    `Missing path entries in included set: ${missing.length}`,
    ...(missing.length ? missing : ['(none)']),
  ];
  return reportLines.join('\n');
}

function runFullSystemAudit(showDialog = true) {
  const report = buildFullSystemAuditReport();
  if (fullSystemAuditReport) fullSystemAuditReport.textContent = report;
  if (analysisResult) {
    analysisResult.textContent = currentLang === 'he'
      ? 'Audit Full System הושלם. פתח את הדוח המלא.'
      : 'Full System audit completed. Open the full report.';
  }
  if (showDialog && fullSystemAuditDialog) {
    openDialogNonBlocking(fullSystemAuditDialog);
  }
}

async function loadCompareOverlayByKey(modelKey) {
  const selected = resolveModelSelection(modelKey);
  if (!selected) return;
  clearCompareOverlay();

  const applyOverlayStyle = (root) => {
    root.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0.22;
        if (mat.emissive) {
          mat.emissive.setHex(0x00c2ff);
          mat.emissiveIntensity = 0.28;
        }
        mat.depthWrite = false;
        mat.needsUpdate = true;
      });
    });
  };

  if (currentModel) {
    compareOverlayModel = currentModel.clone(true);
    applyOverlayStyle(compareOverlayModel);
    scene.add(compareOverlayModel);
    compareEnabled = true;
    compareToggleBtn.textContent = t('compareOff');
  }

  if (modelKey === currentModelKey) return;

  let loaded = null;
  if (selected.parts) {
    loaded = await modelLoaderController.loadCompositeModel(selected, loadRequestId);
  } else {
    loaded = await modelLoaderController.loadSingleModel(selected, loadRequestId, modelKey);
  }
  if (!loaded?.root) return;

  if (compareOverlayModel) {
    scene.remove(compareOverlayModel);
  }
  compareOverlayModel = loaded.root;
  applyOverlayStyle(compareOverlayModel);
  scene.add(compareOverlayModel);
  compareEnabled = true;
  compareToggleBtn.textContent = t('compareOff');
}

function exportScreenshotImage() {
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = `${currentModelKey}-snapshot.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function recordShortViewerVideo(durationMs = 8000) {
  if (videoRecorder && videoRecorder.state === 'recording') return;
  if (!renderer.domElement.captureStream || typeof MediaRecorder === 'undefined') return;

  const stream = renderer.domElement.captureStream(30);
  recordedVideoChunks = [];
  videoRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  recordVideoBtn.textContent = t('recordingVideo');
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;

  videoRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedVideoChunks.push(event.data);
    }
  };

  videoRecorder.onstop = () => {
    const blob = new Blob(recordedVideoChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentModelKey}-8s.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    controls.autoRotate = false;
    recordVideoBtn.textContent = t('recordVideo');
  };

  videoRecorder.start();
  setTimeout(() => {
    if (videoRecorder && videoRecorder.state === 'recording') {
      videoRecorder.stop();
    }
  }, durationMs);
}

function loadModelByKey(modelKey) {
  const selected = resolveModelSelection(modelKey);
  if (!selected) return;

  loadRequestId += 1;
  const requestId = loadRequestId;
  currentModelKey = modelKey;
  renderDirectModelsList();
  stopTimeline(false);
  stopSystemDemo(false);
  clearCompareOverlay();
  setModelLoadingState(true);
  setPlaceholder(t('loading'));
  removeCurrentModel();
  structureEntries = [];

  const attachLoadedModel = (loadedModel) => {
    if (!loadedModel) return;
    currentModel = loadedModel.root;
    currentModelClips = Array.isArray(loadedModel.animations) ? loadedModel.animations : [];
    modelAnimationMixer = currentModelClips.length ? new THREE.AnimationMixer(currentModel) : null;
    activeModelClipAction = null;
    scene.add(currentModel);
    applyStoredTransformsToCurrentModel();
    populateStructureList(currentModel);
    applyHumanScaleMode();
    applyProfessionalMode();
    updateModelClipBadge(false);
    populateCompareModelSelector();
    if (pendingBookmark && pendingBookmark.model === currentModelKey) {
      camera.position.fromArray(pendingBookmark.cameraPos);
      controls.target.fromArray(pendingBookmark.target);
      controls.update();
      pendingBookmark = null;
    }
    if (pendingWorkspaceSnapshot && pendingWorkspaceSnapshot.modelKey === currentModelKey) {
      const snapshotToApply = pendingWorkspaceSnapshot;
      pendingWorkspaceSnapshot = null;
      applyWorkspaceSnapshot(snapshotToApply);
    }
    if (pendingEditedModelPreset && pendingEditedModelPreset.modelKey === currentModelKey) {
      const presetToApply = pendingEditedModelPreset;
      pendingEditedModelPreset = null;
      applyEditedModelPresetToCurrentModel(presetToApply);
    }
  };

  const loadWithSelection = (selection, keyForLoad) => (
    selection.parts
      ? modelLoaderController.loadCompositeModel(selection, requestId)
      : modelLoaderController.loadSingleModel(selection, requestId, keyForLoad)
  );

  const loadTask = loadWithSelection(selected, modelKey)
    .catch(async (primaryError) => {
      if (requestId !== loadRequestId) return null;
      console.warn('Primary model load failed, trying fallback:', primaryError);

      // Fallback 1: unified full system if the user picked another model.
      if (modelKey !== 'full-system' && MODEL_OPTIONS['full-system']) {
        try {
          const fallbackSelection = resolveModelSelection('full-system');
          const fallback = await loadWithSelection(fallbackSelection, 'full-system');
          if (fallback) {
            currentModelKey = 'full-system';
            modelSelect.value = currentModelKey;
            return fallback;
          }
        } catch (fallbackError) {
          console.warn('Full-system fallback failed:', fallbackError);
        }
      }

      // Fallback 2: single baseline model file.
      try {
        return await modelLoaderController.loadSingleModel(
          { path: 'models/open3dmodel.glb' },
          requestId,
          'open3dmodel-fallback'
        );
      } catch (baselineError) {
        console.error('Baseline fallback failed:', baselineError);
        throw primaryError;
      }
    })
    .then((loadedModel) => {
      if (requestId !== loadRequestId || !loadedModel) return;
      attachLoadedModel(loadedModel);
      if (modelKey === 'full-system') {
        reportUnifiedSystemDiagnostics(selected);
      }
    });

  loadTask.then(() => {
    if (requestId !== loadRequestId) return;
    setModelLoadingState(false);
  });

  loadTask.catch((error) => {
    if (requestId !== loadRequestId) return;
    setModelLoadingState(false);
    setPlaceholder(t('failedLoad'));
    currentModelClips = [];
    updateModelClipBadge(false);
    console.error('Error loading GLB model:', error);
  });
}

modelSelect.addEventListener('change', () => {
  loadModelByKey(modelSelect.value);
  saveAppState();
});

async function initApp() {
  installXyzConsoleCapture();
  loadTheme();
  await loadDynamicModelsManifest();
  loadCustomCompositeModels();
  loadLayerMetaStore();
  loadCustomLayerCategories();
  harvestCustomCategoriesFromLayerMeta();
  writeCustomLayerCategories();
  syncPartAnalysisCategoryOptions();
  syncLayerCategoryInputs();
  editedModelPresetsStore = readEditedModelPresetsStore();
  syncEditedModelPresetsUi();
  populateModelSelector();
  populateCompareModelSelector();
  populateBookmarkSelector();
  await refreshDirectLibrary();

  loadAppState();
  loadXyzPanelSettings();
  initWorkspaceProfilesState();
  xrayToggle.checked = xrayEnabled;
  xrayOpacity.value = String(xrayOpacityValueNumber);
  realisticModeToggle.checked = realisticModeEnabled;
  humanScaleToggle.checked = humanScaleModeEnabled;
  activityAnimSelect.value = activityAnimMode;
  activitySpeed.value = String(activitySpeedValueNumber);
  proPresetSelect.value = proPresetMode;
  systemDemoSelect.value = systemDemoMode;
  performanceModeSelect.value = performanceMode;
  adaptiveQualityToggle.checked = adaptiveQualityEnabled;
  updateLanguageUI(false);
  updateTimelineStatusUI();
  updateSystemDemoStatusUI();
  loadModelByKey(currentModelKey);
  updatePickedPartName('');
  updateHoverPartName('');
  openDetailsBtn.disabled = true;
  xrayOpacityValue.textContent = `${Math.round(xrayOpacityValueNumber * 100)}%`;
  activitySpeedValue.textContent = `${activitySpeedValueNumber.toFixed(1)}x`;
  setTimeout(() => {
    validateModelsCatalog();
  }, 450);
}

initApp();

// Animation loop
function animate() {
  const now = performance.now();
  const deltaSec = Math.min((now - lastAnimationTime) / 1000, 0.08);
  lastAnimationTime = now;

  if (pendingPointerEvent) {
    const intervalMs = getHoverPickIntervalMs();
    if (now - lastHoverPickAt >= intervalMs) {
      const event = pendingPointerEvent;
      pendingPointerEvent = null;
      lastHoverPickAt = now;
      const hitMesh = pickMeshAt(event.clientX, event.clientY);
      setHoveredMesh(hitMesh);
    }
  }

  applyAnalogJoystickStep(now);

  if (xyzGridVisible && xyzFloatingDialog?.open) {
    positionXyzFloatingNearSelection();
  }

  if (selectedMesh) {
    if (!selectedMesh.userData._baseScale) {
      selectedMesh.userData._baseScale = selectedMesh.scale.clone();
    }
    if (typeof selectedMesh.userData._baseY !== 'number') {
      selectedMesh.userData._baseY = selectedMesh.position.y;
    }

    if (animationMode === 'pulse') {
      const s = 1 + 0.08 * Math.sin(now * 0.01);
      selectedMesh.scale.copy(selectedMesh.userData._baseScale).multiplyScalar(s);
    } else if (animationMode === 'bob') {
      selectedMesh.position.y = selectedMesh.userData._baseY + 0.03 * Math.sin(now * 0.008);
    }
  }

  if (deltaSec > 0) {
    if (modelAnimationMixer) {
      modelAnimationMixer.update(deltaSec);
    }
    tickTimeline(deltaSec);
    applyProfessionalPresentationState();
    if (!systemDemoUsesRealClip) {
      applySystemDemoFrame(now);
    }
  }

  requestAnimationFrame(animate);
  controls.update();
  stabilizeCameraDistance();
  renderer.render(scene, camera);
}
animate();