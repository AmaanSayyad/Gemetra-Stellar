import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEmployees } from '../hooks/useEmployees';
import { usePayments } from '../hooks/usePayments';
import { generateAIResponse, type AIContext } from '../services/aiService';
import { useChat } from '../hooks/useChat'; // Import useChat hook
import type { ChatMessage as DBChatMessage } from '../lib/supabase'; // Import DB ChatMessage type

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantPageProps {
  companyName?: string;
  sessionId?: string | null; // New prop for session ID
  onSessionCreated?: (sessionId: string) => void; // Callback for new session
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  companyName = 'My Company',
  sessionId: initialSessionId,
  onSessionCreated
}) => {
  const { employees } = useEmployees();
  const { getAllPayments } = usePayments();
  const { createChatSession, getChatMessages, addChatMessage } = useChat(); // Use chat hook

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load existing chat messages if a session ID is provided
  useEffect(() => {
    const loadMessages = async () => {
      if (initialSessionId) {
        setIsLoading(true);
        setLoadingMessage('Loading conversation...');
        try {
          const dbMessages = await getChatMessages(initialSessionId);
          const loadedMessages: Message[] = dbMessages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.created_at)
          }));
          setMessages(loadedMessages);
          setCurrentSessionId(initialSessionId);
        } catch (error) {
          console.error('Failed to load chat messages:', error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If no session ID, start with the initial assistant message
        setMessages([
          {
            id: 'initial-ai-message',
            type: 'assistant',
            content: `Hello! I'm your smart AI assistant for ${companyName}. I'm powered by Google Gemini AI and have deep knowledge about your company data, payroll operations, and Stellar blockchain technology with XLM. I can analyze your employee data, provide payment insights, explain blockchain concepts, and have natural conversations. What would you like to know?`,
            timestamp: new Date()
          }
        ]);
      }
    };

    loadMessages();
  }, [initialSessionId, companyName, getChatMessages]);

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const allPayments = await getAllPayments();
        setPayments(allPayments);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        setPayments([]);
      }
    };

    fetchPayments();
  }, [getAllPayments]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessageContent = inputValue.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLoadingMessage('Analyzing your question...');

    let sessionToUse = currentSessionId;

    // Create a new session if one doesn't exist
    if (!sessionToUse) {
      try {
        const newSession = await createChatSession('New Chat', userMessageContent);
        if (newSession) {
          sessionToUse = newSession.id;
          setCurrentSessionId(newSession.id);
          onSessionCreated?.(newSession.id); // Notify parent about new session
        } else {
          throw new Error('Failed to create new chat session');
        }
      } catch (error) {
        console.error('Error creating chat session:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'I apologize, but I encountered an error starting a new conversation. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }
    }

    // Save user message to DB
    if (sessionToUse) {
      await addChatMessage(sessionToUse, 'user', userMessageContent);
    }

    try {
      const context: AIContext = {
        employees,
        payments,
        companyName
      };

      console.log('Sending to AI:', userMessageContent);
      console.log('AI Context:', context);

      setLoadingMessage('Processing with AI...');
      const response = await generateAIResponse(userMessageContent, context);

      console.log('AI Response received:', response);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to DB
      if (sessionToUse) {
        await addChatMessage(sessionToUse, 'assistant', response);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again. Error details have been logged to the console.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('Thinking...');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Pool of all available questions (50+ questions)
  const allAvailableQuestions = [
    // XLM Questions
    "What is XLM?",
    "Tell me about Stellar Lumens",
    "What is XLM used for?",
    "How do I get XLM tokens?",
    "What are the benefits of using Stellar?",
    "What is XLM's market cap?",
    "Is XLM a stablecoin?",
    "What is the Stellar network?",
    "How is XLM different from Bitcoin?",
    "What is Stellar's consensus mechanism?",
    "What is XLM's 24 hour trading volume?",
    "Is Stellar energy efficient?",
    "What is Stellar's settlement time?",
    "What are Stellar's transaction costs?",
    "How scalable is Stellar?",
    "Where can I buy XLM?",
    "How do I store XLM?",
    "What is XLM's ticker symbol?",
    "Is XLM available on major exchanges?",
    "What is the total XLM supply?",

    // Stellar Blockchain Questions
    "What is Stellar?",
    "What is the current price of XLM?",
    "How does Stellar work?",
    "What is Stellar's mission?",
    "How do I use Stellar?",
    "What are Stellar fees?",
    "What is a Stellar wallet?",
    "How do I connect my wallet?",
    "What is Freighter?",
    "How do I send XLM?",
    "What are Stellar Assets?",
    "Explain Soroban smart contracts",
    "How does blockchain work?",
    "What is a blockchain transaction?",
    "What is the Stellar Consensus Protocol?",

    // Company & Employee Questions
    "How many employees do we have?",
    "Who is our highest paid employee?",
    "List all employees",
    "Company overview please",
    "Employee salary breakdown",
    "What is the total payroll amount?",
    "Show me employee statistics",
    "Who are our employees?",
    "What departments do we have?",
    "What is the average salary?",
    "Show me the lowest paid employee",
    "Which department has the most employees?",
    "What is our total monthly payroll?",
    "Show me employee details",
    "How many active employees?",

    // Payment Questions
    "When was the last payment made?",
    "Show me payment statistics",
    "What are the transaction fees?",
    "Show me recent payments",
    "How many payments have been made?",
    "What is the total amount paid?",
    "Show me payment history",
    "When was the first payment?",
    "What is the average payment amount?",
    "Show me all transactions",
    "How do I make a payment?",
    "What payment methods are supported?",
    "How do scheduled payments work?",
    "Show me pending payments",
    "What is a bulk payment?",
  ];

  // State to track displayed questions and used questions
  const [displayedQuestions, setDisplayedQuestions] = useState<string[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());

  // Initialize displayed questions when starting a new chat
  useEffect(() => {
    // Only show questions in new chats (when there's only the initial message or no messages)
    const isNewChat = messages.length <= 1;

    if (isNewChat && displayedQuestions.length === 0) {
      // Initialize with 70% company questions
      const initialQuestions = isMobile
        ? [
          // 2 company questions (67%), 1 other
          allAvailableQuestions[35], // "How many employees do we have?"
          allAvailableQuestions[36], // "Who is our highest paid employee?"
          allAvailableQuestions[0], // "What is XLM?"
        ]
        : [
          // 7 company questions (70%), 3 other questions (30%)
          allAvailableQuestions[35], // "How many employees do we have?"
          allAvailableQuestions[36], // "Who is our highest paid employee?"
          allAvailableQuestions[37], // "List all employees"
          allAvailableQuestions[38], // "Company overview please"
          allAvailableQuestions[39], // "Employee salary breakdown"
          allAvailableQuestions[40], // "What is the total payroll amount?"
          allAvailableQuestions[41], // "Show me employee statistics"
          allAvailableQuestions[0], // "What is XLM?"
          allAvailableQuestions[2], // "What is XLM used for?"
          allAvailableQuestions[52], // "When was the last payment made?"
        ];
      setDisplayedQuestions(initialQuestions);
      setUsedQuestions(new Set());
    }
  }, [messages.length, isMobile, initialSessionId]);

  // Function to replace a used question with a new one
  const replaceQuestion = (usedQuestion: string) => {
    setUsedQuestions(prevUsed => {
      const newUsed = new Set(prevUsed).add(usedQuestion);

      setDisplayedQuestions(prevDisplayed => {
        // Get available questions that haven't been used and aren't currently displayed
        const available = allAvailableQuestions.filter(q =>
          !newUsed.has(q) && !prevDisplayed.includes(q)
        );

        if (available.length > 0) {
          // Count current category distribution
          const currentCategories = {
            company: prevDisplayed.filter(q => {
              const idx = allAvailableQuestions.indexOf(q);
              return idx >= 35 && idx < 50;
            }).length,
          };

          const totalDisplayed = prevDisplayed.length;
          const targetCompanyCount = Math.ceil(totalDisplayed * 0.7); // 70% target
          const currentCompanyCount = currentCategories.company;

          // Prioritize company questions to maintain 70% ratio
          let preferredQuestions = available;
          if (currentCompanyCount < targetCompanyCount) {
            // Need more company questions - prioritize them
            const companyQuestions = available.filter(q => {
              const idx = allAvailableQuestions.indexOf(q);
              return idx >= 35 && idx < 50;
            });
            if (companyQuestions.length > 0) {
              preferredQuestions = companyQuestions;
            }
          } else {
            // Company questions are at or above target - prefer other categories
            const otherQuestions = available.filter(q => {
              const idx = allAvailableQuestions.indexOf(q);
              return idx < 35 || idx >= 50; // XLM, Stellar, or Payment
            });
            if (otherQuestions.length > 0) {
              preferredQuestions = otherQuestions;
            }
          }

          // Use preferred questions if available, otherwise use all available
          const questionsToChooseFrom = preferredQuestions.length > 0 ? preferredQuestions : available;
          const newQuestion = questionsToChooseFrom[Math.floor(Math.random() * questionsToChooseFrom.length)];
          return prevDisplayed.map(q => q === usedQuestion ? newQuestion : q);
        } else {
          // If no more questions available, just remove the used one
          return prevDisplayed.filter(q => q !== usedQuestion);
        }
      });

      return newUsed;
    });
  };

  // Handle question click
  const handleQuestionClick = (question: string) => {
    setInputValue(question);
    // Replace the question after it's been selected
    replaceQuestion(question);
  };

  // Replace question when it's sent via input field
  useEffect(() => {
    if (messages.length > 1) {
      const lastUserMessage = [...messages].reverse().find(msg => msg.type === 'user');
      if (lastUserMessage) {
        // Use functional update to avoid stale closure
        setUsedQuestions(prevUsed => {
          setDisplayedQuestions(prevDisplayed => {
            // Check if the question is in the displayed list
            if (!prevDisplayed.includes(lastUserMessage.content)) {
              return prevDisplayed; // Question not in list, no change needed
            }

            const newUsed = new Set(prevUsed).add(lastUserMessage.content);

            // Get available questions that haven't been used and aren't currently displayed
            const available = allAvailableQuestions.filter(q =>
              !newUsed.has(q) && !prevDisplayed.includes(q)
            );

            if (available.length > 0) {
              // Count current category distribution
              const currentCategories = {
                company: prevDisplayed.filter(q => {
                  const idx = allAvailableQuestions.indexOf(q);
                  return idx >= 35 && idx < 50;
                }).length,
              };

              const totalDisplayed = prevDisplayed.length;
              const targetCompanyCount = Math.ceil(totalDisplayed * 0.7); // 70% target

              // Prioritize company questions to maintain 70% ratio
              let preferredQuestions = available;
              if (currentCategories.company < targetCompanyCount) {
                // Need more company questions - prioritize them
                const companyQuestions = available.filter(q => {
                  const idx = allAvailableQuestions.indexOf(q);
                  return idx >= 35 && idx < 50;
                });
                if (companyQuestions.length > 0) {
                  preferredQuestions = companyQuestions;
                }
              } else {
                // Company questions are at or above target - prefer other categories
                const otherQuestions = available.filter(q => {
                  const idx = allAvailableQuestions.indexOf(q);
                  return idx < 35 || idx >= 50; // XLM, Stellar, or Payment
                });
                if (otherQuestions.length > 0) {
                  preferredQuestions = otherQuestions;
                }
              }

              // Use preferred questions if available, otherwise use all available
              const questionsToChooseFrom = preferredQuestions.length > 0 ? preferredQuestions : available;
              const newQuestion = questionsToChooseFrom[Math.floor(Math.random() * questionsToChooseFrom.length)];
              return prevDisplayed.map(q => q === lastUserMessage.content ? newQuestion : q);
            } else {
              // If no more questions available, just remove the used one
              return prevDisplayed.filter(q => q !== lastUserMessage.content);
            }
          });

          return new Set(prevUsed).add(lastUserMessage.content);
        });
      }
    }
  }, [messages.length]);

  const quickQuestions = displayedQuestions;

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white p-3 sm:p-6 space-y-3 sm:space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 sm:space-x-3 max-w-full sm:max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user'
                    ? 'bg-gray-900'
                    : 'bg-black'
                  }`}>
                  {message.type === 'user' ? (
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  ) : (
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  )}
                </div>

                <div className={`rounded-lg px-3 py-2 sm:px-4 sm:py-3 ${message.type === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                  }`}>
                  {message.type === 'assistant' ? (
                    <div className="text-sm sm:text-base leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }: any) => <h1 className="text-lg sm:text-xl font-semibold text-gray-900 mt-4 mb-3 first:mt-0" {...props} />,
                          h2: ({ node, ...props }: any) => <h2 className="text-base sm:text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0" {...props} />,
                          h3: ({ node, ...props }: any) => <h3 className="text-sm sm:text-base font-semibold text-gray-900 mt-3 mb-2 first:mt-0" {...props} />,
                          p: ({ node, ...props }: any) => <p className="text-gray-700 my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
                          strong: ({ node, ...props }: any) => <strong className="font-semibold text-gray-900" {...props} />,
                          em: ({ node, ...props }: any) => <em className="italic text-gray-700" {...props} />,
                          ul: ({ node, ...props }: any) => <ul className="list-disc list-inside my-3 space-y-1.5 text-gray-700 ml-2" {...props} />,
                          ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside my-3 space-y-1.5 text-gray-700 ml-2" {...props} />,
                          li: ({ node, ...props }: any) => <li className="text-gray-700 my-1 leading-relaxed" {...props} />,
                          code: ({ node, inline, className, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return inline ? (
                              <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                            ) : (
                              <code className="block bg-gray-800 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto my-3" {...props} />
                            );
                          },
                          pre: ({ node, ...props }: any) => <pre className="bg-gray-800 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto my-3" {...props} />,
                          blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-gray-300 pl-4 my-3 italic text-gray-600" {...props} />,
                          a: ({ node, ...props }: any) => <a className="text-blue-600 hover:text-blue-800 underline break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                          hr: ({ node, ...props }: any) => <hr className="my-4 border-gray-300" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                  )}
                  <div className={`text-xs mt-1 sm:mt-2 ${message.type === 'user' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start space-x-2 sm:space-x-3 max-w-full sm:max-w-3xl">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black flex items-center justify-center">
                <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-gray-600" />
                  <span className="text-gray-600 text-sm sm:text-base">{loadingMessage}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Quick Questions - Always visible throughout the conversation */}
      {quickQuestions.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-3 py-3 sm:px-6 sm:py-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 flex items-center space-x-2">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Try asking:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={`${question}-${index}`}
                onClick={() => handleQuestionClick(question)}
                className="text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors leading-tight"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Input Area - Responsive */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMobile ? "Ask me anything..." : "Ask me anything about your company, employees, payments, or Stellar/XLM blockchain..."}
            className="flex-1 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 sm:px-4 sm:py-3 focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-1 sm:mt-2 leading-tight">
          {isMobile ? "Press Enter to send" : "Press Enter to send • Shift+Enter for new line"}
        </div>
      </div>
    </div>
  );
};