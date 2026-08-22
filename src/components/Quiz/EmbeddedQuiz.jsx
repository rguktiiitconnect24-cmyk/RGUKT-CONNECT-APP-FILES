import { ChevronLeft, RefreshCw, CheckCircle, XCircle, Clock, ChevronRight, Save, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const EmbeddedQuiz = ({ moduleId, moduleTitle, questions: initialQuestions, onClose, passingPercentage = 40, difficulty = 'Moderate', initialState = null, semester = null, subject = null, pastAttempt = null }) => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes default
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    
    // Auto-save key
    const progressKey = `quiz_progress_${moduleId}_${difficulty}`;

    // Initialization & Resume Logic
    useEffect(() => {
        let loadedQuestions = initialQuestions;

        if (pastAttempt) {
            setAnswers(pastAttempt.answers || {});
            setScore(pastAttempt.score || 0);
            setTimeLeft((15 * 60) - (pastAttempt.timeTaken || 0));
            setCurrentQuestionIndex(0);
            setIsSubmitted(true);
            loadedQuestions = initialQuestions; // Assuming pastAttempt doesn't store full questions array
        } else if (initialState) {
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
    }, [initialQuestions, moduleId, initialState, pastAttempt]);

    // Timer Logic
    useEffect(() => {
        if (isSubmitted || questions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
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

    const handleSubmit = async (isAutoSubmit = false) => {
        if (isAutoSubmit !== true && Object.keys(answers).length < questions.length) {
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 3000);
            return;
        }
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

    if (questions.length === 0) return <div className="p-8 text-center">Loading MCQ...</div>;

    const currentQuestion = questions[currentQuestionIndex];
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const percentage = isSubmitted ? Math.round((score / totalMarks) * 100) : 0;
    const isPass = percentage >= passingPercentage;

    if (isSubmitted) {
        const handleDownloadPdf = async () => {
            const doc = new jsPDF();
            const primaryColor = [78, 222, 163]; // #4edea3
            const darkColor = [20, 25, 40];
            
            // Header Banner
            doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("MCQ Response Sheet", 14, 20);
            
            // Student Details Box
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            let subjStr = subject || 'N/A';
            let topicStr = moduleTitle;
            let semStr = semester || user?.currentSem || 'N/A';
            
            doc.text(`Name: ${user?.fullName || 'Student'}`, 14, 40);
            doc.text(`Student ID: ${user?.studentId || user?.uid || 'N/A'}`, 14, 46);
            doc.text(`Department: ${user?.branch || 'N/A'}`, 14, 52);
            doc.text(`Semester: ${semStr}`, 14, 58);
            
            const totalM = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
            const isPass = (score / totalM >= passingPercentage / 100);
            
            doc.text(`Subject: ${subjStr}`, 110, 40);
            doc.text(`Topic: ${topicStr}`, 110, 46);
            doc.text(`Total Score: ${score} / ${totalM}`, 110, 52);
            doc.text(`Status: ${isPass ? 'PASSED' : 'FAILED'}`, 110, 58);
            
            // Separator
            doc.setDrawColor(200, 200, 200);
            doc.line(14, 62, 196, 62);
            
            // Table Data
            const tableColumn = ["Q.No", "Question", "Your Answer", "Correct Answer", "Result"];
            const tableRows = [];
            
            questions.forEach((q, index) => {
                const userAnswer = q.options[answers[index]] || "Not Answered";
                const correctAnswer = q.options[q.correctAnswerIndex];
                const result = (answers[index] === q.correctAnswerIndex) ? "Correct" : "Incorrect";
                
                tableRows.push([
                    index + 1,
                    q.questionText,
                    userAnswer,
                    correctAnswer,
                    result
                ]);
            });
            
            autoTable(doc, {
                startY: 70,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: [0, 0, 0], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 65 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 20, fontStyle: 'bold' }
                },
                willDrawCell: function (data) {
                    if (data.section === 'body' && data.column.index === 4) {
                        if (data.cell.raw === 'Correct') {
                            doc.setTextColor(34, 197, 94); // Green
                        } else {
                            doc.setTextColor(239, 68, 68); // Red
                        }
                    }
                },
                styles: { overflow: 'linebreak', fontSize: 9 }
            });
            
            doc.save(`MCQ_Response_${user?.studentId || 'Student'}_${moduleId}.pdf`);
        };

        return (
            <div className="embedded-quiz-container results-mode-new">
                {/* TopAppBar */}
                <nav className="results-nav" style={{ justifyContent: "center", padding: "20px 16px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
                    <h1 style={{ fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif", fontSize: "24px", margin: 0, textAlign: "center", color: "var(--on-surface)", fontWeight: 700, letterSpacing: "-0.3px", lineHeight: "1.3" }}>
                        MCQ Results: {moduleTitle}
                    </h1>
                </nav>

                <main className="results-main">
                    {/* Score Card */}
                    <section className="results-score-card">
                        <div className="rsc-content">
                            <div className="rsc-circle-container">
                                <div className="circular-progress" style={{
                                    background: `radial-gradient(closest-side, var(--surface-container) 79%, transparent 80% 100%), conic-gradient(var(--color-brand, #4338ca) ${percentage}%, var(--border-color) 0)`
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
                    
                    <div style={{ padding: "0 20px" }}>
                        <button 
                            className="download-response-btn" 
                            onClick={handleDownloadPdf}
                            style={{
                                width: "100%", 
                                padding: "16px", 
                                background: "var(--color-brand, #4338ca)", 
                                color: "var(--color-on-brand, #ffffff)", 
                                fontWeight: "bold", 
                                borderRadius: "var(--radius-xl, 1.25rem)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginTop: "16px",
                                marginBottom: "24px",
                                fontSize: "16px",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: "var(--shadow-md)"
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = "var(--color-brand-hover, #3730a3)";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = "var(--color-brand, #4338ca)";
                            }}
                        >
                            <Download size={20} />
                            Download Response Sheet
                        </button>
                    </div>



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

            {showAlert && (
                <div style={{ background: '#ef444420', border: '1px solid #ef444440', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                    You must answer all questions before submitting the MCQ.
                </div>
            )}

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
                        onClick={() => currentQuestionIndex === questions.length - 1 ? handleSubmit(false) : handleNext()}
                        style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b' }}
                    >
                        Skip
                    </button>
                    
                    {currentQuestionIndex === questions.length - 1 ? (
                        <button 
                            className="btn-submit" 
                            onClick={() => handleSubmit(false)}
                            disabled={answers[currentQuestionIndex] === undefined}
                        >
                            Submit MCQ
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
