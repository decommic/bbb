/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editWithBanana } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import {
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type NanoBananaEditorState,
    useLightbox,
    processAndDownloadAll,
    useAppControls,
    embedJsonInPng,
    PromptResultCard,
} from './uiUtils';

interface NanoBananaEditorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: NanoBananaEditorState;
    onStateChange: (newState: NanoBananaEditorState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const NanoBananaEditor: React.FC<NanoBananaEditorProps> = (props) => {
    const {
        uploaderCaption, uploaderDescription, addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { t, settings } = useAppControls();
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const [localPrompt, setLocalPrompt] = useState(appState.options.prompt);

    useEffect(() => {
        setLocalPrompt(appState.options.prompt);
    }, [appState.options.prompt]);

    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImage: null,
            generatedText: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleOptionChange = (field: keyof NanoBananaEditorState['options'], value: string) => {
        onStateChange({
            ...appState,
            options: { ...appState.options, [field]: value }
        });
    };

    const executeEdit = async () => {
        if (!appState.uploadedImage || !appState.options.prompt.trim()) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const { imageUrl, text } = await editWithBanana(appState.uploadedImage, appState.options.prompt);

            let urlWithMetadata = imageUrl;
            if (imageUrl) {
                 const settingsToEmbed = {
                    viewId: 'nano-banana-editor',
                    state: { ...appState, stage: 'configuring', generatedImage: null, generatedText: null, historicalImages: [], error: null },
                };
                urlWithMetadata = await embedJsonInPng(imageUrl, settingsToEmbed, settings.enableImageMetadata);
            }
            
            const newHistoricalImages = urlWithMetadata ? [...appState.historicalImages, urlWithMetadata] : appState.historicalImages;

            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                generatedText: text,
                historicalImages: newHistoricalImages,
            });
            if (urlWithMetadata) {
                addImagesToGallery([urlWithMetadata]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleRegeneration = async (prompt: string) => {
        if (!appState.uploadedImage) return;

        // Create a new state object with the updated prompt
        const newState: NanoBananaEditorState = {
            ...appState,
            options: {
                ...appState.options,
                prompt: prompt,
            },
        };

        // Update the central state
        onStateChange(newState);

        // Now call the edit function with the new state
        // We'll wrap this in a timeout to ensure the state update has propagated if needed,
        // though it's better to pass the new state directly if the function supported it.
        // For simplicity here, we'll rely on the updated appState.
        
        // A better pattern:
        // Pass the new prompt directly to the generation logic to avoid state timing issues.
        onStateChange({ ...appState, stage: 'generating', error: null, options: { prompt } });

        try {
            const { imageUrl, text } = await editWithBanana(appState.uploadedImage, prompt);
            let urlWithMetadata = imageUrl;
            if (imageUrl) {
                 const settingsToEmbed = {
                    viewId: 'nano-banana-editor',
                    state: { ...appState, options: {prompt}, stage: 'configuring', generatedImage: null, generatedText: null, historicalImages: [], error: null },
                };
                urlWithMetadata = await embedJsonInPng(imageUrl, settingsToEmbed, settings.enableImageMetadata);
            }
            const newHistoricalImages = urlWithMetadata ? [...appState.historicalImages, urlWithMetadata] : appState.historicalImages;
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: urlWithMetadata,
                generatedText: text,
                historicalImages: newHistoricalImages,
                options: { prompt }
            });
            if (urlWithMetadata) {
                addImagesToGallery([urlWithMetadata]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage, options: { prompt } });
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
            zipFilename: 'anh-chinh-sua.zip',
            baseOutputFilename: 'anh-chinh-sua',
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
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">{t('nanoBananaEditor_promptLabel')}</h2>
                            
                            <div>
                                <textarea
                                    id="notes-banana"
                                    value={localPrompt}
                                    onChange={(e) => setLocalPrompt(e.target.value)}
                                    onBlur={() => { if (localPrompt !== appState.options.prompt) { handleOptionChange('prompt', localPrompt); } }}
                                    placeholder={t('nanoBananaEditor_promptPlaceholder')}
                                    className="form-input h-32"
                                    rows={4}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">{t('common_changeImage')}</button>
                                <button onClick={executeEdit} className="btn btn-primary" disabled={isLoading || !localPrompt.trim()}>{isLoading ? t('nanoBananaEditor_creating') : t('nanoBananaEditor_createButton')}</button>
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
                    {appState.generatedImage && (
                        <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-banana" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                            <ActionablePolaroidCard
                                type="output"
                                caption={t('nanoBananaEditor_resultCaption')} status={'done'}
                                mediaUrl={appState.generatedImage ?? undefined}
                                onImageChange={handleGeneratedImageChange}
                                onRegenerate={handleRegeneration}
                                regenerationTitle={t('nanoBananaEditor_promptLabel')}
                                regenerationDescription={t('nanoBananaEditor_regenDescription')}
                                regenerationPlaceholder={t('nanoBananaEditor_promptPlaceholder')}
                                onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            />
                        </motion.div>
                    )}
                    {appState.generatedText && (
                         <motion.div className="w-full md:w-96 flex-shrink-0" key="text-result-banana" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.3 }}>
                            <PromptResultCard title={t('nanoBananaEditor_textResultTitle')} promptText={appState.generatedText} className="h-full" />
                         </motion.div>
                    )}
                     {isLoading && !appState.error && (
                        <motion.div className="w-full md:w-auto flex-shrink-0" key="loading-banana" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}>
                             <ActionablePolaroidCard type="output" caption={t('nanoBananaEditor_resultCaption')} status={'pending'} />
                        </motion.div>
                    )}
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default NanoBananaEditor;