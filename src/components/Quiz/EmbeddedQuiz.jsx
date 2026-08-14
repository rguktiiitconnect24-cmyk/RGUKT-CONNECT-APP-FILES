import { ChevronLeft, RefreshCw, CheckCircle, XCircle, Clock, ChevronRight, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { submitQuizAttempt, savePendingQuiz } from '../../services/quizService';
import { analyzeQuizResults } from '../../services/aiQuizService';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './EmbeddedQuiz.css';

const renderText = (text) => {
    if (!text) return null;
    if (typeof text !== 'string') return text;

    let s = text;

    // 1. If text contains explicit $$ ... $$ or $ ... $, clean any invalid nested delimiters \( or \) inside them
    if (s.includes('$')) {
        s = s.replace(/\\\(/g, ' ').replace(/\\\)/g, ' ').replace(/\\\[/g, ' ').replace(/\\\]/g, ' ');
        s = s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/¹/g, '^1');
    } else {
        // 2. Text has NO $ delimiters. Convert unicode superscripts into inline math $^2$, $^3$, $^1$
        s = s.replace(/²/g, '$^2$')
             .replace(/³/g, '$^3$')
             .replace(/¹/g, '$^1$');

        // 3. Convert standalone LaTeX commands into inline math $...$ without wrapping whole sentence
        s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|\\pm|\\alpha|\\beta|\\gamma|\\pi|\\infty)/g, '$$1$');
    }

    // 4. Convert single newlines \n (soft break) into   \n (hard break) in non-math blocks
    const blocks = s.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/);
    const processedText = blocks.map((block) => {
        if ((block.startsWith('$$') && block.endsWith('$$')) || (block.startsWith('$') && block.endsWith('$'))) {
            return block;
        }
        return block.replace(/([^\n])\n([^\n])/g, '$1  \n$2');
    }).join('');

    return (
        <div className="markdown-math-container" style={{ textAlign: 'left', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ node, children, ...props }) => (
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 0.5rem 0', display: 'inline-block', width: '100%' }} {...props}>
                            {children}
                        </p>
                    ),
                    code: ({ node, inline, className, children, ...props }) => (
                        <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace, monospace', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px' }} {...props}>
                            {children}
                        </code>
                    ),
                    pre: ({ node, children, ...props }) => (
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: '8px', overflowX: 'auto' }} {...props}>
                            {children}
                        </pre>
                    )
                }}
            >
                {processedText}
            </ReactMarkdown>
        </div>
    );
};

// Utility to shuffle array
const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const EmbeddedQuiz = ({ moduleId, moduleTitle, questions: initialQuestions, onClose, passingPercentage = 40, difficulty = 'Moderate', initialState = null }) => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes default
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Auto-save key
    const progressKey = `quiz_progress_${moduleId}_${difficulty}`;

    // Initialization & Resume Logic
    useEffect(() => {
        let loadedQuestions = initialQuestions;

        if (initialState) {
            setAnswers(initialState.answers || {});
            setTimeLeft(initialState.timeLeft || 15 * 60);
            setCurrentQuestionIndex(initialState.currentQuestionIndex || 0);
            loadedQuestions = initialState.questions || initialQuestions;
        } else {
            const savedProgress = localStorage.getItem(progressKey);
            if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                setAnswers(parsed.answers || {});
                setTimeLeft(parsed.timeLeft || 15 * 60);
                setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
                loadedQuestions = parsed.questions || initialQuestions;
            } else {
                loadedQuestions = shuffleArray(initialQuestions);
            }
        }
        
        setQuestions(loadedQuestions);
    }, [initialQuestions, moduleId, initialState]);

    // Timer Logic
    useEffect(() => {
        if (isSubmitted || questions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isSubmitted, questions.length]);

    // Auto-save Logic
    useEffect(() => {
        if (!isSubmitted && questions.length > 0) {
            const progressData = {
                answers,
                timeLeft,
                currentQuestionIndex,
                questions
            };
            
            // Auto-save locally for immediate offline persistence
            localStorage.setItem(progressKey, JSON.stringify(progressData));
            
            // Auto-save to Firebase so it syncs across devices
            if (user) {
                savePendingQuiz(user.uid, moduleId, difficulty, progressData).catch(e => console.error("Firebase auto-save failed", e));
            }
        }
    }, [answers, currentQuestionIndex]); // Deliberately omit timeLeft so we don't spam Firebase every second

    const handleOptionSelect = (optionIndex) => {
        if (isSubmitted) return;
        setAnswers({
            ...answers,
            [currentQuestionIndex]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        let calculatedScore = 0;
        questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswerIndex) {
                calculatedScore += q.marks || 1;
            }
        });

        setScore(calculatedScore);
        setIsSubmitted(true);

        const finalScore = calculatedScore;
        const totalM = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
        
        try {
            await submitQuizAttempt({
                quizId: moduleId, // Ensure it's compatible with dashboard query
                moduleId,
                studentId: user?.uid,
                studentName: user?.fullName || 'Student',
                answers,
                score: finalScore,
                totalMarks: totalM,
                percentage: (finalScore / totalM) * 100,
                timeTaken: (15 * 60) - timeLeft,
                difficulty: difficulty
            });
            localStorage.removeItem(progressKey); // Clear progress on submit
        } catch (error) {
            console.error("Failed to save attempt:", error);
        }

        // Fetch AI Analysis
        setIsAnalyzing(true);
        const analysis = await analyzeQuizResults(questions, answers);
        setAiFeedback(analysis);
        setIsAnalyzing(false);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (questions.length === 0) return <div className="p-8 text-center">Loading quiz...</div>;

    const currentQuestion = questions[currentQuestionIndex];
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const percentage = isSubmitted ? Math.round((score / totalMarks) * 100) : 0;
    const isPass = percentage >= passingPercentage;

    if (isSubmitted) {
        return (
            <div className="embedded-quiz-container results-mode-new">
                {/* TopAppBar */}
                <nav className="results-nav">
                    <div className="results-nav-left">
                        <button className="results-back-btn" onClick={onClose}>
                            <ChevronLeft size={24} />
                        </button>
                        <h1>Quiz Results: {moduleTitle}</h1>
                    </div>
                    <button className="results-close-btn" onClick={onClose}>Close</button>
                </nav>

                <main className="results-main">
                    {/* Score Card */}
                    <section className="results-score-card">
                        <div className="rsc-content">
                            <div className="rsc-circle-container">
                                <div className="circular-progress" style={{
                                    background: `radial-gradient(closest-side, #060e20 79%, transparent 80% 100%), conic-gradient(#4edea3 ${percentage}%, #2d3449 0)`
                                }}></div>
                                <div className="rsc-circle-text">
                                    <span className="rsc-percentage">{percentage}%</span>
                                    <span className="rsc-fraction">{score}/{totalMarks}</span>
                                </div>
                            </div>
                            <div className="rsc-details">
                                <h2>{isPass ? 'Great Job!' : 'Keep Practicing!'}</h2>
                                <div className={`rsc-status-pill ${isPass ? 'pass' : 'fail'}`}>
                                    <span>STATUS: {isPass ? 'PASSED' : 'FAILED'}</span>
                                </div>
                                <p className="rsc-time">
                                    Completed in {formatTime((15 * 60) - timeLeft)}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* AI Performance Analysis */}
                    <section className="results-ai-section">
                        <div className="results-ai-header">
                            <RefreshCw className={isAnalyzing ? "animate-spin" : ""} size={20} />
                            <h3>AI Performance Analysis</h3>
                        </div>
                        {isAnalyzing ? (
                            <p className="results-ai-loading">Analyzing your strengths and weaknesses...</p>
                        ) : aiFeedback ? (
                            <div className="results-ai-content">
                                <div className="ai-block strengths">
                                    <h4>Strengths</h4>
                                    <p>{aiFeedback.strengths}</p>
                                </div>
                                <div className="ai-block weaknesses">
                                    <h4>Areas to Improve</h4>
                                    <p>{aiFeedback.weaknesses}</p>
                                </div>
                                <div className="ai-block recommendation">
                                    <h4>Recommendation</h4>
                                    <p>{aiFeedback.recommendation}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="results-ai-unavailable">Analysis unavailable at this time.</p>
                        )}
                    </section>

                    {/* Review Section */}
                    <section className="results-review-section">
                        <h3>Review Answers</h3>
                        <div className="results-questions-list">
                            {questions.map((q, qIndex) => {
                                const studentAnswer = answers[qIndex];
                                const isCorrect = studentAnswer === q.correctAnswerIndex;
                                const isUnanswered = studentAnswer === undefined;

                                let statusClass = 'incorrect';
                                if (isCorrect) statusClass = 'correct';
                                if (isUnanswered) statusClass = 'unanswered';

                                return (
                                    <div key={qIndex} className={`review-q-card ${statusClass}`}>
                                        <div className="review-q-header">
                                            <span className="review-q-num">Q{qIndex + 1}</span>
                                            <div className="review-q-text">{renderText(q.questionText)}</div>
                                        </div>
                                        <div className="review-q-options">
                                            {q.options.map((opt, oIndex) => {
                                                let optClass = 'review-opt ';
                                                let isChecked = false;
                                                
                                                if (oIndex === q.correctAnswerIndex) {
                                                    optClass += 'correct-ans ';
                                                    isChecked = true;
                                                } else if (oIndex === studentAnswer && !isCorrect) {
                                                    optClass += 'wrong-ans ';
                                                    isChecked = true;
                                                }

                                                return (
                                                    <div key={oIndex} className={optClass}>
                                                        {isChecked && (
                                                            <div className="review-opt-icon">
                                                                {oIndex === q.correctAnswerIndex ? (
                                                                    <CheckCircle size={14} />
                                                                ) : (
                                                                    <XCircle size={14} />
                                                                )}
                                                            </div>
                                                        )}
                                                        <span className={`flex items-start gap-2 flex-1 ${isChecked ? 'ml-0' : 'review-opt-text-padding'}`}>
                                                            <span className="font-bold text-xs uppercase opacity-80 min-w-[20px] pt-0.5">{String.fromCharCode(65 + oIndex)}.</span>
                                                            <span className="flex-1">{renderText(opt)}</span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {q.explanation && (
                                            <div className="review-q-explanation">
                                                <strong>Explanation:</strong>
                                                <div className="mt-1">{renderText(q.explanation)}</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    const handleSaveAndClose = async () => {
        if (user && !isSubmitted && questions.length > 0) {
            const progressData = {
                answers,
                timeLeft,
                currentQuestionIndex,
                questions
            };
            try {
                await savePendingQuiz(user.uid, moduleId, difficulty, progressData);
            } catch (e) {
                console.error("Failed to save final state to Firebase", e);
            }
        }
        onClose();
    };

    return (
        <div className="embedded-quiz-container">
            <div className="quiz-header">
                <div>
                    <h2 className="quiz-title">Test Your Knowledge</h2>
                    <div className="quiz-progress">Question {currentQuestionIndex + 1} of {questions.length}</div>
                </div>
                <div className="quiz-timer">
                    <Clock size={16} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            <div className="quiz-progress-bar">
                <div 
                    className="quiz-progress-fill" 
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            <div className="question-card">
                <div className="question-text text-lg font-bold">
                    {renderText(currentQuestion.questionText)}
                    {currentQuestion.image && (
                        <div className="mt-4 mb-2 flex justify-center">
                            <img 
                                src={currentQuestion.image} 
                                alt="Question Reference" 
                                className="max-h-40 max-w-sm object-contain rounded-lg border border-slate-700/50 bg-black/10 shadow-sm" 
                            />
                        </div>
                    )}
                </div>
                <div className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            className={`option-btn ${answers[currentQuestionIndex] === index ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(index)}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{renderText(option)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="quiz-footer">
                <button 
                    className="btn-nav prev" 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0}
                >
                    <ChevronLeft size={18} /> Previous
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn-nav skip" 
                        onClick={currentQuestionIndex === questions.length - 1 ? handleSubmit : handleNext}
                        style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b' }}
                    >
                        Skip
                    </button>
                    
                    {currentQuestionIndex === questions.length - 1 ? (
                        <button 
                            className="btn-submit" 
                            onClick={handleSubmit}
                            disabled={answers[currentQuestionIndex] === undefined}
                        >
                            Submit Quiz
                        </button>
                    ) : (
                        <button 
                            className="btn-nav next" 
                            onClick={handleNext}
                            disabled={answers[currentQuestionIndex] === undefined}
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="quiz-meta-footer">
                <span className="quiz-auto-save">
                    <Save size={14} /> Progress is auto-saved
                </span>
                <button onClick={handleSaveAndClose} className="btn-save-close">Save & Close</button>
            </div>
        </div>
    );
};

export default EmbeddedQuiz;
