/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import toast from 'react-hot-toast';
// FIX: Import ChangeEvent type from React
import type { ChangeEvent } from 'react';
import { type ImageForZip, type VideoTask } from './uiTypes';

// Declare JSZip for creating zip files
declare const JSZip: any;

/**
 * Handles file input change events, reads the file as a Data URL, and executes a callback.
 * @param e The React change event from the file input.
 * @param callback A function to call with the resulting file data URL.
 */
export const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    callback: (result: string) => void
) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
};

/**
 * Triggers a browser download for a given URL, automatically determining the file extension.
 * @param url The URL of the file to download (can be a data URL or blob URL).
 * @param filenameWithoutExtension The desired name for the downloaded file, without the extension.
 */
export const downloadImage = (url: string, filenameWithoutExtension: string) => {
    if (!url) return;
    toast('Bắt đầu tải về...');

    // Determine extension from URL
    let extension = 'jpg'; // Default extension
    if (url.startsWith('data:image/png')) {
        extension = 'png';
    } else if (url.startsWith('data:image/jpeg')) {
        extension = 'jpg';
    } else if (url.startsWith('data:image/webp')) {
        extension = 'webp';
    } else if (url.startsWith('blob:')) {
        // This is likely a video from video generation or a blob from another source.
        // It's safer to assume mp4 for videos.
        extension = 'mp4';
    }

    const filename = `${filenameWithoutExtension}.${extension}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Triggers a browser download for a JSON object.
 * @param data The JavaScript object to download.
 * @param filenameWithExtension The desired filename, including the .json extension.
 */
export const downloadJson = (data: object, filenameWithExtension: string) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filenameWithExtension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create or download JSON file:", error);
        alert("Could not download settings file.");
    }
};


/**
 * Converts a data URL string to a Blob object.
 * @param dataurl The data URL to convert.
 * @returns A Blob object.
 */
export const dataURLtoBlob = async (dataurl: string): Promise<Blob> => {
    // Handle blob URLs directly
    if (dataurl.startsWith('blob:')) {
        const response = await fetch(dataurl);
        return await response.blob();
    }
    
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Creates a zip file from a list of images and triggers a download.
 * @param images An array of ImageForZip objects.
 * @param zipFilename The desired name for the downloaded zip file.
 */
export const downloadAllImagesAsZip = async (images: ImageForZip[], zipFilename: string = 'results.zip') => {
    if (!images || images.length === 0) {
        toast.error('Không có ảnh nào để tải về.');
        return;
    }
    toast('Đang chuẩn bị file zip...');

    try {
        const zip = new JSZip();

        for (const img of images) {
            if (!img.url) continue;

            const blob = await dataURLtoBlob(img.url);
            let targetFolder = zip;
            if (img.folder) {
                targetFolder = zip.folder(img.folder) || zip;
            }
            
            const fileExtension = img.extension || (blob.type.split('/')[1] || 'jpg').toLowerCase();
            const baseFileName = img.filename.replace(/\s+/g, '-').toLowerCase();

            // Handle duplicates by appending a number
            let finalFilename = `${baseFileName}.${fileExtension}`;
            let count = 1;
            // Use the file method to check for existence within the target folder
            while (targetFolder.file(finalFilename)) {
                count++;
                finalFilename = `${baseFileName}-${count}.${fileExtension}`;
            }

            targetFolder.file(finalFilename, blob);
        }

        if (Object.keys(zip.files).length === 0) {
            toast.error('Không có ảnh hợp lệ nào để tải về.');
            return;
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Lỗi khi tạo file zip:', error);
        toast.error('Đã xảy ra lỗi khi tạo file zip.');
    }
};

/**
 * A centralized utility to process and download all generated assets (images and videos) as a zip file.
 * @param inputImages Array of input images for the zip.
 * @param historicalImages Array of generated images/videos. Can be simple URLs or objects with details for naming.
 * @param videoTasks The video generation task object to find completed videos.
 * @param zipFilename The final name for the downloaded zip file.
 * @param baseOutputFilename A base prefix for all generated output files.
 */
export const processAndDownloadAll = async ({
    inputImages = [],
    historicalImages = [],
    videoTasks = {},
    zipFilename,
    baseOutputFilename,
}: {
    inputImages?: ImageForZip[];
    historicalImages?: Array<string | { url: string; idea?: string; prompt?: string; }>;
    videoTasks?: Record<string, VideoTask>;
    zipFilename: string;
    baseOutputFilename: string;
}) => {
    const allItemsToZip: ImageForZip[] = [...inputImages];
    const processedUrls = new Set<string>();

    // Add historical images first
    historicalImages.forEach((item, index) => {
        const url = typeof item === 'string' ? item : item.url;
        if (processedUrls.has(url)) return;

        // Generate a descriptive filename part
        const namePartRaw = (typeof item !== 'string' && (item.idea || item.prompt))
            ? (item.idea || item.prompt!)
            : `${index + 1}`;
        
        // Sanitize the filename part
        const namePart = namePartRaw.substring(0, 30).replace(/[\s()]/g, '_').replace(/[^\w-]/g, '');
        
        const isVideo = url.startsWith('blob:');

        allItemsToZip.push({
            url,
            filename: `${baseOutputFilename}-${namePart}`,
            folder: 'output',
            extension: isVideo ? 'mp4' : undefined,
        });
        processedUrls.add(url);
    });

    // Add any completed videos from videoTasks that weren't already in historicalImages
    Object.values(videoTasks).forEach((task, index) => {
        if (task.status === 'done' && task.resultUrl && !processedUrls.has(task.resultUrl)) {
            allItemsToZip.push({
                url: task.resultUrl,
                filename: `${baseOutputFilename}-video-${index + 1}`,
                folder: 'output',
                extension: 'mp4',
            });
            processedUrls.add(task.resultUrl);
        }
    });

    if (allItemsToZip.length === inputImages.length) {
        toast.error('Không có ảnh hoặc video nào đã tạo để tải về.');
        return;
    }

    await downloadAllImagesAsZip(allItemsToZip, zipFilename);
};


// --- PNG Metadata Utilities for Import/Export ---

const crc32 = (function() {
    let table: number[] | undefined;

    function makeTable() {
        table = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
    }

    return function(bytes: Uint8Array): number {
        if (!table) makeTable();
        let crc = -1;
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ table![(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ -1) >>> 0;
    };
})();

export const embedJsonInPng = async (imageDataUrl: string, jsonData: object, enabled: boolean): Promise<string> => {
    if (!enabled) {
        return imageDataUrl;
    }
    
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
        console.warn('Cannot embed JSON in non-PNG image. Returning original.');
        return imageDataUrl;
    }
    
    try {
        const blob = await dataURLtoBlob(imageDataUrl);
        const buffer = await blob.arrayBuffer();
        const view = new Uint8Array(buffer);

        const iendIndex = view.length - 12;

        const chunkType = new TextEncoder().encode('apIX');
        const chunkDataStr = JSON.stringify(jsonData);
        const chunkData = new TextEncoder().encode(chunkDataStr);
        const chunkLength = chunkData.length;

        const fullChunk = new Uint8Array(4 + 4 + chunkLength + 4);
        const chunkDataView = new DataView(fullChunk.buffer);
        
        chunkDataView.setUint32(0, chunkLength, false);
        fullChunk.set(chunkType, 4);
        fullChunk.set(chunkData, 8);
        
        const crcData = new Uint8Array(4 + chunkLength);
        crcData.set(chunkType);
        crcData.set(chunkData, 4);
        const crc = crc32(crcData);
        chunkDataView.setUint32(8 + chunkLength, crc, false);

        const newPngData = new Uint8Array(iendIndex + fullChunk.length + 12);
        newPngData.set(view.slice(0, iendIndex));
        newPngData.set(fullChunk, iendIndex);
        newPngData.set(view.slice(iendIndex), iendIndex + fullChunk.length);

        const newBlob = new Blob([newPngData], { type: 'image/png' });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(newBlob);
        });
    } catch (error) {
        console.error("Failed to embed JSON in PNG:", error);
        return imageDataUrl;
    }
};

export const extractJsonFromPng = async (file: File): Promise<object | null> => {
    try {
        const buffer = await file.arrayBuffer();
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            console.error("Not a valid PNG file for extraction.");
            return null;
        }

        let offset = 8;
        while (offset < view.byteLength) {
            const length = view.getUint32(offset, false);
            const typeBytes = uint8View.slice(offset + 4, offset + 8);
            const type = new TextDecoder().decode(typeBytes);

            if (type === 'apIX') {
                const dataBytes = uint8View.slice(offset + 8, offset + 8 + length);
                const jsonString = new TextDecoder().decode(dataBytes);
                return JSON.parse(jsonString);
            }

            if (type === 'IEND') {
                break;
            }
            offset += 12 + length;
        }
    } catch (error) {
        console.error("Failed to extract JSON from PNG:", error);
    }
    return null;
};
// FIX: Add missing combineImages function
// --- NEW: Image Combination Utility ---

interface CombineItem {
    url: string;
    label: string;
}

interface CombineOptions {
    layout: 'smart-grid' | 'horizontal' | 'vertical';
    mainTitle?: string;
    gap?: number;
    backgroundColor?: string;
    labels?: {
        enabled: boolean;
        fontColor?: string;
        backgroundColor?: string;
        baseFontSize?: number;
    };
}

const loadImg = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
    img.src = url;
});

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let testLine;
    for(let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
};

export const combineImages = async (items: CombineItem[], options: CombineOptions): Promise<string> => {
    const {
        layout = 'smart-grid',
        mainTitle = '',
        gap = 0,
        backgroundColor = '#ffffff',
        labels = { enabled: false, fontColor: '#000000', backgroundColor: '#ffffff', baseFontSize: 40 }
    } = options;

    if (items.length === 0) throw new Error("No images provided to combine.");

    const loadedImages = await Promise.all(items.map(item => loadImg(item.url)));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context.");

    const baseFontSize = labels.baseFontSize || 40;
    const mainTitleFontSize = baseFontSize * 1.5;
    const itemLabelFontSize = baseFontSize;
    const mainTitleFont = `bold ${mainTitleFontSize}px "Be Vietnam Pro", sans-serif`;
    const itemLabelFont = `bold ${itemLabelFontSize}px "Be Vietnam Pro", sans-serif`;
    
    const mainTitleHeight = (mainTitle && labels.enabled) ? mainTitleFontSize + gap * 2 : 0;
    let itemLabelHeight = 0;
    if (labels.enabled && items.some(i => i.label.trim() !== '')) {
        itemLabelHeight = itemLabelFontSize + gap * 2;
    }

    let canvasWidth = 0;
    let canvasHeight = 0;
    let positions: { x: number, y: number, width: number, height: number }[] = [];

    // --- Layout Calculation ---
    if (layout === 'horizontal') {
        const totalImageWidth = loadedImages.reduce((sum, img) => sum + img.naturalWidth, 0);
        const totalGapWidth = (loadedImages.length - 1) * gap;
        canvasWidth = totalImageWidth + totalGapWidth;
        canvasHeight = Math.max(...loadedImages.map(img => img.naturalHeight)) + mainTitleHeight + itemLabelHeight;
        
        let currentX = 0;
        loadedImages.forEach(img => {
            positions.push({ x: currentX, y: mainTitleHeight, width: img.naturalWidth, height: img.naturalHeight });
            currentX += img.naturalWidth + gap;
        });
    } else if (layout === 'vertical') {
        canvasWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
        const totalImageHeight = loadedImages.reduce((sum, img) => sum + img.naturalHeight, 0);
        const totalGapHeight = (loadedImages.length - 1) * gap;
        canvasHeight = totalImageHeight + totalGapHeight + mainTitleHeight + itemLabelHeight;
        
        let currentY = mainTitleHeight;
        loadedImages.forEach(img => {
            positions.push({ x: (canvasWidth - img.naturalWidth) / 2, y: currentY, width: img.naturalWidth, height: img.naturalHeight });
            currentY += img.naturalHeight + gap;
        });
    } else { // smart-grid
        const count = loadedImages.length;
        const cols = count <= 2 ? count : Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        const maxColWidths: number[] = new Array(cols).fill(0);
        const rowHeights: number[] = new Array(rows).fill(0);
        
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            maxColWidths[col] = Math.max(maxColWidths[col], loadedImages[i].naturalWidth);
            rowHeights[row] = Math.max(rowHeights[row], loadedImages[i].naturalHeight);
        }
        
        canvasWidth = maxColWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap;
        canvasHeight = rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * gap + mainTitleHeight + (itemLabelHeight * rows);
        
        let currentY = mainTitleHeight;
        for (let row = 0; row < rows; row++) {
            let currentX = 0;
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                if (index < count) {
                    positions[index] = { 
                        x: currentX, 
                        y: currentY, 
                        width: maxColWidths[col], 
                        height: rowHeights[row] 
                    };
                }
                currentX += maxColWidths[col] + gap;
            }
            currentY += rowHeights[row] + gap + itemLabelHeight;
        }
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // --- Drawing ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Main Title
    if (mainTitle && labels.enabled) {
        ctx.fillStyle = labels.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, mainTitleHeight - gap);
        ctx.fillStyle = labels.fontColor || '#000000';
        ctx.font = mainTitleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, mainTitle, canvasWidth / 2, (mainTitleHeight - gap) / 2, canvasWidth - gap * 2, mainTitleFontSize * 1.2);
    }

    // Draw Images and Item Labels
    loadedImages.forEach((img, index) => {
        const pos = positions[index];
        const item = items[index];
        // Center image within its cell in grid layout
        const drawX = layout === 'smart-grid' ? pos.x + (pos.width - img.naturalWidth) / 2 : pos.x;
        const drawY = layout === 'smart-grid' ? pos.y + (pos.height - img.naturalHeight) / 2 : pos.y;
        
        ctx.drawImage(img, drawX, drawY);

        if (item.label.trim() && labels.enabled) {
            const labelY = (layout === 'smart-grid' ? pos.y + pos.height + gap : canvasHeight - itemLabelHeight + gap);
            const labelWidth = (layout === 'smart-grid' ? pos.width : canvasWidth);
            const labelX = (layout === 'smart-grid' ? pos.x : 0);

            ctx.fillStyle = labels.backgroundColor || '#ffffff';
            ctx.fillRect(labelX, labelY, labelWidth, itemLabelHeight - gap);
            
            ctx.fillStyle = labels.fontColor || '#000000';
            ctx.font = itemLabelFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            wrapText(ctx, item.label, labelX + labelWidth / 2, labelY + (itemLabelHeight - gap) / 2, labelWidth - gap * 2, itemLabelFontSize * 1.2);
        }
    });

    return canvas.toDataURL('image/png');
};