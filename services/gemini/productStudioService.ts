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

interface ProductStudioOptions {
    creativityLevel: string;
    notes?: string;
}

/**
 * Generates a product scene by compositing a product image onto a scene image
 * with a specified level of creative freedom for the AI.
 * @param productImageUrl Data URL of the product image (preferably with transparent background).
 * @param sceneImageUrl Data URL of the background scene.
 * @param options Configuration for creativity level and user notes.
 * @returns A promise that resolves to the generated image's data URL.
 */
export async function generateProductScene(
    productImageUrl: string,
    sceneImageUrl: string,
    options: ProductStudioOptions
): Promise<string> {
    const { mimeType: productMime, data: productData } = parseDataUrl(productImageUrl);
    const { mimeType: sceneMime, data: sceneData } = parseDataUrl(sceneImageUrl);

    const productImagePart = { inlineData: { mimeType: productMime, data: productData } };
    const sceneImagePart = { inlineData: { mimeType: sceneMime, data: sceneData } };
    
    const promptParts = [
        'Bạn là một giám đốc nghệ thuật và nhiếp ảnh gia sản phẩm ảo. Nhiệm vụ của bạn là sử dụng hai hình ảnh được cung cấp để tạo ra một bức ảnh sản phẩm chuyên nghiệp, chất lượng cao.',
        '**Ảnh 1:** Ảnh sản phẩm (chủ thể).',
        '**Ảnh 2:** Ảnh bối cảnh (nền).',
        '',
        '**YÊU CẦU VỀ SỰ SÁNG TẠO (QUAN TRỌNG NHẤT):**',
    ];

    switch (options.creativityLevel) {
        case 'Thay đổi nhẹ':
            promptParts.push(
                `**Mức độ: Thay đổi nhẹ.**`,
                `- Ghép sản phẩm từ Ảnh 1 vào bối cảnh của Ảnh 2 một cách chân thực.`,
                `- **CHO PHÉP** bạn điều chỉnh nhẹ nhàng ánh sáng, tông màu của bối cảnh để sản phẩm hòa hợp hơn. Bạn cũng có thể thêm các chi tiết nhỏ như bóng đổ tinh tế hoặc phản chiếu để tăng tính chân thực.`,
                `- **KHÔNG** thay đổi các yếu tố chính của bối cảnh trong Ảnh 2.`
            );
            break;
        case 'Sáng tạo':
            promptParts.push(
                `**Mức độ: Sáng tạo.**`,
                `- Sử dụng Ảnh 2 (bối cảnh) làm **NGUỒN CẢM HỨNG**. Hãy "tưởng tượng lại" và tạo ra một bối cảnh **HOÀN TOÀN MỚI** nhưng vẫn giữ được chủ đề và không khí chung của Ảnh 2.`,
                `- Bối cảnh mới này phải được thiết kế để làm nổi bật sản phẩm từ Ảnh 1 một cách ấn tượng và nghệ thuật nhất.`,
                `- Sau đó, ghép sản phẩm từ Ảnh 1 vào bối cảnh MỚI mà bạn đã tạo ra một cách chân thực.`
            );
            break;
        case 'Giữ nguyên nền':
        default:
            promptParts.push(
                `**Mức độ: Giữ nguyên nền.**`,
                `- Ghép sản phẩm từ Ảnh 1 vào bối cảnh của Ảnh 2.`,
                `- **YÊU CẦU TUYỆT ĐỐI:** KHÔNG ĐƯỢC thay đổi bất kỳ chi tiết nào của bối cảnh trong Ảnh 2. Giữ nguyên 100%.`,
                `- Nhiệm vụ của bạn là làm cho sản phẩm trông như thể nó được chụp ngay tại địa điểm đó bằng cách khớp chính xác ánh sáng, bóng đổ, phối cảnh và màu sắc.`
            );
            break;
    }

    promptParts.push(
        '',
        '**YÊU CẦU CHUNG:**',
        '1.  **Tính Chân Thực:** Kết quả cuối cùng phải trông giống như một bức ảnh chụp chuyên nghiệp.',
        '2.  **Toàn vẹn Sản phẩm:** Giữ nguyên 100% hình dáng, màu sắc và chi tiết của sản phẩm trong Ảnh 1.',
    );

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung từ người dùng (Ưu tiên cao):** "${options.notes}".`);
    }

    promptParts.push(
        '',
        '**ĐẦU RA:** Chỉ trả về một bức ảnh duy nhất, đã được ghép hoàn chỉnh. Không bao gồm bất kỳ văn bản hay giải thích nào.'
    );

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log(`Attempting to generate product scene with creativity: ${options.creativityLevel}`);
        const response = await callGeminiWithRetry([productImagePart, sceneImagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during product scene generation:", processedError);
        throw processedError;
    }
}