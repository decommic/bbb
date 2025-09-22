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

interface ReplaceProductOptions {
    layout: string;
    photoStyle: string;
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
}

/**
 * Intelligently places a product into a scene.
 * @param productImageUrl Data URL for the product's image.
 * @param sceneImageUrl Data URL for the scene's image.
 * @param options User-selected options for layout, style, and notes.
 * @returns A promise that resolves to the generated image's data URL.
 */
export async function replaceProductInScene(
    productImageUrl: string, 
    sceneImageUrl: string, 
    options: ReplaceProductOptions
): Promise<string> {
    const sceneToProcess = await padImageToAspectRatio(sceneImageUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType: productMime, data: productData } = parseDataUrl(productImageUrl);
    const { mimeType: sceneMime, data: sceneData } = parseDataUrl(sceneToProcess);

    const productImagePart = { inlineData: { mimeType: productMime, data: productData } };
    const sceneImagePart = { inlineData: { mimeType: sceneMime, data: sceneData } };

    const promptParts = [
        'Bạn là một chuyên gia xử lý ảnh và nghệ sĩ ghép ảnh kỹ thuật số. Nhiệm vụ của bạn là thực hiện một quy trình 3 bước phức tạp để tạo ra một bức ảnh sản phẩm chân thực:',
        '**Ảnh 1:** Ảnh gốc chứa sản phẩm cần lấy.',
        '**Ảnh 2:** Ảnh bối cảnh để đặt sản phẩm vào.',
        '',
        '**QUY TRÌNH 3 BƯỚC (BẮT BUỘC):**',
        '1.  **Phân tích & Tách nền (Ảnh 1):** Tự động nhận diện chủ thể chính trong Ảnh 1. Tách nền một cách hoàn hảo để chỉ giữ lại sản phẩm.',
        '2.  **Phân tích & Dọn dẹp (Ảnh 2):** Kiểm tra Ảnh 2. Nếu có một sản phẩm nổi bật khác trong đó, hãy **XÓA** nó đi và tái tạo lại phần nền bị che một cách liền mạch. Nếu không có sản phẩm nào, hãy giữ nguyên bối cảnh.',
        '3.  **Ghép ảnh thông minh:** Đặt sản phẩm đã được tách nền từ bước 1 vào bối cảnh đã được dọn dẹp từ bước 2.',
        '',
        '**HƯỚNG DẪN BỔ SUNG ĐỂ TINH CHỈNH KẾT QUẢ:**'
    ];
    
    // Handle Layout
    if (options.layout && options.layout !== 'Tự động') {
        promptParts.push(`- **Bố cục (Layout):** Sản phẩm phải được đặt vào bối cảnh theo kiểu "${options.layout}". Ví dụ, nếu là "Trải sàn", hãy đặt nó phẳng trên một bề mặt phù hợp trong bối cảnh. Nếu là "Treo trên móc", hãy tìm một vị trí hợp lý để treo nó lên.`);
    }

    // Handle Photo & Scene Style
    switch(options.photoStyle) {
        case 'Giống 100% ảnh bối cảnh':
            promptParts.push('- **Phong cách Bối cảnh:** GIỮ NGUYÊN 100% ảnh bối cảnh gốc (Ảnh 2). Chỉ ghép sản phẩm vào một cách chân thực nhất có thể bằng cách khớp chính xác ánh sáng, bóng đổ, và phối cảnh.');
            break;
        case 'Hòa trộn (giống 80%)':
            promptParts.push('- **Phong cách Bối cảnh:** GIỮ NGUYÊN bối cảnh gốc, nhưng cho phép điều chỉnh nhẹ nhàng ánh sáng và màu sắc của toàn bộ ảnh để sản phẩm và bối cảnh hòa hợp một cách hoàn hảo, liền mạch.');
            break;
        case 'Sáng tạo (Tự động chỉnh)':
            promptParts.push('- **Phong cách Bối cảnh:** Sử dụng ảnh bối cảnh gốc làm nguồn CẢM HỨNG để tạo ra một bối cảnh MỚI, phù hợp và làm nổi bật sản phẩm nhất có thể. Bối cảnh mới phải giữ được không khí và chủ đề chung của ảnh gốc.');
            break;
        default: // 'Tự động'
            promptParts.push('- **Phong cách Bối cảnh (Tự động):** AI tự quyết định mức độ thay đổi bối cảnh để có kết quả chân thực và hài hòa nhất.');
            break;
    }

    if (options.notes) {
        promptParts.push(`- **Ghi chú (Ưu tiên cao):** ${options.notes}`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('**YÊU CẦU THÊM:** Ảnh kết quả không được chứa bất kỳ watermark, logo hay chữ ký nào.');
    }

    promptParts.push('', '**ĐẦU RA:** Chỉ trả về một bức ảnh duy nhất đã hoàn thành. Không trả về các bước trung gian hoặc văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to replace product in scene with smart prompt...");
        const response = await callGeminiWithRetry([productImagePart, sceneImagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during product replacement:", processedError);
        throw processedError;
    }
}