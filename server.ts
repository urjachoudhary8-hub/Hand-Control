import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, GenerateVideosOperation } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous threshold for base64 uploads (like images)
app.use(express.json({ limit: '15mb' }));

// Helper to safely get the Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not defined or is a placeholder.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// ==========================================
// 1. AI ASSISTANT / CHAT ENDPOINT WITH FUNCTION CALLING
// ==========================================
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message parameter is required.' });
    }

    const ai = getGeminiClient();

    // Define tools for the OS actions (Holographic desktop integrations)
    const openAppDeclaration = {
      name: 'open_app',
      description: 'Launches or switches to a desktop application within Hand OS.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          appId: {
            type: Type.STRING,
            description: "The ID of the application: 'guide' (Academy), 'airpaint' (Canvas), 'game' (Celestial Shield), 'media' (Music player), 'keyboard' (Notepad), 'settings' (Control Panel), 'calibration' (Aero settings), 'faceread' (Face Scanner), or 'aiworkspace' (AI Suite)."
          }
        },
        required: ['appId']
      }
    };

    const changeThemeDeclaration = {
      name: 'change_theme',
      description: 'Updates the desktop wallpaper cosmetic environment theme.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          theme: {
            type: Type.STRING,
            description: "The cosmetic theme name: 'slate', 'cyberpunk', 'warm-oak', 'polar'."
          }
        },
        required: ['theme']
      }
    };

    const changeVolumeDeclaration = {
      name: 'change_volume',
      description: 'Modifies the master hardware volume setting on the OS.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          volume: {
            type: Type.INTEGER,
            description: 'Master volume level inside scale [0, 100].'
          }
        },
        required: ['volume']
      }
    };

    const typeNotesDeclaration = {
      name: 'type_notes',
      description: 'Appends or inserts typing notes text content directly to the Gesture Notepad.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'The narrative text content or code to type into the Notepad.'
          }
        },
        required: ['text']
      }
    };

    const speakPhraseDeclaration = {
      name: 'speak_phrase',
      description: 'Triggers the holographic text-to-speech speaker to say a custom phrase.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          phrase: {
            type: Type.STRING,
            description: 'Sentence text to read out loud to the user.'
          }
        },
        required: ['phrase']
      }
    };

    // Construct appropriate context and history if available
    const systemInstruction = 
      "You are the Aero AI Assistant, a fully integrated advanced AI companion embedded in the gesture-controlled virtual operating system `Hand OS` (HC-OS).\n" +
      "You are witty, futuristic, helpful, and highly adaptive. When the user asks you to do something that relates to desktop controls, you MUST invoke the appropriate tool/function call.\n" +
      "You can combine multiple tasks. For example, if asked to open Air Paint and make the volume 80%, suggest BOTH function calls.\n" +
      "Always output matching textual comments welcoming the action or explaining your answers clearly.";

    // Convert traditional chats history array if provided
    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    // Add current user turn
    const contents = [...formattedHistory, { role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              openAppDeclaration,
              changeThemeDeclaration,
              changeVolumeDeclaration,
              typeNotesDeclaration,
              speakPhraseDeclaration
            ]
          }
        ]
      }
    });

    const text = response.text || "Command processed successfully.";
    const functionCalls = response.functionCalls || [];

    res.json({
      text,
      actions: functionCalls.map(fc => ({
        name: fc.name,
        args: fc.args
      }))
    });

  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete chat generation' });
  }
});


// ==========================================
// 2. IMAGE GENERATION / WALLPAPER ENDPOINT
// ==========================================
app.post('/api/ai/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for generating design images.' });
    }

    const ai = getGeminiClient();

    // Use gemini-2.5-flash-image for standard rapid generation tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio
        }
      }
    });

    // Extract inline image bytes as base64 encoded png
    let base64Image = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error('Model succeeded but returned no image payload parts.');
    }

    res.json({
      imageUrl: `data:image/png;base64,${base64Image}`
    });

  } catch (err: any) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate visual render' });
  }
});


// ==========================================
// 3. TEXT TO SPEECH (TTS) ENDPOINT
// ==========================================
app.post('/api/ai/generate-speech', async (req, res) => {
  try {
    const { text, voice = 'Zephyr' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Speech conversion text is required.' });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice } // 'Kore', 'Zephyr', 'Fenrir'
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('TTS engine did not return any audio chunk payload.');
    }

    res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`
    });

  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'Failed to synthethize spoken lines' });
  }
});


// ==========================================
// 4. VIDEO GENERATION (3-STEP PATTERN)
// ==========================================
app.post('/api/ai/generate-video', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required to generate videoloops.' });
    }

    const ai = getGeminiClient();

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio
      }
    });

    res.json({ operationName: operation.name });

  } catch (err: any) {
    console.error('Video launch error:', err);
    res.status(500).json({ error: err.message || 'Failed to launch cinematic video generation' });
  }
});

app.post('/api/ai/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'OperationName is required.' });
    }

    const ai = getGeminiClient();

    const op = new GenerateVideosOperation();
    op.name = operationName;
    
    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({ done: updated.done });

  } catch (err: any) {
    console.error('Video poll error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch operation state' });
  }
});

app.post('/api/ai/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'OperationName is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }

    const ai = getGeminiClient();

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Completed video URI not found inside operation schema' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch raw media from video stream server: ${videoRes.statusText}`);
    }

    res.setHeader('Content-Type', 'video/mp4');
    
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();

  } catch (err: any) {
    console.error('Video download error:', err);
    res.status(500).json({ error: err.message || 'Failed to download raw rendering video' });
  }
});


// ==========================================
// 5. SERVER RUNTIME & VITE MIDDLEWARE
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hand OS Server] Core dynamic runtime booted and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
