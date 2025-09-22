/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateProductScene } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import {
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    ResultsView,
    type ProductStudioState,
    useLightbox,
    OptionsPanel,
    Slider,
    processAndDownloadAll,
    embedJsonInPng,
    useAppControls,
} from './uiUtils';

interface ProductStudioProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionProduct: string;
    uploaderDescriptionProduct: string;
    uploaderCaptionScene: string;
    uploaderDescriptionScene: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ProductStudioState;
    onStateChange: (newState: ProductStudioState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const ProductStudio: React.FC<ProductStudioProps> = (props) => {
    const {
        uploaderCaptionProduct, uploaderDescriptionProduct,
        uploaderCaptionScene, uploaderDescriptionScene,
        addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const [localNotes, setLocalNotes] = useState(appState.options.notes);
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const CREATIVITY_LEVELS = t('productStudio_creativityLevels');
    const lightboxImages = [appState.productImage, appState.sceneImage, ...appState.historicalImages].filter((img): img is string => !!img);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);

    const handleProductImageUpload = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.sceneImage ? 'configuring' : 'idle',
            productImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleSceneImageUpload = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.productImage ? 'configuring' : 'idle',
            sceneImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleProductImageChange = (newUrl: string) => onStateChange({ ...appState, productImage: newUrl });
    const handleSceneImageChange = (newUrl: string) => onStateChange({ ...appState, sceneImage: newUrl });
    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleOptionChange = (field: keyof ProductStudioState['options'], value: string) => {
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };

    const executeGeneration = async () => {
        if (!appState.productImage || !appState.sceneImage) return;
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await generateProductScene(appState.productImage, appState.sceneImage, appState.options);
            const settingsToEmbed = {
                viewId: 'product-studio',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata]
            });
            addImagesToGallery([urlWithMetadata]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleBackToOptions = () => onStateChange({ ...appState, stage: 'configuring', error: null });
    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.productImage) inputImages.push({ url: appState.productImage, filename: 'product', folder: 'input' });
        if (appState.sceneImage) inputImages.push({ url: appState.sceneImage, filename: 'scene', folder: 'input' });
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            zipFilename: 'product-studio-results.zip',
            baseOutputFilename: 'product-scene'
        });
    };

    const Uploader = ({ onUpload, caption, description, currentImage, onImageChange, placeholderType, cardType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <ActionablePolaroidCard
                type={currentImage ? cardType : 'uploader'}
                caption={caption}
                status="done"
                mediaUrl={currentImage || undefined}
                placeholderType={placeholderType}
                onImageChange={onImageChange || onUpload}
                onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
            />
            {description && <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">{description}</p>}
        </div>
    );
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                <div className="w-full overflow-x-auto pb-4">
                    <motion.div
                        className="flex flex-col md:flex-row items-center md:items-start justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Uploader onUpload={handleProductImageUpload} onImageChange={handleProductImageChange} caption={uploaderCaptionProduct} description={uploaderDescriptionProduct} currentImage={appState.productImage} placeholderType="clothing" cardType="content-input" />
                        <Uploader onUpload={handleSceneImageUpload} onImageChange={handleSceneImageChange} caption={uploaderCaptionScene} description={uploaderDescriptionScene} currentImage={appState.sceneImage} placeholderType="style" cardType="style-input" />
                    </motion.div>
                </div>
            )}

            {appState.stage === 'configuring' && appState.productImage && appState.sceneImage && (
                 <motion.div className="flex flex-col items-center gap-8 w-full max-w-screen-2xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4">
                            <ActionablePolaroidCard type="content-input" mediaUrl={appState.productImage} caption={t('productStudio_productCaption')} status="done" onClick={() => appState.productImage && openLightbox(lightboxImages.indexOf(appState.productImage))} onImageChange={handleProductImageChange} />
                            <ActionablePolaroidCard type="style-input" mediaUrl={appState.sceneImage} caption={t('productStudio_sceneCaption')} status="done" onClick={() => appState.sceneImage && openLightbox(lightboxImages.indexOf(appState.sceneImage))} onImageChange={handleSceneImageChange} />
                        </div>
                    </div>

                    <OptionsPanel className="max-w-3xl">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                        <Slider
                            label={t('productStudio_creativityLabel')}
                            options={CREATIVITY_LEVELS}
                            value={appState.options.creativityLevel}
                            onChange={(value) => handleOptionChange('creativityLevel', value)}
                        />
                        <div>
                            <label htmlFor="notes-studio" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotes')}</label>
                            <textarea
                                id="notes-studio"
                                value={localNotes}
                                onChange={(e) => setLocalNotes(e.target.value)}
                                onBlur={() => { if (localNotes !== appState.options.notes) handleOptionChange('notes', localNotes); }}
                                placeholder={t('productStudio_notesPlaceholder')}
                                className="form-input h-24"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                            <button onClick={executeGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('common_creating') : t('productStudio_createButton')}</button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                 <ResultsView
                    stage={appState.stage}
                    originalImage={appState.productImage}
                    onOriginalClick={() => appState.productImage && openLightbox(lightboxImages.indexOf(appState.productImage))}
                    error={appState.error}
                    isMobile={isMobile}
                    actions={(
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">{t('common_downloadAll')}</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_editOptions')}</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">{t('common_startOver')}</button>
                        </>
                    )}
                 >
                    {appState.sceneImage && (
                        <motion.div key="scene" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard type="style-input" caption={t('productStudio_sceneCaption')} status="done" mediaUrl={appState.sceneImage} isMobile={isMobile} onClick={() => appState.sceneImage && openLightbox(lightboxImages.indexOf(appState.sceneImage))} onImageChange={handleSceneImageChange} />
                        </motion.div>
                    )}
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-studio" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('common_result')}
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
                        />
                    </motion.div>
                 </ResultsView>
            )}

             <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default ProductStudio;