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

interface DressModelOptions {
    background: string;
    pose: string;
    style: string;
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
    enhanceQuality?: boolean;
    faceRestoration?: boolean;
    upscaleFactor: 'none' | '2x' | '4x';
    denoiseLevel: number;
    restoreOldPhoto: boolean;
    sharpenLevel: number;
}

/**
 * Generates an image of a model wearing specified clothing, with style consistency from historical images.
 * @param modelImageDataUrl Data URL for the model's image.
 * @param clothingImageDataUrl Data URL for the clothing's image.
 * @param options User-selected options for background, pose, and notes.
 * @param historicalImages Optional array of data URLs from previous results for style consistency.
 * @param referenceImage Optional specific image URL from history to be used as a style reference.
 * @returns A promise that resolves to the generated image's data URL.
 */
export async function generateDressedModelImage(
    modelImageDataUrl: string, 
    clothingImageDataUrl: string, 
    options: DressModelOptions,
    historicalImages?: string[],
    referenceImage?: string | null
): Promise<string> {
    const modelImageToProcess = await padImageToAspectRatio(modelImageDataUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType: modelMime, data: modelData } = parseDataUrl(modelImageToProcess);
    const { mimeType: clothingMime, data: clothingData } = parseDataUrl(clothingImageDataUrl);

    const modelImagePart = { inlineData: { mimeType: modelMime, data: modelData } };
    const clothingImagePart = { inlineData: { mimeType: clothingMime, data: clothingData } };
    
    const referenceImagePart = referenceImage ? { inlineData: { ...parseDataUrl(referenceImage) } } : null;
    
    // Filter out the reference image from historical images to avoid duplicates, and limit to 10.
    const historicalImageParts = (historicalImages || [])
        .filter(url => url !== referenceImage)
        .slice(0, 10)
        .map(url => ({ inlineData: { ...parseDataUrl(url) } }));

    const promptParts = [];

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(
            `**YÊU CẦU ƯU TIÊN SỐ 1 - TỶ LỆ KHUNG HÌNH:**`,
            `1. Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là **${options.aspectRatio}**.`,
            `2. **Quan trọng:** Ảnh Người mẫu có thể đã được thêm nền trắng để đạt đúng tỷ lệ này. Nhiệm vụ của bạn là lấp đầy phần nền trắng đó một cách sáng tạo, mở rộng bối cảnh theo các tùy chọn bên dưới. TUYỆT ĐỐI không để lại viền trắng trong kết quả cuối cùng.`,
            ``
        );
    }

    let imageCounter = 2;
    const referenceImageIndex = referenceImage ? ++imageCounter : 0;
    const historyStartIndex = referenceImage ? imageCounter + 1 : 3;

    promptParts.push(
        '**Nhiệm vụ:** Bạn là một AI chuyên gia về thời trang. Tôi cung cấp cho bạn nhiều hình ảnh:',
        '- Ảnh 1: Một trang phục.',
        '- Ảnh 2: Một người mẫu.',
    );
    if (referenceImage) {
        promptParts.push(`- Ảnh ${referenceImageIndex}: Một ảnh tham chiếu phong cách.`);
    }
    if (historicalImages && historicalImages.length > 0) {
        promptParts.push(`- Ảnh ${historyStartIndex}, ${historyStartIndex+1}, ...: Các kết quả thành công đã tạo trước đó cho cùng người mẫu này.`);
    }
    promptParts.push('Nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, trong đó người mẫu từ Ảnh 2 đang mặc trang phục từ Ảnh 1.', '');


    if (referenceImage) {
        promptParts.push(
            '**YÊU CẦU QUAN TRỌNG NHẤT VỀ PHONG CÁCH (ƯU TIÊN TUYỆT ĐỐI):**',
            `Một ảnh tham chiếu phong cách (Ảnh ${referenceImageIndex}) đã được cung cấp.`,
            '1. **PHÂN TÍCH:** Phân tích kỹ lưỡng ảnh tham chiếu này để xác định chính xác phong cách về: **Ánh sáng, Tông màu, Góc chụp, và Bố cục.**',
            '2. **SAO CHÉP PHONG CÁCH:** Áp dụng **CHÍNH XÁC** phong cách đã học được vào ảnh mới. Kết quả cuối cùng phải trông như thể nó được chụp trong cùng một buổi chụp ảnh với ảnh tham chiếu.',
            ''
        );
    } else if (historicalImages && historicalImages.length > 0) {
        promptParts.push(
            '**YÊU CẦU QUAN TRỌNG NHẤT VỀ TÍNH NHẤT QUÁN (ƯU TIÊN TUYỆT ĐỐI):**',
            `Các ảnh từ ${historyStartIndex} trở đi là các kết quả thành công trước đó.`,
            '1. **PHÂN TÍCH:** Phân tích kỹ các ảnh lịch sử này để xác định một phong cách nhất quán về: **1. Ánh sáng** (hướng, độ gắt/mềm, màu sắc), **2. Tông màu** (ấm/lạnh, độ bão hòa, tương phản), **3. Góc chụp và bố cục chung.**',
            '2. **SAO CHÉP PHONG CÁCH:** Áp dụng chính xác phong cách đã học được vào ảnh mới. Kết quả cuối cùng phải trông như thể nó được chụp trong cùng một buổi chụp ảnh với các ảnh lịch sử.',
            ''
        );
    }

    promptParts.push(
        '**YÊU CẦU CỤ THỂ:**',
        '1.  **GIỮ NGUYÊN NGƯỜI MẪU:** Phải giữ lại chính xác 100% khuôn mặt, vóc dáng, màu da, và kiểu tóc của người mẫu trong Ảnh 2. TUYỆT ĐỐI KHÔNG THAY ĐỔI NGƯỜI MẪU.',
        '2.  **MẶC TRANG PHỤC:** Lấy trang phục từ Ảnh 1 và mặc nó lên người mẫu một cách tự nhiên và chân thực. Giữ nguyên màu sắc, họa tiết, và kiểu dáng của trang phục.',
        '3.  **TẠO CẢNH:** Dựa vào các yêu cầu sau để tạo ra bức ảnh cuối cùng:'
    );
    
    let optionsSelected = false;
    if (options.background && options.background !== 'Tự động') {
        promptParts.push(`    *   **Bối cảnh (Background):** ${options.background}.`);
        optionsSelected = true;
    }
    if (options.pose && options.pose !== 'Tự động') {
        promptParts.push(`    *   **Tư thế (Pose):** ${options.pose}.`);
        optionsSelected = true;
    }
    if (options.style && options.style !== 'Tự động') {
        promptParts.push(`    *   **Phong cách ảnh (Photo Style):** ${options.style}.`);
        optionsSelected = true;
    }
    
    if (!optionsSelected && (!historicalImages || historicalImages.length === 0)) {
        promptParts.push('    *   **Toàn quyền sáng tạo:** Hãy tự động chọn bối cảnh, tư thế và phong cách ảnh phù hợp nhất để tạo ra một bức ảnh thời trang ấn tượng, chuyên nghiệp.');
    } else if (!optionsSelected) {
        promptParts.push('    *   **Linh hoạt:** Các tùy chọn không được chỉ định, hãy dựa hoàn toàn vào phong cách đã học từ lịch sử để đưa ra lựa chọn phù hợp nhất.');
    }

     if (options.notes) {
        promptParts.push(`    *   **Ghi chú bổ sung (Ưu tiên cao):** ${options.notes}`);
    }
    
    if (options.enhanceQuality) {
        const enhancementRequests = [];
        const denoiseLevels = ['', 'nhẹ', 'vừa', 'mạnh'];
        const sharpenLevels = ['', 'nhẹ', 'vừa', 'mạnh'];

        if (options.upscaleFactor && options.upscaleFactor !== 'none') {
            enhancementRequests.push(`- **Nâng cấp độ phân giải (Upscale):** Tăng kích thước và độ chi tiết của ảnh lên ${options.upscaleFactor} mà không bị vỡ hạt.`);
        }
        if (options.denoiseLevel > 0) {
            enhancementRequests.push(`- **Khử nhiễu (Denoise):** Loại bỏ các hạt nhiễu ở mức độ **${denoiseLevels[options.denoiseLevel]}** để ảnh trong và mượt hơn.`);
        }
        if (options.sharpenLevel > 0) {
            enhancementRequests.push(`- **Làm nét ảnh (Sharpen):** Tăng cường độ sắc nét cho các đường viền và chi tiết ở mức độ **${sharpenLevels[options.sharpenLevel]}**.`);
        }
        if (options.faceRestoration) {
            enhancementRequests.push('- **Phục hồi khuôn mặt:** Đảm bảo các chi tiết trên khuôn mặt (mắt, mũi, miệng) cực kỳ sắc nét và tự nhiên. Sửa bất kỳ lỗi nào trên khuôn mặt nếu có.');
        }
        if (options.restoreOldPhoto) {
             enhancementRequests.push('- **Phục chế ảnh cũ:** Áp dụng thuật toán chuyên dụng để sửa các vết trầy xước, nếp gấp, và làm rõ các chi tiết bị mờ, mang lại vẻ ngoài mới cho bức ảnh.');
        }

        if (enhancementRequests.length > 0) {
            promptParts.push(
                '',
                '**YÊU CẦU NÂNG CAO CHẤT LƯỢNG (ƯU TIÊN CAO):**',
                'Sau khi hoàn thành các yêu cầu trên, hãy thực hiện các bước sau để nâng cao chất lượng ảnh cuối cùng:',
                ...enhancementRequests
            );
        }
    }

    promptParts.push(
        '',
        'Kết quả cuối cùng phải là một bức ảnh duy nhất, chất lượng cao, trông giống như ảnh chụp thời trang chuyên nghiệp. Chỉ trả về ảnh kết quả.'
    );

    if (options.removeWatermark) {
        promptParts.push('**YÊU CẦU THÊM:** Ảnh kết quả không được chứa bất kỳ watermark, logo hay chữ ký nào.');
    }

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to generate dressed model image with history-aware prompt...");
        // FIX: Explicitly type `allParts` as `object[]` to accommodate both image and text parts.
        const allParts: object[] = [clothingImagePart, modelImagePart];
        if (referenceImagePart) {
            allParts.push(referenceImagePart);
        }
        allParts.push(...historicalImageParts, textPart);

        const response = await callGeminiWithRetry(allParts);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during dressed model image generation:", processedError);
        throw processedError;
    }
}