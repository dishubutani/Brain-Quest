import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  Rocket, 
  PawPrint, 
  Calculator, 
  History, 
  Leaf, 
  Trophy, 
  ArrowRight, 
  RotateCcw, 
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft
} from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import confetti from "canvas-confetti";
import { cn } from "./lib/utils";

// --- Types ---

type AgeGroup = "3-5" | "6-10" | "11-15";

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface GameState {
  screen: "welcome" | "age-select" | "category-select" | "loading" | "playing" | "results";
  ageGroup: AgeGroup | null;
  category: Category | null;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  showExplanation: boolean;
  lastAnswerCorrect: boolean | null;
}

// --- Constants ---

const CATEGORIES: Category[] = [
  { 
    id: "animals", 
    name: "Animals", 
    icon: <PawPrint className="w-6 h-6" />, 
    color: "bg-orange-500",
    description: "Discover creatures from all over the world!"
  },
  { 
    id: "space", 
    name: "Space", 
    icon: <Rocket className="w-6 h-6" />, 
    color: "bg-indigo-600",
    description: "Explore stars, planets, and the universe!"
  },
  { 
    id: "math", 
    name: "Math", 
    icon: <Calculator className="w-6 h-6" />, 
    color: "bg-emerald-500",
    description: "Fun numbers and logic puzzles!"
  },
  { 
    id: "history", 
    name: "History", 
    icon: <History className="w-6 h-6" />, 
    color: "bg-amber-700",
    description: "Travel back in time to meet famous people!"
  },
  { 
    id: "nature", 
    name: "Nature", 
    icon: <Leaf className="w-6 h-6" />, 
    color: "bg-green-600",
    description: "Learn about plants, trees, and our Earth!"
  },
];

const AGE_GROUPS = [
  { id: "3-5", label: "Little Explorers", range: "Ages 3-5", emoji: "🐣" },
  { id: "6-10", label: "Junior Detectives", range: "Ages 6-10", emoji: "🕵️‍♂️" },
  { id: "11-15", label: "Master Minds", range: "Ages 11-15", emoji: "🧠" },
];

// --- Main Component ---

export default function App() {
  const [state, setState] = useState<GameState>({
    screen: "welcome",
    ageGroup: null,
    category: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    showExplanation: false,
    lastAnswerCorrect: null,
  });

  const [loadingMessage, setLoadingMessage] = useState("Preparing your quest...");

  // --- Gemini Logic ---

  const generateQuestions = useCallback(async (age: AgeGroup, category: Category) => {
    setLoadingMessage(`Generating ${category.name} questions for ${age} year olds...`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 5 multiple-choice questions for children aged ${age} about ${category.name}. 
        The questions should be educational, engaging, and age-appropriate.
        For age 3-5, keep it very simple and visual.
        For age 6-10, use basic facts and logic.
        For age 11-15, include more complex concepts and critical thinking.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The question text" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Exactly 4 options"
                },
                correctIndex: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                explanation: { type: Type.STRING, description: "A short, encouraging explanation of why the answer is correct" }
              },
              required: ["text", "options", "correctIndex", "explanation"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]") as Question[];
      setState(prev => ({ 
        ...prev, 
        questions: data, 
        screen: "playing",
        currentQuestionIndex: 0,
        score: 0
      }));
    } catch (error) {
      console.error("Failed to generate questions:", error);
      // Fallback or error state
      setLoadingMessage("Oops! Something went wrong. Let's try again.");
      setTimeout(() => setState(prev => ({ ...prev, screen: "category-select" })), 2000);
    }
  }, []);

  // --- Handlers ---

  const handleStart = () => setState(prev => ({ ...prev, screen: "age-select" }));

  const selectAge = (age: AgeGroup) => setState(prev => ({ ...prev, ageGroup: age, screen: "category-select" }));

  const selectCategory = (cat: Category) => {
    setState(prev => ({ ...prev, category: cat, screen: "loading" }));
    if (state.ageGroup) {
      generateQuestions(state.ageGroup, cat);
    }
  };

  const handleAnswer = (index: number) => {
    if (state.showExplanation) return;

    const currentQ = state.questions[state.currentQuestionIndex];
    const isCorrect = index === currentQ.correctIndex;

    if (isCorrect) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F97316', '#10B981', '#6366F1']
      });
    }

    setState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      lastAnswerCorrect: isCorrect,
      showExplanation: true
    }));
  };

  const nextQuestion = () => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        showExplanation: false,
        lastAnswerCorrect: null
      }));
    } else {
      setState(prev => ({ ...prev, screen: "results" }));
    }
  };

  const restart = () => setState({
    screen: "welcome",
    ageGroup: null,
    category: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    showExplanation: false,
    lastAnswerCorrect: null,
  });

  // --- Render Helpers ---

  const renderWelcome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto px-4"
    >
      <div className="relative">
        <div className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full" />
        <Brain className="w-24 h-24 text-orange-500 relative animate-pulse" />
      </div>
      
      <div className="space-y-4">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900">
          BRAIN<span className="text-orange-500">QUEST</span>
        </h1>
        <p className="text-xl text-slate-600 font-medium">
          The ultimate knowledge adventure for curious minds!
        </p>
      </div>

      <button 
        onClick={handleStart}
        className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-orange-500/20"
      >
        <span className="flex items-center gap-2">
          Start Your Quest <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>

      <div className="grid grid-cols-3 gap-4 pt-8">
        {['Fun Quizzes', 'Earn Badges', 'Learn Daily'].map((feat, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{feat}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderAgeSelect = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 max-w-4xl mx-auto px-4"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Choose Your Level</h2>
        <p className="text-slate-500">We'll tailor the quest just for you!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AGE_GROUPS.map((group) => (
          <button
            key={group.id}
            onClick={() => selectAge(group.id as AgeGroup)}
            className="group p-8 bg-white border-2 border-slate-100 rounded-3xl text-left transition-all hover:border-orange-500 hover:shadow-2xl hover:-translate-y-2"
          >
            <div className="text-5xl mb-4">{group.emoji}</div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-orange-500 transition-colors">{group.label}</h3>
            <p className="text-slate-500 font-medium">{group.range}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderCategorySelect = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 max-w-5xl mx-auto px-4"
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setState(prev => ({ ...prev, screen: "age-select" }))}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-left">
          <h2 className="text-3xl font-bold text-slate-900">Pick a Subject</h2>
          <p className="text-slate-500">What do you want to learn about today?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat)}
            className="group relative overflow-hidden p-8 bg-white border-2 border-slate-100 rounded-3xl text-left transition-all hover:shadow-2xl hover:-translate-y-1"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110", cat.color)}>
              {cat.icon}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{cat.name}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{cat.description}</p>
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-6 h-6 text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center space-y-8 py-20">
      <div className="relative w-24 h-24">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-slate-100 border-t-orange-500 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="w-10 h-10 text-orange-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-slate-900">Knowledge Loading...</h3>
        <p className="text-slate-500 animate-pulse">{loadingMessage}</p>
      </div>
    </div>
  );

  const renderPlaying = () => {
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ) return null;

    const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl text-white", state.category?.color)}>
              {state.category?.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{state.category?.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Question {state.currentQuestionIndex + 1} of {state.questions.length}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-orange-500">{state.score}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Points</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={cn("h-full transition-all duration-500", state.category?.color)}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={state.currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border-2 border-slate-50 space-y-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
              {currentQ.text}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {currentQ.options.map((option, i) => (
                <button
                  key={i}
                  disabled={state.showExplanation}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "group p-6 rounded-2xl text-left border-2 transition-all flex items-center justify-between",
                    !state.showExplanation 
                      ? "border-slate-100 hover:border-orange-500 hover:bg-orange-50 active:scale-[0.98]" 
                      : i === currentQ.correctIndex 
                        ? "border-emerald-500 bg-emerald-50" 
                        : state.lastAnswerCorrect === false && i === state.questions[state.currentQuestionIndex].correctIndex
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-100 opacity-50"
                  )}
                >
                  <span className={cn(
                    "text-lg font-bold",
                    state.showExplanation && i === currentQ.correctIndex ? "text-emerald-700" : "text-slate-700"
                  )}>
                    {option}
                  </span>
                  {state.showExplanation && i === currentQ.correctIndex && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Explanation Overlay */}
        <AnimatePresence>
          {state.showExplanation && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center gap-6",
                state.lastAnswerCorrect ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                state.lastAnswerCorrect ? "bg-emerald-500" : "bg-orange-500"
              )}>
                {state.lastAnswerCorrect ? <Trophy className="w-8 h-8 text-white" /> : <Info className="w-8 h-8 text-white" />}
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h4 className={cn("font-bold text-lg", state.lastAnswerCorrect ? "text-emerald-900" : "text-orange-900")}>
                  {state.lastAnswerCorrect ? "Great Job!" : "Not Quite, But Keep Learning!"}
                </h4>
                <p className="text-slate-600 font-medium">{currentQ.explanation}</p>
              </div>
              <button 
                onClick={nextQuestion}
                className={cn(
                  "px-8 py-4 rounded-2xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
                  state.lastAnswerCorrect ? "bg-emerald-500" : "bg-orange-500"
                )}
              >
                {state.currentQuestionIndex === state.questions.length - 1 ? "Finish Quest" : "Next Question"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderResults = () => {
    const percentage = (state.score / state.questions.length) * 100;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto px-4 text-center space-y-10"
      >
        <div className="relative inline-block">
          <div className="absolute -inset-10 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-50">
            <Trophy className="w-24 h-24 text-orange-500 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-slate-900 mb-2">Quest Complete!</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest mb-8">You are a {state.ageGroup === "3-5" ? "Little Explorer" : state.ageGroup === "6-10" ? "Junior Detective" : "Master Mind"}!</p>
            
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-4xl font-black text-slate-900">{state.score}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">Correct</p>
              </div>
              <div className="w-px h-12 bg-slate-100" />
              <div className="text-center">
                <p className="text-4xl font-black text-slate-900">{state.questions.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
              </div>
              <div className="w-px h-12 bg-slate-100" />
              <div className="text-center">
                <p className="text-4xl font-black text-orange-500">{Math.round(percentage)}%</p>
                <p className="text-xs font-bold text-slate-400 uppercase">Score</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl text-left">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Tutor's Feedback
              </h4>
              <p className="text-slate-600 text-sm italic">
                {percentage === 100 
                  ? "Perfect score! You've mastered this subject. Why not try a different category or a harder level?"
                  : percentage >= 60 
                    ? "Great effort! You clearly know your stuff. A little more practice and you'll be an expert!"
                    : "Good try! Every question is a chance to learn something new. Let's try again!"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={restart}
            className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>
          <button 
            onClick={() => setState(prev => ({ ...prev, screen: "category-select", score: 0, currentQuestionIndex: 0 }))}
            className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Change Subject
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans selection:bg-orange-200">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={restart}>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-orange-500" />
          </div>
          <span className="text-xl font-black tracking-tighter">BRAINQUEST</span>
        </div>
        
        {state.screen !== "welcome" && (
          <div className="flex items-center gap-4">
            {state.ageGroup && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm">
                <span className="text-sm font-bold text-slate-600">{AGE_GROUPS.find(g => g.id === state.ageGroup)?.label}</span>
              </div>
            )}
            <button 
              onClick={restart}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              title="Restart Game"
            >
              <RotateCcw className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="relative z-10 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {state.screen === "welcome" && renderWelcome()}
          {state.screen === "age-select" && renderAgeSelect()}
          {state.screen === "category-select" && renderCategorySelect()}
          {state.screen === "loading" && renderLoading()}
          {state.screen === "playing" && renderPlaying()}
          {state.screen === "results" && renderResults()}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center">
        <p className="text-slate-400 text-sm font-medium">
          Powered by Gemini AI • Made for curious minds
        </p>
      </footer>
    </div>
  );
}
