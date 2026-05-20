import { GoogleGenAI } from "@google/genai";

// Support both local Node/AI Studio runtime (process.env.GEMINI_API_KEY) and Vite/Vercel browser runtime (VITE_GEMINI_API_KEY)
const apiKey = (import.meta.env?.VITE_GEMINI_API_KEY) || 
               (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") || 
               "";

const ai = new GoogleGenAI({ apiKey });

export async function getHistoricalAdvice(prompt: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một "Cố vấn Lịch sử" thông thái. 
        NHIỆM VỤ: Giải đáp thắc mắc về lịch sử Việt Nam.
        YÊU CẦU:
        - Trả lời NGẮN GỌN, súc tích (tối đa 2-3 câu).
        - Ngôn ngữ DỄ HIỂU, hiện đại, tránh rườm rà.
        - Trực tiếp vào trọng tâm câu hỏi.

        Ngữ cảnh hiện tại: ${context}
        Câu hỏi: ${prompt}`,
      config: {
        systemInstruction: `Trả lời bằng tiếng Việt. Giọng văn hào hùng nhưng cực kỳ tối giản và dễ hiểu. 
        Nếu câu hỏi liên quan đến giải đố, chỉ gợi ý hướng tư duy, KHÔNG bao giờ đưa ra đáp án trực tiếp. 
        Ưu tiên sự súc tích và khơi gợi tò mò.`,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("AI Advisor error:", error);
    return "Ta xin lỗi, kết nối với dòng chảy thời gian đang bị gián đoạn. Hãy thử lại sau.";
  }
}
