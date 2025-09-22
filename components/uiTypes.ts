/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Base types
export interface ImageForZip {
    url: string;
    filename: string;
    folder?: string;
    extension?: string;
}

export interface VideoTask {
    status: 'pending' | 'done' | 'error';
    resultUrl?: string;
    error?: string;
    operation?: any;
}

export interface AppConfig {
    id: string;
    titleKey: string;
    descriptionKey: string;
    icon: string;
}

// FIX: Add the missing Settings type definition.
export interface AppSettings {
    mainTitleKey: string;
    subtitleKey: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    [key: string]: any;
}
  
export interface Settings {
    home: {
        mainTitleKey: string;
        subtitleKey: string;
        useSmartTitleWrapping: boolean;
        smartTitleWrapWords: number;
    };
    apps: AppConfig[];
    enableImageMetadata: boolean;
    dressTheModel: AppSettings;
    replaceProductInScene: AppSettings;
    mixStyle: AppSettings;
    freeGeneration: AppSettings;
    imageInterpolation: AppSettings;
    aiUpscaler: AppSettings;
}

export type Theme = 'vietnam' | 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';
export const THEMES: Theme[] = ['vietnam', 'black-night', 'clear-sky', 'skyline', 'emerald-water', 'life'];

export interface ImageToEdit {
    url: string | null;
    onSave: (newUrl: string) => void;
}


// --- Centralized State Definitions ---

export type HomeState = { stage: 'home' };

export interface DressTheModelState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    modelImage: string | null;
    clothingImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        background: string;
        pose: string;
        style: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ReplaceProductInSceneState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    modelImage: string | null;      // Represents product
    clothingImage: string | null;   // Represents scene
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        layout: string;
        photoStyle: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface MixStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    contentImage: string | null;
    styleImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    finalPrompt: string | null;
    error: string | null;
}

export interface FreeGenerationState {
    stage: 'configuring' | 'generating' | 'results';
    image1: string | null;
    image2: string | null;
    generatedImages: string[];
    historicalImages: string[];
    options: {
        prompt: string;
        removeWatermark: boolean;
        numberOfImages: number;
        aspectRatio: string;
    };
    error: string | null;
}

export interface ImageInterpolationState {
    stage: 'idle' | 'prompting' | 'configuring' | 'generating' | 'results';
    analysisMode: 'general' | 'detailed';
    inputImage: string | null;
    outputImage: string | null;
    referenceImage: string | null;
    generatedPrompt: string;
    promptSuggestions: string;
    additionalNotes: string;
    finalPrompt: string | null;
    generatedImage: string | null;
    historicalImages: { url: string; prompt: string; }[];
    options: {
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface AIUpscalerState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        upscaleFactor: '2x' | '4x';
        enhancementLevel: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

// FIX: Add missing ProductStudioState to resolve import errors.
export interface ProductStudioState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    productImage: string | null;
    sceneImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        creativityLevel: string;
        notes: string;
    };
    error: string | null;
}

// FIX: Add missing state type definitions
export interface ArchitectureIdeatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        context: string;
        style: string;
        color: string;
        lighting: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface AvatarCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImages: { [idea: string]: { status: 'pending' | 'done' | 'error'; url?: string; error?: string } };
    selectedIdeas: string[];
    historicalImages: { idea: string, url: string }[];
    options: {
        additionalPrompt: string;
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface PhotoRestorationState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        type: string;
        gender: string;
        age: string;
        nationality: string;
        notes: string;
        removeWatermark: boolean;
        removeStains: boolean;
    };
    error: string | null;
}

export interface ImageToRealState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        faithfulness: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface SwapStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        style: string;
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ToyModelCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    concept: string; // e.g., 'desktop_model', 'keychain'
    // FIX: Explicitly define all options to fix type error when calling the service.
    options: {
        // Shared
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
        // Concept 1: Desktop Model
        computerType: string;
        softwareType: string;
        boxType: string;
        background: string;
        // Concept 2: Keychain
        keychainMaterial: string;
        keychainStyle: string;
        accompanyingItems: string;
        deskSurface: string;
        // Concept 3: Gachapon
        capsuleColor: string;
        modelFinish: string;
        capsuleContents: string;
        displayLocation: string;
        // Concept 4: Miniature
        miniatureMaterial: string;
        baseMaterial: string;
        baseShape: string;
        lightingStyle: string;
        // Concept 5: Pokémon Model
        pokeballType: string;
        evolutionDisplay: string;
        modelStyle: string;
        // Concept 6: Crafting Model
        modelType: string;
        blueprintType: string;
        characterMood: string;
    };
    error: string | null;
}

export interface NanoBananaEditorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    generatedText: string | null;
    historicalImages: string[];
    options: {
        prompt: string;
    };
    error: string | null;
}

// Union type for all possible app states
export type AnyAppState =
  | HomeState
  | DressTheModelState
  | ReplaceProductInSceneState
  | MixStyleState
  | FreeGenerationState
  | ImageInterpolationState
  | AIUpscalerState
  // FIX: Add ProductStudioState to the union type.
  | ProductStudioState
  | ArchitectureIdeatorState
  | AvatarCreatorState
  | PhotoRestorationState
  | ImageToRealState
  | SwapStyleState
  | ToyModelCreatorState
  | NanoBananaEditorState;

// --- App Navigation & State Types (Moved from App.tsx) ---
export type HomeView = { viewId: 'home'; state: HomeState };
export type DressTheModelView = { viewId: 'dress-the-model'; state: DressTheModelState };
export type ReplaceProductInSceneView = { viewId: 'replace-product-in-scene'; state: ReplaceProductInSceneState };
export type MixStyleView = { viewId: 'mix-style'; state: MixStyleState };
export type FreeGenerationView = { viewId: 'free-generation'; state: FreeGenerationState };
export type ImageInterpolationView = { viewId: 'image-interpolation'; state: ImageInterpolationState };
export type AIUpscalerView = { viewId: 'ai-upscaler', state: AIUpscalerState };
// FIX: Add missing ProductStudioView type.
export type ProductStudioView = { viewId: 'product-studio'; state: ProductStudioState };
// FIX: Add missing view type definitions
export type ArchitectureIdeatorView = { viewId: 'architecture-ideator'; state: ArchitectureIdeatorState };
export type AvatarCreatorView = { viewId: 'avatar-creator'; state: AvatarCreatorState };
export type PhotoRestorationView = { viewId: 'photo-restoration'; state: PhotoRestorationState };
export type ImageToRealView = { viewId: 'image-to-real'; state: ImageToRealState };
export type SwapStyleView = { viewId: 'swap-style'; state: SwapStyleState };
export type ToyModelCreatorView = { viewId: 'toy-model-creator'; state: ToyModelCreatorState };
export type NanoBananaEditorView = { viewId: 'nano-banana-editor'; state: NanoBananaEditorState };


export type ViewState =
  | HomeView
  | DressTheModelView
  | ReplaceProductInSceneView
  | MixStyleView
  | FreeGenerationView
  | ImageInterpolationView
  | AIUpscalerView
  // FIX: Add ProductStudioView to the union type.
  | ProductStudioView
  | ArchitectureIdeatorView
  | AvatarCreatorView
  | PhotoRestorationView
  | ImageToRealView
  | SwapStyleView
  | ToyModelCreatorView
  | NanoBananaEditorView;

// Helper function to get initial state for an app
export const getInitialStateForApp = (viewId: string): AnyAppState => {
    switch (viewId) {
        case 'home':
            return { stage: 'home' };
        case 'dress-the-model':
            return { stage: 'idle', modelImage: null, clothingImage: null, generatedImage: null, historicalImages: [], options: { background: '', pose: '', style: '', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'replace-product-in-scene':
            return { stage: 'idle', modelImage: null, clothingImage: null, generatedImage: null, historicalImages: [], options: { layout: 'Tự động', photoStyle: 'Tự động', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'mix-style':
            return { stage: 'idle', contentImage: null, styleImage: null, generatedImage: null, historicalImages: [], options: { styleStrength: 'Rất mạnh', notes: '', removeWatermark: false }, finalPrompt: null, error: null };
        case 'free-generation':
            return { stage: 'configuring', image1: null, image2: null, generatedImages: [], historicalImages: [], options: { prompt: '', removeWatermark: false, numberOfImages: 1, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'image-interpolation':
             return { stage: 'idle', analysisMode: 'general', inputImage: null, outputImage: null, referenceImage: null, generatedPrompt: '', promptSuggestions: '', additionalNotes: '', finalPrompt: null, generatedImage: null, historicalImages: [], options: { removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'ai-upscaler':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { upscaleFactor: '2x', enhancementLevel: 'Tăng cường', notes: '', removeWatermark: false }, error: null };
        // FIX: Add initial state for product-studio view.
        case 'product-studio':
            return { stage: 'idle', productImage: null, sceneImage: null, generatedImage: null, historicalImages: [], options: { creativityLevel: 'Giữ nguyên nền', notes: '' }, error: null };
        // FIX: Add initial state for new app views
        case 'architecture-ideator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { context: '', style: '', color: '', lighting: '', notes: '', removeWatermark: false }, error: null };
        case 'avatar-creator':
            return { stage: 'idle', uploadedImage: null, generatedImages: {}, selectedIdeas: [], historicalImages: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: '1:1' }, error: null };
        case 'photo-restoration':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { type: 'Chân dung', gender: '', age: '', nationality: 'Việt Nam', notes: '', removeWatermark: false, removeStains: true }, error: null };
        case 'image-to-real':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { faithfulness: 'Trung bình', notes: '', removeWatermark: false }, error: null };
        case 'swap-style':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { style: '', styleStrength: 'Trung bình', notes: '', removeWatermark: false }, error: null };
        case 'toy-model-creator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], concept: 'desktop_model', options: { aspectRatio: '16:9', notes: '', removeWatermark: false, computerType: '', softwareType: '', boxType: '', background: '', keychainMaterial: '', keychainStyle: '', accompanyingItems: '', deskSurface: '', capsuleColor: '', modelFinish: '', capsuleContents: '', displayLocation: '', miniatureMaterial: '', baseMaterial: '', baseShape: '', lightingStyle: '', pokeballType: '', evolutionDisplay: '', modelStyle: '', modelType: '', blueprintType: '', characterMood: '' }, error: null };
        case 'nano-banana-editor':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, generatedText: null, historicalImages: [], options: { prompt: '' }, error: null };
        default:
            return { stage: 'home' };
    }
};

// --- Context Types ---

export interface AppControlContextType {
    currentView: ViewState;
    settings: any;
    theme: Theme;
    sessionGalleryImages: string[];
    historyIndex: number;
    viewHistory: ViewState[];
    isSearchOpen: boolean;
    isGalleryOpen: boolean;
    isInfoOpen: boolean;
    isExtraToolsOpen: boolean;
    isImageLayoutModalOpen: boolean;
    isBeforeAfterModalOpen: boolean;
    isLayerComposerMounted: boolean;
    isLayerComposerVisible: boolean;
    language: 'vi' | 'en';
    addImagesToGallery: (newImages: (string | null | undefined)[]) => void;
    removeImageFromGallery: (imageIndex: number) => void;
    replaceImageInGallery: (imageIndex: number, newImageUrl: string) => void;
    handleThemeChange: (newTheme: Theme) => void;
    handleLanguageChange: (lang: 'vi' | 'en') => void;
    navigateTo: (viewId: string) => void;
    handleStateChange: (newAppState: AnyAppState) => void;
    handleSelectApp: (appId: string) => void;
    handleGoHome: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleResetApp: () => void;
    handleOpenSearch: () => void;
    handleCloseSearch: () => void;
    handleOpenGallery: () => void;
    handleCloseGallery: () => void;
    handleOpenInfo: () => void;
    handleCloseInfo: () => void;
    toggleExtraTools: () => void;
    openImageLayoutModal: () => void;
    closeImageLayoutModal: () => void;
    openBeforeAfterModal: () => void;
    closeBeforeAfterModal: () => void;
    openLayerComposer: () => void;
    closeLayerComposer: () => void;
    hideLayerComposer: () => void;
    toggleLayerComposer: () => void;
    importSettingsAndNavigate: (settings: any) => void;
    t: (key: string, ...args: any[]) => any;
}