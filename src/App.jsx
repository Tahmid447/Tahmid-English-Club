import React, { useState, useEffect, useMemo } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { 
  BookOpen, Star, Award, User, LogOut, Volume2, 
  CheckCircle, XCircle, ArrowRight, Edit3, Trash2, Plus, 
  X, History, School, Users, UploadCloud, Layers, 
  Home, Headphones, Music, Smile, Key, Calendar, 
  Shuffle, Play, Trophy, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Teacher account email (used both for Firebase login check and dashboard routing)
const TEACHER_EMAIL = "tahmidhc245@gmail.com";
// --- 1. CONFIGURATION & MOCK DATA ---

// 初期データ
const INITIAL_DATA = {
  vocab: [
    { id: 'v1', word: 'Elephant', meaning: 'ぞう', emoji: '🐘', category: 'animals', createdAt: Date.now() },
    { id: 'v2', word: 'Delicious', meaning: 'おいしい', emoji: '😋', category: 'adjectives', createdAt: Date.now() },
    { id: 'v3', word: 'Rainbow', meaning: 'にじ', emoji: '🌈', category: 'nature', createdAt: Date.now() },
  ],
  quiz: [
    { 
      id: 'q1', 
      type: 'grammar', 
      title: 'Unit 1 Grammar', 
      date: '2025-12-16',
      question: 'I ___ playing soccer now.', 
      options: ['is', 'am', 'are', 'be'], 
      correctAnswer: 'am', 
      explanation: '主語が "I" なので "am" を使います。',
      category: 'grammar',
    },
    { 
      id: 'q2', 
      type: 'sorting', 
      title: 'Unit 1 Grammar', 
      date: '2025-12-16',
      question: '並べ替えて「これはペンです」にしなさい。', 
      options: ['a', 'This', 'pen', 'is'], 
      correctAnswer: 'This is a pen', 
      explanation: 'This (これ) + is (は) + a pen (ペンです)。',
      category: 'grammar',
    }
  ],
  users: [
    { id: 'haru', name: 'Haru', role: 'student', gender: 'girl', pass: 'haru123', age: 10 },
    { id: 'kan', name: 'Kansuke', role: 'student', gender: 'boy', pass: 'kan123', age: 8 },
    { id: 'sasa', name: 'Sasa', role: 'student', gender: 'boy', pass: 'sasa123', age: 9 },
  ],
  results: [],
};

// --- ローカルストレージ管理 (LocalDB) ---
class LocalDB {
  static get(key) {
    try {
      const data = localStorage.getItem(`tec_v5_${key}`);
      return data ? JSON.parse(data) : INITIAL_DATA[key] || [];
    } catch (e) {
      console.error("Load error", e);
      return [];
    }
  }

  static set(key, data) {
    try {
      localStorage.setItem(`tec_v5_${key}`, JSON.stringify(data));
      // データの変更を即座に通知
      window.dispatchEvent(new Event('storageUpdated'));
    } catch (e) {
      console.error("Save error", e);
    }
  }

  static add(collection, item) {
    const list = this.get(collection);
    // ID重複チェック (Usersのみ)
    if (collection === 'users' && list.find(u => u.id === item.id)) {
      throw new Error('ID already exists (IDが重複しています)');
    }
    const newItem = { 
      ...item, 
      id: item.id || Math.random().toString(36).substr(2, 9), 
      createdAt: Date.now() 
    };
    list.push(newItem);
    this.set(collection, list);
    return newItem;
  }

  static update(collection, id, updates) {
    const list = this.get(collection);
    const index = list.findIndex(i => i.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      this.set(collection, list);
    }
  }

  static delete(collection, id) {
    const list = this.get(collection);
    const newList = list.filter(i => i.id !== id);
    this.set(collection, newList);
  }
  
  static clear(collection) {
    this.set(collection, []);
  }
}

// --- 2. UTILS ---
const playSound = (type) => {
  const sounds = {
    click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_22659e9c9a.mp3',
    correct: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
    wrong: 'https://cdn.pixabay.com/audio/2021/08/04/audio_8b056e408e.mp3',
    success: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3',
    pop: 'https://cdn.pixabay.com/audio/2022/03/24/audio_824e8e1694.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

const speak = (text) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9; 
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang.includes('en-US'));
  if (preferredVoice) u.voice = preferredVoice;
  window.speechSynthesis.speak(u);
};

// --- 3. SHARED COMPONENTS ---

const BackgroundPattern = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#FFFBF5]">
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-200/30 blur-3xl animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-200/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-pink-200/30 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
  </div>
);

const EmptyState = ({ text, icon: Icon = Layers }) => (
  <div className="text-center py-12 px-4 bg-white/60 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
    <motion.div 
      animate={{ y: [0, -10, 0] }} 
      transition={{ repeat: Infinity, duration: 2 }}
      className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 text-slate-400 shadow-sm"
    >
      <Icon size={32} />
    </motion.div>
    <p className="text-slate-400 font-bold">{text}</p>
  </div>
);

// --- 4. LOGIN SCREEN ---
const LoginScreen = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      // If ID contains "@", treat it as teacher email login (Firebase)
      if (id.includes("@")) {
        const cred = await signInWithEmailAndPassword(auth, id, pass);
      
        // ✅ only allow YOUR email as teacher
        if (cred.user.email !== "tahmidhc245@gmail.com") {
          throw new Error("Not authorized");
        }
      
        playSound("success");
      
        onLogin({
          id: "Teacher",
          name: "Tahamid Teacher",
          role: "teacher",
          email: cred.user.email,
        });
      
        setLoading(false);
        return;
      }
  
      // Otherwise, keep your existing student login (LocalDB)
      const users = LocalDB.get("users");
      const user = users.find(
        (u) => u.id.toLowerCase() === id.toLowerCase() && u.pass === pass
      );
  
      if (user) {
        playSound("success");
        onLogin(user);
      } else {
        playSound("wrong");
        setError("ID または パスワード がちがいます");
        setLoading(false);
      }
    } catch (err) {
      playSound("wrong");
      setError("Firebase login failed (email/password wrong)");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFD166] via-[#FF9F1C] to-[#EF476F] p-4 overflow-hidden relative">
      {/* Moving Background Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div 
          key={i}
          className="absolute bg-white/20 rounded-full"
          initial={{ x: Math.random() * window.innerWidth, y: window.innerHeight + 100, scale: Math.random() * 0.5 + 0.5 }}
          animate={{ y: -100, rotate: 360 }}
          transition={{ duration: 10 + Math.random() * 10, repeat: Infinity, ease: "linear" }}
          style={{ width: 50 + Math.random() * 100, height: 50 + Math.random() * 100 }}
        />
      ))}

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl p-8 max-w-sm w-full text-center border-[6px] border-white/50 ring-4 ring-orange-200/50 relative z-10"
      >
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-28 h-28 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl"
        >
          <School className="text-white w-14 h-14" />
        </motion.div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Tahamid<br/><span className="text-orange-500">English Club</span></h1>
        <p className="text-slate-400 font-bold mb-8 text-sm">Let's learn together!</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID (おなまえ)" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-lg outline-none border-2 border-transparent focus:border-orange-300 focus:bg-white transition-all shadow-inner" />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="PASSWORD (パスワード)" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold text-lg outline-none border-2 border-transparent focus:border-orange-300 focus:bg-white transition-all shadow-inner" />
          </div>
          {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-bold bg-red-50 py-2 rounded-xl flex items-center justify-center gap-1"><XCircle size={16}/>{error}</motion.div>}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="submit" disabled={loading} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
            {loading ? 'Loading...' : <>START <ArrowRight/></>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

// --- 5. QUIZ GAME (Interactive) ---

const QuizGame = ({ user, questions = [], onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); 
  const [selectedWords, setSelectedWords] = useState([]); 

  const q = questions[currentIndex];

  const handleSortingSelect = (word) => {
    playSound('pop');
    if (selectedWords.includes(word)) setSelectedWords(prev => prev.filter(w => w !== word));
    else setSelectedWords(prev => [...prev, word]);
  };

  const checkAnswer = () => {
    let isCorrect = false;
    const normalize = (str) => String(str).toLowerCase().replace(/[.,?!]/g, '').trim();

    if (q.type === 'sorting') {
      const answerString = selectedWords.join(' ');
      if (normalize(answerString) === normalize(q.correctAnswer)) isCorrect = true;
    } else {
      if (normalize(userAnswer) === normalize(q.correctAnswer)) isCorrect = true;
    }

    if (isCorrect) {
      playSound('correct');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setScore(s => s + 1);
      setFeedback('correct');
      LocalDB.add('results', { studentId: user.id, studentName: user.name, question: q.question, isCorrect: true, date: Date.now() });
    } else {
      playSound('wrong');
      setFeedback('wrong');
      LocalDB.add('results', { studentId: user.id, studentName: user.name, question: q.question, isCorrect: false, date: Date.now() });
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setUserAnswer('');
    setSelectedWords([]);
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
    else { setShowResult(true); playSound('success'); }
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="mb-6">
          <Trophy className="w-40 h-40 text-yellow-400 drop-shadow-2xl" strokeWidth={1} />
        </motion.div>
        <h2 className="text-4xl font-black text-slate-800 mb-2">Great Job!</h2>
        <p className="text-slate-400 font-bold mb-8 text-lg">You finished the homework!</p>
        <div className="text-7xl font-black text-orange-500 mb-10 tracking-tighter">{score} / {questions.length}</div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-xl text-lg">
          Finish (おわり)
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"><X size={24} className="text-slate-400"/></button>
        <div className="flex gap-1">
          {questions.map((_, i) => (
             <motion.div key={i} animate={{ scale: i === currentIndex ? 1.2 : 1 }} className={`h-3 w-3 rounded-full transition-colors ${i <= currentIndex ? 'bg-orange-400' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="font-bold text-slate-400 bg-white px-3 py-1 rounded-full text-sm shadow-sm">Q.{currentIndex + 1}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar justify-center">
        {questions.map((_, i) => (
          <button key={i} onClick={() => {setFeedback(null); setUserAnswer(''); setSelectedWords([]); setCurrentIndex(i);}} className={`w-12 h-12 rounded-2xl font-bold flex-shrink-0 transition-all ${i === currentIndex ? 'bg-orange-500 text-white shadow-lg scale-110' : 'bg-white text-slate-400 border-2 border-slate-100'}`}>{i + 1}</button>
        ))}
      </div>

      <motion.div 
        key={currentIndex} 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="bg-white rounded-[2.5rem] p-6 shadow-xl border-4 border-slate-50 flex-1 flex flex-col overflow-y-auto relative"
      >
        {q.imageUrl && <img src={q.imageUrl} alt="Quiz" className="w-full h-48 object-contain rounded-2xl mb-4 border-2 border-slate-100 bg-slate-50" />}
        
        {q.type === 'listening' && (
          <div className="flex justify-center mb-6">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => speak(q.correctAnswer)} className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 shadow-lg border-4 border-blue-50"><Headphones size={40} /></motion.button>
          </div>
        )}

        <h3 className="text-2xl font-black text-slate-800 mb-6 leading-relaxed whitespace-pre-line text-center">{q.question}</h3>
        
        <div className="flex-1">
          {feedback ? (
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`p-6 rounded-3xl text-center border-4 ${feedback === 'correct' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
               <div className={`font-black text-3xl mb-4 flex items-center justify-center gap-2 ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                 {feedback === 'correct' ? <><CheckCircle size={40} /> PERFECT!</> : <><XCircle size={40} /> NICE TRY!</>}
               </div>
               
               <div className="bg-white/80 p-5 rounded-2xl shadow-sm text-left mb-4">
                 <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Correct Answer</p>
                 <p className="text-xl font-black text-slate-800">{q.correctAnswer}</p>
               </div>
               <p className="text-slate-600 font-bold mb-6 text-lg">{q.explanation}</p>
               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={nextQuestion} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-xl shadow-lg flex items-center justify-center gap-2">NEXT <ArrowRight /></motion.button>
             </motion.div>
          ) : (
            <div className="space-y-4">
              {q.type === 'grammar' && (
                <div className="grid gap-3">
                  {q.options.map((opt, i) => (
                    <motion.button whileTap={{ scale: 0.98 }} key={i} onClick={() => setUserAnswer(opt)} className={`w-full p-5 text-left font-bold text-xl border-2 rounded-2xl transition-all shadow-sm ${userAnswer === opt ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>{opt}</motion.button>
                  ))}
                </div>
              )}
              {q.type === 'image_select' && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt, i) => (
                     <motion.button whileTap={{ scale: 0.95 }} key={i} onClick={() => setUserAnswer(opt)} className={`p-2 border-4 rounded-3xl transition-all overflow-hidden aspect-square ${userAnswer === opt ? 'border-orange-400 bg-orange-50' : 'border-slate-100 bg-white'}`}>
                       <img src={opt} className="w-full h-full object-cover rounded-2xl" />
                     </motion.button>
                  ))}
                </div>
              )}
              {q.type === 'sorting' && (
                <>
                  <div className="bg-slate-100 p-4 rounded-3xl min-h-[80px] flex flex-wrap gap-2 border-2 border-slate-200 border-dashed justify-center items-center">
                    {selectedWords.length === 0 && <span className="text-slate-400 font-bold opacity-50">ことばを タップ してね</span>}
                    {selectedWords.map((w, i) => (
                      <motion.button layout initial={{ scale: 0 }} animate={{ scale: 1 }} key={`${w}-${i}`} onClick={() => handleSortingSelect(w)} className="bg-white px-4 py-2 rounded-xl font-bold shadow-sm text-slate-700 flex items-center gap-2 border border-slate-200 text-lg">{w} <X size={14} className="text-red-400"/></motion.button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {q.options.map((opt, i) => {
                      const optCount = q.options.filter(o => o === opt).length;
                      const selCount = selectedWords.filter(s => s === opt).length;
                      const disabled = selCount >= optCount;
                      return (
                        <motion.button whileTap={{ scale: 0.9 }} key={i} onClick={() => !disabled && handleSortingSelect(opt)} disabled={disabled} className={`px-5 py-3 rounded-2xl font-bold border-b-4 transition-all text-lg ${disabled ? 'opacity-30 scale-95 bg-slate-200' : 'bg-white text-indigo-600 border-indigo-100 shadow-sm hover:-translate-y-1'}`}>{opt}</motion.button>
                      )
                    })}
                  </div>
                </>
              )}
              {(q.type === 'writing' || q.type === 'listening') && (
                 <input value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="ここに かいてね" className="w-full p-6 text-3xl font-bold text-center rounded-3xl border-4 border-slate-100 focus:border-orange-400 outline-none text-slate-700 placeholder:text-slate-300" autoComplete="off" />
              )}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={checkAnswer} disabled={(!userAnswer && q.type !== 'sorting') || (q.type === 'sorting' && selectedWords.length === 0)} className="w-full py-5 mt-6 bg-orange-500 text-white rounded-2xl font-black text-2xl shadow-xl shadow-orange-200 hover:shadow-2xl transition-all disabled:opacity-50 disabled:shadow-none">CHECK! (こたえあわせ)</motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- 6. STUDENT DASHBOARD (Joyful UI) ---

const StudentDashboard = ({ user, onLogout }) => {
  const [tab, setTab] = useState('home'); 
  const [vocabList, setVocabList] = useState([]);
  const [quizList, setQuizList] = useState([]);
  const [activeQuizSet, setActiveQuizSet] = useState([]);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    const loadData = () => {
      setVocabList(LocalDB.get('vocab'));
      setQuizList(LocalDB.get('quiz'));
      const freshUser = LocalDB.get('users').find(u => u.id === user.id);
      if (freshUser) setCurrentUser(freshUser);
    };
    loadData();
    window.addEventListener('storageUpdated', loadData);
    return () => window.removeEventListener('storageUpdated', loadData);
  }, []);

  const groupedQuizzes = useMemo(() => {
    const groups = {};
    quizList.forEach(q => {
      const key = `${q.title || 'Homework'}_${q.date || 'No Date'}`;
      if (!groups[key]) groups[key] = { title: q.title || 'Homework', date: q.date || '', items: [] };
      groups[key].items.push(q);
    });
    return Object.values(groups);
  }, [quizList]);

  // --- Student Profile Editing ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const startEdit = () => {
    setEditForm({ ...currentUser });
    setIsEditing(true);
  };

  const saveProfile = () => {
    if (!editForm.name || !editForm.pass) return alert("Name and Password are required");
    LocalDB.update('users', currentUser.id, editForm);
    setIsEditing(false);
    playSound('success');
  };

  if (tab === 'quiz') return <div className="fixed inset-0 bg-[#FFFBF5] z-50 overflow-y-auto"><BackgroundPattern/><QuizGame user={currentUser} questions={activeQuizSet} onClose={() => setTab('home')} /></div>;

  return (
    <div className="min-h-screen pb-28 font-sans relative overflow-hidden">
      <BackgroundPattern />
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 p-4 rounded-b-[2rem] shadow-sm border-b border-orange-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.9 }} className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-3xl border-4 border-white shadow-md ${currentUser.gender === 'girl' ? 'bg-pink-100' : 'bg-blue-100'}`}>{currentUser.gender === 'girl' ? '👧' : '👦'}</motion.div>
          <div><h1 className="font-black text-slate-800 leading-tight text-lg">Hi, {currentUser.name}!</h1><div className="text-xs font-bold text-white bg-orange-400 px-3 py-1 rounded-full inline-block shadow-sm">Student</div></div>
        </div>
        <button onClick={onLogout} className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 hover:bg-slate-50"><LogOut size={20}/></button>
      </header>

      {tab === 'home' && (
        <main className="p-4 space-y-8">
          <section>
             <h2 className="font-black text-slate-700 text-xl mb-3 flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400" size={28}/> Homework Missions</h2>
             {groupedQuizzes.length === 0 ? (
               <div className="bg-white/60 p-8 rounded-[2rem] text-center text-slate-400 font-bold border-2 border-dashed border-slate-200">
                 <Smile size={48} className="mx-auto mb-2 text-slate-300"/>
                 No Homework Today! <br/>(きょうは しゅくだい ないよ)
               </div> 
             ) : (
               <div className="grid gap-4">
                 {groupedQuizzes.map((group, i) => (
                   <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => { setActiveQuizSet(group.items); setTab('quiz'); }} className="w-full bg-white p-5 rounded-[2.5rem] shadow-lg border-2 border-white ring-2 ring-slate-100 flex items-center justify-between group relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full translate-x-10 -translate-y-10 z-0"/>
                     <div className="flex items-center gap-5 text-left relative z-10">
                       <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 text-white flex flex-col items-center justify-center font-bold shadow-lg border-4 border-white">
                         <span className="text-[10px] opacity-90 font-black">DEC</span>
                         <span className="text-2xl leading-none font-black">{new Date(group.date || Date.now()).getDate()}</span>
                       </div>
                       <div>
                         <div className="font-black text-slate-700 text-xl line-clamp-1">{group.title}</div>
                         <div className="text-xs text-slate-400 font-bold flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg w-fit mt-1"><Layers size={12}/> {group.items.length} Questions</div>
                       </div>
                     </div>
                     <div className="bg-slate-800 p-3 rounded-full text-white shadow-lg relative z-10 group-hover:scale-110 transition-transform"><ArrowRight size={24} /></div>
                   </motion.button>
                 ))}
               </div>
             )}
          </section>

          <section>
            <h2 className="font-black text-slate-700 text-xl mb-3 flex items-center gap-2"><BookOpen className="text-green-500" size={28}/> Vocabulary <span className="text-sm font-bold text-slate-400 bg-white px-2 py-1 rounded-lg">Words</span></h2>
            <div className="grid grid-cols-2 gap-4">
              {vocabList.map(v => (
                <motion.div key={v.id} whileHover={{ y: -5, rotate: 2 }} whileTap={{ scale: 0.95 }} onClick={() => speak(v.word)} className="bg-white p-5 rounded-[2.5rem] shadow-md border-b-8 border-slate-100 flex flex-col items-center justify-center cursor-pointer border-2 border-t-white border-l-white border-r-white">
                  <div className="text-6xl mb-3 drop-shadow-sm">{v.emoji}</div>
                  <h3 className="text-xl font-black text-slate-700">{v.word}</h3>
                  <span className="text-sm font-bold text-slate-400 bg-slate-50 px-2 rounded mt-1">{v.meaning}</span>
                </motion.div>
              ))}
            </div>
          </section>
        </main>
      )}

      {tab === 'profile' && (
        <div className="p-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-white ring-4 ring-slate-50 text-center relative">
             <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-6xl mb-4 border-8 border-white shadow-2xl ${currentUser.gender === 'girl' ? 'bg-pink-100' : 'bg-blue-100'}`}>{currentUser.gender === 'girl' ? '👧' : '👦'}</div>
             
             {isEditing ? (
               <div className="space-y-4 text-left max-w-sm mx-auto mt-6">
                 <div><label className="text-xs font-bold text-slate-400 ml-1">Name (なまえ)</label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-orange-300 outline-none"/></div>
                 <div><label className="text-xs font-bold text-slate-400 ml-1">Password (パスワード)</label><input value={editForm.pass} onChange={e => setEditForm({...editForm, pass: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-orange-300 outline-none"/></div>
                 <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-xs font-bold text-slate-400 ml-1">Age</label><input type="number" value={editForm.age} onChange={e => setEditForm({...editForm, age: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100"/></div>
                   <div><label className="text-xs font-bold text-slate-400 ml-1">Gender</label><select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100"><option value="boy">Boy</option><option value="girl">Girl</option></select></div>
                 </div>
                 <div className="flex gap-2 mt-4">
                   <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl">Cancel</button>
                   <button onClick={saveProfile} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg">Save!</button>
                 </div>
               </div>
             ) : (
               <>
                 <h2 className="text-3xl font-black text-slate-800 mb-1">{currentUser.name}</h2>
                 <p className="text-slate-400 font-bold mb-6 flex justify-center gap-3">
                   <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">ID: {currentUser.id}</span>
                   <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">Age: {currentUser.age}</span>
                   <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">Pass: {currentUser.pass}</span>
                 </p>
                 <motion.button whileTap={{ scale: 0.95 }} onClick={startEdit} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 mx-auto">
                   <Edit3 size={18}/> Edit Profile (へんしゅう)
                 </motion.button>
               </>
             )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-2 flex justify-around border border-white/50 z-40">
        <button onClick={() => setTab('home')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center transition-colors ${tab === 'home' ? 'bg-orange-50 text-orange-500' : 'text-slate-300'}`}><Home size={28} fill={tab === 'home' ? "currentColor" : "none"} /><span className="text-[10px] font-black mt-1">HOME</span></button>
        <button onClick={() => setTab('profile')} className={`flex-1 py-3 rounded-2xl flex flex-col items-center transition-colors ${tab === 'profile' ? 'bg-orange-50 text-orange-500' : 'text-slate-300'}`}><User size={28} fill={tab === 'profile' ? "currentColor" : "none"} /><span className="text-[10px] font-black mt-1">PROFILE</span></button>
      </nav>
    </div>
  );
};

// --- 7. TEACHER EDITOR (Fixed & Simplified) ---

const TeacherEditor = ({ item, tab, onClose, onSave }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!item) {
      if (tab === 'vocab') setFormData({ word: '', meaning: '', emoji: '📝', category: 'all' });
      if (tab === 'quiz') setFormData({ title: 'Homework', date: new Date().toISOString().split('T')[0], question: '', type: 'grammar', correctAnswer: '', explanation: '', options: [] });
      if (tab === 'students') setFormData({ name: '', id: '', pass: '', age: 10, gender: 'boy', role: 'student' });
    } else {
      setFormData(item);
    }
  }, [item, tab]);

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  // Pure Logic Shuffle (Safe for deployment)
  const shuffleOptions = () => {
    if (!formData.correctAnswer) return alert("Please enter the correct sentence first.");
    const words = formData.correctAnswer.split(' ').filter(w => w.trim() !== '');
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    handleChange('options', shuffled);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => handleChange('imageUrl', ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const updateOption = (idx, val) => {
    const newOpts = [...(formData.options || [])];
    newOpts[idx] = val;
    handleChange('options', newOpts);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">{item ? <Edit3/> : <Plus/>} {item ? 'Edit Item' : 'Create New'}</h3>
          <button type="button" onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-200"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          {tab === 'vocab' && (
            <>
              <input value={formData.word || ''} onChange={e => handleChange('word', e.target.value)} required placeholder="English Word" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold text-lg" />
              <input value={formData.meaning || ''} onChange={e => handleChange('meaning', e.target.value)} required placeholder="Japanese Meaning" className="w-full p-4 border-2 border-slate-100 rounded-2xl" />
              <input value={formData.emoji || ''} onChange={e => handleChange('emoji', e.target.value)} placeholder="Emoji (e.g. 🍎)" className="w-full p-4 border-2 border-slate-100 rounded-2xl" />
            </>
          )}

          {tab === 'quiz' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={formData.date || ''} onChange={e => handleChange('date', e.target.value)} className="p-3 border-2 border-slate-100 rounded-2xl" />
                <input value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} placeholder="Title (e.g. Unit 1)" className="p-3 border-2 border-slate-100 rounded-2xl font-bold" />
              </div>
              <select value={formData.type || 'grammar'} onChange={e => handleChange('type', e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-indigo-50 font-bold text-indigo-700">
                <option value="grammar">Grammar (4-Choice)</option>
                <option value="sorting">Sorting (並べ替え)</option>
                <option value="writing">Writing (記述)</option>
                <option value="listening">Listening (リスニング)</option>
                <option value="image_select">Image Select (画像選択)</option>
              </select>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 relative cursor-pointer transition-colors group">
                <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                {formData.imageUrl ? <img src={formData.imageUrl} className="h-32 mx-auto object-contain" /> : <div className="text-slate-400 font-bold group-hover:text-indigo-500"><UploadCloud className="mx-auto mb-1"/> Drag & Drop Image</div>}
              </div>

              <textarea value={formData.question || ''} onChange={e => handleChange('question', e.target.value)} required placeholder="Question Text" className="w-full p-4 border-2 border-slate-100 rounded-2xl h-24 font-bold" />
              
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <label className="text-xs font-bold text-green-600 mb-1 block">Correct Answer (正解)</label>
                <input value={formData.correctAnswer || ''} onChange={e => handleChange('correctAnswer', e.target.value)} required placeholder="Answer" className="w-full p-3 border-2 border-green-200 rounded-xl font-bold text-green-700 bg-white" />
                
                {formData.type === 'sorting' && (
                  <button type="button" onClick={shuffleOptions} className="mt-3 w-full py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm"><Shuffle size={14}/> Shuffle Words (Create Options)</button>
                )}
              </div>

              {(formData.type === 'grammar' || formData.type === 'sorting' || formData.type === 'image_select') && (
                <div>
                   <label className="text-xs font-bold text-slate-400 mb-2 block">Options (Click "+" to add)</label>
                   <div className="grid grid-cols-2 gap-2">
                     {[0, 1, 2, 3].map(i => (
                       <input key={i} value={formData.options?.[i] || ''} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i+1}`} className="p-3 border-2 border-slate-100 rounded-xl text-sm" readOnly={formData.type === 'sorting'} />
                     ))}
                   </div>
                </div>
              )}
              <input value={formData.explanation || ''} onChange={e => handleChange('explanation', e.target.value)} placeholder="Explanation (解説)" className="w-full p-4 border-2 border-slate-100 rounded-2xl" />
            </>
          )}

          {tab === 'students' && (
            <>
              <input value={formData.id || ''} onChange={e => handleChange('id', e.target.value)} required placeholder="Login ID" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50" readOnly={!!item} />
              <input value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} required placeholder="Name" className="w-full p-4 border-2 border-slate-100 rounded-2xl" />
              <input value={formData.pass || ''} onChange={e => handleChange('pass', e.target.value)} required placeholder="Password" className="w-full p-4 border-2 border-slate-100 rounded-2xl" />
              <div className="flex gap-2">
                <select value={formData.gender || 'boy'} onChange={e => handleChange('gender', e.target.value)} className="flex-1 p-4 border-2 border-slate-100 rounded-2xl bg-white"><option value="boy">Boy</option><option value="girl">Girl</option></select>
                <input type="number" value={formData.age || 10} onChange={e => handleChange('age', parseInt(e.target.value))} className="w-24 p-4 border-2 border-slate-100 rounded-2xl" />
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-200">Cancel</button>
          <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg transform active:scale-95 transition-all">Save</button>
        </div>
      </form>
    </div>
  );
};

// --- 8. TEACHER DASHBOARD (Fixed Deletion) ---

const TeacherDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('vocab'); 
  const [data, setData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState(null); 
  // 強制再レンダリング用のステート
  const [refresh, setRefresh] = useState(0);

  const load = () => {
    if (activeTab === 'logs') setData(LocalDB.get('results').sort((a,b) => b.date - a.date));
    else if (activeTab === 'students') setData(LocalDB.get('users').filter(u => u.role === 'student'));
    else setData(LocalDB.get(activeTab));
  };

  useEffect(() => { load(); }, [activeTab, refresh]);

  // FIX: Delete Logic
  const handleDelete = (id) => {
    if (confirm('本当に削除しますか？ (Delete?)')) {
      const collection = activeTab === 'students' ? 'users' : activeTab === 'logs' ? 'results' : activeTab;
      LocalDB.delete(collection, id);
      playSound('click');
      setRefresh(r => r + 1); // Force update UI
    }
  };

  const handleSave = (itemData) => {
    const collection = activeTab === 'students' ? 'users' : activeTab;
    if (editItem) LocalDB.update(collection, editItem.id, itemData);
    else {
      try { LocalDB.add(collection, itemData); } 
      catch(e) { alert(e.message); return; }
    }
    setIsEditing(false); setEditItem(null); playSound('success');
    setRefresh(r => r + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-700">
      <aside className="w-full md:w-72 bg-slate-900 text-white p-6 flex flex-col">
        <div className="font-bold text-2xl mb-8 flex items-center gap-3"><School className="text-orange-400" size={32}/> Tahamid<br/>Admin</div>
        <nav className="space-y-3">
          {[{ id: 'vocab', l: '単語 (Vocab)', i: BookOpen }, { id: 'quiz', l: '宿題 (Homework)', i: Star }, { id: 'students', l: '生徒 (Students)', i: Users }, { id: 'logs', l: 'ログ (Logs)', i: History }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><t.i size={24} /> {t.l}</button>
          ))}
        </nav>
        <button onClick={onLogout} className="mt-auto flex items-center gap-3 text-slate-400 hover:text-white text-sm font-bold p-4 bg-slate-800 rounded-2xl"><LogOut size={20}/> Logout</button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-slate-800 capitalize">{activeTab} Manager</h2>
          {activeTab !== 'logs' && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {setEditItem(null); setIsEditing(true);}} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 flex items-center gap-3"><Plus size={24}/> New Item</motion.button>}
        </div>

        <div className="space-y-4">
          {data.length === 0 && <EmptyState text="No data found." />}
          {data.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-5">
                {activeTab === 'vocab' && <span className="text-4xl bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">{item.emoji}</span>}
                {activeTab === 'students' && <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">{item.gender==='girl'?'👧':'👦'}</div>}
                <div>
                  <div className="font-bold text-slate-800 text-xl">{item.word || item.question || item.name}</div>
                  <div className="text-sm text-slate-400 font-bold">{item.meaning || item.title || `ID: ${item.id}`}</div>
                  {activeTab === 'quiz' && <div className="text-xs bg-slate-100 px-2 py-1 rounded inline-block mt-1">{item.type}</div>}
                  {activeTab === 'logs' && <div className={`font-black ${item.isCorrect?'text-green-500':'text-red-500'}`}>{item.isCorrect?'PASS':'FAIL'}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                {activeTab !== 'logs' && <button onClick={() => {setEditItem(item); setIsEditing(true);}} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 size={20}/></button>}
                <button onClick={() => handleDelete(item.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {isEditing && <TeacherEditor item={editItem} tab={activeTab} onClose={() => setIsEditing(false)} onSave={handleSave} />}
    </div>
  );
};

// --- 9. ROOT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回データセットアップ
    const u = LocalDB.get('users');
    if (!u.length) { LocalDB.set('users', INITIAL_DATA.users); LocalDB.set('vocab', INITIAL_DATA.vocab); LocalDB.set('quiz', INITIAL_DATA.quiz); }
    // セッション
    const s = localStorage.getItem('tec_session_v5');
    if (s) setCurrentUser(JSON.parse(s));
    setLoading(false);
  }, []);

  const login = (u) => { setCurrentUser(u); localStorage.setItem('tec_session_v5', JSON.stringify(u)); };
  const logout = () => { setCurrentUser(null); localStorage.removeItem('tec_session_v5'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!currentUser) return <LoginScreen onLogin={login} />;
  const isTeacher =
  currentUser?.role === "teacher" && currentUser?.email === TEACHER_EMAIL;

return isTeacher
  ? <TeacherDashboard user={currentUser} onLogout={logout} />
  : <StudentDashboard user={currentUser} onLogout={logout} />;}