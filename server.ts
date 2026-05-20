import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Backend endpoint proxying history advice requests to Gemini API
  app.post("/api/advisor", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Check if API key is provided
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not defined. Returning helpful offline hint.");
        return res.json({ 
          text: "Ta xin lỗi, cố vấn đang offline do thiếu API key trong phần Settings. Em hãy thử suy nghĩ từ manh mối có sẵn nhé!" 
        });
      }

      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Bạn là một "Cố vấn Lịch sử" thông thái. 
          NHIỆM VỤ: Giải đáp thắc mắc về lịch sử Việt Nam.
          YÊU CẦU:
          - Trả lời NGẮN GỌN, súc tích (tối đa 2-3 câu).
          - Ngôn ngữ DỄ HIỂU, hiện đại, tránh rườm rà.
          - Trực tiếp vào trọng tâm câu hỏi.

          Ngữ cảnh hiện tại: ${context || ""}
          Câu hỏi: ${prompt}`,
        config: {
          systemInstruction: `Trả lời bằng tiếng Việt. Giọng văn hào hùng nhưng cực kỳ tối giản và dễ hiểu. 
          Nếu câu hỏi liên quan đến giải đố, chỉ gợi ý hướng tư duy, KHÔNG bao giờ đưa ra đáp án trực tiếp. 
          Ưu tiên sự súc tích và khơi gợi tò mò.`,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Advisor backend error:", error);
      res.status(500).json({ 
        error: "Internal server error", 
        message: "Ta xin lỗi, kết nối với dòng chảy thời gian đang bị gián đoạn. Hãy thử lại sau." 
      });
    }
  });

  // Integrate Vite dynamically based on build mode
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Serve SPA index.html on wildcard unmatched paths (compatible with Express v4)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
