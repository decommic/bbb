/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { replaceProductInScene, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    ResultsView,
    type ReplaceProductInSceneState,
    useLightbox,
    OptionsPanel,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';

interface ReplaceProductInSceneProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionProduct: string;
    uploaderDescriptionProduct: string;
    uploaderCaptionScene: string;
    uploaderDescriptionScene: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ReplaceProductInSceneState;
    onStateChange: (newState: ReplaceProductInSceneState) => void;
    onReset: () => void;
    onGoBack: () => void;
}


const ReplaceProductInScene: React.FC<ReplaceProductInSceneProps> = (props) => {
    const { 
        uploaderCaptionProduct, uploaderDescriptionProduct,
        uploaderCaptionScene, uploaderDescriptionScene,
        addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;
    
    // Rename state variables for clarity in this component
    const { modelImage: productImage, clothingImage: sceneImage } = appState;

    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [localNotes, setLocalNotes] = useState(appState.options.notes);

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);
    
    const LAYOUT_OPTIONS = t('replaceProductInScene_layoutOptions');
    const PHOTO_STYLE_OPTIONS = t('replaceProductInScene_photoStyleOptions');
    const ASPECT_RATIO_OPTIONS = t('aspectRatioOptions');

    const lightboxImages = [productImage, sceneImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleProductImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.clothingImage ? 'configuring' : 'idle',
                modelImage: imageDataUrl, // Corresponds to productImage
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleSceneImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                stage: appState.modelImage ? 'configuring' : 'idle',
                clothingImage: imageDataUrl, // Corresponds to sceneImage
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };
    
    const handleProductImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.clothingImage ? 'configuring' : 'idle',
            modelImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleSceneImageChange = (newUrl: string) => {
        onStateChange({
            ...appState,
            stage: appState.modelImage ? 'configuring' : 'idle',
            clothingImage: newUrl,
        });
        addImagesToGallery([newUrl]);
    };
    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const handleOptionChange = (field: keyof ReplaceProductInSceneState['options'], value: string | boolean) => {
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };

    const executeInitialGeneration = async () => {
        if (!productImage || !sceneImage) return;
        onStateChange({ ...appState, stage: 'generating', error: null });
        try {
            const resultUrl = await replaceProductInScene(productImage, sceneImage, appState.options);
            const settingsToEmbed = {
                viewId: 'replace-product-in-scene',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            onStateChange({ ...appState, stage: 'results', generatedImage: urlWithMetadata, historicalImages: [...appState.historicalImages, urlWithMetadata] });
            addImagesToGallery([urlWithMetadata]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;
        onStateChange({ ...appState, stage: 'generating', error: null });
        try {
            const resultUrl = await editImageWithPrompt(appState.generatedImage, prompt);
            const settingsToEmbed = {
                viewId: 'replace-product-in-scene',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            onStateChange({ ...appState, stage: 'results', generatedImage: urlWithMetadata, historicalImages: [...appState.historicalImages, urlWithMetadata] });
            addImagesToGallery([urlWithMetadata]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (productImage) {
            inputImages.push({ url: productImage, filename: 'san-pham-goc', folder: 'input' });
        }
        if (sceneImage) {
            inputImages.push({ url: sceneImage, filename: 'boi-canh-goc', folder: 'input' });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-ghep-nen.zip',
            baseOutputFilename: 'ket-qua-ghep-nen',
        });
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, onImageChange, placeholderType, cardType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <ActionablePolaroidCard
                    type={currentImage ? cardType : 'uploader'}
                    caption={caption}
                    status="done"
                    mediaUrl={currentImage || undefined}
                    placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
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
                        <Uploader id="product-upload" onUpload={handleProductImageUpload} onImageChange={handleProductImageChange} caption={uploaderCaptionProduct} description={uploaderDescriptionProduct} currentImage={productImage} placeholderType="clothing" cardType="content-input" />
                        <Uploader id="scene-upload" onUpload={handleSceneImageUpload} onImageChange={handleSceneImageChange} caption={uploaderCaptionScene} description={uploaderDescriptionScene} currentImage={sceneImage} placeholderType="style" cardType="style-input" />
                    </motion.div>
                </div>
            )}

            {appState.stage === 'configuring' && productImage && sceneImage && (
                <motion.div className="flex flex-col items-center gap-8 w-full max-w-screen-2xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 w-full md:w-max mx-auto px-4">
                            <ActionablePolaroidCard type="content-input" mediaUrl={productImage} caption={t('replaceProductInScene_modelCaption')} status="done" onClick={() => productImage && openLightbox(lightboxImages.indexOf(productImage))} onImageChange={handleProductImageChange} />
                            <ActionablePolaroidCard type="style-input" mediaUrl={sceneImage} caption={t('replaceProductInScene_clothingCaption')} status="done" onClick={() => sceneImage && openLightbox(lightboxImages.indexOf(sceneImage))} onImageChange={handleSceneImageChange} />
                        </div>
                    </div>

                    <OptionsPanel className="max-w-4xl">
                        <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('common_options')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="layout-select" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('replaceProductInScene_layoutLabel')}</label>
                                <select id="layout-select" value={appState.options.layout} onChange={(e) => handleOptionChange('layout', e.target.value)} className="form-input">
                                    {LAYOUT_OPTIONS.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="style-select" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('replaceProductInScene_photoStyleLabel')}</label>
                                <select id="style-select" value={appState.options.photoStyle} onChange={(e) => handleOptionChange('photoStyle', e.target.value)} className="form-input">
                                    {PHOTO_STYLE_OPTIONS.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotes')}</label>
                            <textarea
                                id="notes"
                                value={localNotes}
                                onChange={(e) => setLocalNotes(e.target.value)}
                                onBlur={() => {
                                    if (localNotes !== appState.options.notes) {
                                        handleOptionChange('notes', localNotes);
                                    }
                                }}
                                placeholder={t('replaceProductInScene_notesPlaceholder')}
                                className="form-input h-24"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input type="checkbox" id="remove-watermark-replace" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" aria-label={t('common_removeWatermark')} />
                            <label htmlFor="remove-watermark-replace" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                            <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('replaceProductInScene_creating') : t('replaceProductInScene_createButton')}</button>
                        </div>
                    </OptionsPanel>
                </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={productImage} onOriginalClick={() => productImage && openLightbox(lightboxImages.indexOf(productImage))} error={appState.error} isMobile={isMobile} actions={
                    <>
                        {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">{t('common_downloadAll')}</button>)}
                        <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_editOptions')}</button>
                        <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">{t('common_startOver')}</button>
                    </>
                }>
                    {sceneImage && (
                        <motion.div key="scene" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard type="style-input" caption={t('replaceProductInScene_clothingCaption')} status="done" mediaUrl={sceneImage} isMobile={isMobile} onClick={() => sceneImage && openLightbox(lightboxImages.indexOf(sceneImage))} onImageChange={handleSceneImageChange} />
                        </motion.div>
                    )}
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-replace" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('common_result')}
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('common_regenDescription')}
                            regenerationPlaceholder={t('replaceProductInScene_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
                        />
                    </motion.div>
                    {appState.historicalImages.map(sourceUrl => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`${sourceUrl}-video`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            >
                                <ActionablePolaroidCard
                                    type="output"
                                    caption={t('common_video')}
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default ReplaceProductInScene;