/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError, 
    padImageToAspectRatio,
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface PatternDesignerOptions {
    applyMode: string;
    aspectRatio: string;
    patternScale: number;
    notes: string;
    changeObjectColor: boolean;
    removeWatermark: boolean;
}

export async function applyPatternToClothing(
    clothingImageUrl: string,
    patternImageUrl: string,
    patternImageUrl2: string | null,
    options: PatternDesignerOptions
): Promise<string> {
    const clothingToProcess = await padImageToAspectRatio(clothingImageUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType: clothingMime, data: clothingData } = parseDataUrl(clothingToProcess);
    const { mimeType: patternMime, data: patternData } = parseDataUrl(patternImageUrl);

    const clothingImagePart = { inlineData: { mimeType: clothingMime, data: clothingData } };
    const patternImagePart = { inlineData: { mimeType: patternMime, data: patternData } };
    const allParts: object[] = [clothingImagePart, patternImagePart];

    if (patternImageUrl2) {
        const { mimeType: patternMime2, data: patternData2 } = parseDataUrl(patternImageUrl2);
        const patternImagePart2 = { inlineData: { mimeType: patternMime2, data: patternData2 } };
        allParts.push(patternImagePart2);
    }

    const promptParts = [
        "**Nhiệm vụ:** Bạn là một AI chuyên gia thiết kế thời trang. Sử dụng các hình ảnh được cung cấp:",
        "- **Ảnh 1:** Ảnh trang phục (áo, váy, quần, v.v.).",
        "- **Ảnh 2:** Ảnh chứa họa tiết chính.",
    ];
    
    if (patternImageUrl2) {
        promptParts.push("- **Ảnh 3:** Ảnh chứa họa tiết thứ hai.");
        promptParts.push(
            "",
            "**YÊU CẦU CỐT LÕI:** Trộn và kết hợp họa tiết từ Ảnh 2 và Ảnh 3 một cách sáng tạo để áp dụng lên trang phục trong Ảnh 1. Kết quả phải là một bức ảnh chân thực, trong đó trang phục đã được thay đổi họa tiết một cách tự nhiên, tuân thủ theo các nếp gấp, hình dạng và ánh sáng của trang phục gốc."
        );
    } else {
        promptParts.push(
            "",
            "**YÊU CẦU CỐT LÕI:** Áp dụng họa tiết từ Ảnh 2 lên trang phục trong Ảnh 1. Kết quả phải là một bức ảnh chân thực, trong đó trang phục đã được thay đổi họa tiết một cách tự nhiên, tuân thủ theo các nếp gấp, hình dạng và ánh sáng của trang phục gốc."
        );
    }

    promptParts.push(
        "",
        "**HƯỚNG DẪN CHI TIẾT:**",
        "1. **Giữ nguyên Đối tượng & Bối cảnh:** Phải giữ lại 100% người mẫu (nếu có), vóc dáng, tư thế, và bối cảnh từ Ảnh 1. Chỉ thay đổi họa tiết của trang phục được chỉ định.",
    );

    const scaleLevels = ["nhỏ", "trung bình", "lớn", "rất lớn"];
    promptParts.push(`2. **Tỷ lệ Họa tiết:** Áp dụng họa tiết với kích thước ${scaleLevels[options.patternScale] || 'trung bình'}.`);

    if (options.applyMode && options.applyMode !== 'Tự động') {
         promptParts.push(`3. **Chế độ Áp dụng:** ${options.applyMode}.`);
    }

    if (options.notes) {
        promptParts.push(`4. **Ghi chú bổ sung (Ưu tiên cao):** ${options.notes}`);
    }

    if (options.changeObjectColor) {
        promptParts.push("5. **Thay đổi màu sắc:** Dựa vào Ghi chú bổ sung, thay đổi màu sắc của một vật thể cụ thể được yêu cầu.");
    }

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(
            `6. **Tỷ lệ khung hình:** Ảnh kết quả BẮT BUỘC phải có tỷ lệ ${options.aspectRatio}. Nếu Ảnh 1 có viền trắng, hãy lấp đầy chúng một cách sáng tạo, liền mạch với bối cảnh.`
        );
    }
    
    if (options.removeWatermark) {
        promptParts.push("**YÊU CẦU THÊM:** Ảnh kết quả không được chứa bất kỳ watermark, logo hay chữ ký nào.");
    }
    
    promptParts.push("\n**ĐẦU RA:** Chỉ trả về hình ảnh đã hoàn thành, không kèm văn bản.");

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };
    allParts.push(textPart);

    try {
        console.log("Attempting to apply pattern to clothing...");
        const response = await callGeminiWithRetry(allParts);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during pattern application:", processedError);
        throw processedError;
    }
}