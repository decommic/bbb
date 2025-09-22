/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
    processApiError,
    parseDataUrl,
    callGeminiWithRetry,
    processGeminiResponse
} from './baseService';

interface AIUpscalerOptions {
    upscaleFactor: '2x' | '4x';
    enhancementLevel: string; // 'Tự nhiên', 'Tăng cường', 'Tối đa'
    notes?: string;
    removeWatermark?: boolean;
}

const getPrompt = (options: AIUpscalerOptions, upscalePass: 'first' | 'second' = 'first'): string => {
    const targetScale = upscalePass === 'first' && options.upscaleFactor === '4x' ? 'gấp đôi (2x)' : 'gấp đôi (2x)';
    
    const promptParts = [
        `**Nhiệm vụ:** Bạn là một chuyên gia AI về phục hồi và nâng cấp hình ảnh. Nhiệm vụ của bạn là nâng cấp độ phân giải của hình ảnh được cung cấp lên ${targetScale} kích thước gốc.`,
        '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**',
        '1. **Nâng cấp & Làm nét:** Tăng độ phân giải của ảnh, làm cho các chi tiết trở nên sắc nét và rõ ràng hơn. Loại bỏ nhiễu (noise) và các hiện vật nén (compression artifacts) một cách tự nhiên.',
        '2. **Không thêm chi tiết mới:** Tuyệt đối không được thêm bất kỳ đối tượng, yếu tố, hoặc chi tiết nào không có trong ảnh gốc. Chỉ cải thiện những gì đã có.',
        '3. **Giữ nguyên bố cục & màu sắc:** Giữ nguyên 100% bố cục, thành phần, và bảng màu gốc của hình ảnh.',
    ];

    const enhancementMapping: { [key: string]: string } = {
        'Tự nhiên': '4. **Mức độ tăng cường (Tự nhiên):** Cải thiện chi tiết một cách tinh tế, giữ cho ảnh trông tự nhiên nhất có thể.',
        'Tăng cường': '4. **Mức độ tăng cường (Tăng cường):** Tăng cường đáng kể các chi tiết nhỏ và kết cấu bề mặt để ảnh sắc nét hơn rõ rệt.',
        'Tối đa': '4. **Mức độ tăng cường (Tối đa):** Đẩy mạnh tối đa độ sắc nét và chi tiết. Kết quả phải cực kỳ rõ ràng, ngay cả khi điều này có thể làm cho nó trông hơi "siêu thực".',
    };

    promptParts.push(enhancementMapping[options.enhancementLevel] || enhancementMapping['Tăng cường']);

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung:** "${options.notes}".`);
    }

    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Nếu có bất kỳ watermark nào, hãy loại bỏ nó một cách khéo léo.');
    }

    promptParts.push('**ĐẦU RA:** Chỉ trả về hình ảnh đã được nâng cấp, không có văn bản nào khác.');

    return promptParts.join('\n');
};

const upscalePass = async (imageDataUrl: string, options: AIUpscalerOptions, pass: 'first' | 'second' = 'first'): Promise<string> => {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };
    const prompt = getPrompt(options, pass);
    const textPart = { text: prompt };

    try {
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        throw error; // Let the calling function handle the processed error
    }
};

export async function upscaleImage(imageDataUrl: string, options: AIUpscalerOptions): Promise<string> {
    try {
        console.log(`Starting upscale process with factor: ${options.upscaleFactor}`);
        const firstPassResult = await upscalePass(imageDataUrl, options, 'first');
        
        if (options.upscaleFactor === '4x') {
            console.log("First 2x pass complete. Starting second 2x pass for 4x result...");
            const secondPassResult = await upscalePass(firstPassResult, options, 'second');
            return secondPassResult;
        }

        return firstPassResult;
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during AI upscale process:", processedError);
        throw processedError;
    }
}
