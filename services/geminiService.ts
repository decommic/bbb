/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file acts as an aggregator for all Gemini service functions.
// It allows components to import from a single location, simplifying refactoring.

export * from './gemini/baseService';
export * from './gemini/imageEditingService';
export * from './gemini/dressTheModelService';
export * from './gemini/replaceProductInSceneService';
export * from './gemini/mixStyleService';
export * from './gemini/freeGenerationService';
export * from './gemini/imageInterpolationService';
export * from './gemini/videoGenerationService';
export * from './gemini/aiUpscalerService';
// FIX: Export new Gemini service functions
export * from './gemini/architectureIdeatorService';
export * from './gemini/avatarCreatorService';
export * from './gemini/photoRestorationService';
export * from './gemini/imageToRealService';
export * from './gemini/swapStyleService';
export * from './gemini/toyModelCreatorService';
export * from './gemini/bananaEditorService';
// FIX: Export productStudioService to resolve import errors.
export * from './gemini/productStudioService';