/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, handleFileUpload } from './uiUtils';
import { CloseIcon, CloudUploadIcon, StarIcon, DeleteIcon } from './icons';
import { cn } from '../lib/utils';

interface ModelLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
}

const ModelLibraryModal: React.FC<ModelLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { modelLibrary, addModelToLibrary, updateModelInLibrary, deleteModelFromLibrary, t } = useAppControls();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (url: string) => {
        onSelect(url);
        onClose();
    };
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            addModelToLibrary(imageDataUrl);
        });
    };

    const favorites = modelLibrary.filter(m => m.isFavorite);
    const defaults = modelLibrary.filter(m => !m.isFavorite);

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay z-[60]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-4xl !h-[85vh] flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                             <h3 className="base-font font-bold text-2xl text-yellow-400">{t('dressTheModel_modelLibraryTitle')}</h3>
                             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                                <CloseIcon className="h-6 w-6" strokeWidth={2}/>
                             </button>
                        </div>
                        
                        {modelLibrary.length === 0 ? (
                             <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                <p>{t('dressTheModel_libraryEmpty')}</p>
                            </div>
                        ) : (
                             <div className="gallery-grid">
                                <motion.div
                                    className="gallery-grid-item !bg-neutral-800/50 border-2 border-dashed border-neutral-600 hover:border-yellow-400 hover:bg-neutral-700/50 transition-colors flex items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                    title={t('dressTheModel_library_upload')}
                                    whileHover={{ scale: 1.02 }}
                                >
                                     <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleFileChange}
                                        onClick={(e) => (e.currentTarget.value = '')}
                                    />
                                    <CloudUploadIcon className="h-12 w-12 text-neutral-500" />
                                </motion.div>
                                
                                {favorites.map((model, index) => (
                                     <motion.div
                                        key={model.id}
                                        className="gallery-grid-item group"
                                        onClick={() => handleSelect(model.url)}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <img src={model.url} alt={`Favorite Model ${index + 1}`} loading="lazy" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">{t('common_select')}</span>
                                        </div>
                                         <div className="thumbnail-actions !opacity-100">
                                            <button onClick={(e) => { e.stopPropagation(); updateModelInLibrary(model.id, { isFavorite: !model.isFavorite }); }} className="thumbnail-action-btn" title="Yêu thích">
                                                <StarIcon className="h-4 w-4 text-yellow-400" fill="currentColor"/>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteModelFromLibrary(model.id); }} className="thumbnail-action-btn hover:!bg-red-600 focus:!ring-red-500" title={t('dressTheModel_library_deleteTooltip')}>
                                                <DeleteIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                                {defaults.map((model, index) => (
                                     <motion.div
                                        key={model.id}
                                        className="gallery-grid-item group"
                                        onClick={() => handleSelect(model.url)}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: (index + favorites.length) * 0.03 }}
                                    >
                                        <img src={model.url} alt={`Model ${index + 1}`} loading="lazy" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">{t('common_select')}</span>
                                        </div>
                                        <div className="thumbnail-actions">
                                            <button onClick={(e) => { e.stopPropagation(); updateModelInLibrary(model.id, { isFavorite: !model.isFavorite }); }} className="thumbnail-action-btn" title="Yêu thích">
                                                <StarIcon className="h-4 w-4 text-white"/>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteModelFromLibrary(model.id); }} className="thumbnail-action-btn hover:!bg-red-600 focus:!ring-red-500" title={t('dressTheModel_library_deleteTooltip')}>
                                                <DeleteIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                             </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ModelLibraryModal;