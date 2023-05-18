import { ChatCompletionType, StreamResponseType } from './index';
import { ChatRoleEnum } from '@/constants/chat';
import axios from 'axios';
import mongoose from 'mongoose';
import { NEW_CHATID_HEADER } from '@/constants/chat';

/* 模型对话 */
export const claudChat = async ({ apiKey, messages, stream, chatId, res }: ChatCompletionType) => {
  const conversationId = chatId || String(new mongoose.Types.ObjectId());
  // create a new chat
  !chatId &&
    messages.filter((item) => item.obj === 'Human').length === 1 &&
    res?.setHeader(NEW_CHATID_HEADER, conversationId);

  // get system prompt
  const systemPrompt = messages
    .filter((item) => item.obj === 'System')
    .map((item) => item.value)
    .join('\n');
  const systemPromptText = systemPrompt ? `你本次知识:${systemPrompt}\n下面是我的问题:` : '';

  const prompt = `${systemPromptText}'${messages[messages.length - 1].value}'`;

  const response = await axios.post(
    process.env.CLAUDE_BASE_URL || '',
    {
      prompt,
      stream,
      conversationId
    },
    {
      headers: {
        Authorization: apiKey
      },
      timeout: stream ? 60000 : 240000,
      responseType: stream ? 'stream' : 'json'
    }
  );

  const responseText = stream ? '' : response.data?.text || '';

  return {
    streamResponse: response,
    responseMessages: messages.concat({ obj: ChatRoleEnum.AI, value: responseText }),
    responseText,
    totalTokens: 0
  };
};

/* openai stream response */
export const claudStreamResponse = async ({ res, chatResponse, prompts }: StreamResponseType) => {
  try {
    let responseContent = '';

    try {
      const decoder = new TextDecoder();
      for await (const chunk of chatResponse.data as any) {
        if (!res.writable) {
          // 流被中断了，直接忽略后面的内容
          break;
        }
        const content = decoder.decode(chunk);
        responseContent += content;
        content && res.write(content);
      }
    } catch (error) {
      console.log('pipe error', error);
    }

    const finishMessages = prompts.concat({
      obj: ChatRoleEnum.AI,
      value: responseContent
    });

    return {
      responseContent,
      totalTokens: 0,
      finishMessages
    };
  } catch (error) {
    return Promise.reject(error);
  }
};
