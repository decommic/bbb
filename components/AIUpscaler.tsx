/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { upscaleImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import {
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    Slider,
    type AIUpscalerState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
} from './uiUtils';

interface AIUpscalerProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: AIUpscalerState;
    onStateChange: (newState: AIUpscalerState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const AIUpscaler: React.FC<AIUpscalerProps> = (props) => {
    const {
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const [localNotes, setLocalNotes] = useState(appState.options.notes);
    
    const UPSCALE_FACTOR_OPTIONS = ['2x', '4x'];
    const ENHANCEMENT_LEVELS = t('aiUpscaler_enhancementLevels');

    useEffect(() => {
        setLocalNotes(appState.options.notes);
    }, [appState.options.notes]);


    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleOptionChange = (field: keyof AIUpscalerState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const executeUpscale = async () => {
        if (!appState.uploadedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await upscaleImage(appState.uploadedImage, appState.options);
            const settingsToEmbed = {
                viewId: 'ai-upscaler',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
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
                viewId: 'ai-upscaler',
                state: { ...appState, stage: 'configuring', generatedImage: null, historicalImages: [], error: null },
            };
            const urlWithMetadata = await embedJsonInPng(resultUrl, settingsToEmbed, settings.enableImageMetadata);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                historicalImages: [...appState.historicalImages, urlWithMetadata],
            });
            addImagesToGallery([urlWithMetadata]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleUploadedImageChange = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
        addImagesToGallery([newUrl]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };
    
    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({ url: appState.uploadedImage, filename: 'anh-goc', folder: 'input' });
        }
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'anh-nang-cap.zip',
            baseOutputFilename: 'anh-nang-cap',
        });
    };
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {(appState.stage === 'idle' || appState.stage === 'configuring') && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader onImageChange={handleImageSelectedForUploader} uploaderCaption={uploaderCaption} uploaderDescription={uploaderDescription} placeholderType="magic" />
                )}
                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard type="content-input" mediaUrl={appState.uploadedImage} caption={t('common_originalImage')} status="done" onClick={() => openLightbox(0)} onImageChange={handleUploadedImageChange} />
                        </div>
                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('aiUpscaler_optionsTitle')}</h2>
                            
                            <div>
                                <label htmlFor="upscale-factor" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('aiUpscaler_upscaleFactorLabel')}</label>
                                <select id="upscale-factor" value={appState.options.upscaleFactor} onChange={(e) => handleOptionChange('upscaleFactor', e.target.value)} className="form-input">
                                    {UPSCALE_FACTOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            
                            <Slider
                                label={t('aiUpscaler_enhancementLevelLabel')}
                                options={ENHANCEMENT_LEVELS}
                                value={appState.options.enhancementLevel}
                                onChange={(value) => handleOptionChange('enhancementLevel', value)}
                            />
                            
                            <div>
                                <label htmlFor="notes-upscaler" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">{t('common_additionalNotes')}</label>
                                <textarea
                                    id="notes-upscaler"
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    onBlur={() => { if (localNotes !== appState.options.notes) { handleOptionChange('notes', localNotes); } }}
                                    placeholder={t('aiUpscaler_notesPlaceholder')}
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex items-center pt-2">
                                <input type="checkbox" id="remove-watermark-upscaler" checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" />
                                <label htmlFor="remove-watermark-upscaler" className="ml-3 block text-sm font-medium text-neutral-300">{t('common_removeWatermark')}</label>
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                                <button onClick={executeUpscale} className="btn btn-primary" disabled={isLoading}>{isLoading ? t('aiUpscaler_creating') : t('aiUpscaler_createButton')}</button>
                            </div>
                        </OptionsPanel>
                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={appState.uploadedImage} onOriginalClick={() => openLightbox(0)} error={appState.error} actions={
                        <>
                            {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">{t('common_downloadAll')}</button>)}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">{t('common_editOptions')}</button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">{t('common_startOver')}</button>
                        </>
                    }>
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-upscaler" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                        <ActionablePolaroidCard
                            type="output"
                            caption={t('aiUpscaler_resultCaption')} status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle={t('common_regenTitle')}
                            regenerationDescription={t('aiUpscaler_regenDescription')}
                            regenerationPlaceholder={t('aiUpscaler_regenPlaceholder')}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                        />
                    </motion.div>
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default AIUpscaler;
