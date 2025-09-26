/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useCallback } from 'react';
import { useAppControls } from './uiContexts';
import { startVideoGenerationFromImage, pollVideoOperation } from '../services/geminiService';
import { type VideoTask } from './uiTypes';

/**
 * Custom hook to track media query status.
 * @param query The media query string (e.g., '(max-width: 768px)').
 * @returns boolean indicating if the query matches.
 */
export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

/**
 * Custom hook to manage the state and actions for the Lightbox component.
 * @returns An object with the lightbox's current index and functions to control it.
 */
export const useLightbox = () => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
    }, []);

    const navigateLightbox = useCallback((newIndex: number) => {
        setLightboxIndex(newIndex);
    }, []);

    return {
        lightboxIndex,
        openLightbox,
        closeLightbox,
        navigateLightbox,
    };
};

// --- NEW: Debounce Hook ---
/**
 * Custom hook to debounce a value.
 * @param value The value to debounce.
 * @param delay The delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// --- NEW: Video Generation Hook ---

export const useVideoGeneration = () => {
    const { addImagesToGallery } = useAppControls();
    const [videoTasks, setVideoTasks] = useState<Record<string, VideoTask>>({});

    const generateVideo = useCallback(async (sourceUrl: string, prompt: string) => {
        const finalPrompt = prompt.trim() || "Animate this image, bringing it to life with subtle, cinematic motion.";
        setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'pending' } }));
        try {
            const op = await startVideoGenerationFromImage(sourceUrl, finalPrompt);
            setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'pending', operation: op } }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'error', error: errorMessage } }));
        }
    }, [addImagesToGallery]);

    useEffect(() => {
        // FIX: Add explicit type annotation to fix property access errors on 'unknown'.
        const tasksToPoll = Object.entries(videoTasks).filter(([, task]: [string, VideoTask]) => task.status === 'pending' && task.operation);
        if (tasksToPoll.length === 0) return;
    
        let isCancelled = false;
    
        const poll = async () => {
            if (isCancelled) return;
    
            const newTasks = { ...videoTasks };
            let tasksUpdated = false;
    
            // FIX: Add explicit type annotation to fix property access errors on 'unknown'.
            await Promise.all(tasksToPoll.map(async ([sourceUrl, task]: [string, VideoTask]) => {
                if (!task.operation) return;
                try {
                    const updatedOp = await pollVideoOperation(task.operation);
                    if (isCancelled) return;
    
                    if (updatedOp.done) {
                        if (updatedOp.response?.generatedVideos?.[0]?.video?.uri) {
                            const downloadLink = updatedOp.response.generatedVideos[0].video.uri;
                            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            newTasks[sourceUrl] = { status: 'done', resultUrl: blobUrl };
                            addImagesToGallery([blobUrl]);
                        } else {
                            throw new Error(updatedOp.error?.message || "Video generation finished but no URI was found.");
                        }
                    } else {
                        // FIX: Cast task to VideoTask before spreading to resolve spread type error.
                        newTasks[sourceUrl] = { ...(task as VideoTask), operation: updatedOp };
                    }
                    tasksUpdated = true;
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    newTasks[sourceUrl] = { status: 'error', error: errorMessage };
                    tasksUpdated = true;
                }
            }));
    
            if (!isCancelled && tasksUpdated) {
                setVideoTasks(newTasks);
            }
    
            // FIX: Add explicit type annotation to fix property access errors on 'unknown'.
            const stillPending = Object.values(newTasks).some((t: VideoTask) => t.status === 'pending');
            if (!isCancelled && stillPending) {
                setTimeout(poll, 10000);
            }
        };
    
        const timeoutId = setTimeout(poll, 5000);
    
        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [videoTasks, addImagesToGallery]);

    return { videoTasks, generateVideo };
};