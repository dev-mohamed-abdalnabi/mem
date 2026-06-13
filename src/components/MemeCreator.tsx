import React, { useState, useRef, useEffect } from "react";
import { Download, Sparkles, Image as ImageIcon, Send, RefreshCw, Layers } from "lucide-react";
import { MemeTemplate, MEME_TEMPLATES, Profile, Meme } from "../types";

interface MemeCreatorProps {
  currentUser: Profile;
  onPublishMeme: (caption: string, imageUrl: string, tags: string[]) => Promise<void>;
  onNavigate: (tab: string) => void;
}

export default function MemeCreator({ currentUser, onPublishMeme, onNavigate }: MemeCreatorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate>(MEME_TEMPLATES[0]);
  const [topText, setTopText] = useState(selectedTemplate.default_top || "لما تفهم الكود أخيراً");
  const [bottomText, setBottomText] = useState(selectedTemplate.default_bottom || "وتلاقيه اشتغل لوحده!");
  const [fontSize, setFontSize] = useState<number>(32);
  const [fontColor, setFontColor] = useState<string>("#FFFFFF");
  const [strokeColor, setStrokeColor] = useState<string>("#000000");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("#برمجة #طالب_هندسة");
  
  const [publishing, setPublishing] = useState(false);
  const [errorPublishing, setErrorPublishing] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-draw when dependencies change
  useEffect(() => {
    drawMeme();
  }, [selectedTemplate, topText, bottomText, fontSize, fontColor, strokeColor, customImage]);

  const handleTemplateSelect = (template: MemeTemplate) => {
    setSelectedTemplate(template);
    setCustomImage(null);
    setTopText(template.default_top || "");
    setBottomText(template.default_bottom || "");
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const drawMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = customImage || selectedTemplate.image_url;

    img.onload = () => {
      // Set canvas dimensions
      canvas.width = 500;
      canvas.height = 500;

      // Draw loaded image scaled
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Setup typography style
      ctx.fillStyle = fontColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `black ${fontSize}px "Cairo", "Tajawal", "Inter", sans-serif`;

      // Helper loop for writing text wrap
      const writeText = (text: string, yPos: 'top' | 'bottom') => {
        if (!text) return;
        const x = canvas.width / 2;
        const padding = 20;

        ctx.font = `900 ${fontSize}px "Cairo", "Tajawal", sans-serif`;

        if (yPos === 'top') {
          ctx.textBaseline = "top";
          ctx.strokeText(text, x, padding);
          ctx.fillText(text, x, padding);
        } else {
          ctx.textBaseline = "bottom";
          ctx.strokeText(text, x, canvas.height - padding);
          ctx.fillText(text, x, canvas.height - padding);
        }
      };

      writeText(topText, 'top');
      writeText(bottomText, 'bottom');
    };
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `memesbook-comic-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePublish = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setPublishing(true);
    setErrorPublishing("");
    setPublishSuccess(false);

    try {
      // Convert Canvas representation to simulated dataURL (highly scalable and client portable)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      
      const cleanTags = tagsInput
        .split(" ")
        .filter(t => t.startsWith("#"))
        .map(t => t.replace("#", ""));

      // Publish callback inside parent index
      await onPublishMeme(
        caption.trim() || `${topText} ... ${bottomText}`,
        dataUrl,
        cleanTags
      );

      setPublishSuccess(true);
      setCaption("");
      setTimeout(() => {
        setPublishSuccess(false);
        onNavigate("feed");
      }, 3000);
    } catch (err: any) {
      setErrorPublishing(err.message || "حدث خطأ غير متوقع أثناء نشر الميم.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4 text-right flex flex-col lg:flex-row gap-6">
      {/* Editor Controls Section (Right Columns / RTL) */}
      <div className="flex-1 flex flex-col gap-5 order-2 lg:order-1">
        <div>
          <h2 className="font-extrabold text-xl text-gray-900 flex items-center gap-1.5 justify-end">
            <span>استوديو الكوميكس التفاعلي</span>
            <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-100" />
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            اختر قالب قفشة شهير، اكتب إفيهاتك ومسمياتك واصنع الضحكة بثانية!
          </p>
        </div>

        {/* Template Chooser */}
        <div>
          <label className="block text-xs font-black text-gray-700 mb-2">القوالب الكلاسيكية الشهيرة:</label>
          <div className="grid grid-cols-4 gap-2">
            {MEME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleTemplateSelect(tmpl)}
                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  selectedTemplate.id === tmpl.id && !customImage
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <img
                  src={tmpl.image_url}
                  alt=""
                  className="w-10 h-10 object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[9px] font-bold text-gray-700 truncate w-full text-center">
                  {tmpl.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Image Upload Option */}
        <div className="bg-gray-50/50 p-3 rounded-2xl border border-dashed border-gray-200">
          <label className="flex items-center justify-between text-xs font-black text-gray-700 cursor-pointer">
            <span className="flex items-center gap-1.5 text-blue-600">
              <ImageIcon className="w-4 h-4" />
              رفع صورة ميم خاصة بك
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomImageUpload}
              className="hidden"
            />
            {customImage && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px]">مرفوع</span>}
          </label>
        </div>

        {/* Text modifiers */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-black text-gray-700 mb-1">الكلمة فوق (رأس الميم) ✍️</label>
            <input
              type="text"
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="اكتب إفيه السطر العلوي..."
              className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-700 mb-1">الكلمة تحت (أسفل الميم) ✍️</label>
            <input
              type="text"
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              placeholder="اكتب إفيه السطر السفلي..."
              className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Size Slider, stroke and fill color picker combo row */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-1">حجم الخط</label>
            <input
              type="range"
              min="20"
              max="52"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full cursor-pointer accent-blue-600"
            />
            <span className="text-[9px] font-mono font-bold text-gray-500 block text-center mt-1">{fontSize}px</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-1">لون الكلمة</label>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              className="w-full h-8 rounded-lg cursor-pointer border border-gray-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-1">لون الحدود</label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-full h-8 rounded-lg cursor-pointer border border-gray-200 bg-white"
            />
          </div>
        </div>

        {/* Optional caption and tag inputs for posting directly */}
        <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
          <h3 className="font-extrabold text-xs text-gray-800">تفاصيل النشر والمشاركة:</h3>
          
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">وصف الميم والهاشتاجات (اختياري)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="مثال: لما صاحبك يقولك متقلقش الامتحان سهل... #دراسة #امتحانات"
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-4 py-2 text-xs font-semibold placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">الهاشتاجات المرفقة (مفصولة بمسافة)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="#برمجة #كلية #ترفيه"
              className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Triggers */}
        {errorPublishing && (
          <p className="text-xs text-red-600 font-extrabold bg-red-50 border border-red-100 p-3 rounded-xl">
            {errorPublishing}
          </p>
        )}

        {publishSuccess && (
          <p className="text-xs text-green-700 font-black bg-green-50 border border-green-100 p-3 rounded-xl animate-bounce">
            تم نشر ابتكارك الكوميدي بنجاح وجاري إعادتك للرئيسية يا غالي! 🎉🚀 (+5 نقاط لمستواك)
          </p>
        )}

        <div className="flex gap-2 mt-2">
          {/* Direct Post */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
            <span>{publishing ? "جاري النشر بالسرية التامة..." : "انشر الآن على ميمز بوك 🚀"}</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="تحميل الميم كصورة PNG للجهاز"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تحميل للجهاز</span>
          </button>
        </div>
      </div>

      {/* Interactive Live Canvas Preview Stage (Left Columns / LTR layout for proper viewport centering) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-4 border border-gray-100 min-h-[300px] order-1 lg:order-2">
        <label className="block text-[11px] font-black text-gray-400 mb-2 self-start flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          معاينة وتصميم الأبعاد الفورية
        </label>
        
        {/* Real Dynamic Responsive Canvas with backup screen placeholder height wrapper */}
        <div className="relative shadow-2xl rounded-2xl overflow-hidden max-w-full border border-gray-200 bg-white">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[400px] aspect-square object-contain block"
          />
        </div>
        
        <p className="text-[10px] text-gray-400 mt-3 font-semibold">
          💡 يمكنك تغيير الكلمات بالتكست وسوف يتحدث مصنع الميمز مباشرةً!
        </p>
      </div>
    </div>
  );
}
