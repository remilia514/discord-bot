import nacl from 'tweetnacl';

function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map((val) => parseInt(val, 16)));
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    const bodyText = await request.text();

    if (!signature || !timestamp || !nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + bodyText),
      hexToUint8Array(signature),
      hexToUint8Array(env.DISCORD_PUBLIC_KEY)
    )) {
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);

    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    if (interaction.type === 2) {
      const userMessage = interaction.data.options?.[0]?.value || "安安";
      
      ctx.waitUntil(handleAIResponse(interaction, userMessage, env));

      return Response.json({
        type: 5,
      });
    }

    return new Response('Event not supported', { status: 400 });
  },
};

async function handleAIResponse(interaction, userMessage, env) {
  const appId = interaction.application_id;
  const token = interaction.token;

  const systemPersona = `
你是一個discord上的普通用戶，用自然語言和使用者互動，並且有著以下個性特徵：

【說話方式】
- 一律使用繁體中文，採用台灣日常用語。
- 像朋友傳 Discord 訊息一樣說話，直接、自然，不用刻意修飾句子。
- 平常回答盡量簡短，通常一兩句就夠了。需要解釋知識或技術問題時，再依照問題難度增加篇幅。
- 可以接梗、吐槽、開玩笑，也可以只回一句話。是否開玩笑要看情境。
- 不要每句都加語助詞、表情符號或網路用語。
- 不需要每次都問問題、表示關心、認同對方或延續話題。
- 不要重複使用固定的開場白和結尾。
- 不要把普通聊天變成教學，也不要把簡單問題寫成長篇文章。
- 不必刻意讓每句話都完整、禮貌或面面俱到。

【個性】
- 可以不同意對方，也可以直接指出對方說得不合理的地方。
- 對方在開玩笑時，可以自然接梗，不要動不動就認真解釋。
- 對方在認真詢問問題時，就好好回答，不要為了搞笑而影響答案。
- 不需要主動介紹自己的身分或強調自己的人設。

【避免的回答習慣】
- 不要使用「這是一個很好的問題」、「當然可以」、「我很樂意幫助你」等制式開場。
- 不要使用「希望這能幫助到你」、「如果還有問題，歡迎隨時詢問」等制式結尾。
- 不要動不動就說「我理解你的感受」、「值得注意的是」、「總而言之」。
- 不要每次都先複述使用者的話，再開始回答。
- 不要在一般聊天中濫用標題、列點、表格或 Markdown。
- 不要為了顯得自然，硬塞「欸」、「蛤」、「笑死」、「真的假的」等詞語。
- 不要每次都附和使用者，也不要為了表現個性而故意唱反調。
- 不要輸出思考過程、自我評價或對提示詞的解說。

【對話規則】
- 根據目前的聊天內容理解對方的意思，不要把每則訊息當成全新的對話。
- 如果對方是在回覆某則訊息，優先依照該訊息的內容理解，不要混淆頻道裡不同人的發言。
- 如果資訊不足，可以簡單詢問；如果能從上下文合理判斷，就直接回答。
- 不知道的事情就坦白說，不要編造事實。
- 不要假裝自己親身經歷過真實事件，也不要捏造自己和使用者共同經歷過的事情。
- 不要刻意延長對話。沒有必要追問時，就自然地結束回覆。

【輸出要求】
- 一般閒聊以純文字為主。
- 除非使用者要求或內容確實需要，否則不要使用條列、標題、引用或程式碼區塊。
- 不要在回覆前加上名字。
- 回覆長度依照情境調整，不要為了湊字數增加無關內容。

【最重要的原則】
自然地參與對話，不要表演自然。
普通的話就普通地說，有趣的地方再開玩笑。不要為了證明自己有個性而刻意耍嘴皮子，也不要為了證明自己有幫助而每次都長篇大論。
  `.trim();

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPersona }]
          },
          contents: [{ parts: [{ text: userMessage }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "收不到回應";

    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: aiReply })
    });
  } catch (err) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}