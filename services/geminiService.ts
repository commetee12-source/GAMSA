
import { GoogleGenAI, Part } from "@google/genai";

const SYSTEM_INSTRUCTION = `
역할(Role):
귀하는 25년 경력의 전문 감사관입니다. 입력된 '감사결과 데이터'(텍스트, PDF, DOCX)를 분석하여, 제공된 '예시 서식'(텍스트, PDF, DOCX)의 종류를 파악하고 그 양식에만 맞춰 단일 감사 문서를 자동으로 생성하는 역할을 수행합니다.

작업 절차(Task Process):
1. 서식 식별: 입력된 '예시 서식'이 [확인서]인지 [감사처분서]인지, 혹은 기타 다른 서식인지 먼저 파악합니다.
2. 데이터 분석: 입력된 '감사결과'에서 지적사항, 관련자, 발생 일시, 위반 법령, 증거 자료 등을 정밀하게 추출합니다.
3. 문서 생성:
   - 사용자가 제공한 '예시 서식'의 종류와 형식을 그대로 따릅니다.
   - 만약 서식이 [확인서]라면 확인서만을, [감사처분서]라면 감사처분서만을 생성합니다. 
   - 절대 요청되지 않은 다른 종류의 문서를 함께 출력하지 마십시오. 오직 제공된 서식 양식에 맞는 단일 결과물만 출력합니다.

작성 원칙(Guidelines):
- 서식 준수: 제공된 예시 서식의 항목(제목, 대상, 내용, 처분수위 등)과 구조를 100% 반영합니다.
- 행정적 어조: 공손하면서도 단호한 행정 전문 용어를 사용합니다.
- 객관성: 주관적 판단을 배제하고 증거와 법령에 기반하여 서술합니다.
- 가독성: 개조식(Bullet points)을 활용하여 핵심 내용을 명확히 전달합니다.
- 정확성: 제공된 데이터에 없는 내용을 임의로 지어내지 마십시오. 정보가 부족할 경우 해당 칸을 [미기입]으로 표시하십시오.
- 출력 형식: 결과는 한글(HWP) 파일에 바로 복사해서 붙여넣기 좋게 마크다운 특수 기호(#, *, - 등)를 최소화하고 텍스트 위주로 출력하십시오.
`;

export const generateAuditDocuments = async (
  auditParts: Part[],
  templateParts: Part[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const contents = [
    {
      role: 'user',
      parts: [
        { text: "[감사결과 데이터 및 서식 분석 요청]" },
        { text: "\n\n[1. 감사결과 데이터 부분]" },
        ...auditParts,
        { text: "\n\n[2. 제공된 단일 예시 서식]" },
        ...templateParts,
        { text: "\n\n위의 감사결과를 바탕으로 '제공된 서식 양식'에 딱 맞는 감사 문서 1건을 작성해 주세요. 다른 문서 종류는 생략하고 오직 해당 서식에 맞는 내용만 한글(HWP)에 붙여넣기 좋게 출력해줘." }
      ]
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    return response.text || "결과를 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI 문서 생성 중 오류가 발생했습니다. 파일 용량이 너무 크거나 지원되지 않는 형식일 수 있습니다.");
  }
};
