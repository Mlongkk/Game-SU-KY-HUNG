/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Client-side service calling our backend API instead of importing @google/genai directly
export async function getHistoricalAdvice(prompt: string, context: string): Promise<string> {
  try {
    const response = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.text || "Ta không nhận thấy hồi âm từ dòng thời gian cũ.";
  } catch (error) {
    console.error("AI Advisor client-side error:", error);
    return "Ta xin lỗi, kết nối với dòng chảy thời gian đang bị gián đoạn. Hãy thử lại sau.";
  }
}
