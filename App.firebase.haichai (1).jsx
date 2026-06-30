import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
// --- FIREBASE CONFIG ---
// Firebase apiKey trong config client KHÔNG phải secret. Gemini API key mới là secret, nên app chỉ lưu Gemini key trong localStorage của máy người dùng.
const firebaseConfig = {
  apiKey: 'AIzaSyCYmWWdxzs6U0Q-N9Eqa-fM6fEP9DYiGwY',
  authDomain: 'haichai-script-studio.firebaseapp.com',
  projectId: 'haichai-script-studio',
  storageBucket: 'haichai-script-studio.firebasestorage.app',
  messagingSenderId: '409195333074',
  appId: '1:409195333074:web:05b167ddd5da157899b40b',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const ALLOWED_EMAIL_DOMAINS = ['haichai.vn', 'starspits.vn'];

const getEmailDomain = (email = '') => email.toLowerCase().split('@').pop() || '';

const isAllowedCompanyEmail = (email = '') =>
  ALLOWED_EMAIL_DOMAINS.includes(getEmailDomain(email));

const getAppDataRef = () =>
  doc(db, 'workspaces', 'haichai-script-studio');


// --- TYPES & INTERFACES (Conceptual) ---
// Script: { id, title, category, topic, angle, mainMessage, hookOptions, selectedHook, selectedHookReason, duration, scenes, ending, caption, textOnScreen, hashtags, notes, status, duplicateRiskScore, createdAt, updatedAt }
// Topic: { id, category, topicName, angle, hookType, suggestedHook, mainMessage, whyItCanWork, avoidRepeating, duplicateRiskScore, selected }

// --- ICONS (Inline SVGs for standalone compatibility) ---
const IconLibrary = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconFileText = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
const IconBook = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconPrinter = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- CONSTANTS & MOCK DATA ---
const DEFAULT_CONTENT_BIBLE = `[HAICHAI CONTENT BIBLE
Bộ quy chuẩn nội dung cho TikTok nhân hiệu & kênh thương hiệu
1. Vai trò của bộ tài liệu này...
(Vui lòng dán toàn bộ Content Bible thật vào đây khi sử dụng)]`;

const INITIAL_SCRIPTS = [
  {
    id: 's1', title: 'Cửa hàng đẹp chưa chắc bán tốt', category: 'Sai lầm / bài học người chủ', topic: 'Mặt bằng', angle: 'Quan điểm ngược về chọn mặt bằng', mainMessage: 'Vị trí phù hợp quy trình quan trọng hơn vẻ hào nhoáng.',
    hookOptions: ['Cửa hàng đẹp chưa chắc đã bán tốt.', 'Tôi từng vứt đi 200 triệu tiền cọc mặt bằng chỉ vì thấy nó quá đẹp.', 'Đi xem mặt bằng, tôi không nhìn chỗ đông người đầu tiên.', 'Mặt bằng đẹp là cái bẫy lớn nhất khi mở chuỗi.', 'Thử chọn một góc ngã tư sầm uất, bạn sẽ khóc khi làm kho.'],
    selectedHook: 'Cửa hàng đẹp chưa chắc đã bán tốt. Sau vài lần đi xem mặt bằng cho Haichai, tôi mới nhận ra có một thứ quan trọng hơn vị trí.',
    selectedHookReason: 'Đánh trúng tâm lý thích mặt bằng đẹp, có mâu thuẫn nhẹ và hứa hẹn bài học thật.',
    duration: '60s',
    scenes: [
      { name: 'Cảnh 1: Đang đứng trước một mặt bằng đang sửa', content: 'Nhiều người nghĩ mở chuỗi thì cứ tìm ngã tư, mặt tiền rộng là thắng. Tôi cũng từng nghĩ thế.', visualSuggestion: 'Cầm bản vẽ, chỉ tay vào không gian' },
      { name: 'Cảnh 2: Đi vào khu vực kho hẹp', content: 'Nhưng ra làm thật mới thấy, cửa hàng đẹp mà không có chỗ làm kho, không có đường cho xe tải nhỏ vào giao hàng thì vận hành cực kỳ khổ.', visualSuggestion: 'Quay góc hẹp, vẻ mặt nhăn nhó' },
      { name: 'Cảnh 3: Đứng ở quầy thu ngân', content: 'Với ngành này, mặt bằng phù hợp với quy trình kiểm soát quan trọng hơn một cái mặt tiền hào nhoáng.', visualSuggestion: 'Gõ tay lên bàn, nói dứt khoát' }
    ],
    ending: 'Mở rộng không khó bằng giữ tiêu chuẩn khi mở rộng. Bắt đầu từ cái mặt bằng.',
    caption: 'Bài học xương máu khi đi tìm nhà cho Haichai. #haichai #kinhdoanh #mochuoi', textOnScreen: 'Cửa hàng đẹp chưa chắc đã bán tốt', hashtags: '#haichai, #kinhdoanh', notes: '', status: 'approved', duplicateRiskScore: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
];

const CATEGORIES = [
  "Góc khuất / quan điểm ngược",
  "Sai lầm / bài học người chủ",
  "Hậu trường thật",
  "Sản phẩm / niềm tin / giấy tờ"
];

const EMPTY_MANUAL_SCRIPT = {
  title: '',
  category: CATEGORIES[0],
  topic: '',
  mainMessage: '',
  selectedHook: '',
  selectedHookReason: 'Thêm thủ công',
  scenes: [{ name: 'Cảnh 1', content: '', visualSuggestion: '' }],
  ending: '',
  textOnScreen: '',
  caption: '',
  notes: ''
};

// --- REAL AI FUNCTIONS (GEMINI API) ---
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const GEMINI_TIMEOUT_MS = 30000;

const emitGeminiStatus = (message) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('haichai-gemini-status', { detail: message }));
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = GEMINI_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Gemini không phản hồi sau ${Math.round(timeoutMs / 1000)} giây. Hãy bấm “Test Gemini Key” ở Cài đặt & Dữ liệu để kiểm tra key/model trước.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeGeminiError = (status, message) => {
  if (status === 400) return `Gemini báo request chưa hợp lệ (${status}): ${message || 'Kiểm tra model/schema/prompt.'}`;
  if (status === 401 || status === 403) return `Gemini API Key sai hoặc chưa được cấp quyền (${status}). Hãy kiểm tra lại key ở Cài đặt & Dữ liệu.`;
  if (status === 404) return `Model Gemini không tồn tại hoặc key chưa có quyền dùng model này (${status}).`;
  if (status === 429) return 'Gemini đang bị rate limit. Đợi 30–60 giây rồi thử lại.';
  return message || `Lỗi Google Gemini (${status})`;
};

const shouldTryNextModel = (status, message = '') => {
  const m = String(message).toLowerCase();
  return status === 404 || (status === 400 && (m.includes('model') || m.includes('not found')));
};

const extractJsonFromText = (text) => {
  if (!text) throw new Error('AI trả về dữ liệu rỗng. Có thể prompt quá dài hoặc response bị chặn.');

  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
};

// --- REAL AI FUNCTIONS (GEMINI API) ---
const callGeminiWithRetry = async (systemPrompt, userPrompt, schema, retries = 1) => {
  const apiKey =
    typeof window !== 'undefined'
      ? (localStorage.getItem('gemini_api_key') || '').trim()
      : '';

  if (!apiKey) {
    throw new Error('Bạn chưa nhập Gemini API Key. Vào “Cài đặt & Dữ liệu” để nhập key trước.');
  }

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  };

  let lastError;

  for (const model of GEMINI_MODELS) {
    for (let i = 0; i < retries; i++) {
      try {
        emitGeminiStatus(`Đang gọi Gemini: ${model}${retries > 1 ? ` (${i + 1}/${retries})` : ''}...`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const rawMessage = errData?.error?.message || '';
          const err = new Error(normalizeGeminiError(response.status, rawMessage));
          err.status = response.status;
          err.rawMessage = rawMessage;
          throw err;
        }

        const result = await response.json();
        emitGeminiStatus('Gemini đã phản hồi, đang đọc JSON...');
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        return extractJsonFromText(responseText);
      } catch (error) {
        lastError = error;
        console.error(`Gemini ${model} failed:`, error);

        if ([401, 403].includes(error.status)) throw error;

        if (shouldTryNextModel(error.status, error.rawMessage || error.message)) break;

        // Không retry quá lâu để tránh treo màn hình “Đang tạo”.
        if (!error.status || error.status === 400) throw error;

        if (i === retries - 1) break;
        await new Promise(res => setTimeout(res, 1500));
      }
    }
  }

  throw lastError || new Error('Không gọi được Google Gemini.');
};

const generateTopicsFromAI = async (bible, currentScripts) => {
  const systemPrompt = `Bạn là Content Strategist cho kênh TikTok nhân hiệu Haichai.
Dựa trên Content Bible và kết quả scan thư viện kịch bản cũ, hãy tạo ra CHÍNH XÁC 30 chủ đề mới theo đúng tỉ lệ sau:
- 14 chủ đề: Góc khuất / quan điểm ngược
- 7 chủ đề: Sai lầm / bài học người chủ
- 6 chủ đề: Hậu trường thật
- 3 chủ đề: Sản phẩm / niềm tin / giấy tờ

TUYỆT ĐỐI QUAN TRỌNG: Bạn BẮT BUỘC phải tạo ra một mảng chứa ĐÚNG 30 chủ đề. Không được lười biếng làm ít hơn.

Yêu cầu:
- Không trùng với các chủ đề đã có trong thư viện.
- Không biến nội dung thành quảng cáo rượu, không cổ vũ uống rượu.
- Ưu tiên hook: một con số, quan điểm ngược, gây tò mò, khơi gợi nỗi đau, trích lời nói thật.
- duplicateRiskScore là điểm đánh giá từ 0-100 về khả năng trùng lặp ý tưởng với thư viện cũ (càng cao càng dễ trùng).`;

  const userPrompt = `Content Bible:\n${bible}\n\nThư viện kịch bản cũ (Tránh trùng lặp):\n${JSON.stringify(currentScripts.map(s => s.topic))}\n\nHãy tạo ĐẦY ĐỦ 30 chủ đề ngay bây giờ. BẮT BUỘC PHẢI CÓ ĐỦ 30 ITEMS TRONG JSON.`;

  const schema = {
    type: "OBJECT",
    properties: {
      topics: {
        type: "ARRAY",
        description: "Mảng này BẮT BUỘC phải chứa ĐÚNG 30 object chủ đề.",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            topicName: { type: "STRING" },
            angle: { type: "STRING" },
            hookType: { type: "STRING" },
            suggestedHook: { type: "STRING" },
            mainMessage: { type: "STRING" },
            whyItCanWork: { type: "STRING" },
            avoidRepeating: { type: "STRING" },
            duplicateRiskScore: { type: "INTEGER" }
          },
          required: ["category", "topicName", "angle", "hookType", "suggestedHook", "mainMessage", "whyItCanWork", "avoidRepeating", "duplicateRiskScore"]
        }
      }
    },
    required: ["topics"]
  };

  try {
    const result = await callGeminiWithRetry(systemPrompt, userPrompt, schema);
    const rawTopics = result.topics || [];
    return rawTopics.map((t, index) => ({
      id: `top_${Date.now()}_${index}`,
      ...t,
      selected: false
    }));
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [];
  }
};

const generateScriptsBatchFromAI = async (topics, bible, currentScripts) => {
  const systemPrompt = `Bạn là Script Writer kiêm Content Editor cho kênh TikTok nhân hiệu Haichai.
Nhiệm vụ của bạn là viết kịch bản chi tiết cho CÁC chủ đề được cung cấp. Bắt buộc bám Content Bible và kết quả scan thư viện để tránh trùng lặp.

Yêu cầu CHUNG cho mỗi kịch bản:
- Viết kịch bản TikTok 60–75 giây.
- Giọng thật, tỉnh, có trải nghiệm, không quảng cáo, không kêu gọi mua hàng, không cổ vũ uống rượu.
- Mỗi video chỉ có một thông điệp chính.
- Tạo 5 phương án hook, chọn 1 hook tốt nhất và giải thích.
- duplicateRiskScore là mức độ rủi ro trùng lặp với thư viện cũ (0-100).

TUYỆT ĐỐI QUAN TRỌNG: Đầu vào có bao nhiêu chủ đề, bạn PHẢI trả về mảng 'scripts' chứa đúng bấy nhiêu kịch bản.`;

  const userPrompt = `Content Bible:\n${bible}\n\nThư viện cũ:\n${JSON.stringify(currentScripts.map(s => ({title: s.title, topic: s.topic})))}\n\nDANH SÁCH CHỦ ĐỀ CẦN VIẾT (${topics.length} chủ đề):\n${JSON.stringify(topics)}\n\nHãy viết kịch bản cho TẤT CẢ các chủ đề trên.`;

  const schema = {
    type: "OBJECT",
    properties: {
      scripts: {
        type: "ARRAY",
        description: `Mảng này BẮT BUỘC phải chứa đúng ${topics.length} kịch bản tương ứng với đầu vào.`,
        items: {
          type: "OBJECT",
          properties: {
            topicId: { type: "STRING", description: "Mã ID của chủ đề tương ứng ở đầu vào" },
            title: { type: "STRING" },
            mainMessage: { type: "STRING" },
            hookOptions: { type: "ARRAY", items: { type: "STRING" } },
            selectedHook: { type: "STRING" },
            selectedHookReason: { type: "STRING" },
            duration: { type: "STRING" },
            scenes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  content: { type: "STRING" },
                  visualSuggestion: { type: "STRING" }
                }
              }
            },
            ending: { type: "STRING" },
            caption: { type: "STRING" },
            textOnScreen: { type: "STRING" },
            hashtags: { type: "STRING" },
            notes: { type: "STRING" },
            duplicateRiskScore: { type: "INTEGER" }
          }
        }
      }
    },
    required: ["scripts"]
  };

  try {
    const result = await callGeminiWithRetry(systemPrompt, userPrompt, schema);
    const generatedScripts = result.scripts || [];
    
    // Map dữ liệu AI trả về với Topic ban đầu
    return generatedScripts.map(rawScript => {
      const originalTopic = topics.find(t => t.id === rawScript.topicId) || topics[0];
      return {
        id: `scr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: originalTopic.category,
        topic: originalTopic.topicName,
        angle: originalTopic.angle,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...rawScript
      };
    });
  } catch (error) {
    console.error("AI Batch Generation Error:", error);
    return [];
  }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('library');
  const [bible, setBible] = useState(DEFAULT_CONTENT_BIBLE);
  const [scripts, setScripts] = useState([]);
  const [viewingScript, setViewingScript] = useState(null);
  
  // Library State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  // Topic Gen State
  const [generatedTopics, setGeneratedTopics] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  
  // Script Gen State
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
  const [draftScripts, setDraftScripts] = useState([]);
  const [generationStatus, setGenerationStatus] = useState("");

  // Manual Add State
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualScript, setManualScript] = useState(EMPTY_MANUAL_SCRIPT);

  // Custom Modal UI State
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Firebase Auth + Firestore Sync State
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Chưa đăng nhập Firebase');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const latestDataRef = useRef({ bible: DEFAULT_CONTENT_BIBLE, scripts: [], draftScripts: [], generatedTopics: [] });
  const syncingFromCloudRef = useRef(false);

  // Gemini key chỉ lưu ở máy người dùng, không đẩy lên Firestore.
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeyStatus, setGeminiKeyStatus] = useState('');
  const [isTestingGeminiKey, setIsTestingGeminiKey] = useState(false);

  const handleSignInWithGoogle = async () => {
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email || '';

      if (!isAllowedCompanyEmail(email)) {
        await signOut(auth);
        setCurrentUser(null);
        setAuthError(`Email ${email || 'này'} không được phép. Chỉ cho phép @haichai.vn và @starspits.vn.`);
        return;
      }

      setCurrentUser(result.user);
    } catch (error) {
      console.error('Firebase sign-in error:', error);
      setAuthError(error.message || 'Không đăng nhập được bằng Google.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCloudReady(false);
    setSyncStatus('Đã đăng xuất Firebase');
  };

  const handleSaveGeminiKey = () => {
    const key = geminiApiKey.trim();
    if (!key) {
      localStorage.removeItem('gemini_api_key');
      setGeminiKeyStatus('Đã xoá Gemini API Key trên máy này.');
      return;
    }

    localStorage.setItem('gemini_api_key', key);
    setGeminiKeyStatus('Đã lưu Gemini API Key trên máy này.');
  };

  const handleTestGeminiKey = async () => {
    const key = geminiApiKey.trim();
    if (!key) {
      setGeminiKeyStatus('Bạn chưa nhập key để test.');
      return;
    }

    localStorage.setItem('gemini_api_key', key);
    setIsTestingGeminiKey(true);
    setGeminiKeyStatus('Đang test Gemini API Key...');

    try {
      const result = await callGeminiWithRetry(
        'Bạn là hệ thống kiểm tra kết nối. Chỉ trả JSON hợp lệ.',
        'Trả về {"ok":true,"message":"Gemini connected"}',
        {
          type: 'OBJECT',
          properties: {
            ok: { type: 'BOOLEAN' },
            message: { type: 'STRING' },
          },
          required: ['ok', 'message'],
        },
        1
      );

      if (result?.ok) {
        setGeminiKeyStatus('Gemini API Key dùng được.');
      } else {
        setGeminiKeyStatus('Gemini có phản hồi nhưng JSON không đúng format mong đợi.');
      }
    } catch (error) {
      console.error('Gemini key test error:', error);
      setGeminiKeyStatus(error.message || 'Không test được Gemini API Key.');
    } finally {
      setIsTestingGeminiKey(false);
    }
  };

  // Load local backup trước để không mất dữ liệu khi chưa đăng nhập hoặc mất mạng.
  useEffect(() => {
    try {
      const savedBible = localStorage.getItem('haichai_bible');
      if (savedBible) setBible(savedBible);

      const savedScripts = localStorage.getItem('haichai_scripts');
      if (savedScripts) {
        setScripts(JSON.parse(savedScripts));
      } else {
        setScripts(INITIAL_SCRIPTS);
      }

      const savedDrafts = localStorage.getItem('haichai_drafts');
      if (savedDrafts) setDraftScripts(JSON.parse(savedDrafts));

      const savedTopics = localStorage.getItem('haichai_generated_topics');
      if (savedTopics) setGeneratedTopics(JSON.parse(savedTopics));

      const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
      setGeminiApiKey(savedGeminiKey);
    } catch (error) {
      console.error('LocalStorage load error:', error);
      setScripts(INITIAL_SCRIPTS);
    } finally {
      setIsLocalLoaded(true);
    }
  }, []);

  // Lắng nghe trạng thái đăng nhập Firebase.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(false);

      if (!user) {
        setCurrentUser(null);
        setCloudReady(false);
        setSyncStatus('Chưa đăng nhập Firebase');
        return;
      }

      const email = user.email || '';
      if (!isAllowedCompanyEmail(email)) {
        await signOut(auth);
        setCurrentUser(null);
        setCloudReady(false);
        setAuthError(`Email ${email || 'này'} không được phép. Chỉ cho phép @haichai.vn và @starspits.vn.`);
        setSyncStatus('Email không thuộc domain công ty');
        return;
      }

      setAuthError('');
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Giữ dữ liệu mới nhất trong ref để lần đầu tạo document Firestore không bị stale state.
  useEffect(() => {
    latestDataRef.current = { bible, scripts, draftScripts, generatedTopics };
  }, [bible, scripts, draftScripts, generatedTopics]);

  // Luôn lưu một bản backup local. Nguồn chính vẫn là Firestore sau khi đăng nhập.
  useEffect(() => {
    if (!isLocalLoaded) return;

    localStorage.setItem('haichai_bible', bible);
    localStorage.setItem('haichai_scripts', JSON.stringify(scripts));
    localStorage.setItem('haichai_drafts', JSON.stringify(draftScripts));
    localStorage.setItem('haichai_generated_topics', JSON.stringify(generatedTopics));
  }, [isLocalLoaded, bible, scripts, draftScripts, generatedTopics]);

  // Tải dữ liệu từ Firestore sau khi đăng nhập Google bằng email công ty.
  useEffect(() => {
    if (!currentUser || !isLocalLoaded) return;

    setSyncStatus('Đang kết nối Firestore...');
    setCloudReady(false);

    const ref = getAppDataRef();
    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        syncingFromCloudRef.current = true;

        try {
          if (snapshot.exists()) {
            const data = snapshot.data();

            if (typeof data.bible === 'string') setBible(data.bible);
            if (Array.isArray(data.scripts)) setScripts(data.scripts);
            if (Array.isArray(data.draftScripts)) setDraftScripts(data.draftScripts);
            if (Array.isArray(data.generatedTopics)) setGeneratedTopics(data.generatedTopics);

            setSyncStatus('Đã tải dữ liệu từ Firestore');
          } else {
            await setDoc(ref, {
              ...latestDataRef.current,
              ownerEmail: currentUser.email || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });

            setSyncStatus('Đã tạo dữ liệu Firestore từ dữ liệu local hiện tại');
          }

          setLastSyncedAt(new Date());
          setCloudReady(true);
        } finally {
          setTimeout(() => {
            syncingFromCloudRef.current = false;
          }, 0);
        }
      },
      (error) => {
        console.error('Firestore listen error:', error);
        setSyncStatus(`Lỗi Firestore: ${error.message}`);
        setCloudReady(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isLocalLoaded]);

  // Tự động sync mọi thay đổi lên Firestore, có debounce để không ghi liên tục từng ký tự.
  useEffect(() => {
    if (!currentUser || !cloudReady || syncingFromCloudRef.current) return;

    setSyncStatus('Đang chờ đồng bộ...');
    const timeout = setTimeout(async () => {
      try {
        await setDoc(getAppDataRef(), {
          bible,
          scripts,
          draftScripts,
          generatedTopics,
          ownerEmail: currentUser.email || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });

        setSyncStatus('Đã đồng bộ Firestore');
        setLastSyncedAt(new Date());
      } catch (error) {
        console.error('Firestore save error:', error);
        setSyncStatus(`Lỗi lưu Firestore: ${error.message}`);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [currentUser, cloudReady, bible, scripts, draftScripts, generatedTopics]);

  const saveScriptsToStorage = (newScripts) => {
    setScripts(newScripts);
  };

  const handleBibleChange = (e) => {
    setBible(e.target.value);
  };

  const handleSaveManualScript = () => {
    if (!manualScript.title.trim()) {
      return showAlert("Lỗi", "Vui lòng nhập tiêu đề kịch bản!");
    }
    
    const newScript = {
      ...manualScript,
      id: `s_man_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'approved',
      duplicateRiskScore: 0, // Kịch bản thủ công mặc định rủi ro = 0
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    saveScriptsToStorage([newScript, ...scripts]);
    setIsAddingManual(false);
    setManualScript(EMPTY_MANUAL_SCRIPT);
    showAlert("Thành công", "Đã thêm kịch bản thủ công vào thư viện!");
  };

  const updateManualScene = (index, field, value) => {
    const newScenes = [...manualScript.scenes];
    newScenes[index][field] = value;
    setManualScript({ ...manualScript, scenes: newScenes });
  };

  const addManualScene = () => {
    setManualScript({
      ...manualScript,
      scenes: [...manualScript.scenes, { name: `Cảnh ${manualScript.scenes.length + 1}`, content: '', visualSuggestion: '' }]
    });
  };

  const removeManualScene = (index) => {
    const newScenes = manualScript.scenes.filter((_, i) => i !== index);
    setManualScript({ ...manualScript, scenes: newScenes });
  };

  // --- ACTIONS ---
  const handleScanLibrary = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Mock logic: đếm số lượng theo category
      const counts = scripts.reduce((acc, script) => {
        acc[script.category] = (acc[script.category] || 0) + 1;
        return acc;
      }, {});
      
      setScanResult({
        total: scripts.length,
        categories: counts,
        warning: scripts.length > 0 ? "Thư viện đã có nội dung. Chú ý các chủ đề về 'Mặt bằng' đang lặp lại." : "Thư viện trống. An toàn để tạo mới.",
        suggestedFocus: "Nên tập trung vào nhóm 'Sản phẩm / niềm tin / giấy tờ' vì đang thiếu."
      });
      setIsScanning(false);
    }, 800);
  };

  const handleGenerateTopics = async () => {
    const savedKey = (geminiApiKey || localStorage.getItem('gemini_api_key') || '').trim();
    if (!savedKey) {
      setActiveTab('settings');
      return showAlert('Thiếu Gemini API Key', 'Vào Cài đặt & Dữ liệu, dán Gemini API Key rồi bấm “Lưu Gemini API Key” trước khi tạo chủ đề.');
    }

    setIsGeneratingTopics(true);
    try {
      const topics = await generateTopicsFromAI(bible, scripts);
      if (topics && topics.length > 0) {
        setGeneratedTopics(topics);
      } else {
        showAlert('Lỗi', 'AI không trả về dữ liệu. Hãy bấm “Test Gemini Key” trong Cài đặt rồi thử lại.');
      }
    } catch (error) {
      console.error('Topic generation error:', error);
      showAlert('Lỗi Gemini', error.message || 'Không tạo được chủ đề.');
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const toggleTopicSelection = (id) => {
    setGeneratedTopics(topics => 
      topics.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const handleGenerateDetailedScripts = async () => {
    const selected = generatedTopics.filter(t => t.selected);
    if (selected.length === 0) return showAlert("Thông báo", "Vui lòng chọn ít nhất 1 chủ đề!");

    const savedKey = (geminiApiKey || localStorage.getItem('gemini_api_key') || '').trim();
    if (!savedKey) {
      setActiveTab('settings');
      return showAlert('Thiếu Gemini API Key', 'Vào Cài đặt & Dữ liệu, dán Gemini API Key rồi bấm “Lưu Gemini API Key” trước khi tạo kịch bản.');
    }

    setActiveTab('generate-scripts');
    setIsGeneratingScripts(true);
    setGenerationStatus("Bắt đầu khởi tạo dữ liệu...");

    // TỐI ƯU: Chia mảng selected thành các nhóm nhỏ (Chunks), mỗi nhóm 3 chủ đề
    const CHUNK_SIZE = 3;
    let generatedCount = 0;
    
    for (let i = 0; i < selected.length; i += CHUNK_SIZE) {
      const chunk = selected.slice(i, i + CHUNK_SIZE);
      const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
      const totalChunks = Math.ceil(selected.length / CHUNK_SIZE);
      
      setGenerationStatus(`Đang xử lý cụm ${chunkNumber}/${totalChunks} (gồm ${chunk.length} kịch bản)...`);
      
      const newScripts = await generateScriptsBatchFromAI(chunk, bible, scripts);
      
      if (newScripts && newScripts.length > 0) {
        generatedCount += newScripts.length;
        setDraftScripts(prev => {
            const updatedDrafts = [...prev, ...newScripts];
            return updatedDrafts;
        });
      } else {
        console.warn(`Lỗi tạo cụm kịch bản số ${chunkNumber}`);
      }
      
      // Chỉ nghỉ 5 giây nếu chưa phải là cụm cuối cùng, để tránh rate limit
      if (i + CHUNK_SIZE < selected.length) {
        setGenerationStatus(`Hoàn thành cụm ${chunkNumber}. Nghỉ 5s để tránh nghẽn mạng...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    
    setIsGeneratingScripts(false);
    setGenerationStatus("");
    
    if (generatedCount === 0) {
      showAlert("Lỗi", "Có lỗi kết nối khi tạo kịch bản, vui lòng thử lại!");
    } else if (generatedCount < selected.length) {
      showAlert("Thông báo", `Đã tạo thành công ${generatedCount}/${selected.length} kịch bản. Một số bị bỏ qua do giới hạn của AI.`);
    } else {
      showAlert("Thành công", `Đã tạo thành công ${generatedCount} kịch bản!`);
    }
  };

  const handleSaveDraftToLibrary = (draftId) => {
    const draftToSave = draftScripts.find(d => d.id === draftId);
    if (draftToSave) {
      const newScript = { ...draftToSave, status: 'approved' };
      saveScriptsToStorage([...scripts, newScript]);
      
      setDraftScripts(drafts => {
         const newDrafts = drafts.filter(d => d.id !== draftId);
         return newDrafts;
      });
      showAlert("Thành công", "Đã lưu vào thư viện!");
    }
  };

  const handleDeleteScript = (id) => {
    showConfirm("Xác nhận xóa", "Bạn có chắc muốn xóa kịch bản này?", () => {
        saveScriptsToStorage(scripts.filter(s => s.id !== id));
    });
  }

  const handleDeleteDraft = (id) => {
    showConfirm("Xác nhận xóa", "Bạn có chắc muốn xóa kịch bản nháp này?", () => {
        setDraftScripts(drafts => {
           const newDrafts = drafts.filter(d => d.id !== id);
           localStorage.setItem('haichai_drafts', JSON.stringify(newDrafts));
           return newDrafts;
        });
    });
  };

  const handleExportPDF = (script) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert("Lỗi Pop-up", "Vui lòng cho phép trình duyệt mở tab mới (Pop-up) để in kịch bản.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${script.title} - Haichai Script</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
          body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          h1 { font-size: 24px; border-bottom: 2px solid #1f2937; padding-bottom: 10px; margin-bottom: 24px; text-transform: uppercase; }
          .meta-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
          .meta-item { margin-bottom: 10px; }
          .meta-item:last-child { margin-bottom: 0; }
          .meta-label { font-weight: 700; color: #4b5563; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
          .meta-value { font-size: 15px; color: #111827; }
          .hook-box { background: #eef2ff; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 30px; }
          h2 { font-size: 18px; margin-top: 30px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;}
          .scene { margin-bottom: 20px; page-break-inside: avoid; }
          .scene-title { font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 6px; }
          .scene-content { margin: 0 0 8px 0; font-size: 15px; }
          .scene-visual { color: #4f46e5; font-style: italic; font-size: 14px; margin: 0; background: #f8fafc; padding: 6px 10px; border-radius: 4px; display: inline-block; }
          .footer-note { margin-top: 50px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; }
          .danger-note { color: #b91c1c; background: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fecaca; }
          @media print {
            body { padding: 0; margin: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <h1>${script.title}</h1>
        
        <div class="meta-box">
          <div class="meta-item">
            <span class="meta-label">Nhóm nội dung</span>
            <span class="meta-value">${script.category}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Thông điệp chính</span>
            <span class="meta-value">${script.mainMessage}</span>
          </div>
        </div>

        <div class="hook-box">
          <span class="meta-label" style="color: #4f46e5;">Hook</span>
          <span class="meta-value" style="font-weight: 500; font-size: 16px;">"${script.selectedHook}"</span>
        </div>

        <h2>KỊCH BẢN CHI TIẾT (SHOOTING SCRIPT)</h2>
        ${script.scenes ? script.scenes.map(s => `
          <div class="scene">
            <div class="scene-title">${s.name}</div>
            <p class="scene-content">${s.content}</p>
            <p class="scene-visual">🎥 Góc máy/Hành động: ${s.visualSuggestion}</p>
          </div>
        `).join('') : '<p>Chưa có phân cảnh.</p>'}

        <div class="scene" style="margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 16px;">
          <div class="scene-title">CÂU KẾT</div>
          <p class="scene-content" style="font-weight: 500;">"${script.ending}"</p>
        </div>

        <h2>HẬU KỲ & ĐĂNG TẢI</h2>
        <div class="meta-item" style="margin-bottom: 16px;">
          <span class="meta-label">Text On Screen (Chữ trên màn hình)</span>
          <span class="meta-value">${script.textOnScreen}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Caption</span>
          <span class="meta-value" style="white-space: pre-wrap;">${script.caption}</span>
        </div>

        ${script.notes ? `
        <h2 style="color: #b91c1c; border-bottom-color: #fecaca;">LƯU Ý AN TOÀN</h2>
        <div class="danger-note">${script.notes}</div>
        ` : ''}

        <div class="footer-note">Tạo bởi Haichai Script Studio - Xuất ngày ${new Date().toLocaleDateString('vi-VN')}</div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- SUB-COMPONENTS ---
  const renderModal = () => {
    if (!modal.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-3">{modal.title}</h3>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">{modal.message}</p>
          <div className="flex justify-end gap-3">
            {modal.type === 'confirm' && (
              <button 
                onClick={closeModal} 
                className="px-5 py-2 text-[#0d71ba] hover:bg-slate-100 rounded-lg font-medium transition"
              >
                Hủy
              </button>
            )}
            <button
              onClick={() => {
                if (modal.onConfirm) modal.onConfirm();
                closeModal();
              }}
              className="px-5 py-2 bg-[#0d71ba] hover:opacity-90 text-white rounded-lg font-medium transition shadow-sm"
            >
              {modal.type === 'confirm' ? 'Xác nhận' : 'Đóng'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="w-64 text-white flex flex-col h-screen fixed top-0 left-0 bg-[#0d2440]">
      <div className="p-6 flex items-center">
        {/* Placeholder if image fails to load */}
        <img 
            src="https://tascusfood.com/haichailogo.png" 
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x50/0d2440/FFF?text=HAICHAI+STUDIO"; }}
            alt="Haichai Script Studio" 
            className="h-18 w-auto object-contain" 
        />
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {[
          { id: 'library', icon: <IconBook/>, label: 'Thư viện kịch bản' },
          { id: 'generate-topics', icon: <IconSparkles/>, label: 'Tạo chủ đề' },
          { id: 'generate-scripts', icon: <IconFileText/>, label: 'Kịch bản Draft' },
          { id: 'bible', icon: <IconFileText/>, label: 'Content Bible' },
          { id: 'settings', icon: <IconSettings/>, label: 'Cài đặt & Dữ liệu' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id ? 'bg-[#819396] text-white shadow-md' : 'text-slate-400 hover:bg-[#bf0e0e] hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 text-xs text-slate-300 border-t border-slate-700">
        <div className="font-medium text-white/80">MVP v1.1 - Firebase</div>
        <div className="mt-1 truncate">{currentUser?.email || 'Chưa đăng nhập'}</div>
        <div className="mt-1 text-slate-400">{syncStatus}</div>
      </div>
    </div>
  );

  const renderLibrary = () => {
    const filteredScripts = scripts.filter(s => {
      const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.topic.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCat === 'All' || s.category === filterCat;
      return matchSearch && matchCat;
    });

    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Thư viện Kịch bản ({scripts.length})</h2>
          <button 
            className="bg-[#0d71ba] hover:opacity-90 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition flex items-center gap-2" 
            onClick={() => { setManualScript(EMPTY_MANUAL_SCRIPT); setIsAddingManual(true); }}
          >
            <IconPlus /> Thêm thủ công
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center text-slate-400"><IconSearch /></div>
            <input 
              type="text" placeholder="Tìm tên kịch bản, chủ đề..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="border border-slate-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterCat} onChange={e => setFilterCat(e.target.value)}
          >
            <option value="All">Tất cả nhóm nội dung</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tiêu đề</th>
                <th className="px-6 py-4">Nhóm nội dung</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Trùng lặp</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScripts.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-500">Chưa có kịch bản nào.</td></tr>
              ) : (
                filteredScripts.map(script => (
                  <tr key={script.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{script.title}</td>
                    <td className="px-6 py-4 text-slate-600">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">{script.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${script.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {script.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${script.duplicateRiskScore > 70 ? 'bg-red-100 text-red-700' : script.duplicateRiskScore > 40 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        Score: {script.duplicateRiskScore}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setViewingScript(script)} className="text-[#0d71ba] hover:opacity-70 font-medium text-sm mr-3 transition">Xem</button>
                      <button onClick={() => handleExportPDF(script)} className="text-[#0d71ba] hover:opacity-70 font-medium text-sm mr-3 transition" title="In/Xuất PDF">In/PDF</button>
                      <button onClick={() => handleDeleteScript(script.id)} className="text-[#0d71ba] hover:opacity-70 font-medium text-sm transition">Xóa</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Xem Kịch Bản */}
        {viewingScript && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">{viewingScript.title}</h3>
                    <div className="flex gap-4 items-center">
                        <button onClick={() => handleExportPDF(viewingScript)} className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition">
                            <IconPrinter /> In kịch bản
                        </button>
                        <button onClick={() => setViewingScript(null)} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm">
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Thông điệp chính</h4>
                            <p className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg italic">
                                {viewingScript.mainMessage}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Hook Được Chọn</h4>
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                                <p className="text-lg font-medium text-indigo-900">"{viewingScript.selectedHook}"</p>
                                <p className="text-indigo-600 mt-2 text-xs">Lý do: {viewingScript.selectedHookReason}</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Các Cảnh Quay</h4>
                            <div className="space-y-4">
                                {viewingScript.scenes?.map((scene, i) => (
                                    <div key={i} className="border-l-2 border-indigo-200 pl-4 py-1">
                                        <p className="font-bold text-slate-700">{scene.name}</p>
                                        <p className="text-slate-800 mt-1 whitespace-pre-line">{scene.content}</p>
                                        <p className="text-slate-500 text-xs mt-1">🎥 {scene.visualSuggestion}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Câu Kết</h4>
                            <p className="text-slate-800 font-medium">"{viewingScript.ending}"</p>
                        </div>
                    </div>
                    <div className="space-y-6 bg-slate-50 p-4 rounded-lg border border-slate-100 h-fit">
                        <div>
                            <h4 className="font-bold text-slate-800 mb-1 uppercase text-xs">Text on Screen</h4>
                            <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">{viewingScript.textOnScreen}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-1 uppercase text-xs">Caption</h4>
                            <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 whitespace-pre-line">{viewingScript.caption}</p>
                        </div>
                        {viewingScript.notes && (
                            <div>
                                <h4 className="font-bold text-red-800 mb-1 uppercase text-xs">Checklist An Toàn</h4>
                                <p className="text-red-700 bg-red-50 p-2 rounded border border-red-200">{viewingScript.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Modal Thêm Kịch Bản Thủ Công */}
        {isAddingManual && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Thêm kịch bản thủ công</h3>
                    <button onClick={() => setIsAddingManual(false)} className="text-slate-400 hover:text-slate-600 font-bold text-2xl leading-none">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-white flex-1 space-y-6 text-sm">
                    {/* Hàng 1: Tiêu đề & Nhóm */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tiêu đề kịch bản (*)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                placeholder="VD: Sai lầm khi chọn mặt bằng"
                                value={manualScript.title}
                                onChange={(e) => setManualScript({...manualScript, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nhóm nội dung</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={manualScript.category}
                                onChange={(e) => setManualScript({...manualScript, category: e.target.value})}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Hàng 2: Chủ đề & Main Message */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Từ khóa Chủ đề</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                placeholder="VD: Mặt bằng, Quản lý kho..."
                                value={manualScript.topic}
                                onChange={(e) => setManualScript({...manualScript, topic: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Thông điệp chính</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                placeholder="Tóm tắt 1 câu thông điệp video"
                                value={manualScript.mainMessage}
                                onChange={(e) => setManualScript({...manualScript, mainMessage: e.target.value})}
                            />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Hook */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-[#0d71ba]">Câu Hook (Mở đầu)</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-[#0d71ba] bg-blue-50/30 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" 
                            placeholder="Câu nói đầu tiên thu hút người xem..."
                            value={manualScript.selectedHook}
                            onChange={(e) => setManualScript({...manualScript, selectedHook: e.target.value})}
                        />
                    </div>

                    {/* Scenes */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Các phân cảnh chi tiết</label>
                            <button 
                                onClick={addManualScene}
                                className="text-xs bg-[#0d71ba] text-white hover:opacity-90 px-3 py-1 rounded font-medium flex items-center gap-1 transition"
                            >
                                <IconPlus /> Thêm cảnh
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {manualScript.scenes.map((scene, index) => (
                                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 relative group">
                                    <div className="flex justify-between mb-2">
                                        <input 
                                            type="text" 
                                            className="font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-700 text-sm w-32 outline-none" 
                                            value={scene.name}
                                            onChange={(e) => updateManualScene(index, 'name', e.target.value)}
                                            placeholder="Tên cảnh..."
                                        />
                                        {manualScript.scenes.length > 1 && (
                                            <button 
                                                onClick={() => removeManualScene(index)}
                                                className="text-[#0d71ba] hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Xóa cảnh"
                                            >
                                                <IconTrash />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <textarea 
                                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px] text-sm" 
                                            placeholder="Lời thoại (Voice / Nói trực tiếp)..."
                                            value={scene.content}
                                            onChange={(e) => updateManualScene(index, 'content', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-600 italic" 
                                            placeholder="Góc máy / Hành động..."
                                            value={scene.visualSuggestion}
                                            onChange={(e) => updateManualScene(index, 'visualSuggestion', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Câu kết */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Câu Kết (Call to Action / Chốt vấn đề)</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" 
                            placeholder="Câu nói chốt lại vấn đề cuối video..."
                            value={manualScript.ending}
                            onChange={(e) => setManualScript({...manualScript, ending: e.target.value})}
                        />
                    </div>

                    <hr className="border-slate-100" />

                    {/* Hậu kỳ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Text on screen (Chữ nổi trên màn hình)</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" 
                                placeholder="Tiêu đề to dán trên video..."
                                value={manualScript.textOnScreen}
                                onChange={(e) => setManualScript({...manualScript, textOnScreen: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Caption bài đăng (Kèm Hashtag)</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[80px] bg-white" 
                                placeholder="Mô tả dưới bài đăng..."
                                value={manualScript.caption}
                                onChange={(e) => setManualScript({...manualScript, caption: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Ghi chú an toàn (Nếu có)</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[80px] bg-red-50" 
                                placeholder="Các từ ngữ cần tránh, lưu ý đạo cụ..."
                                value={manualScript.notes}
                                onChange={(e) => setManualScript({...manualScript, notes: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button 
                        onClick={() => setIsAddingManual(false)} 
                        className="px-5 py-2 text-[#0d71ba] hover:bg-slate-200 rounded-lg font-medium transition"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSaveManualScript}
                        className="px-5 py-2 bg-[#0d71ba] hover:opacity-90 text-white rounded-lg font-medium transition shadow-sm flex items-center gap-2"
                    >
                        <IconCheck /> Lưu Kịch Bản
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTopicGenerator = () => (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tạo 30 Chủ đề theo Tỉ lệ</h2>
      
      {/* Scan Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="text-lg font-semibold mb-2">Bước 1: Quét thư viện cũ</h3>
        <p className="text-sm text-slate-500 mb-4">AI sẽ phân tích các kịch bản đã có để tránh tạo trùng ý tưởng, trùng hook.</p>
        <button 
          onClick={handleScanLibrary}
          disabled={isScanning}
          className="bg-[#0d71ba] text-white px-5 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2 hover:opacity-90 shadow-sm"
        >
          {isScanning ? 'Đang quét...' : 'Bắt đầu quét thư viện'}
        </button>

        {scanResult && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-200">
            <p><strong>Tổng số kịch bản:</strong> {scanResult.total}</p>
            <p><strong>Cảnh báo AI:</strong> <span className="text-amber-600">{scanResult.warning}</span></p>
            <p><strong>Gợi ý:</strong> <span className="text-indigo-600">{scanResult.suggestedFocus}</span></p>
          </div>
        )}
      </div>

      {/* Generate Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold mb-1">Bước 2: Tạo chủ đề mới</h3>
                <p className="text-sm text-slate-500">Tạo 30 chủ đề theo đúng Content Bible (14 - 7 - 6 - 3).</p>
            </div>
            <button 
                onClick={handleGenerateTopics}
                disabled={isGeneratingTopics || !scanResult}
                className={`px-5 py-2 rounded-lg font-medium transition shadow-sm flex items-center gap-2 ${!scanResult ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#0d71ba] hover:opacity-90 text-white'}`}
            >
                {isGeneratingTopics ? 'Đang tạo...' : 'Tạo 30 Chủ Đề'}
            </button>
        </div>

        {generatedTopics.length > 0 && (
          <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
             <div className="bg-indigo-50 p-3 border-b border-slate-200 flex justify-between items-center text-sm">
                 <span className="font-medium text-indigo-800">Đã chọn: {generatedTopics.filter(t => t.selected).length} chủ đề</span>
                 <button 
                    onClick={handleGenerateDetailedScripts}
                    className="bg-[#0d71ba] text-white px-4 py-1.5 rounded hover:opacity-90 font-medium shadow-sm transition"
                 >
                    Tạo kịch bản cho chủ đề đã chọn →
                 </button>
             </div>
             <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">Chọn</th>
                            <th className="px-4 py-3">Nhóm nội dung</th>
                            <th className="px-4 py-3">Chủ đề & Góc nhìn</th>
                            <th className="px-4 py-3 w-24">Risk Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {generatedTopics.map(topic => (
                            <tr key={topic.id} className={`hover:bg-indigo-50/70 cursor-pointer transition-colors ${topic.selected ? 'bg-indigo-50/50' : ''}`} onClick={() => toggleTopicSelection(topic.id)}>
                                <td className="px-4 py-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={topic.selected} 
                                        onChange={() => {}} // Handled by tr click
                                        className="w-4 h-4 text-[#0d71ba] rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">{topic.category}</span>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="font-medium text-slate-900">{topic.topicName}</p>
                                    <p className="text-slate-500 mt-1 line-clamp-2">{topic.angle}</p>
                                </td>
                                <td className="px-4 py-4">
                                     <span className={`px-2 py-1 rounded text-xs font-medium ${topic.duplicateRiskScore > 70 ? 'bg-red-100 text-red-700' : topic.duplicateRiskScore > 40 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {topic.duplicateRiskScore}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderScriptGenerator = () => (
    <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Kịch bản Draft chưa lưu</h2>
        
        {draftScripts.length === 0 && !isGeneratingScripts ? (
            <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-slate-200 text-slate-500">
                Không có kịch bản Draft nào. Hãy sang tab "Tạo chủ đề" để chọn và tạo.
            </div>
        ) : (
            <div className="space-y-6">
                {[...draftScripts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((script, idx) => (
                    <div key={script.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">#{idx + 1} - {script.title}</h3>
                                <div className="flex gap-2 mt-2 text-xs">
                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">{script.category}</span>
                                    <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded">Risk: {script.duplicateRiskScore}</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleSaveDraftToLibrary(script.id)}
                                    className="bg-[#0d71ba] hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
                                >
                                    <IconCheck /> Lưu vào Thư viện
                                </button>
                                <button 
                                    onClick={() => handleDeleteDraft(script.id)}
                                    className="bg-[#0d71ba] hover:opacity-90 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
                                    title="Xóa nháp này"
                                >
                                    <IconTrash /> Xóa
                                </button>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6 text-sm">
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Thông điệp chính</h4>
                                    <p className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg italic">
                                        {script.mainMessage}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Hook Được Chọn</h4>
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                                        <p className="text-lg font-medium text-indigo-900">"{script.selectedHook}"</p>
                                        <p className="text-indigo-600 mt-2 text-xs">Lý do AI chọn: {script.selectedHookReason}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Các Cảnh Quay</h4>
                                    <div className="space-y-4">
                                        {script.scenes?.map((scene, i) => (
                                            <div key={i} className="border-l-2 border-indigo-200 pl-4 py-1">
                                                <p className="font-bold text-slate-700">{scene.name}</p>
                                                <p className="text-slate-800 mt-1 whitespace-pre-line">{scene.content}</p>
                                                <p className="text-slate-500 text-xs mt-1">🎥 {scene.visualSuggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Câu Kết</h4>
                                    <p className="text-slate-800 font-medium">"{script.ending}"</p>
                                </div>
                            </div>
                            
                            {/* Cột phải */}
                            <div className="space-y-6 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100 h-fit">
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 uppercase text-xs">Text on Screen</h4>
                                    <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">{script.textOnScreen}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 uppercase text-xs">Caption</h4>
                                    <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 whitespace-pre-line">{script.caption}</p>
                                </div>
                                {script.notes && (
                                    <div>
                                        <h4 className="font-bold text-red-800 mb-1 uppercase text-xs">Checklist An Toàn</h4>
                                        <p className="text-red-700 bg-red-50 p-2 rounded border border-red-200">{script.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {isGeneratingScripts && (
                    <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-slate-200 border-dashed">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-600 font-medium">AI đang xử lý kịch bản dựa trên Content Bible...</p>
                        <p className="text-sm text-indigo-600 font-medium mt-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">{generationStatus}</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );

  const renderBible = () => (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Content Bible</h2>
        <p className="text-slate-500 text-sm mt-1">AI sẽ đọc bộ quy chuẩn này mỗi khi tạo kịch bản để đảm bảo đúng định vị thương hiệu Haichai.</p>
      </div>
      <textarea
        className="flex-1 w-full p-6 border border-slate-300 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm resize-none bg-slate-50 text-slate-800 leading-relaxed"
        value={bible}
        onChange={handleBibleChange}
        spellCheck="false"
      />
    </div>
  );

  const renderSettings = () => {
    const handleExport = () => {
      const backup = {
        bible,
        scripts,
        draftScripts,
        generatedTopics,
        exportedAt: new Date().toISOString(),
        ownerEmail: currentUser?.email || '',
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "haichai_script_studio_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };

    return (
      <div className="animate-fade-in max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Cài đặt & Dữ liệu</h2>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h3 className="text-lg font-bold mb-4">Đăng nhập Firebase</h3>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Tài khoản:</strong> {currentUser?.email || 'Chưa đăng nhập'}</p>
            <p><strong>Domain được phép:</strong> @haichai.vn, @starspits.vn</p>
            <p><strong>Đồng bộ:</strong> {syncStatus}</p>
            {lastSyncedAt && <p><strong>Lần sync gần nhất:</strong> {lastSyncedAt.toLocaleString('vi-VN')}</p>}
          </div>

          <div className="flex gap-3 mt-5">
            {currentUser ? (
              <button
                onClick={handleSignOut}
                className="bg-[#0d71ba] text-white px-4 py-2 rounded-lg font-medium text-sm transition hover:opacity-90 shadow-sm"
              >
                Đăng xuất
              </button>
            ) : (
              <button
                onClick={handleSignInWithGoogle}
                className="bg-[#0d71ba] text-white px-4 py-2 rounded-lg font-medium text-sm transition hover:opacity-90 shadow-sm"
              >
                Đăng nhập Google công ty
              </button>
            )}

            <button
              onClick={handleExport}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm"
            >
              Export Backup JSON
            </button>
          </div>

          {authError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {authError}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h3 className="text-lg font-bold mb-4">Gemini API Key</h3>
          <p className="text-sm text-slate-500 mb-4">
            Key này dùng để gọi Google Gemini khi tạo chủ đề/kịch bản. App lưu key trên trình duyệt của máy đang dùng, không đẩy key lên Firestore.
          </p>

          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Nhập Gemini API Key
          </label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
            placeholder="AIza..."
            value={geminiApiKey}
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              setGeminiKeyStatus('');
            }}
          />

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleSaveGeminiKey}
              className="bg-[#0d71ba] text-white px-4 py-2 rounded-lg font-medium text-sm transition hover:opacity-90 shadow-sm"
            >
              Lưu Gemini API Key
            </button>
            <button
              onClick={handleTestGeminiKey}
              disabled={isTestingGeminiKey}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {isTestingGeminiKey ? 'Đang test...' : 'Test Gemini Key'}
            </button>
            <button
              onClick={() => {
                setGeminiApiKey('');
                localStorage.removeItem('gemini_api_key');
                setGeminiKeyStatus('Đã xoá Gemini API Key trên máy này.');
              }}
              className="bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-sm"
            >
              Xoá Key
            </button>
          </div>

          {geminiKeyStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm border ${
              geminiKeyStatus.includes('được') || geminiKeyStatus.includes('Đã lưu')
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {geminiKeyStatus}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4">Dữ liệu đang lưu ở đâu?</h3>
          <div className="text-sm text-slate-600 space-y-2">
            <p>• <strong>Firestore:</strong> lưu chung Content Bible, thư viện kịch bản, draft và danh sách chủ đề đã tạo cho team Haichai.</p>
            <p>• <strong>Local backup:</strong> vẫn giữ một bản cache trong trình duyệt để tránh mất dữ liệu khi mạng lỗi.</p>
            <p>• <strong>Gemini API Key:</strong> chỉ lưu trên máy người dùng, không sync lên cloud.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderLoginScreen = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="mb-6">
          <img 
            src="https://tascusfood.com/haichailogo.png" 
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/180x60/0d2440/FFF?text=HAICHAI+STUDIO"; }}
            alt="Haichai Script Studio"
            className="h-16 w-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-900">Haichai Script Studio</h1>
          <p className="text-sm text-slate-500 mt-2">
            Đăng nhập bằng Google Workspace công ty để sử dụng thư viện kịch bản và đồng bộ Firestore.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 mb-5">
          Chỉ cho phép email có đuôi <strong>@haichai.vn</strong> hoặc <strong>@starspits.vn</strong>.
        </div>

        {authError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-5">
            {authError}
          </div>
        )}

        <button
          onClick={handleSignInWithGoogle}
          className="w-full bg-[#0d71ba] hover:opacity-90 text-white px-5 py-3 rounded-lg font-semibold transition shadow-sm"
        >
          Đăng nhập bằng Google công ty
        </button>
      </div>
      {renderModal()}
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-600">
        Đang kiểm tra đăng nhập Firebase...
      </div>
    );
  }

  if (!currentUser) {
    return renderLoginScreen();
  }

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {renderSidebar()}
      <main className="ml-64 flex-1 p-8 h-screen overflow-y-auto">
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'generate-topics' && renderTopicGenerator()}
        {activeTab === 'generate-scripts' && renderScriptGenerator()}
        {activeTab === 'bible' && renderBible()}
        {activeTab === 'settings' && renderSettings()}
      </main>
      
      {/* Global UI Components */}
      {renderModal()}

      {/* Global Styles for simple animations & CSS Reset */}
      <style dangerouslySetInnerHTML={{__html: `
        #root { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; text-align: left !important; }
        body { margin: 0; padding: 0; background-color: #f8fafc; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}} />
    </div>
  );
}