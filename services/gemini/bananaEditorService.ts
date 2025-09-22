/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Modality, type GenerateContentResponse } from "@google/genai";
import ai from './client';
import { processApiError, parseDataUrl } from './baseService';

interface EditResult {
    imageUrl: string | null;
    text: string | null;
}

export async function editWithBanana(
    imageDataUrl: string,
    prompt: string
): Promise<EditResult> {
    try {
        const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
        const imagePart = {
            inlineData: { mimeType, data: base64Data },
        };
        const textPart = { text: prompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let imageUrl: string | null = null;
        let text: string | null = null;
        
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    text = part.text;
                } else if (part.inlineData) {
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }


        if (!imageUrl && !text) {
            throw new Error("The AI model did not return an image or text.");
        }

        return { imageUrl, text };

    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during Banana image editing:", processedError);
        throw processedError;
    }
}
