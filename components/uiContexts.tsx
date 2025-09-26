/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
    type ImageToEdit, type ViewState, type AnyAppState, type Theme,
    type AppConfig, THEMES, getInitialStateForApp, type Settings,
    type Model,
    // FIX: Import AppControlContextType to resolve TypeScript errors.
    type AppControlContextType,
} from './uiTypes';
import { idbSet, idbGet } from '../lib/idb';

// --- Auth Context ---
interface Account {
    username: string;
    password?: string;
}

interface LoginSettings {
    enabled: boolean;
    accounts: Account[];
}

interface AuthContextType {
    loginSettings: LoginSettings | null;
    isLoggedIn: boolean;
    currentUser: string | null;
    isLoading: boolean;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loginSettings, setLoginSettings] = useState<LoginSettings | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const defaultSettingsOnError: LoginSettings = {
                enabled: true,
                accounts: [
                    { username: "aPix", password: "sdvn" },
                    { username: "guest", password: "123" }
                ]
            };
            
            const handleEnabledLogin = (settings: LoginSettings) => {
                const storedUser = sessionStorage.getItem('currentUser');
                if (storedUser && settings.accounts.some(acc => acc.username === storedUser)) {
                    setCurrentUser(storedUser);
                    setIsLoggedIn(true);
                }
            };

            try {
                const response = await fetch('/setting-login.json');
                if (response.ok) {
                    const settings: LoginSettings = await response.json();
                    setLoginSettings(settings);
                    
                    if (settings.enabled === false) {
                        // Login is disabled. Bypass the login screen. No user is set.
                        setIsLoggedIn(true);
                        setCurrentUser(null);
                        sessionStorage.removeItem('currentUser');
                    } else {
                        // Treat enabled:true or missing enabled property as login required.
                        handleEnabledLogin(settings);
                    }
                } else {
                    // File not found. Default to login enabled.
                    console.warn("setting-login.json not found. Defaulting to login enabled.");
                    setLoginSettings(defaultSettingsOnError);
                    handleEnabledLogin(defaultSettingsOnError);
                }
            } catch (error) {
                // On any other error (parsing, network), default to login enabled.
                console.error("Error processing setting-login.json. Defaulting to login enabled.", error);
                setLoginSettings(defaultSettingsOnError);
                handleEnabledLogin(defaultSettingsOnError);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = useCallback(async (username: string, password?: string): Promise<boolean> => {
        if (!loginSettings) return false;

        const account = loginSettings.accounts.find(acc => acc.username === username);
        if (account && account.password === password) {
            setCurrentUser(username);
            setIsLoggedIn(true);
            sessionStorage.setItem('currentUser', username);
            return true;
        }
        return false;
    }, [loginSettings]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setIsLoggedIn(false);
        sessionStorage.removeItem('currentUser');
    }, []);

    const value = { loginSettings, isLoggedIn, currentUser, isLoading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// --- Image Editor Hook & Context ---
interface ImageEditorContextType {
    imageToEdit: ImageToEdit | null;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    openEmptyImageEditor: (onSave: (newUrl: string) => void) => void;
    closeImageEditor: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

export const ImageEditorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);

    const openImageEditor = useCallback((url: string, onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        if (!url) {
            console.error("openImageEditor called with no URL.");
            return;
        }
        setImageToEdit({ url, onSave });
    }, []);

    const openEmptyImageEditor = useCallback((onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        setImageToEdit({ url: null, onSave });
    }, []);

    const closeImageEditor = useCallback(() => {
        setImageToEdit(null);
    }, []);

    const value = { imageToEdit, openImageEditor, openEmptyImageEditor, closeImageEditor };

    return (
        <ImageEditorContext.Provider value={value}>
            {children}
        </ImageEditorContext.Provider>
    );
};

export const useImageEditor = (): ImageEditorContextType => {
    const context = useContext(ImageEditorContext);
    if (context === undefined) {
        throw new Error('useImageEditor must be used within an ImageEditorProvider');
    }
    return context;
};


// --- App Control Context ---
const AppControlContext = createContext<AppControlContextType | undefined>(undefined);

export const AppControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && THEMES.includes(savedTheme)) {
            return savedTheme;
        }
        // If no theme is saved, pick a random one
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isExtraToolsOpen, setIsExtraToolsOpen] = useState(false);
    const [isImageLayoutModalOpen, setIsImageLayoutModalOpen] = useState(false);
    const [isBeforeAfterModalOpen, setIsBeforeAfterModalOpen] = useState(false);
    const [beforeAfterImages, setBeforeAfterImages] = useState<[string | null, string | null]>([null, null]);
    const [isLayerComposerMounted, setIsLayerComposerMounted] = useState(false);
    const [isLayerComposerVisible, setIsLayerComposerVisible] = useState(false);
    const [sessionGalleryImages, setSessionGalleryImages] = useState<string[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);

    const [language, setLanguage] = useState<'vi' | 'en'>(() => (localStorage.getItem('app-language') as 'vi' | 'en') || 'vi');
    const [translations, setTranslations] = useState<Record<string, any>>({});
    
    // State for Model Library and Result History
    const [modelLibrary, setModelLibrary] = useState<Model[]>([]);
    const [dressTheModelHistory, setDressTheModelHistory] = useState<string[]>([]);

    const currentView = viewHistory[historyIndex];

    // Load model library and history from IndexedDB on startup
    useEffect(() => {
        const loadData = async () => {
            try {
                const savedLibrary = await idbGet<Model[] | string[]>('__modelLibrary__');
                if (savedLibrary) {
                    // MIGRATION LOGIC: Check if the saved data is the old string array format.
                    if (savedLibrary.length > 0 && typeof savedLibrary[0] === 'string') {
                        console.log("Migrating old model library format...");
                        const migratedLibrary: Model[] = (savedLibrary as string[]).map(url => ({
                            id: url, // Use URL as unique ID
                            url,
                            isFavorite: false,
                            category: 'default'
                        }));
                        setModelLibrary(migratedLibrary);
                        // Save back the new, structured format
                        await idbSet('__modelLibrary__', migratedLibrary);
                    } else {
                        setModelLibrary(savedLibrary as Model[]);
                    }
                }

                const savedDTMHistory = await idbGet<string[]>('__dressTheModelHistory__');
                if (savedDTMHistory) {
                    setDressTheModelHistory(savedDTMHistory);
                }
            } catch (error) {
                console.error("Failed to load initial data from storage", error);
            }
        };
        loadData();
    }, []);

    // Save model library to IndexedDB when it changes
    useEffect(() => {
        if (modelLibrary) { // Save even if empty to allow clearing the library
             try {
                idbSet('__modelLibrary__', modelLibrary);
            } catch (error) {
                console.error("Failed to save model library to IndexedDB", error);
            }
        }
    }, [modelLibrary]);

    const addModelToLibrary = useCallback((imageDataUrl: string) => {
        setModelLibrary(prev => {
            if (prev.some(m => m.url === imageDataUrl)) return prev;

            const newModel: Model = { id: imageDataUrl, url: imageDataUrl, isFavorite: false, category: 'default' };
            let newLibrary = [newModel, ...prev];
            
            // Pruning logic: keep all favorites + 20 most recent non-favorites
            const favorites = newLibrary.filter(m => m.isFavorite);
            const nonFavorites = newLibrary.filter(m => !m.isFavorite);
            const prunedNonFavorites = nonFavorites.slice(0, 20);
            
            return [...favorites, ...prunedNonFavorites];
        });
    }, []);
    
    const updateModelInLibrary = useCallback((modelId: string, updates: Partial<Omit<Model, 'id' | 'url'>>) => {
        setModelLibrary(prev => prev.map(model => 
            model.id === modelId ? { ...model, ...updates } : model
        ));
    }, []);

    const deleteModelFromLibrary = useCallback((modelId: string) => {
        setModelLibrary(prev => prev.filter(model => model.id !== modelId));
    }, []);

    const addResultToDressTheModelHistory = useCallback((resultUrl: string) => {
        setDressTheModelHistory(prev => {
            const newHistory = [resultUrl, ...prev.filter(url => url !== resultUrl)].slice(0, 20); // Keep last 20, prevent duplicates
            try {
                idbSet('__dressTheModelHistory__', newHistory);
            } catch (error) {
                console.error("Failed to save DTM history to IndexedDB", error);
            }
            return newHistory;
        });
    }, []);


    useEffect(() => {
        const fetchTranslations = async () => {
             const modules = [
                'common', 
                'data',
                'home', 
                'dressTheModel',
                'replaceProductInScene',
                'freeGeneration',
                'imageInterpolation',
                'mixStyle',
                'aiUpscaler',
                'productStudio',
                'architectureIdeator',
                'avatarCreator',
                'photoRestoration',
                'imageToReal',
                'swapStyle',
                'toyModelCreator',
                'nanoBananaEditor',
                'patternDesigner',
            ];
            try {
                const fetchPromises = modules.map(module =>
                    fetch(`/locales/${language}/${module}.json`)
                        .then(res => {
                            if (!res.ok) {
                                console.warn(`Could not fetch ${module}.json for ${language}`);
                                return {}; // Return empty object on failure to not break Promise.all
                            }
                            return res.json();
                        })
                );

                const loadedTranslations = await Promise.all(fetchPromises);
                
                const mergedTranslations = loadedTranslations.reduce(
                    (acc, current) => ({ ...acc, ...current }),
                    {}
                );
                setTranslations(mergedTranslations);
            } catch (error) {
                console.error(`Could not load translations for ${language}`, error);
            }
        };
        fetchTranslations();
    }, [language]);

    const handleLanguageChange = useCallback((lang: 'vi' | 'en') => {
        setLanguage(lang);
        localStorage.setItem('app-language', lang);
    }, []);

    const t = useCallback((key: string, ...args: any[]): any => {
        const keys = key.split('.');
        let translation = keys.reduce((obj, keyPart) => {
            if (obj && typeof obj === 'object' && keyPart in obj) {
                return (obj as Record<string, any>)[keyPart];
            }
            return undefined;
        }, translations as any);

        if (translation === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        if (typeof translation === 'string' && args.length > 0) {
            let result = translation;
            args.forEach((arg, index) => {
                result = result.replace(`{${index}}`, String(arg));
            });
            return result;
        }

        return translation;
    }, [translations]);


    const addImagesToGallery = useCallback((newImages: (string | null | undefined)[]) => {
        setSessionGalleryImages(prev => {
            const uniqueNewImages = newImages.filter((img): img is string => !!img && !prev.includes(img));
            if (uniqueNewImages.length === 0) {
                return prev;
            }
            return [...prev, ...uniqueNewImages];
        });
    }, []);

    const removeImageFromGallery = useCallback((indexToRemove: number) => {
        setSessionGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const replaceImageInGallery = useCallback((indexToReplace: number, newImageUrl: string) => {
        setSessionGalleryImages(prev => {
            const newImages = [...prev];
            if (indexToReplace >= 0 && indexToReplace < newImages.length) {
                newImages[indexToReplace] = newImageUrl;
            }
            return newImages;
        });
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                 if (!response.ok) {
                    console.warn('Could not load setting.json, using built-in settings.');
                    return;
                }
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        document.body.classList.remove('theme-sdvn', 'theme-vietnam', 'theme-dark', 'theme-ocean-blue', 'theme-blue-sky', 'theme-black-night', 'theme-clear-sky', 'theme-skyline', 'theme-blulagoo', 'theme-life', 'theme-emerald-water');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const navigateTo = useCallback((viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);
    
    const handleStateChange = useCallback((newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const importSettingsAndNavigate = useCallback((settings: any) => {
        if (!settings || typeof settings.viewId !== 'string' || typeof settings.state !== 'object') {
            alert('Invalid settings file.');
            return;
        }
    
        const { viewId, state: importedState } = settings;
        
        const initialState = getInitialStateForApp(viewId);
        if (initialState.stage === 'home') { 
            alert(`Unknown app in settings file: ${viewId}`);
            return;
        }
    
        const mergedState = { ...initialState, ...importedState };
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: mergedState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    
    }, [viewHistory, historyIndex]);

    const handleSelectApp = useCallback((appId: string) => {
        if (settings) {
            const validAppIds = settings.apps.map((app: AppConfig) => app.id);
            if (validAppIds.includes(appId)) {
                navigateTo(appId);
            } else {
                navigateTo('home');
            }
        }
    }, [settings, navigateTo]);

    const handleGoHome = useCallback(() => {
        navigateTo('home');
    }, [navigateTo]);

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);

    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleResetApp = useCallback(() => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(current.viewId);

        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: initialState } as ViewState);

        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

    }, [viewHistory, historyIndex]);

    const value = {
        currentView,
        settings,
        theme,
        sessionGalleryImages,
        historyIndex,
        viewHistory,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isExtraToolsOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        beforeAfterImages,
        isLayerComposerMounted,
        isLayerComposerVisible,
        language,
        modelLibrary,
        dressTheModelHistory,
        addModelToLibrary,
        updateModelInLibrary,
        deleteModelFromLibrary,
        addResultToDressTheModelHistory,
        addImagesToGallery,
        removeImageFromGallery,
        replaceImageInGallery,
        handleThemeChange,
        handleLanguageChange,
        navigateTo,
        handleStateChange,
        handleSelectApp,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleResetApp,
        handleOpenSearch: () => setIsSearchOpen(true),
        handleCloseSearch: () => setIsSearchOpen(false),
        handleOpenGallery: () => setIsGalleryOpen(true),
        handleCloseGallery: () => setIsGalleryOpen(false),
        handleOpenInfo: () => setIsInfoOpen(true),
        handleCloseInfo: () => setIsInfoOpen(false),
        toggleExtraTools: () => setIsExtraToolsOpen(prev => !prev),
        openImageLayoutModal: () => setIsImageLayoutModalOpen(true),
        closeImageLayoutModal: () => setIsImageLayoutModalOpen(false),
        openBeforeAfterModal: (before: string | null = null, after: string | null = null) => {
            setBeforeAfterImages([before, after]);
            setIsBeforeAfterModalOpen(true);
        },
        closeBeforeAfterModal: () => {
            setIsBeforeAfterModalOpen(false);
            setBeforeAfterImages([null, null]);
        },
        openLayerComposer: () => {
            setIsLayerComposerMounted(true);
            setTimeout(() => setIsLayerComposerVisible(true), 10);
        },
        closeLayerComposer: () => {
            setIsLayerComposerVisible(false);
        },
        hideLayerComposer: () => setIsLayerComposerMounted(false),
        toggleLayerComposer: () => {
            if (isLayerComposerVisible) {
                setIsLayerComposerVisible(false);
            } else {
                setIsLayerComposerMounted(true);
                setTimeout(() => setIsLayerComposerVisible(true), 10);
            }
        },
        importSettingsAndNavigate,
        t,
    };

    return (
        <AppControlContext.Provider value={value as AppControlContextType}>
            {children}
        </AppControlContext.Provider>
    );
};

export const useAppControls = (): AppControlContextType => {
    const context = useContext(AppControlContext);
    if (context === undefined) {
        throw new Error('useAppControls must be used within an AppControlProvider');
    }
    return context;
};