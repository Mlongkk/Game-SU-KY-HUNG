/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, CheckCircle2, Timer, Brain } from 'lucide-react';
import { Puzzle } from '../types';
import React, { useState, useMemo, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { getHistoricalAdvice } from '../services/geminiService';

interface PuzzleOverlayProps {
  puzzle: Puzzle;
  onSolve: (puzzleId: string, rewardItemId?: string) => void;
  onWrongAnswer: (reason: 'wrong' | 'timeout') => void;
  lives: number;
  aiUses: number;
  onAiUse: () => void;
  onClose: () => void;
}

export default function PuzzleOverlay({ puzzle, onSolve, onWrongAnswer, lives, aiUses, onAiUse, onClose }: PuzzleOverlayProps) {
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState(false);
  const [solved, setSolved] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(45);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (solved || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [solved, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !solved) {
      onWrongAnswer('timeout');
      onClose();
    }
  }, [timeLeft, solved, onWrongAnswer, onClose]);

  const shuffledOptions = useMemo(() => {
    if (!puzzle.options) return [];
    const options = [...puzzle.options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }, [puzzle.id, puzzle.options]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (answer.trim().toLowerCase() === String(puzzle.answer).toLowerCase()) {
      setSolved(true);
      audioService.playSFX('puzzleSolve');
      setTimeout(() => {
        onSolve(puzzle.id, puzzle.rewardItemId);
      }, 1500);
    } else {
      setError(true);
      audioService.playSFX('wrong');
      setTimeout(() => {
        setError(false);
        onWrongAnswer('wrong');
        onClose(); 
      }, 1000);
    }
  };

  const handleAiHelp = async () => {
    if (isAiLoading || aiUses >= 2 || puzzle.difficulty !== 'hard') return;
    
    setIsAiLoading(true);
    audioService.playSFX('click');
    
    const context = `Người chơi đang giải câu đố: "${puzzle.question}". Câu trả lời đúng là: "${puzzle.answer}". Đố này có độ khó: ${puzzle.difficulty}. 
      YÊU CẦU: Gợi ý hướng làm một cách tinh tế, KHÔNG ĐƯỢC CHO BIẾT ĐÁP ÁN TRỰC TIẾP. NGẮN GỌN (tối đa 1-2 câu).`;
      
    const response = await getHistoricalAdvice("Hãy gợi ý cho tôi về câu hỏi này", context);
    setAiTip(response);
    onAiUse();
    setIsAiLoading(false);
  };

  const handleOptionClick = (opt: string) => {
    setAnswer(opt);
    audioService.playSFX('click');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-[0.5px] overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="stone-texture w-full max-w-xl p-5 sm:p-10 rounded shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-stone-800 text-stone-200 relative overflow-hidden my-auto max-h-[95vh] flex flex-col"
      >
        {/* Decorative Corners */}
        <div className="absolute top-4 left-4 w-8 h-8 sm:w-12 sm:h-12 border-t border-l border-amber-900/50 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-8 h-8 sm:w-12 sm:h-12 border-b border-r border-amber-900/50 pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 text-stone-600 hover:text-amber-500 transition-colors z-30 hover:rotate-90 duration-300 p-1"
        >
          <X className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>

        <div className="relative z-10 flex flex-col items-center overflow-y-auto scrollbar-hide py-1">
          <div className="text-amber-700/50 text-[10px] md:text-xs font-display flex items-center gap-2 mb-1 tracking-widest shrink-0">
             <div className="w-6 sm:w-10 h-[1px] bg-amber-900/40" />
             BÍ ẨN LỊCH SỬ
             <div className="w-6 sm:w-10 h-[1px] bg-amber-900/40" />
          </div>
          <h2 className="text-base sm:text-3xl font-bold text-amber-100 mb-1 text-center tracking-widest uppercase px-6 sm:px-8 font-display italic shrink-0">
            {puzzle.title}
          </h2>
          <div className="w-10 sm:w-24 h-0.5 bg-amber-900/40 mx-auto mb-2 sm:mb-6 shrink-0" />

          {/* TIMER AND LIVES DISPLAY */}
          <div className="w-full flex justify-between items-center px-4 mb-4 font-display">
            <div className={`flex items-center gap-2 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
              <Timer className="w-4 h-4" />
              <span className="text-xs md:text-sm font-bold tracking-widest">{timeLeft}s</span>
            </div>
            <div className="text-[8px] md:text-xs text-stone-500 uppercase tracking-widest">
              Độ khó: <span className={puzzle.difficulty === 'hard' ? 'text-red-400' : 'text-green-400'}>
                {puzzle.difficulty === 'hard' ? 'Khó' : 'Dễ'}
              </span>
            </div>
          </div>

          {solved ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-4 sm:py-16 gap-2 sm:gap-4"
            >
              <CheckCircle2 className="w-10 h-10 sm:w-24 sm:h-24 text-amber-500" />
              <p className="text-sm sm:text-2xl font-bold text-amber-100 uppercase tracking-widest font-display">Đã Giải Mã</p>
              <p className="text-stone-400 italic text-[9px] sm:text-sm">Cơ quan đang được kích hoạt...</p>
            </motion.div>
          ) : (
            <div className="w-full space-y-2 sm:space-y-8 flex flex-col">
              <div className="bg-black/40 p-2 sm:p-6 border border-amber-900/20 shadow-inner relative shrink-0">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="text-[9px] sm:text-xl leading-relaxed italic text-stone-300 text-center font-serif"
                >
                  "{puzzle.question}"
                </motion.p>
              </div>

              <div className="flex-1">
                {puzzle.type === 'quiz' || puzzle.type === 'sequence' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-4">
                    {shuffledOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleOptionClick(opt)}
                        className={`p-2 sm:p-4 text-center border transition-all uppercase text-[6px] sm:text-xs tracking-widest leading-tight font-display ${
                          answer === opt
                            ? 'bg-amber-900/40 border-amber-600 text-amber-100 shadow-lg'
                            : 'bg-stone-800/50 border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-xs mx-auto">
                    <input
                      autoFocus
                      type="text"
                      value={answer}
                      onChange={(e) => {
                        setAnswer(e.target.value);
                        if (error) setError(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="NHẬP MẬT MÃ..."
                      className="w-full p-2 sm:p-4 text-sm sm:text-2xl border-b border-amber-900/50 bg-black/20 text-center focus:outline-none focus:border-amber-500 transition-colors uppercase tracking-[0.2em] sm:tracking-[0.5em] text-amber-200 font-display"
                    />
                  </div>
                )}
                
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-500 text-[10px] sm:text-sm text-center font-bold uppercase tracking-[0.2em] mt-2 sm:mt-4"
                    >
                      Sai lệch mật mã! Hãy thử lại.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <footer className="flex items-center justify-between pt-2 sm:pt-4 border-t border-stone-800 flex-wrap gap-2 shrink-0">
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-amber-500 text-[8px] sm:text-xs uppercase tracking-widest transition-colors font-bold font-display"
                  >
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Manh mối
                  </button>

                  {puzzle.difficulty === 'hard' && (
                    <button
                      onClick={handleAiHelp}
                      disabled={isAiLoading || aiUses >= 2}
                      className={`flex items-center gap-1.5 text-stone-500 hover:text-cyan-500 text-[8px] sm:text-xs uppercase tracking-widest transition-colors font-bold font-display ${
                        aiUses >= 2 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      <Brain className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                      Gợi ý AI ({2 - aiUses})
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => handleSubmit()}
                  disabled={!answer}
                  className={`px-4 sm:px-10 py-1.5 sm:py-3 bg-amber-800 border border-amber-600 text-amber-100 uppercase text-[8px] sm:text-xs tracking-[0.2em] transition-all hover:bg-amber-700 font-display ${
                    !answer ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'
                  } ${error ? 'animate-shake' : ''}`}
                >
                  {error ? 'Vô Hiệu' : 'Xác Nhận'}
                </button>
              </footer>

              <AnimatePresence>
                {aiTip && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-cyan-950/20 p-4 border-l-4 border-cyan-700 text-sm italic text-cyan-100"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-cyan-500 font-bold uppercase">
                      <Brain className="w-3 h-3" /> Gợi ý từ Cố vấn
                    </div>
                    {aiTip}
                  </motion.div>
                )}
                {showHint && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-black/50 p-4 border-l-4 border-amber-700 text-sm italic text-stone-400"
                  >
                    {puzzle.hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
