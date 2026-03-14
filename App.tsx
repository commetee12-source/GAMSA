
import React, { useState, useRef } from 'react';
import { generateAuditDocuments } from './services/geminiService';
import { GeneratedDoc } from './types';
import { Part } from '@google/genai';
import * as mammoth from 'mammoth';
import { 
  FileText, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  History, 
  Trash2,
  Download,
  ShieldCheck,
  Scale,
  FileUp,
  X,
  Gavel,
  BookOpen
} from 'lucide-react';

interface FileState {
  name: string;
  data: string; // base64
  mimeType: string;
}

const App: React.FC = () => {
  const [auditResult, setAuditResult] = useState('');
  const [template, setTemplate] = useState('여기에 확인서 또는 처분서 서식을 입력하세요.');
  const [auditFile, setAuditFile] = useState<FileState | null>(null);
  const [templateFile, setTemplateFile] = useState<FileState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedDoc[]>([]);
  const [currentDoc, setCurrentDoc] = useState<GeneratedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audit' | 'template') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const fileState = {
        name: file.name,
        data: base64,
        mimeType: file.type || 'application/octet-stream'
      };

      if (type === 'audit') {
        setAuditFile(fileState);
        if (file.type === 'text/plain') {
          const textReader = new FileReader();
          textReader.onload = (ev) => setAuditResult(ev.target?.result as string);
          textReader.readAsText(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          setAuditResult(result.value);
        }
      } else {
        setTemplateFile(fileState);
        if (file.type === 'text/plain') {
          const textReader = new FileReader();
          textReader.onload = (ev) => setTemplate(ev.target?.result as string);
          textReader.readAsText(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          setTemplate(result.value);
        }
      }
    } catch (err) {
      setError('파일을 읽는 중 오류가 발생했습니다.');
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!auditResult.trim() && !auditFile) {
      setError('감사결과 데이터를 입력하거나 파일을 업로드해 주세요.');
      return;
    }
    if (!template.trim() && !templateFile) {
      setError('적용할 서식 양식(확인서 또는 처분서)을 입력하거나 업로드해 주세요.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const auditParts: Part[] = [];
      if (auditResult.trim()) auditParts.push({ text: auditResult });
      if (auditFile) auditParts.push({ inlineData: { data: auditFile.data, mimeType: auditFile.mimeType } });

      const templateParts: Part[] = [];
      if (template.trim()) templateParts.push({ text: template });
      if (templateFile) templateParts.push({ inlineData: { data: templateFile.data, mimeType: templateFile.mimeType } });

      const content = await generateAuditDocuments(auditParts, templateParts);
      
      const docTypeLabel = template.includes('확인서') || templateFile?.name.includes('확인서') ? '확인서' : 
                          template.includes('처분서') || templateFile?.name.includes('처분서') ? '감사처분서' : '감사문서';

      const newDoc: GeneratedDoc = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: '통합',
        content,
        title: `${docTypeLabel}_${new Date().toLocaleDateString()}_${new Date().getHours()}시${new Date().getMinutes()}분`
      };
      
      setCurrentDoc(newDoc);
      setHistory(prev => [newDoc, ...prev]);
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다. 한글(HWP) 파일에 붙여넣기 하세요.');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentDoc?.id === id) setCurrentDoc(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] lg:flex-row">
      {/* Sidebar - Official Navy Theme */}
      <aside className="w-full lg:w-80 bg-[#002b5b] border-r border-[#001f41] overflow-y-auto h-screen sticky top-0 z-10 shadow-2xl">
        <div className="p-8 border-b border-[#ffffff1a] text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-[#ffffff1a] rounded-lg">
              <ShieldCheck className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight leading-tight">
              스마트 감사<br/>
              행정 어시스턴트
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-sky-900/50 rounded-full w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="text-[10px] font-bold text-sky-200 tracking-wider">OFFICIAL AI AGENT</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5 px-3">
            <div className="flex items-center gap-2 text-sky-200/70 font-bold text-xs uppercase tracking-widest">
              <History className="w-4 h-4" />
              최근 생성 문서
            </div>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 px-6 text-sky-200/30 text-xs border border-[#ffffff0a] rounded-xl bg-[#ffffff05]">
                <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-20" />
                처리된 내역이 없습니다.
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setCurrentDoc(item)}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    currentDoc?.id === item.id 
                    ? 'border-sky-400 bg-sky-800/40 shadow-lg scale-[1.02]' 
                    : 'border-[#ffffff1a] hover:border-sky-700 hover:bg-[#ffffff0a]'
                  }`}
                >
                  <div className={`text-sm font-bold truncate pr-6 ${currentDoc?.id === item.id ? 'text-white' : 'text-sky-100'}`}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-sky-300/60 mt-1 font-medium">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-sky-300/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-auto p-6 text-[10px] text-sky-400/40 font-medium">
          © 2025 Audit Administration AI<br/>
          Designed for Public Services
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <header className="mb-10 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[#004792] font-bold text-sm mb-3 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                <Gavel className="w-4 h-4" />
                감사관실 전용 행정 도구
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">지능형 감사 문서 생성 시스템</h2>
              <div className="mt-2 h-1 w-20 bg-[#004792] rounded-full"></div>
              <p className="text-slate-500 mt-4 max-w-2xl leading-relaxed">
                25년 경력 감사 전문가의 분석 로직을 기반으로, 업로드된 <strong>감사결과</strong>와 <strong>서식 양식</strong>을 대조 분석하여 법적으로 완결성 있는 초안을 생성합니다.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">시스템 상태</div>
                  <div className="text-sm font-bold text-[#004792]">정상 운영 중</div>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Action Panel - Card Design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Data Input Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#004792]" />
                STEP 1. 감사 데이터 입력
              </h3>
              <label className="text-xs font-bold text-[#004792] cursor-pointer hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all bg-blue-50 flex items-center gap-2">
                <FileUp className="w-3.5 h-3.5" />
                문서 업로드
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'audit')} />
              </label>
            </div>
            <div className="p-6">
              <textarea 
                value={auditResult}
                onChange={(e) => setAuditResult(e.target.value)}
                placeholder="지적사항, 위반사항 등 원천 데이터를 여기에 입력하거나 PDF, DOCX 파일을 업로드하세요."
                className="w-full h-56 p-5 bg-white border-2 border-slate-100 rounded-xl text-sm focus:border-[#004792] focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-300 font-medium leading-relaxed"
              />
              {auditFile && (
                <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3 text-sm text-[#004792] font-bold truncate">
                    <div className="p-1.5 bg-white rounded-lg border border-blue-100 shadow-sm">
                      <FileText className="w-4 h-4" />
                    </div>
                    {auditFile.name}
                  </div>
                  <button onClick={() => setAuditFile(null)} className="p-1.5 text-blue-300 hover:text-red-500 hover:bg-white rounded-lg transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-[#004792]" />
                STEP 2. 생성 서식 지정
              </h3>
              <label className="text-xs font-bold text-[#004792] cursor-pointer hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all bg-blue-50 flex items-center gap-2">
                <FileUp className="w-3.5 h-3.5" />
                서식 업로드
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'template')} />
              </label>
            </div>
            <div className="p-6">
              <textarea 
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="확인서, 처분서 등 결과물이 따라야 할 양식 문서를 업로드(PDF, DOCX)하거나 텍스트를 입력하세요."
                className="w-full h-56 p-5 bg-white border-2 border-slate-100 rounded-xl text-sm focus:border-[#004792] focus:ring-0 outline-none transition-all resize-none text-slate-500 placeholder:text-slate-300 font-medium leading-relaxed"
              />
              {templateFile && (
                <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-3 text-sm text-[#004792] font-bold truncate">
                    <div className="p-1.5 bg-white rounded-lg border border-blue-100 shadow-sm">
                      <Clipboard className="w-4 h-4" />
                    </div>
                    {templateFile.name}
                  </div>
                  <button onClick={() => setTemplateFile(null)} className="p-1.5 text-blue-300 hover:text-red-500 hover:bg-white rounded-lg transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button - Prominent Official Button */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-4 px-12 py-5 rounded-2xl font-black text-xl shadow-[0_10px_30px_rgba(0,71,146,0.3)] transition-all duration-300 border border-[#002e5f] border-b-4 ${
              isGenerating 
              ? 'bg-slate-400 border-slate-500 cursor-not-allowed text-white translate-y-1 shadow-none' 
              : 'bg-[#004792] hover:bg-[#005bbd] text-white hover:-translate-y-1 active:translate-y-0.5 active:border-b-0'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                문서 분석 및 작성 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-7 h-7" />
                감사 문서 맞춤 생성
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-4 text-red-700 shadow-sm animate-shake">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Result Display - Professional Document Style */}
        {currentDoc && (
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="px-8 py-6 border-b border-slate-100 bg-[#004792] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#ffffff20] rounded-2xl backdrop-blur-md border border-[#ffffff30]">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-xl tracking-tight">생성된 {currentDoc.title.split('_')[0]} 초안</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-xs text-blue-100 font-medium">검토용 감사 초안 작성이 완료되었습니다.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 self-end sm:self-auto">
                <button 
                  onClick={() => copyToClipboard(currentDoc.content)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-sm font-bold text-[#004792] hover:bg-blue-50 transition-all shadow-sm border border-transparent"
                >
                  <Clipboard className="w-4 h-4" />
                  클립보드 복사
                </button>
                <button 
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-400 rounded-xl text-sm font-bold text-[#002b5b] hover:bg-sky-300 transition-all shadow-sm"
                  onClick={() => {
                    const blob = new Blob([currentDoc.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${currentDoc.title}.txt`;
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4" />
                  TXT 저장
                </button>
              </div>
            </div>
            
            <div className="p-2 bg-slate-100 shadow-inner">
               <div className="p-10 min-h-[500px] overflow-y-auto whitespace-pre-wrap font-serif text-base leading-[1.8] text-slate-800 bg-white border border-slate-200 shadow-sm mx-auto max-w-4xl rounded-sm">
                {currentDoc.content}
               </div>
            </div>
          </div>
        )}

        {/* Security Notice - Professional Footer */}
        <footer className="mt-20 py-10 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-400 text-xs">
            <div className="col-span-2">
              <p className="font-bold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-tighter">
                <ShieldCheck className="w-4 h-4 text-slate-400" /> 
                보안 및 법적 고지사항
              </p>
              <p className="mb-2 leading-relaxed">
                본 시스템은 감사 업무 효율화를 위한 <strong>초안 생성 보조 도구</strong>입니다. 
                본 결과물은 AI에 의한 추정이 포함되어 있으므로, 반드시 담당 감사관의 사실관계 대조 및 법령 적정성 최종 검토가 필요합니다. 
              </p>
              <p className="leading-relaxed">
                ⚠️ <span className="text-red-400 font-bold">개인정보보호:</span> 주민등록번호, 계좌번호 등 민감정보는 반드시 비식별화(*** 처리 등) 후 입력하시기 바랍니다.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <div className="text-slate-500 font-bold mb-2">행정지원센터 감사지원팀</div>
              <div className="flex flex-col gap-1">
                <span>Version 2.1.4 (Official)</span>
                <span>Last Updated: 2025.02</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
