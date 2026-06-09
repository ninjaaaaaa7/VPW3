import React, { useState, useEffect } from 'react';
import { Leaf, Flame, Sparkles, ShieldAlert, ArrowRight, RotateCcw, HelpCircle, CheckCircle2, User, BookOpen, Trash2, Award } from 'lucide-react';

// Pre-defined list of Eco Courses
const AVAILABLE_COURSES = [
  {
    id: 'energy-101',
    title: 'Home Energy Efficiency 101',
    category: 'Energy',
    description: 'Learn how to optimize your home heating, cooling, and appliance usage to reduce carbon emissions and electricity bills.',
    duration: '45 mins',
    lessons: [
      { title: 'Understanding Thermostat Optimization', content: 'Keeping your thermostat 2°C cooler in winter and warmer in summer can save over 500kg of CO2 per year.' },
      { title: 'LED Transition & Smart Plugs', content: 'Replacing incandescent bulbs with LEDs reduces lighting energy usage by 75-80%.' }
    ],
    quiz: {
      question: 'Adjusting your thermostat by 2°C in seasonal extremes saves approximately how much CO2 annually?',
      options: ['50 kg', '200 kg', '500 kg', '1000 kg'],
      answer: 2 // 500 kg
    }
  },
  {
    id: 'diet-sustainable',
    title: 'Transitioning to a Low-Carbon Diet',
    category: 'Food',
    description: 'Explore the environmental impact of various food groups and discover simple, nutrient-rich plant-based alternatives.',
    duration: '30 mins',
    lessons: [
      { title: 'The Carbon Footprint of Beef vs. Plants', content: 'Producing 1kg of beef results in roughly 60kg of greenhouse gases, while peas produce less than 1kg.' },
      { title: 'Reducing Food Waste at Home', content: 'Nearly 30% of all food produced is wasted. Planning meals and composting reduces methane emissions from landfills.' }
    ],
    quiz: {
      question: 'Which food group has the highest average carbon emissions per kilogram?',
      options: ['Poultry', 'Beef', 'Pork', 'Tofu'],
      answer: 1 // Beef
    }
  },
  {
    id: 'transit-future',
    title: 'Modern Transit & Commuting',
    category: 'Transport',
    description: 'Analyze emissions across trains, buses, gas cars, and EVs. Build an optimized personal transit strategy.',
    duration: '60 mins',
    lessons: [
      { title: 'The Efficiency of Public Transport', content: 'Taking a bus or train instead of driving solo can reduce your daily commute emissions by over 70%.' },
      { title: 'Understanding EV Life-Cycle Emissions', content: 'Though EV manufacturing is resource-intensive, their operational lifecycle emissions are significantly lower than petrol cars.' }
    ],
    quiz: {
      question: 'Roughly how much can taking public transport reduce your commute emissions compared to solo driving?',
      options: ['10%', '35%', '70%', '95%'],
      answer: 2 // 70%
    }
  }
];

const AVATARS = [
  '🌱', '☀️', '🦊', '🦉', '🌊', '🌲', '⚡', '🚲'
];

export default function App() {
  // Client-side routing state: 'tracker' | 'courses' | 'course-detail' | 'profile'
  const [currentView, setCurrentView] = useState('tracker');
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Core App states
  const [activity, setActivity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Persisted local storage states
  const [history, setHistory] = useState([]);
  const [bio, setBio] = useState('An Eco-warrior seeking to minimize carbon footprints.');
  const [avatar, setAvatar] = useState('🌱');
  const [joinedCourses, setJoinedCourses] = useState({});
  const [quizScore, setQuizScore] = useState(0);

  // Profile editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');

  // Quiz interactive state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResultMsg, setQuizResultMsg] = useState('');

  // Load from local storage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('eco_history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedBio = localStorage.getItem('eco_bio');
      if (storedBio) setBio(storedBio);

      const storedAvatar = localStorage.getItem('eco_avatar');
      if (storedAvatar) setAvatar(storedAvatar);

      const storedCourses = localStorage.getItem('eco_courses');
      if (storedCourses) setJoinedCourses(JSON.parse(storedCourses));

      const storedScore = localStorage.getItem('eco_quiz_score');
      if (storedScore) setQuizScore(parseInt(storedScore, 10) || 0);
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }
  }, []);

  // Sync state functions
  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('eco_history', JSON.stringify(newHistory));
  };

  const handleUpdateBio = (e) => {
    e.preventDefault();
    setBio(tempBio);
    localStorage.setItem('eco_bio', tempBio);
    setIsEditingBio(false);
  };

  const handleAvatarChange = (selected) => {
    setAvatar(selected);
    localStorage.setItem('eco_avatar', selected);
  };

  const handleJoinCourse = (courseId) => {
    const updated = {
      ...joinedCourses,
      [courseId]: {
        joinedAt: new Date().toISOString(),
        completed: false
      }
    };
    setJoinedCourses(updated);
    localStorage.setItem('eco_courses', JSON.stringify(updated));
  };

  const handleDeleteHistory = (index) => {
    const updated = history.filter((_, i) => i !== index);
    saveHistory(updated);
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const handleClear = () => {
    setActivity('');
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = activity.trim();
    if (trimmed.length < 3) {
      setError('Activity details must be at least 3 characters.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Activity details must be less than 500 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          const errMsg = data.detail?.[0]?.msg || 'Validation error.';
          throw new Error(`Invalid input format: ${errMsg}`);
        }
        throw new Error(data.detail || 'Failed to analyze footprint.');
      }

      setResult(data);
      
      // Save to history list
      const record = {
        activity: trimmed,
        estimated_kg: data.estimated_kg,
        analysis: data.analysis,
        timestamp: new Date().toISOString()
      };
      saveHistory([record, ...history].slice(0, 20)); // limit to last 20
    } catch (err) {
      setError(err.message || 'Failed to reach API endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizSubmit = (course) => {
    if (selectedAnswer === null) return;
    setQuizSubmitted(true);
    if (selectedAnswer === course.quiz.answer) {
      setQuizResultMsg('Correct! Excellent understanding of environmental concepts.');
      const newScore = quizScore + 10;
      setQuizScore(newScore);
      localStorage.setItem('eco_quiz_score', newScore.toString());
      
      // Mark course as completed
      const updated = {
        ...joinedCourses,
        [course.id]: {
          ...joinedCourses[course.id],
          completed: true
        }
      };
      setJoinedCourses(updated);
      localStorage.setItem('eco_courses', JSON.stringify(updated));
    } else {
      setQuizResultMsg(`Incorrect. The correct answer was: ${course.quiz.options[course.quiz.answer]}`);
    }
  };

  // Find active course object
  const activeCourse = AVAILABLE_COURSES.find(c => c.id === selectedCourseId);

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen bg-obsidian text-gray-200">
      
      {/* Skip to Content Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-neon focus:text-obsidian focus:font-bold focus:rounded focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Navigation Header */}
      <header className="border-b border-obsidian-border bg-obsidian-darker/90 backdrop-blur-md sticky top-0 z-40 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setCurrentView('tracker'); setResult(null); }}>
            <Leaf className="h-8 w-8 text-neon animate-pulse" aria-hidden="true" />
            <div>
              <span className="font-extrabold text-xl tracking-wider text-white">
                ECO<span className="text-neon text-neon-glow">-TRACKER</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-4 bg-obsidian-input p-1 rounded-xl border border-obsidian-border" aria-label="Main menu navigation">
            <button
              onClick={() => { setCurrentView('tracker'); setResult(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${currentView === 'tracker' ? 'bg-neon text-obsidian shadow' : 'text-gray-400 hover:text-white'}`}
              aria-label="Navigate to Carbon Footprint Tracker"
            >
              Carbon Tracker
            </button>
            
            <button
              onClick={() => setCurrentView('courses')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${currentView === 'courses' || currentView === 'course-detail' ? 'bg-neon text-obsidian shadow' : 'text-gray-400 hover:text-white'}`}
              aria-label="Navigate to Environmental Courses"
            >
              Eco Courses
            </button>

            <button
              onClick={() => {
                setCurrentView('profile');
                setTempBio(bio);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-150 ${currentView === 'profile' ? 'bg-neon text-obsidian shadow' : 'text-gray-400 hover:text-white'}`}
              aria-label="Navigate to User Profile"
            >
              Profile ({avatar})
            </button>
          </nav>

        </div>
      </header>

      {/* Main View Manager */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-start">
        
        {/* =======================================================
            1. CARBON TRACKER VIEW
            ======================================================= */}
        {currentView === 'tracker' && (
          <div className="flex flex-col space-y-10">
            {/* Intro text */}
            <section className="text-center" aria-label="Introductory Header">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Track Daily Actions. <br className="hidden md:inline" />
                <span className="text-neon text-neon-glow">Visualize Environmental Cost.</span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-gray-400 max-w-xl mx-auto">
                Use advanced generative AI to assess your carbon output in real time and discover actionable options to offset emissions.
              </p>
            </section>

            {/* Main Input Form */}
            <section className="max-w-3xl w-full mx-auto" aria-label="Carbon Input Form">
              <form 
                onSubmit={handleSubmit}
                className="bg-obsidian-card border border-obsidian-border rounded-2xl p-6 md:p-8 box-neon-glow"
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-baseline">
                    <label 
                      htmlFor="activity-input"
                      className="text-xs font-bold uppercase tracking-wider text-neon"
                    >
                      Describe your activity
                    </label>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {activity.length} / 500 characters
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      id="activity-input"
                      type="text"
                      required
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      placeholder="e.g. Drove 30 miles in a diesel truck, or Flew economy from London to Madrid"
                      disabled={isLoading}
                      className="w-full bg-obsidian-input text-white border border-obsidian-border focus:border-neon focus:ring-1 focus:ring-neon rounded-xl py-4 pl-4 pr-12 transition-all text-sm disabled:opacity-50"
                      aria-label="Activity description string"
                    />

                    {activity && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-obsidian-border"
                        aria-label="Clear input field"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-gray-500 font-bold uppercase">Quick Samples:</span>
                    {[
                      'Drove 10 miles in an SUV',
                      'Flew 500 miles economy',
                      'Ordered beef burgers for 4',
                      'Left 100W light bulb on for 10 hours'
                    ].map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivity(s)}
                        disabled={isLoading}
                        className="text-[10px] bg-obsidian-input hover:bg-obsidian-border text-gray-300 hover:text-neon border border-obsidian-border hover:border-neon/30 px-2.5 py-0.5 rounded-md transition-colors"
                        aria-label={`Use template: ${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-obsidian-border/50">
                    <button
                      type="submit"
                      disabled={isLoading || !activity.trim()}
                      className="bg-neon hover:bg-neon-light disabled:bg-neon-dark text-obsidian disabled:text-gray-500 font-extrabold px-6 py-3 rounded-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-md box-neon-glow-active"
                      aria-label="Calculate carbon emissions"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-obsidian border-t-transparent" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Calculate Footprint</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            {/* Loading & Errors */}
            <section aria-live="polite" className="max-w-3xl w-full mx-auto">
              {error && (
                <div role="alert" className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3 text-red-200">
                  <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <h2 className="font-bold text-sm text-red-400">Request Failed</h2>
                    <p className="text-xs text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="bg-obsidian-card/50 border border-neon/20 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
                  <Sparkles className="h-8 w-8 text-neon animate-spin" />
                  <p className="text-xs font-bold tracking-wider text-neon uppercase animate-pulse">Consulting Gemini 1.5 Flash Model...</p>
                </div>
              )}
            </section>

            {/* Dashboard Display Cards */}
            {result && !isLoading && (
              <section className="space-y-6 max-w-5xl w-full mx-auto" aria-label="Tracking Results">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CARD 1: Estimated CO2 */}
                  <article className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl flex flex-col justify-between" aria-label="Carbon emission estimation value">
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Estimated CO2</h2>
                      <div className="text-5xl font-black text-neon text-neon-glow font-sans mt-3">
                        {result.estimated_kg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Kilograms</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-obsidian-border/30">
                      Calculated using standard fuel-burn formulas, grid intensities, and production averages.
                    </p>
                  </article>

                  {/* CARD 2: Impact Analysis */}
                  <article className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl flex flex-col justify-between" aria-label="Detailed impact breakdown">
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Impact Analysis</h2>
                      <p className="text-sm text-gray-200 font-light mt-3 leading-relaxed">
                        "{result.analysis}"
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neon/60 mt-4">AI Carbon Assessment</span>
                  </article>

                  {/* CARD 3: Reduction Steps */}
                  <article className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl flex flex-col justify-between" aria-label="Mitigation recommendations">
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Reduction Steps</h2>
                      <ul className="space-y-3 mt-3">
                        {result.reduction_steps.map((step, i) => (
                          <li key={i} className="flex items-start space-x-2 text-xs text-gray-300">
                            <span className="text-neon font-bold">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neon/60 mt-4">Suggested actions</span>
                  </article>
                </div>
              </section>
            )}

            {/* Scan History list */}
            {history.length > 0 && (
              <section className="max-w-3xl w-full mx-auto" aria-label="Analysis History Logs">
                <div className="flex justify-between items-center mb-4 border-b border-obsidian-border pb-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-neon">Recent Log Entries ({history.length})</h2>
                  <button 
                    onClick={handleClearHistory}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase flex items-center space-x-1 border border-red-500/20 hover:border-red-500/40 px-2 py-1 rounded"
                    aria-label="Clear all local history entries"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {history.map((item, idx) => (
                    <div key={idx} className="bg-obsidian-card border border-obsidian-border hover:border-neon/20 p-4 rounded-xl flex items-center justify-between gap-4 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate capitalize">{item.activity}</p>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{item.analysis}</p>
                        <p className="text-[8px] text-gray-500 mt-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className="text-xs font-bold text-neon bg-neon/5 border border-neon/20 px-2 py-1 rounded">
                          {item.estimated_kg.toFixed(1)} kg
                        </span>
                        <button 
                          onClick={() => handleDeleteHistory(idx)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-obsidian-border/50 rounded-lg"
                          aria-label={`Delete entry ${item.activity} from local history`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* =======================================================
            2. ECO COURSES LIST VIEW
            ======================================================= */}
        {currentView === 'courses' && (
          <div className="space-y-8">
            <section className="text-center mb-8" aria-label="Courses Introduction">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">Environmental Impact Courses</h1>
              <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto mt-2">
                Boost your green credentials. Complete lessons, pass quizzes, and earn Eco-credits for your profile.
              </p>
              <div className="mt-4 flex justify-center">
                <span className="bg-neon/10 text-neon border border-neon/30 rounded-full px-4 py-1 text-xs font-bold flex items-center space-x-2">
                  <Award className="h-4 w-4" />
                  <span>My Eco Score: {quizScore} Points</span>
                </span>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Course catalog cards">
              {AVAILABLE_COURSES.map((course) => {
                const isJoined = joinedCourses[course.id];
                const isCompleted = isJoined?.completed;

                return (
                  <article key={course.id} className="bg-obsidian-card border border-obsidian-border hover:border-neon/30 p-6 rounded-2xl flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-neon bg-neon/5 border border-neon/20 px-2 py-0.5 rounded">
                          {course.category}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{course.duration}</span>
                      </div>
                      <h2 className="text-base font-bold text-white mb-2">{course.title}</h2>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">{course.description}</p>
                    </div>

                    <div className="pt-4 border-t border-obsidian-border/50">
                      {isJoined ? (
                        <div className="flex flex-col space-y-2">
                          <span className="text-xs font-bold text-center text-neon flex items-center justify-center space-x-1.5 py-1.5 bg-neon/5 rounded-lg border border-neon/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isCompleted ? 'Completed' : 'Enrolled'}</span>
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setCurrentView('course-detail');
                              setSelectedAnswer(null);
                              setQuizSubmitted(false);
                              setQuizResultMsg('');
                            }}
                            className="w-full text-center text-xs font-bold text-white border border-obsidian-border hover:border-neon py-2 rounded-lg transition-colors"
                            aria-label={`Open class: ${course.title}`}
                          >
                            Open Class
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinCourse(course.id)}
                          className="w-full bg-neon text-obsidian font-extrabold text-xs py-2 rounded-lg hover:bg-neon-light transition-colors"
                          aria-label={`Enroll in course: ${course.title}`}
                        >
                          Enroll Course
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        )}

        {/* =======================================================
            3. COURSE DETAIL VIEW
            ======================================================= */}
        {currentView === 'course-detail' && activeCourse && (
          <div className="max-w-3xl w-full mx-auto space-y-8">
            <button 
              onClick={() => setCurrentView('courses')}
              className="text-xs font-bold text-neon hover:text-neon-light uppercase flex items-center space-x-1"
              aria-label="Back to courses list"
            >
              <span>← Back to Courses</span>
            </button>

            {/* Course Header */}
            <section className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl">
              <span className="text-[10px] text-neon font-bold uppercase tracking-wider">{activeCourse.category}</span>
              <h1 className="text-2xl font-black text-white mt-1">{activeCourse.title}</h1>
              <p className="text-xs text-gray-400 mt-2">{activeCourse.description}</p>
            </section>

            {/* Lessons list */}
            <section className="space-y-4" aria-label="Course Lessons">
              <h2 className="text-sm font-extrabold uppercase text-neon tracking-widest">Syllabus Lessons</h2>
              {activeCourse.lessons.map((lesson, idx) => (
                <article key={idx} className="bg-obsidian-card/60 border border-obsidian-border p-5 rounded-xl">
                  <h3 className="text-xs font-bold text-white mb-2">{idx + 1}. {lesson.title}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{lesson.content}</p>
                </article>
              ))}
            </section>

            {/* Interactive Lesson Quiz */}
            <section className="bg-obsidian-card border border-neon/20 p-6 rounded-2xl space-y-4" aria-label="Interactive Course Quiz">
              <h2 className="text-sm font-extrabold uppercase text-neon tracking-widest flex items-center space-x-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Verify Knowledge (+10 points)</span>
              </h2>
              <p className="text-xs text-white font-medium">{activeCourse.quiz.question}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeCourse.quiz.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={quizSubmitted}
                      onClick={() => setSelectedAnswer(idx)}
                      className={`text-left text-xs p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'border-neon bg-neon/5 text-neon font-bold' 
                          : 'border-obsidian-border bg-obsidian-input text-gray-300 hover:border-gray-500'
                      } ${quizSubmitted && 'opacity-60 cursor-not-allowed'}`}
                      aria-label={`Option ${idx + 1}: ${opt}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {quizResultMsg && (
                <div aria-live="polite" className={`p-3 rounded-lg border text-xs font-medium ${
                  quizResultMsg.startsWith('Correct') 
                    ? 'border-neon/30 bg-neon/5 text-neon' 
                    : 'border-red-500/20 bg-red-950/20 text-red-400'
                }`}>
                  {quizResultMsg}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-obsidian-border/50">
                {!quizSubmitted ? (
                  <button
                    onClick={() => handleQuizSubmit(activeCourse)}
                    disabled={selectedAnswer === null}
                    className="bg-neon hover:bg-neon-light disabled:bg-neon-dark text-obsidian disabled:text-gray-500 text-xs font-extrabold px-6 py-2.5 rounded-lg transition-colors"
                    aria-label="Submit your quiz response"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedAnswer(null);
                      setQuizSubmitted(false);
                      setQuizResultMsg('');
                    }}
                    className="text-xs font-bold text-gray-400 border border-obsidian-border hover:border-neon px-5 py-2.5 rounded-lg hover:text-white transition-colors"
                    aria-label="Retake this lesson quiz"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* =======================================================
            4. USER PROFILE VIEW
            ======================================================= */}
        {currentView === 'profile' && (
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Avatar & Basic Specs */}
            <section className="md:col-span-1 bg-obsidian-card border border-obsidian-border p-6 rounded-2xl flex flex-col items-center justify-between text-center space-y-6">
              <div>
                <div className="w-24 h-24 bg-obsidian-input border-2 border-neon text-5xl rounded-full flex items-center justify-center select-none shadow-md">
                  {avatar}
                </div>
                <h1 className="text-lg font-black text-white mt-3">Green Citizen</h1>
                <p className="text-[10px] uppercase font-bold text-neon tracking-widest mt-1">Level 1 Eco Member</p>
              </div>

              {/* Avatar Selector */}
              <div className="w-full">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Change Avatar</span>
                <div className="grid grid-cols-4 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => handleAvatarChange(av)}
                      className={`text-xl p-1.5 rounded-lg bg-obsidian-input border transition-all ${avatar === av ? 'border-neon' : 'border-transparent hover:border-gray-700'}`}
                      aria-label={`Select avatar ${av}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full pt-4 border-t border-obsidian-border/50 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total Score:</span>
                  <span className="font-bold text-neon">{quizScore} pts</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">History items:</span>
                  <span className="font-bold text-white">{history.length}</span>
                </div>
              </div>
            </section>

            {/* Right Column: Bio and Enrolled Classes */}
            <section className="md:col-span-2 space-y-6">
              
              {/* Bio block */}
              <article className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl space-y-4" aria-label="Bio customization">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-extrabold uppercase text-neon tracking-widest">About Me</h2>
                  <button
                    onClick={() => {
                      if (isEditingBio) {
                        setIsEditingBio(false);
                      } else {
                        setTempBio(bio);
                        setIsEditingBio(true);
                      }
                    }}
                    className="text-[10px] text-neon border border-neon/30 hover:bg-neon/10 px-2 py-1 rounded font-bold uppercase transition-colors"
                    aria-label={isEditingBio ? "Cancel biography edit" : "Edit biography content"}
                  >
                    {isEditingBio ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditingBio ? (
                  <form onSubmit={handleUpdateBio} className="space-y-3">
                    <textarea
                      required
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      maxLength={300}
                      rows={3}
                      className="w-full bg-obsidian-input text-white border border-obsidian-border focus:border-neon focus:ring-1 focus:ring-neon rounded-lg p-2.5 text-xs transition-colors"
                      placeholder="Share your eco goals..."
                      aria-label="Edit biography details"
                    />
                    <button
                      type="submit"
                      className="bg-neon text-obsidian text-[11px] font-extrabold px-4 py-2 rounded transition-colors"
                      aria-label="Save biography"
                    >
                      Save Bio
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-gray-300 leading-relaxed font-medium capitalize">
                    {bio || "Tell us about your carbon mitigation goals..."}
                  </p>
                )}
              </article>

              {/* Class Enrollment tracker list */}
              <article className="bg-obsidian-card border border-obsidian-border p-6 rounded-2xl space-y-4" aria-label="Enrolled courses tracker">
                <h2 className="text-xs font-extrabold uppercase text-neon tracking-widest">Joined Classes</h2>

                <div className="space-y-3">
                  {AVAILABLE_COURSES.map((course) => {
                    const enrolled = joinedCourses[course.id];
                    if (!enrolled) return null;

                    return (
                      <div key={course.id} className="p-3.5 bg-obsidian-input border border-obsidian-border rounded-xl flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{course.title}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">Enrolled on: {new Date(enrolled.joinedAt).toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            enrolled.completed 
                              ? 'border-neon/30 bg-neon/5 text-neon' 
                              : 'border-orange-500/30 bg-orange-500/5 text-orange-400'
                          }`}>
                            {enrolled.completed ? 'Finished' : 'In Progress'}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setCurrentView('course-detail');
                              setSelectedAnswer(null);
                              setQuizSubmitted(false);
                              setQuizResultMsg('');
                            }}
                            className="text-[10px] font-extrabold text-white hover:text-neon transition-colors"
                            aria-label={`Open syllabus: ${course.title}`}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(joinedCourses).length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      <span>You have not joined any classes yet.</span>
                      <button 
                        onClick={() => setCurrentView('courses')} 
                        className="text-neon underline ml-1 font-bold"
                        aria-label="View all classes"
                      >
                        Enroll now
                      </button>
                    </div>
                  )}
                </div>
              </article>

            </section>
          </div>
        )}

      </main>
    </div>
  );
}
