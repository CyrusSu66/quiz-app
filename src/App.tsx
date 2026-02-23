import { useState, useEffect } from 'react';

export interface Question {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizState, setQuizState] = useState<'START' | 'FORM' | 'PLAYING' | 'RESULT'>('START');
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [score, setScore] = useState(0);

  // New telemetry states
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [, setEndTime] = useState<Date | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load questions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');

    if (apiParam) {
      setApiUrl(apiParam);
      fetch(apiParam)
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error loading questions from API:", err);
          setIsLoading(false);
        });
    } else {
      const basePath = import.meta.env.BASE_URL;
      fetch(`${basePath}questions.json`)
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error loading local questions:", err);
          setIsLoading(false);
        });
    }
  }, []);

  // Anti-cheat: Window Focus
  useEffect(() => {
    if (quizState !== 'PLAYING') return;

    const handleBlur = () => {
      setIsOverlayVisible(true);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [quizState]);

  // Anti-cheat: Prevent copy/paste
  useEffect(() => {
    if (quizState !== 'PLAYING') return;

    const blockEvent = (e: ClipboardEvent | MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', blockEvent as EventListener);
    document.addEventListener('cut', blockEvent as EventListener);
    document.addEventListener('paste', blockEvent as EventListener);
    document.addEventListener('contextmenu', blockEvent as EventListener);

    return () => {
      document.removeEventListener('copy', blockEvent as EventListener);
      document.removeEventListener('cut', blockEvent as EventListener);
      document.removeEventListener('paste', blockEvent as EventListener);
      document.removeEventListener('contextmenu', blockEvent as EventListener);
    };
  }, [quizState]);

  const goToForm = () => {
    setQuizState('FORM');
  };

  const startQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim()) return;

    setStartTime(new Date());
    setQuizState('PLAYING');
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setScore(0);
    setIsOverlayVisible(false);
    setSubmitError('');
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const end = new Date();
    setEndTime(end);

    let finalScore = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        finalScore++;
      }
    });

    const scaledScore = Math.round((finalScore / questions.length) * 100);
    setScore(scaledScore);
    setQuizState('RESULT');
    submitResult(scaledScore, end);
  };

  const submitResult = async (finalScore: number, end: Date) => {
    if (!apiUrl) {
      console.log(`[Offline Mode] Scored ${finalScore}/100. No API URL configured.`);
      return;
    }

    setIsSubmitting(true);

    // Format answers sequence
    const answersList = questions.map((_, idx) => {
      const selectedIdx = selectedAnswers[idx];
      return selectedIdx !== undefined ? String.fromCharCode(65 + selectedIdx) : '-';
    }).join(',');

    const payload = {
      studentId: studentId.trim(),
      studentName: studentName.trim(),
      startTime: startTime?.toISOString(),
      endTime: end.toISOString(),
      answersStr: answersList,
      score: finalScore
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          // Note: using text/plain to avoid CORS preflight issues with GAS
        }
      });
      const result = await response.json();
      if (result.result !== 'success') {
        throw new Error('API returned failure');
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitError('成績上傳失敗，請通知老師。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-500 font-semibold animate-pulse">載入題庫中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 sm:p-12 user-select-none">

      {/* Anti-cheat Overlay */}
      {isOverlayVisible && (
        <div
          className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={() => setIsOverlayVisible(false)}
        >
          <svg className="w-16 h-16 text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h2 className="text-3xl font-bold mb-2">測驗已暫停</h2>
          <p className="text-gray-300">系統偵測到您離開了測驗畫面。</p>
          <p className="text-gray-400 mt-8 animate-pulse">點擊畫面任意處繼續作答</p>
        </div>
      )}

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg px-6 py-8 sm:px-12 sm:py-10 relative overflow-hidden">

        {/* START SCREEN */}
        {quizState === 'START' && (
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-blue-600 mb-6">線上測驗系統</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              準備好後，請點擊下方按鈕填寫資料。<br />
              <span className="text-red-500 font-semibold text-sm">注意：測驗過程中禁止反白複製、點擊右鍵，若視窗失去焦點將會暫停測驗。</span>
            </p>
            <button
              onClick={goToForm}
              className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-md hover:shadow-xl transform hover:-translate-y-1"
            >
              進入報到
            </button>
          </div>
        )}

        {/* FORM SCREEN */}
        {quizState === 'FORM' && (
          <form onSubmit={startQuiz} className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">考生資料填寫</h1>
            <p className="text-gray-500 mb-8 text-center text-sm">這將作為您的成績登記依據，請確實填寫。</p>

            <div className="mb-6">
              <label htmlFor="studentId" className="block text-sm font-bold text-gray-700 mb-2">學號</label>
              <input
                id="studentId"
                type="text"
                required
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="請輸入學號"
              />
            </div>

            <div className="mb-8">
              <label htmlFor="studentName" className="block text-sm font-bold text-gray-700 mb-2">姓名</label>
              <input
                id="studentName"
                type="text"
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="請輸入姓名"
              />
            </div>

            <button
              type="submit"
              disabled={!studentId.trim() || !studentName.trim()}
              className={`px-8 py-3 rounded-full font-bold text-lg transition shadow-md w-full ${(!studentId.trim() || !studentName.trim()) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl transform hover:-translate-y-1'}`}
            >
              開始作答
            </button>
          </form>
        )}

        {/* PLAYING SCREEN */}
        {quizState === 'PLAYING' && questions.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                問題 {currentQuestionIndex + 1} / {questions.length}
              </span>
              <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-8 leading-tight">
              {questions[currentQuestionIndex].question}
            </h2>

            <div className="space-y-4 sm:space-y-5">
              {questions[currentQuestionIndex].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left px-6 py-5 rounded-xl border-2 transition-all duration-200 font-medium ${selectedAnswers[currentQuestionIndex] === idx
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500/30'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <span className="inline-block w-8 font-bold text-gray-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={nextQuestion}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                className={`px-8 py-3 rounded-lg font-bold transition-all ${selectedAnswers[currentQuestionIndex] !== undefined
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {currentQuestionIndex === questions.length - 1 ? '送出答案' : '下一題'}
              </button>
            </div>
          </div>
        )}

        {/* RESULT SCREEN */}
        {quizState === 'RESULT' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">測驗完成！</h2>

            {isSubmitting ? (
              <p className="text-blue-500 mb-8 font-semibold animate-pulse">成績傳送中...</p>
            ) : submitError ? (
              <p className="text-red-500 mb-8 font-semibold">{submitError}</p>
            ) : apiUrl ? (
              <p className="text-gray-500 mb-8">您的答案已成功登錄。</p>
            ) : (
              <p className="text-orange-500 mb-8 text-sm">目前為離線測試模式，成績不紀錄。</p>
            )}

            <div className="bg-gray-50 rounded-xl p-6 mb-8 inline-block">
              <p className="text-sm text-gray-400 uppercase tracking-wide font-bold mb-1">您的總分</p>
              <div className="text-5xl font-black text-blue-600">
                {score} <span className="text-2xl text-gray-400 font-medium">/ 100</span>
              </div>
            </div>

            <div>
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-4"
              >
                重新啟動
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
