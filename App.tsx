/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Footer from './components/Footer';
import Home from './components/Home';
import SearchModal from './components/SearchModal';
import GalleryModal from './components/GalleryModal';
import InfoModal from './components/InfoModal';
import AppToolbar from './components/AppToolbar';
import LoginScreen from './components/LoginScreen';
import UserStatus from './components/UserStatus';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ImageEditorModal } from './components/ImageEditorModal';
import {
    renderSmartlyWrappedTitle,
    useImageEditor,
    useAppControls,
    ImageLayoutModal,
    BeforeAfterModal,
    LayerComposerModal,
    useAuth,
    AppConfig,
    PatternDesignerState
} from './components/uiUtils';
import { LoadingSpinnerIcon } from './components/icons';

// Lazy load app components for code splitting
const DressTheModel = lazy(() => import('./components/DressTheModel'));
const ReplaceProductInScene = lazy(() => import('./components/ReplaceProductInScene'));
const FreeGeneration = lazy(() => import('./components/FreeGeneration'));
const ImageInterpolation = lazy(() => import('./components/ImageInterpolation'));
const PatternDesigner = lazy(() => import('./components/PatternDesigner'));


const AppLoadingFallback = () => (
    <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400" />
    </div>
);

function App() {
    const {
        currentView,
        settings,
        sessionGalleryImages,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isImageLayoutModalOpen,
        isBeforeAfterModalOpen,
        isLayerComposerMounted,
        isLayerComposerVisible,
        handleSelectApp,
        handleStateChange,
        addImagesToGallery,
        handleResetApp,
        handleGoBack,
        handleCloseSearch,
        handleCloseGallery,
        handleCloseInfo,
        closeImageLayoutModal,
        closeBeforeAfterModal,
        closeLayerComposer,
        hideLayerComposer,
        t,
    } = useAppControls();
    
    const { imageToEdit, closeImageEditor } = useImageEditor();
    const { loginSettings, isLoggedIn, isLoading, currentUser } = useAuth();

    useEffect(() => {
        const isAnyModalOpen = isSearchOpen || 
                               isGalleryOpen || 
                               isInfoOpen || 
                               isImageLayoutModalOpen || 
                               isBeforeAfterModalOpen || 
                               isLayerComposerVisible || 
                               !!imageToEdit;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup function to ensure overflow is reset when the component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isSearchOpen, isGalleryOpen, isInfoOpen, isImageLayoutModalOpen, isBeforeAfterModalOpen, isLayerComposerVisible, imageToEdit]);

    const renderContent = () => {
        if (!settings) return null; // Wait for settings to load

        const motionProps = {
            className: "w-full h-full flex-1 min-h-0",
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
            transition: { duration: 0.4 },
        };
        const commonProps = { 
            addImagesToGallery,
            onStateChange: handleStateChange,
            onReset: handleResetApp,
            onGoBack: handleGoBack,
        };

        switch (currentView.viewId) {
            case 'home':
                return (
                    <Home 
                        key="home"
                        onSelectApp={handleSelectApp} 
                        title={renderSmartlyWrappedTitle(t(settings.home.mainTitleKey), settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={t(settings.home.subtitleKey)}
                        apps={settings.apps.map((app: AppConfig) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)}))}
                    />
                );
            case 'free-generation':
                 return (
                    <Suspense fallback={<AppLoadingFallback />}>
                        <motion.div key="free-generation" {...motionProps}>
                            <FreeGeneration 
                                {...settings.freeGeneration}
                                mainTitle={t(settings.freeGeneration.mainTitleKey)}
                                subtitle={t(settings.freeGeneration.subtitleKey)}
                                uploaderCaption1={t(settings.freeGeneration.uploaderCaption1Key)}
                                uploaderDescription1={t(settings.freeGeneration.uploaderDescription1Key)}
                                uploaderCaption2={t(settings.freeGeneration.uploaderCaption2Key)}
                                uploaderDescription2={t(settings.freeGeneration.uploaderDescription2Key)}
                                {...commonProps} 
                                appState={currentView.state} 
                            />
                        </motion.div>
                    </Suspense>
                );
            case 'dress-the-model':
                return (
                    <Suspense fallback={<AppLoadingFallback />}>
                        <motion.div key="dress-the-model" {...motionProps}>
                            <DressTheModel 
                                {...settings.dressTheModel}
                                mainTitle={t(settings.dressTheModel.mainTitleKey)}
                                subtitle={t(settings.dressTheModel.subtitleKey)}
                                uploaderCaptionModel={t(settings.dressTheModel.uploaderCaptionModelKey)}
                                uploaderDescriptionModel={t(settings.dressTheModel.uploaderDescriptionModelKey)}
                                uploaderCaptionClothing={t(settings.dressTheModel.uploaderCaptionClothingKey)}
                                uploaderDescriptionClothing={t(settings.dressTheModel.uploaderDescriptionClothingKey)}
                                {...commonProps}
                                appState={currentView.state} 
                            />
                        </motion.div>
                    </Suspense>
                );
            case 'replace-product-in-scene':
                return (
                    <Suspense fallback={<AppLoadingFallback />}>
                        <motion.div key="replace-product-in-scene" {...motionProps}>
                            <ReplaceProductInScene
                                {...settings.replaceProductInScene}
                                mainTitle={t(settings.replaceProductInScene.mainTitleKey)}
                                subtitle={t(settings.replaceProductInScene.subtitleKey)}
                                uploaderCaptionProduct={t(settings.replaceProductInScene.uploaderCaptionProductKey)}
                                uploaderDescriptionProduct={t(settings.replaceProductInScene.uploaderDescriptionProductKey)}
                                uploaderCaptionScene={t(settings.replaceProductInScene.uploaderCaptionSceneKey)}
                                uploaderDescriptionScene={t(settings.replaceProductInScene.uploaderDescriptionSceneKey)}
                                {...commonProps}
                                appState={currentView.state as any}
                            />
                        </motion.div>
                    </Suspense>
                );
            case 'image-interpolation':
                 return (
                    <Suspense fallback={<AppLoadingFallback />}>
                        <motion.div key="image-interpolation" {...motionProps}>
                            <ImageInterpolation 
                                {...settings.imageInterpolation}
                                mainTitle={t(settings.imageInterpolation.mainTitleKey)}
                                subtitle={t(settings.imageInterpolation.subtitleKey)}
                                uploaderCaptionInput={t(settings.imageInterpolation.uploaderCaptionInputKey)}
                                uploaderDescriptionInput={t(settings.imageInterpolation.uploaderDescriptionInputKey)}
                                uploaderCaptionOutput={t(settings.imageInterpolation.uploaderCaptionOutputKey)}
                                uploaderDescriptionOutput={t(settings.imageInterpolation.uploaderDescriptionOutputKey)}
                                uploaderCaptionReference={t(settings.imageInterpolation.uploaderCaptionReferenceKey)}
                                uploaderDescriptionReference={t(settings.imageInterpolation.uploaderDescriptionReferenceKey)}
                                {...commonProps}
                                appState={currentView.state} 
                            />
                        </motion.div>
                    </Suspense>
                 );
            case 'pattern-designer':
                 return (
                    <Suspense fallback={<AppLoadingFallback />}>
                        <motion.div key="pattern-designer" {...motionProps}>
                            <PatternDesigner 
                                {...settings.patternDesigner}
                                mainTitle={t(settings.patternDesigner.mainTitleKey)}
                                subtitle={t(settings.patternDesigner.subtitleKey)}
                                uploaderCaptionClothing={t(settings.patternDesigner.uploaderCaptionClothingKey)}
                                uploaderDescriptionClothing={t(settings.patternDesigner.uploaderDescriptionClothingKey)}
                                uploaderCaptionPattern1={t(settings.patternDesigner.uploaderCaptionPattern1Key)}
                                uploaderDescriptionPattern1={t(settings.patternDesigner.uploaderDescriptionPattern1Key)}
                                uploaderCaptionPattern2={t(settings.patternDesigner.uploaderCaptionPattern2Key)}
                                uploaderDescriptionPattern2={t(settings.patternDesigner.uploaderDescriptionPattern2Key)}
                                {...commonProps}
                                appState={currentView.state as PatternDesignerState} 
                            />
                        </motion.div>
                    </Suspense>
                );
            default: // Fallback for any invalid view id in history
                 return (
                    <Home 
                        key="home-fallback"
                        onSelectApp={handleSelectApp} 
                        title={renderSmartlyWrappedTitle(t(settings.home.mainTitleKey), settings.home.useSmartTitleWrapping, settings.home.smartTitleWrapWords)}
                        subtitle={t(settings.home.subtitleKey)}
                        apps={settings.apps.map((app: AppConfig) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)}))}
                    />
                 );
        }
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-neutral-900">
                <LoadingSpinnerIcon className="animate-spin h-10 w-10 text-yellow-400" />
            </div>
        );
    }

    if (loginSettings?.enabled && !isLoggedIn) {
        return <LoginScreen />;
    }

    return (
        <main className="text-neutral-200 min-h-screen w-full relative">
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        fontFamily: '"Be Vietnam Pro", sans-serif',
                        background: 'rgba(38, 38, 38, 0.75)', /* bg-neutral-800 @ 75% */
                        backdropFilter: 'blur(8px)',
                        color: '#E5E5E5', /* text-neutral-200 */
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#FBBF24', // yellow-400
                            secondary: '#171717', // neutral-900
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#f87171', // red-400
                            secondary: '#171717', // neutral-900
                        },
                    },
                }}
            />
            <div className="absolute inset-0 bg-black/30 z-0" aria-hidden="true"></div>
            
            <div className="fixed top-4 left-4 z-20 flex items-center gap-2">
                {isLoggedIn && currentUser && <UserStatus />}
                <LanguageSwitcher />
            </div>
            <AppToolbar />

            <div className="relative z-10 w-full min-h-screen flex flex-row items-center justify-center px-4 pt-16 pb-24">
                <AnimatePresence mode="wait">
                   {renderContent()}
                </AnimatePresence>
            </div>
            
            <SearchModal
                isOpen={isSearchOpen}
                onClose={handleCloseSearch}
                onSelectApp={(appId) => {
                    handleSelectApp(appId);
                    handleCloseSearch();
                }}
                apps={settings ? settings.apps.map((app: AppConfig) => ({...app, title: t(app.titleKey), description: t(app.descriptionKey)})) : []}
            />
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={handleCloseGallery}
                images={sessionGalleryImages}
            />
             <InfoModal
                isOpen={isInfoOpen}
                onClose={handleCloseInfo}
            />
            <ImageEditorModal 
                imageToEdit={imageToEdit}
                onClose={closeImageEditor}
            />
            <ImageLayoutModal
                isOpen={isImageLayoutModalOpen}
                onClose={closeImageLayoutModal}
            />
            <BeforeAfterModal
                isOpen={isBeforeAfterModalOpen}
                onClose={closeBeforeAfterModal}
            />
            {isLayerComposerMounted && (
                <LayerComposerModal
                    isOpen={isLayerComposerVisible}
                    onClose={closeLayerComposer}
                    onHide={hideLayerComposer}
                />
            )}
            <Footer />
        </main>
    );
}

export default App;