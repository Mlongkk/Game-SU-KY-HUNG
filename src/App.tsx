/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Info, 
  Search, 
  DoorClosed, 
  Trophy, 
  HelpCircle,
  History,
  X,
  CheckCircle2,
  ArrowRight,
  Volume2,
  VolumeX,
  RotateCcw,
  LogIn,
  LogOut,
  Heart,
  Cloud,
  CloudOff
} from 'lucide-react';
import { GameState, Item, Puzzle, RoomObject } from './types';
import { ITEMS, LEVELS } from './constants';
import Inventory from './components/Inventory';
import PuzzleOverlay from './components/PuzzleOverlay';
import { audioService } from './services/audioService';
import { 
  signInWithGoogle, 
  auth, 
  onAuthStateChanged, 
  saveProgress, 
  loadProgress, 
  User,
  checkConnection 
} from './services/firebaseService';

const AtmosphericParticles = () => {
  return (
    <div className="dust-container">
      {/* Dust Motes */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={`dust-${i}`}
          className="dust-particle"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDuration: `${Math.random() * 20 + 20}s`,
            animationDelay: `${Math.random() * -40}s`,
            opacity: Math.random() * 0.3,
          }}
        />
      ))}
      {/* Embers */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`ember-${i}`}
          className="ember-particle"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animationDuration: `${Math.random() * 10 + 10}s`,
            animationDelay: `${Math.random() * -20}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const STORAGE_KEY = 'su_ky_hung_save_state';

  const initialState: GameState = {
    currentLevelId: 'bac_thuoc',
    inventory: [],
    solvedPuzzles: [],
    completedLevels: [],
    isGameWon: false,
    message: 'Chào mừng bạn đến với Sử Ký Hùng. Hãy tìm kiếm các bảo vật để khai mở lịch sử.',
    lives: 3,
    isCriticalMessage: false,
    aiUsesCount: {}
  };

  const [state, setState] = useState<GameState>(initialState);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const [authToast, setAuthToast] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [itemRewardNotification, setItemRewardNotification] = useState<Item | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showIntro, setShowIntro] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return !saved;
  });

  // Auth Listener
  useEffect(() => {
    checkConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        setIsSyncing(true);
        const cloudState = await loadProgress(u.uid);
        if (cloudState) {
          setState({ ...initialState, ...cloudState });
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
             try { 
               const parsed = JSON.parse(saved);
               setState({ ...initialState, ...parsed }); 
             } catch (e) { 
               console.error(e); 
             }
          }
        }
        setHasLoadedFromCloud(true);
        setIsSyncing(false);
        setAuthToast(`Chào mừng trở lại, ${u.displayName}!`);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try { 
            const parsed = JSON.parse(saved);
            setState({ ...initialState, ...parsed }); 
          } catch (e) { 
            console.error(e); 
          }
        }
        setHasLoadedFromCloud(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (authToast) {
      const timer = setTimeout(() => setAuthToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [authToast]);

  // Save changes to cloud/local
  useEffect(() => {
    if (user && !hasLoadedFromCloud) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    if (user) {
      const saveTimer = setTimeout(async () => {
        setIsSyncing(true);
        await saveProgress(user.uid, state);
        setIsSyncing(false);
      }, 1000);
      return () => clearTimeout(saveTimer);
    }
  }, [state, user, hasLoadedFromCloud]);

  const resetGame = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
    if (user) {
      setIsSyncing(true);
      await saveProgress(user.uid, initialState);
      setIsSyncing(false);
    }
    setShowIntro(true);
    setActivePuzzle(null);
    setShowResetConfirm(false);
  };

  const handleLogin = async () => {
    try {
      audioService.playSFX('click');
      setIsLoggingIn(true);
      const u = await signInWithGoogle();
      if (!u) {
        setAuthToast("Đăng nhập thất bại.");
      }
    } catch (error) {
      console.error(error);
      setAuthToast("Lỗi hệ thống khi đăng nhập.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    audioService.playSFX('click');
    await auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
    setAuthToast("Đã đăng xuất khỏi hành trình.");
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showFinalVictory, setShowFinalVictory] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [solveFlash, setSolveFlash] = useState<{ x: number, y: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(() => audioService.getAmbientVolume());
  const [sfxVolume, setSfxVolume] = useState(() => audioService.getSfxVolume());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showIntro) {
      audioService.playAmbient();
    }

    // Global listener to unlock audio on first interaction if blocked
    const handleGesture = () => {
      audioService.playAmbient();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
    window.addEventListener('click', handleGesture);
    window.addEventListener('touchstart', handleGesture);

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [showIntro]);

  const currentLevel = useMemo(() => {
    const found = LEVELS.find(l => l.id === state.currentLevelId) || LEVELS[0];
    console.log('Current Level Update:', { 
      id: state.currentLevelId, 
      foundId: found?.id, 
      hasPuzzles: !!found?.puzzles, 
      puzzleIds: found?.puzzles ? Object.keys(found.puzzles) : [] 
    });
    return found;
  }, [state.currentLevelId]);

  const levelPuzzlesSolved = useMemo(() => {
    if (!currentLevel.puzzles) return false;
    return Object.keys(currentLevel.puzzles).every(pid => (state.solvedPuzzles || []).includes(pid));
  }, [currentLevel, state.solvedPuzzles]);

  useEffect(() => {
    if (showLevelComplete && currentLevel) {
      audioService.playSFX('levelComplete');
    }
  }, [showLevelComplete, currentLevel]);

  // Check for final victory
  useEffect(() => {
    // Voice removed per user request
  }, [showFinalVictory]);

  const handleObjectClick = (obj: RoomObject) => {
    audioService.playSFX('click');
    if (obj.id === 'exit_door') {
      if (levelPuzzlesSolved) {
        const nextLevelIndex = LEVELS.findIndex(l => l.id === state.currentLevelId) + 1;
        if (nextLevelIndex < LEVELS.length) {
          setShowLevelComplete(true);
          audioService.playSFX('levelComplete');
        } else {
          // Giai đoạn cuối: Thời kỳ chống Mỹ
          if (state.inventory.length >= 7) {
            setShowFinalVictory(true);
            audioService.stopAmbient();
          } else {
            setState(prev => ({ 
              ...prev, 
              message: "Hào kiệt đã giải mã xong bí ẩn, nhưng cần thu thập đủ 7 Thất Bảo Linh Vật để thống nhất non sông!" 
            }));
          }
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          message: `Cửa đang khóa chặt. Bạn cần giải mã toàn bộ bí ẩn của ${currentLevel.name} để mở lối phong ấn.`
        }));
      }
      return;
    }

    if (obj.puzzleId) {
      if (!state.solvedPuzzles.includes(obj.puzzleId)) {
        const puzzle = currentLevel.puzzles ? currentLevel.puzzles[obj.puzzleId] : null;
        if (puzzle) {
          setActivePuzzle(puzzle);
        } else {
          console.error(`Puzzle ${obj.puzzleId} not found in level ${currentLevel.id}`);
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          message: `Ấn ký cổ tại ${obj.name} đã được khai mở. Bí ẩn này không còn gì để che giấu.` 
        }));
      }
    } else {
      setState(prev => ({ ...prev, message: obj.description }));
    }
  };

  const onPuzzleSolve = (puzzleId: string, rewardItemId?: string) => {
    // Reset lives when a puzzle is solved maybe? 
    // Actually the requirement is "Mỗi giai đoạn có tối đa 3 mạng. Khi hết mạng sẽ quay trở lại từ đầu giai đoạn."
    // So lives should be reset per stage.
    // Trigger flash effect at object position
    const solvedObj = currentLevel.objects.find(o => o.puzzleId === puzzleId);
    if (solvedObj) {
      setSolveFlash({ x: solvedObj.position.x, y: solvedObj.position.y });
      setTimeout(() => setSolveFlash(null), 1000);
    }

    setState(prev => {
      const isActuallyNew = !prev.solvedPuzzles.includes(puzzleId);
      const newSolvedPuzzles = isActuallyNew ? [...prev.solvedPuzzles, puzzleId] : prev.solvedPuzzles;
      
      // Check if all 3 puzzles in this level are now solved
      const levelPuzzles = currentLevel.puzzles ? Object.keys(currentLevel.puzzles) : [];
      const allLevelPuzzlesSolved = levelPuzzles.length > 0 && levelPuzzles.every(pid => 
        pid === puzzleId || newSolvedPuzzles.includes(pid)
      );

      const rewardItem = rewardItemId ? ITEMS[rewardItemId] : null;
      const alreadyHas = prev.inventory.some(i => i.id === rewardItemId);
      
      // Only award item if all puzzles in level are solved
      const shouldAward = allLevelPuzzlesSolved && rewardItem && !alreadyHas;

      if (shouldAward && rewardItem) {
        setItemRewardNotification(rewardItem);
        audioService.playSFX('itemCollect');
      }

      return {
        ...prev,
        solvedPuzzles: newSolvedPuzzles,
        inventory: shouldAward ? [...prev.inventory, rewardItem!] : prev.inventory,
        message: allLevelPuzzlesSolved 
          ? `Bạn đã hoàn thành các bí ẩn. Cánh cửa của ${currentLevel.name} đã được khai mở!` 
          : `Giải mã thành công! Bạn đã tìm thấy một manh mối mới.`
      };
    });
    setActivePuzzle(null);
  };

  const onWrongAnswer = useCallback((reason: 'wrong' | 'timeout') => {
    setState(prev => {
      const newLives = prev.lives - 1;
      const isGameOver = newLives <= 0;
      
      let message = reason === 'timeout' ? "Hết thời gian! Ngươi đã chậm trễ." : "Đáp án chưa chính xác.";
      
      if (isGameOver) {
        return {
          ...initialState,
          message: "Hào kiệt đã thất thủ. Hành trình đã khép lại và phải bắt đầu lại từ thuở sơ khai.",
          isCriticalMessage: true
        };
      }

      message += `\nNgươi bị trừ 1 mạng. Còn lại ${newLives} lượt thử.`;

      return {
        ...prev,
        lives: newLives,
        message: message,
        isCriticalMessage: true
      };
    });

    // Auto clear critical message state
    setTimeout(() => {
      setState(prev => ({ ...prev, isCriticalMessage: false }));
    }, 3000);

    audioService.playSFX('wrong');
  }, [currentLevel.puzzles]);

  const handleAiUse = (puzzleId: string) => {
    setState(prev => ({
      ...prev,
      aiUsesCount: {
        ...prev.aiUsesCount,
        [puzzleId]: (prev.aiUsesCount[puzzleId] || 0) + 1
      }
    }));
  };

  const goToNextLevel = () => {
    audioService.playSFX('click');
    const nextLevelIndex = LEVELS.findIndex(l => l.id === state.currentLevelId) + 1;
    if (nextLevelIndex < LEVELS.length) {
      const nextLevel = LEVELS[nextLevelIndex];
      setState(prev => ({
        ...prev,
        currentLevelId: nextLevel.id,
        completedLevels: [...prev.completedLevels, prev.currentLevelId],
        message: `Chào mừng bạn đến với ${nextLevel.name}.`,
        lives: 3 // Reset lives for new stage
      }));
      setShowLevelComplete(false);
    }
  };

  return (
    <div className="w-full h-screen bg-soph-bg text-stone-200 font-serif flex flex-col border-2 md:border-4 border-soph-border overflow-hidden relative">
      {/* Background Effects */}
      <div className="film-grain" />
      <div className="vignette" />
      <div className="sepia-overlay" />
      <AtmosphericParticles />
      
      {/* AUTH TOAST */}
      <AnimatePresence>
        {authToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] bg-amber-900/90 border border-amber-600/50 text-amber-100 px-4 py-2 rounded shadow-2xl font-display text-[9px] md:text-xs tracking-widest backdrop-blur-[0.5px]"
          >
            {authToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* HEADER */}
      <header className="h-14 md:h-11 bg-soph-surface border-b border-amber-900/30 px-3 md:px-8 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-7 h-7 md:w-7 md:h-7 border border-amber-600 flex items-center justify-center text-amber-600 font-display font-bold rotate-45 shrink-0">
            <span className="-rotate-45 text-[8px] md:text-[9px]">SKH</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-[12px] md:text-lg font-display tracking-[0.1em] md:tracking-[0.2em] font-bold text-amber-100 truncate">Sử Ký Hùng</h1>
            <div className="text-[10px] md:text-xs text-amber-400 tracking-widest flex items-center gap-1 font-display mt-0.5">
              <History className="w-3 h-3 md:w-3 md:h-3" /> {currentLevel.era}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-8 text-[7px] md:text-[9px] tracking-[0.1em] md:tracking-[0.2em] text-amber-500/80 font-display">
          <div className="flex items-center gap-1.5 md:gap-2">
            {isSyncing ? <Cloud className="w-3 h-3 animate-pulse text-amber-400" /> : <CloudOff className="w-3 h-3 opacity-20" />}
            {isAuthReady ? (
              user ? (
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-stone-400 truncate max-w-[40px] md:max-w-[80px]">{user.displayName}</span>
                  <button onClick={handleLogout} className="hover:text-amber-100 flex items-center gap-1 bg-amber-900/10 px-1 py-0.5 border border-amber-900/20 rounded">
                    <LogOut className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden sm:inline">Thoát</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="hover:text-amber-100 flex items-center gap-1 bg-amber-900/20 px-1.5 md:px-2 py-1 border border-amber-900/30 rounded">
                  <LogIn className="w-3 h-3 md:w-3 md:h-3" /> <span className="inline">Lưu</span>
                </button>
              )
            ) : (
              <div className="w-10 h-3 animate-pulse bg-amber-900/20 rounded-full" />
            )}
          </div>
          <div className="hidden sm:block text-stone-100 font-mono text-[9px] md:text-xs">Tiến trình: {LEVELS.indexOf(currentLevel) + 1}/{LEVELS.length}</div>
          <div className="flex items-center gap-2 px-2 py-1 bg-red-950/20 border border-red-900/30 rounded-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart 
                key={i} 
                className={`w-3 h-3 md:w-3.5 md:h-3.5 ${i < state.lives ? 'text-red-500 fill-red-500' : 'text-stone-700'}`} 
              />
            ))}
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 relative">
            <div 
              ref={volumeRef}
              className="flex items-center relative"
            >
              <button 
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-1 md:p-1.5 text-stone-500 hover:text-amber-500 transition-colors"
                title="Âm lượng"
              >
                {isMuted ? <VolumeX className="w-4 h-4 md:w-4 md:h-4 text-red-500" /> : <Volume2 className="w-4 h-4 md:w-4 md:h-4" />}
              </button>
              
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 top-full mt-2 bg-stone-950 border border-amber-900/40 rounded-lg p-4 flex flex-col gap-4 z-[100] shadow-2xl min-w-[200px]"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-amber-500 font-bold">
                        <span>Nhạc nền</span>
                        <span>{Math.round(ambientVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={ambientVolume}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newVol = parseFloat(e.target.value);
                          setAmbientVolume(newVol);
                          audioService.setAmbientVolume(newVol);
                        }}
                        className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-amber-500 font-bold">
                        <span>Hiệu ứng</span>
                        <span>{Math.round(sfxVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={sfxVolume}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newVol = parseFloat(e.target.value);
                          setSfxVolume(newVol);
                          audioService.setSfxVolume(newVol);
                        }}
                        className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>

                    <button 
                      onClick={() => setIsMuted(audioService.toggleMute())}
                      className="mt-2 text-[9px] uppercase tracking-[0.2em] font-bold text-stone-500 hover:text-amber-500 transition-colors flex items-center justify-center gap-2 py-2 border-t border-stone-800"
                    >
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      {isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setShowIntro(true)} className="cursor-pointer hover:text-amber-100 transition-colors p-1 md:p-1" title="Hướng dẫn">
              <Info className="w-4 h-4 md:w-4 md:h-4" />
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="cursor-pointer hover:text-red-500 transition-colors p-1 md:p-1"
              title="Làm lại từ đầu"
            >
              <RotateCcw className="w-4 h-4 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10 min-h-0">
        {/* GAME AREA */}
        <div className="flex-1 relative bg-soph-stone flex flex-col overflow-hidden min-h-0">
          {/* Ambient Glow */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-1000" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at center, rgba(180, 83, 9, 0.15) 0%, transparent 70%)',
              mixBlendMode: 'plus-lighter'
            }} 
          />

          {/* Top Info Bar */}
          <div className="p-0.5 md:p-2 z-10 flex justify-between items-start shrink-0">
            <div className="bg-black/80 border-l-4 border-amber-700 p-1 md:p-2 backdrop-blur-[0.5px] w-28 md:w-64 shadow-2xl relative">
              <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <h2 className="text-amber-500 text-[7px] md:text-[9px] font-display font-bold tracking-widest mb-0.5">Diễn biến</h2>
              <p className="text-[8px] md:text-[11px] italic text-stone-300 leading-tight md:leading-relaxed font-serif line-clamp-2 md:line-clamp-none whitespace-pre-line">
                {state.message}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[6px] md:text-[9px] uppercase tracking-tighter text-stone-500 italic mb-0.5 font-display">Giai đoạn</div>
              <div className="text-[8px] md:text-base text-amber-100 tracking-wider font-bold drop-shadow-lg leading-tight font-display">{currentLevel.name}</div>
            </div>
          </div>

          {/* Room View */}
          <div className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 md:p-4 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              <motion.div 
                key={state.currentLevelId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full h-auto max-w-4xl max-h-full aspect-[4/3] md:aspect-[16/9] border border-stone-800 bg-[#1c1917] rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden group"
              >
                {/* Background image per level */}
                <div className="absolute inset-0 z-0">
                  <div 
                    className="w-full h-full bg-cover bg-center opacity-40 mix-blend-overlay sepia-[0.3] grayscale-[0.2] transition-opacity duration-1000" 
                    style={{ backgroundImage: `url(${currentLevel.background})` }} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/90" />
                </div>

                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-amber-900/50 pointer-events-none"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-amber-900/50 pointer-events-none"></div>

                {/* Overlays for effects */}
                <AnimatePresence>
                  {solveFlash && (
                    <motion.div 
                      key="solve-flash"
                      initial={{ scale: 0.1, opacity: 1 }}
                      animate={{ scale: 3, opacity: 0 }}
                      className="solve-flash"
                      style={{ 
                        left: `${solveFlash.x}%`, 
                        top: `${solveFlash.y}%`,
                        position: 'absolute',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}
                  {levelPuzzlesSolved && (
                    <motion.div 
                      key="level-complete-glow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="level-complete-glow"
                    />
                  )}
                </AnimatePresence>

                {/* Game Objects */}
                {currentLevel.objects.map((obj) => {
                  const isSolved = obj.puzzleId && state.solvedPuzzles.includes(obj.puzzleId);
                  const isExit = obj.id === 'exit_door';
                  
                    return (
                      <div
                        key={`${state.currentLevelId}-${obj.id}`}
                        id={`object-${obj.id}`}
                        style={{ 
                          left: `${obj.position.x}%`, 
                          top: `${obj.position.y}%`,
                          position: 'absolute',
                          zIndex: 10,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <button
                          onClick={() => handleObjectClick(obj)}
                          className="relative group/item cursor-pointer"
                        >
                          <div className={`
                            w-8 h-8 md:w-12 md:h-12 rounded border flex items-center justify-center transition-all bg-black/60
                            ${isSolved 
                              ? 'border-green-500 bg-green-900/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                              : isExit
                                ? `w-14 h-14 md:w-20 md:h-20 gold-glow ${levelPuzzlesSolved ? 'bg-amber-500/20 border-amber-500 historical-pulse importance-shimmer' : 'bg-stone-900 border-amber-900/50 opacity-40'}` 
                                : 'border-stone-600 hover:border-amber-500/70 historical-pulse importance-shimmer'
                            }
                          `}>
                            {isExit ? (
                              <DoorClosed className={`w-6 h-6 md:w-10 md:h-10 ${levelPuzzlesSolved ? 'text-amber-400' : 'text-amber-900'}`} />
                            ) : isSolved ? (
                              <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-green-400" />
                            ) : (
                              <HelpCircle className="w-4 h-4 md:w-6 md:h-6 text-stone-400 group-hover/item:text-amber-500 shimmer-target" />
                            )}
                          </div>
                          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-900/95 text-[8px] md:text-[10px] rounded opacity-0 md:group-hover/item:opacity-100 transition-opacity whitespace-nowrap border border-stone-800 tracking-widest text-stone-400 uppercase pointer-events-none">
                            {obj.name}
                          </span>
                        </button>
                      </div>
                    );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* SIDE PANEL */}
        <aside className="w-full md:w-[450px] bg-soph-surface border-t md:border-t-0 md:border-l border-amber-900/30 p-3 md:p-6 flex flex-col shrink-0 overflow-y-auto max-h-[45vh] md:max-h-full shadow-2xl scrollbar-hide z-20">
          <div className="flex-1 overflow-y-auto pr-1 md:pr-0 scrollbar-hide">
            <h3 className="text-amber-600 text-[8px] md:text-[10px] font-display font-bold mb-2 md:mb-4 tracking-widest flex items-center gap-2 sticky top-0 bg-soph-surface z-10 py-1">
              <History className="w-3 h-3 md:w-4 md:h-4 text-amber-700" /> Tiến Trình Lịch Sử
            </h3>
            <div className="space-y-4 md:space-y-5 relative pl-5 border-l border-amber-900/10 ml-1">
              {LEVELS.map((level, idx) => {
                const isActive = state.currentLevelId === level.id;
                const isCompleted = state.completedLevels.includes(level.id);
                const isLocked = !isActive && !isCompleted;

                return (
                  <div key={level.id} className="relative group/step">
                    {/* Progress dot */}
                    <div className={`absolute -left-[25px] top-1.5 w-3 h-3 rounded-full border-2 z-10 transition-all duration-500 ${
                      isActive ? 'bg-amber-500 border-amber-200 shadow-[0_0_15px_gold] scale-125 historical-pulse' : 
                      isCompleted ? 'bg-green-600 border-green-900' : 
                      'bg-[#1c1917] border-stone-800'
                    }`} />
                    
                    {/* Connection line highlight */}
                    {idx < LEVELS.length - 1 && (
                      <div className={`absolute -left-[20px] top-4 w-[1px] h-6 ${
                        isCompleted ? 'bg-green-900/50' : 'bg-stone-800/30'
                      }`} />
                    )}

                    <div className={`text-[10px] md:text-[13px] font-bold transition-colors leading-tight font-display ${
                      isActive ? 'text-amber-100 italic importance-shimmer' : 
                      isCompleted ? 'text-green-500/60' : 
                      'text-stone-400'
                    }`}>
                        {idx + 1}. {level.name}
                        {isLocked && <span className="ml-1 opacity-20">[Khóa]</span>}
                        {isCompleted && <span className="ml-1 opacity-50 font-serif italic text-[8px]">(Hoàn tất)</span>}
                    </div>
                    <div className={`text-[10px] md:text-sm tracking-widest font-serif mt-1 ${
                      isActive ? 'text-amber-400' : 'text-stone-500'
                    }`}>
                      {level.era}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-stone-800">
            <Inventory 
              items={state.inventory} 
              artifactSlots={LEVELS.length} 
              onItemClick={(item) => setSelectedItem(item)}
            />
          </div>
        </aside>
      </main>



      {/* OVERLAYS */}
      {/* FINAL VICTORY OVERLAY */}
      <AnimatePresence>
        {showFinalVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/95 backdrop-blur-[1px] overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center relative py-12 md:py-20 w-full max-w-4xl"
            >
              <div className="absolute inset-0 bg-amber-500/10 blur-[40px] rounded-full animate-pulse" />
              
              <button
                onClick={() => setShowVideo(true)}
                className="relative z-10 w-48 h-48 md:w-64 md:h-64 bg-amber-900/20 border-2 border-amber-500/50 rounded-full flex items-center justify-center group mb-8 mx-auto shadow-[0_0_80px_rgba(245,158,11,0.3)] hover:shadow-[0_0_120px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer"
              >
                <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/20 to-transparent rounded-full" />
                <Trophy className="w-20 h-20 md:w-32 md:h-32 text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] group-hover:scale-110 transition-transform duration-500" />
                
                {/* Glowing particles */}
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute w-1 h-1 bg-amber-400 rounded-full animate-pulse"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              </button>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl md:text-5xl font-display font-bold text-amber-100 mb-6 tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  Thất Bảo Linh Vật
                </h2>
                <p className="max-w-2xl mx-auto text-amber-500/80 font-display text-sm md:text-xl italic leading-relaxed tracking-widest px-4">
                  "Chúc mừng hào kiệt đã vượt qua mọi cửa ải, thu thập đủ Thất Bảo Linh Vật, non sông nay đã thống nhất."
                </p>
                
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN VIDEO OVERLAY */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          >
             <div className="w-full h-full relative">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/wA6eTiHo8ss?list=RDwA6eTiHo8ss"
                  title="Sử Ký Hùng - Kết Thúc"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                
                <button
                  onClick={() => {
                    setShowVideo(false);
                    setShowFinalVictory(false); // Return to game screen
                    audioService.playAmbient(); // Resume music
                  }}
                  className="absolute bottom-10 right-10 z-[210] bg-black/60 border border-amber-900/50 px-6 py-3 text-amber-100 font-display text-xs md:text-sm tracking-[0.3em] uppercase hover:bg-amber-900/40 transition-all rounded shadow-2xl backdrop-blur-[0.5px] flex items-center gap-2 group"
                >
                  Quay lại <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRITICAL NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {state.isCriticalMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4"
          >
            <div className="bg-red-950/90 border-2 border-red-500 p-8 md:p-12 text-center backdrop-blur-[0.5px] shadow-[0_0_50px_rgba(239,68,68,0.5)]">
              <div className="flex justify-center mb-4">
                <Heart className="w-12 h-12 text-red-500 fill-red-500 animate-bounce" />
              </div>
              <p className="text-red-100 font-display text-lg md:text-2xl font-bold tracking-[0.2em] whitespace-pre-line leading-relaxed uppercase">
                {state.message}
              </p>
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full ${i < state.lives ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-red-950 border border-red-900'}`} 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePuzzle && (
          <PuzzleOverlay 
            puzzle={activePuzzle} 
            onSolve={onPuzzleSolve} 
            onWrongAnswer={onWrongAnswer}
            lives={state.lives}
            aiUses={state.aiUsesCount[activePuzzle.id] || 0}
            onAiUse={() => handleAiUse(activePuzzle.id)}
            onClose={() => setActivePuzzle(null)} 
          />
        )}
        
        {isLoggingIn && (
          <motion.div
            key="login-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[0.5px]"
          >
            <div className="stone-texture p-8 border border-amber-500 rounded flex flex-col items-center gap-4">
              <Cloud className="w-12 h-12 text-amber-500 animate-bounce" />
              <div className="text-amber-100 font-display tracking-[0.2em] uppercase text-xs">Đang kết nối với lịch sử...</div>
            </div>
          </motion.div>
        )}

        {itemRewardNotification && (
          <motion.div
            key="item-reward-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/95 backdrop-blur-[1px]"
          >
            <motion.div
              initial={{ scale: 0.5, y: 100, rotate: 10 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              className="stone-texture max-w-sm w-full rounded border-2 border-amber-500 text-center shadow-[0_0_100px_rgba(251,191,36,0.4)] relative max-h-[90vh] flex flex-col"
            >
              <div className="overflow-y-auto p-8 scrollbar-hide">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 bg-amber-600/20 rounded-full border-2 border-amber-500 flex items-center justify-center animate-pulse">
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-amber-100 mb-6 mt-8 tracking-widest uppercase">Khai Mở Bảo Vật</h2>
                
                <div 
                  className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6 bg-black/40 border border-amber-900/50 p-4 rounded-lg cursor-pointer hover:scale-110 transition-transform gold-glow relative group"
                  onClick={() => {
                    setSelectedItem(itemRewardNotification);
                    setItemRewardNotification(null);
                  }}
                >
                  <img src={itemRewardNotification.imageUrl} alt={itemRewardNotification.name} className="w-full h-full object-contain drop-shadow-[0_0_15px_gold]" />
                  <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                </div>

                <p className="text-lg md:text-xl font-display text-amber-500 font-bold mb-4">{itemRewardNotification.name}</p>
                <p className="text-stone-300 italic mb-8 font-serif leading-relaxed text-sm md:text-base">
                  "Bạn đã nhận được {itemRewardNotification.name}. Cửa của {currentLevel.name} đã được khai mở..."
                </p>

                <button 
                  onClick={() => setItemRewardNotification(null)}
                  className="w-full py-4 bg-amber-800 text-amber-100 uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] font-bold hover:bg-amber-700 transition-all font-display rounded border border-amber-600 active:scale-95"
                >
                  Tiếp tục hành trình
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedItem && (
          <motion.div
            key="item-detail-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-[1px]"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="stone-texture max-w-lg w-full rounded border border-amber-600/50 relative text-center max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-4 right-4 text-stone-500 cursor-pointer hover:text-amber-100 transition-colors z-30 p-2 bg-black/20 rounded-full md:bg-transparent" 
                onClick={() => setSelectedItem(null)}
                aria-label="Close"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="overflow-y-auto p-6 md:p-12 scrollbar-hide">
                <div className="w-40 h-40 md:w-64 md:h-64 mx-auto mb-6 md:mb-8 relative">
                  <div className="absolute inset-0 bg-amber-600/5 rounded-full blur-3xl animate-pulse" />
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_30px_rgba(180,83,9,0.5)]" />
                </div>

                <h2 className="text-xl md:text-3xl font-display font-bold text-amber-100 mb-4 tracking-widest uppercase italic">{selectedItem.name}</h2>
                <div className="w-20 h-0.5 bg-amber-900 mx-auto mb-6" />
                <p className="text-stone-300 font-serif text-sm md:text-lg leading-relaxed italic mb-8">
                  {selectedItem.description}
                </p>

                <button 
                  onClick={() => setSelectedItem(null)}
                  className="px-8 py-3 bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-amber-100 hover:border-amber-900 transition-all rounded font-display text-[10px] md:text-xs tracking-widest uppercase"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLevelComplete && (
          <motion.div
            key="level-complete-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-[0.5px] overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="stone-texture max-w-lg w-full p-6 md:p-10 rounded border-2 border-amber-600 text-center shadow-[0_0_100px_rgba(251,191,36,0.3)] relative my-auto max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <div className="absolute -top-4 -left-4 md:-top-6 md:-left-6 w-8 h-8 md:w-12 md:h-12 border-t-4 border-l-4 border-amber-600" />
              <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 w-8 h-8 md:w-12 md:h-12 border-b-4 border-r-4 border-amber-600" />
              
              <div className="w-14 h-14 md:w-20 md:h-20 bg-amber-600/20 border border-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 animate-bounce">
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
              </div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base md:text-5xl font-display font-bold text-amber-100 mb-2 md:mb-4 tracking-tighter italic text-center break-words"
              >
                Xâm Lăng Bất Thành!
              </motion.h2>
              <p className="text-stone-300 mb-6 md:mb-8 font-serif italic text-sm md:text-lg leading-relaxed">
                "Hào khí ngàn năm, muôn thuở vững bền. Bạn đã khai mở bí ẩn của {currentLevel.name}."
              </p>
              <button 
                onClick={goToNextLevel}
                className="w-full py-4 md:py-5 bg-amber-800 text-amber-100 uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.4em] font-bold flex items-center justify-center gap-3 hover:bg-amber-700 transition-all group font-display shadow-[0_4px_0_rgb(120,53,15)] active:translate-y-1 active:shadow-none"
              >
                Tiến về phía trước <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {showResetConfirm && (
          <motion.div
            key="reset-confirm-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[0.5px]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="stone-texture max-w-sm w-full p-8 rounded border-2 border-red-900/40 text-center shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <RotateCcw className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-amber-100 mb-2 uppercase tracking-widest font-display">Thiết lập lại?</h3>
              <p className="text-stone-400 text-sm mb-8 font-serif italic">Toàn bộ báu vật và hành trình của bạn sẽ bị xóa bỏ. Bạn có chắc chắn muốn bắt đầu lại?</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={resetGame}
                  className="w-full py-3 bg-red-900/60 hover:bg-red-800 border border-red-600 text-red-100 uppercase text-[10px] tracking-widest font-bold transition-all font-display"
                >
                  Xác nhận làm lại
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-3 bg-stone-900/40 hover:bg-stone-800/60 border border-stone-700 text-stone-400 uppercase text-[10px] tracking-widest font-bold transition-all font-display"
                >
                  Hủy bỏ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showIntro && (
          <motion.div
            key="intro-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-[1px] overflow-y-auto"
          >
            <button 
              onClick={() => {
                setShowIntro(false);
                audioService.unlockAudio();
              }}
              className="absolute top-4 right-4 md:top-8 md:right-8 text-stone-500 hover:text-amber-500 uppercase text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] font-display transition-colors group flex items-center gap-2 z-50 p-2"
            >
              Bỏ qua <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>

            <motion.div
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
              className="stone-texture max-w-3xl w-full p-6 md:p-12 rounded border border-amber-900/40 text-stone-200 text-center relative max-h-[85vh] overflow-y-auto scrollbar-hide my-auto"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-amber-900/30" />
              <h2 className="text-3xl md:text-5xl font-bold text-amber-100 mb-4 md:mb-8 tracking-[0.2em] md:tracking-[0.3em] uppercase font-display italic">Sử Ký Hùng</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-left mb-6 md:mb-10 overflow-y-auto max-h-[50vh] pr-2 md:pr-4 scrollbar-hide">
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-amber-600 text-[10px] md:text-xs font-display font-bold tracking-widest uppercase border-b border-amber-900/20 pb-2">Hồi ức Lịch sử</h3>
                  <div className="space-y-2 md:space-y-3 italic text-stone-300 leading-relaxed font-serif text-[11px] md:text-sm">
                    <p>Bạn là một linh hồn lạc bước giữa dòng thời gian đang bị đứt gãy. Chỉ những người am tường sử học mới có thể hàn gắn lại những mãnh vỡ của quá khứ.</p>
                    <p>Hành trình bắt đầu từ những năm tháng Bắc thuộc tăm tối nhưng quật khởi, đi qua các triều đại huy hoàng như Lý, Trần, Lê, cho đến thời đại hiện đại rực rỡ.</p>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h3 className="text-amber-600 text-[10px] md:text-xs font-display font-bold tracking-widest uppercase border-b border-amber-900/20 pb-2 mb-2 md:mb-3">Chỉ dẫn Hành trình</h3>
                    <ul className="space-y-2 text-[10px] md:text-[11px] text-stone-300 font-serif">
                      <li className="flex gap-2"><Search className="w-3 h-3 shrink-0 text-amber-900" /> Tìm kiếm các vật phẩm lấp lánh trong căn phòng.</li>
                      <li className="flex gap-2"><HelpCircle className="w-3 h-3 shrink-0 text-amber-900" /> Giải mã các câu đố lịch sử để nhận Bảo vật.</li>
                      <li className="flex gap-2"><DoorClosed className="w-3 h-3 shrink-0 text-amber-900" /> Thu thập đủ Bảo vật để mở cổng thời gian.</li>
                    </ul>
                  </div>
                  
                  <div className="hidden sm:block">
                    <h3 className="text-amber-600 text-[10px] md:text-xs font-display font-bold tracking-widest uppercase border-b border-amber-900/20 pb-2 mb-2 md:mb-3">Tầm vóc Thời đại</h3>
                    <p className="text-[11px] md:text-xs italic text-amber-100/70 leading-relaxed">Mỗi thời kỳ bạn vượt qua không chỉ là một màn chơi, mà là một minh chứng cho ý chí tự cường của dân tộc qua hàng thiên niên kỷ.</p>
                    <p className="mt-4 text-[9px] text-amber-400/40 uppercase tracking-[0.2em] font-display">Vui lòng bật loa để cảm nhận hào khí sử thi.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIntro(false);
                  audioService.unlockAudio();
                }}
                className="w-full md:w-auto px-10 md:px-20 py-3 md:py-4 bg-amber-800 border border-amber-600 text-amber-100 uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] font-bold hover:bg-amber-700 transition-all active:scale-95 shadow-[0_10px_30px_rgba(180,83,9,0.3)] font-display"
              >
                Khai mở hành trình
              </button>
            </motion.div>
          </motion.div>
        )}

        {state.isGameWon && (
          <motion.div
            key="win-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-soph-surface/90 backdrop-blur-[0.5px] overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="stone-texture max-w-xl w-full p-8 md:p-16 rounded border-2 border-amber-600 text-center shadow-[0_0_100px_rgba(217,119,6,0.3)] my-auto max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <Trophy className="w-16 h-16 md:w-24 md:h-24 text-amber-500 mx-auto mb-6 md:mb-8 animate-bounce" />
              <h2 className="text-3xl md:text-5xl font-bold text-amber-100 mb-3 md:mb-4 tracking-widest uppercase font-display">Nhân Kiệt Đại Thành</h2>
              <p className="text-stone-400 italic mb-6 md:mb-10 text-sm md:text-lg leading-relaxed font-serif">Chúc mừng bạn đã hoàn thành hành trình xuyên không gian và thời gian, thấu hiểu trọn vẹn tiến trình lịch sử Việt Nam qua các thời đại rực rỡ nhất.</p>
              <div className="p-4 md:p-6 bg-black/40 border border-amber-900/30 rounded mb-6 md:mb-10 text-[10px] md:text-xs">
                 <p className="mb-2 text-amber-600 uppercase font-bold tracking-widest font-display">Bản tin chiến thắng</p>
                 <p className="text-stone-500 font-serif">Người chơi: {state.inventory.length} bảo vật đã được quy tụ. Thời gian đã được ổn định. Đất nước thái bình.</p>
              </div>
              <iframe width="100%" height="315" src="https://www.youtube.com/embed/wA6eTiHo8ss?si=bdHl7nRglfb4OK3J" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
              <br/>
              <button onClick={resetGame} className="w-full md:w-auto px-8 md:px-12 py-3 md:py-4 bg-amber-800 text-amber-100 uppercase text-[10px] md:text-xs tracking-widest border border-amber-600 animate-pulse font-display">
                Khởi đầu lại từ đầu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
