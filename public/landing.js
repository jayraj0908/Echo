/**
 * Landing Page JavaScript
 * 
 * Handles landing page interactions, navigation, and authentication checks
 */

(function() {
  'use strict';

  // DOM elements
  const navSignInBtn = document.getElementById('nav-signin-btn');
  const navSignUpBtn = document.getElementById('nav-signup-btn');
  const heroCtaBtn = document.getElementById('hero-cta-btn');
  const heroSignInBtn = document.getElementById('hero-signin-btn');
  const ctaSignUpBtn = document.getElementById('cta-signup-btn');
  const authLoading = document.getElementById('auth-loading');
  const themeToggle = document.getElementById('theme-toggle');

  /**
   * Initialize landing page functionality
   */
  function init() {
    // Initialize theme from localStorage
    initializeTheme();
    
    // Show loading while checking auth state
    showLoading(true);

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, showing landing page...');
      showLoading(false);
      setupEventListeners();
      startAnimations();
    }, 3000); // 3 second timeout

    // Check if AuthUtils is available
    if (window.AuthUtils && window.AuthUtils.onAuthStateChanged) {
      // Check authentication state and handle redirects
      window.AuthUtils.onAuthStateChanged((user) => {
        clearTimeout(loadingTimeout);
        showLoading(false);
        
        if (user) {
          // User is already authenticated, redirect to app
          console.log('User is authenticated, redirecting to app...');
          window.AuthUtils.redirectToApp();
        } else {
          // User is not authenticated, show landing page
          setupEventListeners();
          startAnimations();
        }
      });
    } else {
      // AuthUtils not available, show landing page directly
      console.log('AuthUtils not available, showing landing page...');
      clearTimeout(loadingTimeout);
      showLoading(false);
      setupEventListeners();
      startAnimations();
    }
  }

  /**
   * Set up event listeners for landing page interactions
   */
  function setupEventListeners() {
    // Navigation buttons
    if (navSignInBtn) {
      navSignInBtn.addEventListener('click', () => {
        navigateToLogin();
      });
    }

    if (navSignUpBtn) {
      navSignUpBtn.addEventListener('click', () => {
        navigateToSignUp();
      });
    }

    // Hero section buttons
    if (heroCtaBtn) {
      heroCtaBtn.addEventListener('click', () => {
        navigateToSignUp();
      });
    }

    if (heroSignInBtn) {
      heroSignInBtn.addEventListener('click', () => {
        navigateToLogin();
      });
    }

    // CTA section button
    if (ctaSignUpBtn) {
      ctaSignUpBtn.addEventListener('click', () => {
        navigateToSignUp();
      });
    }

    // Theme toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // Add scroll effects for navigation
    setupScrollEffects();
  }

  /**
   * Navigate to login page
   */
  function navigateToLogin() {
    showLoading(true);
    window.location.href = '/login.html';
  }

  /**
   * Navigate to signup (login page with signup tab)
   */
  function navigateToSignUp() {
    showLoading(true);
    // Store preference to show signup tab
    sessionStorage.setItem('auth_preferred_tab', 'signup');
    window.location.href = '/login.html';
  }

  /**
   * Toggle between light and dark themes with Apple-inspired animation
   */
  function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Add transition class for smooth theme change
    html.classList.add('theme-transitioning');
    
    // Update theme
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Create ripple effect from toggle button
    const toggleRect = themeToggle.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${toggleRect.left + toggleRect.width / 2}px;
      top: ${toggleRect.top + toggleRect.height / 2}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: ${newTheme === 'dark' ? 'rgba(52, 53, 65, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(ripple);
    
    // Trigger ripple animation
    requestAnimationFrame(() => {
      const maxDimension = Math.max(window.innerWidth, window.innerHeight) * 2;
      ripple.style.width = maxDimension + 'px';
      ripple.style.height = maxDimension + 'px';
    });
    
    // Clean up after animation
    setTimeout(() => {
      html.classList.remove('theme-transitioning');
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
    
    // Add subtle particle burst effect
    createThemeToggleParticles(toggleRect.left + toggleRect.width / 2, toggleRect.top + toggleRect.height / 2);
  }

  /**
   * Create particle burst effect for theme toggle
   */
  function createThemeToggleParticles(x, y) {
    const colors = document.documentElement.getAttribute('data-theme') === 'dark' 
      ? ['#19c37d', '#7c3aed', '#ffffff'] 
      : ['#10a37f', '#7c3aed', '#333333'];
    
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 4 + 2;
      const angle = (i / 12) * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: themeParticleBurst 0.8s ease-out forwards;
        --angle: ${angle};
        --velocity: ${velocity};
      `;
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 800);
    }
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Show/hide loading state
   * @param {boolean} loading
   */
  function showLoading(loading) {
    if (authLoading) {
      authLoading.style.display = loading ? 'flex' : 'none';
    }
  }

  /**
   * Set up scroll effects for navigation bar
   */
  function setupScrollEffects() {
    const nav = document.querySelector('.landing-nav');
    if (!nav) return;

    let lastScrollY = 0;
    let ticking = false;

    function updateNavbar() {
      const scrollY = window.scrollY;
      
      // Add/remove scrolled class based on scroll position
      if (scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      // Hide/show navbar on scroll direction (optional)
      if (scrollY > lastScrollY && scrollY > 100) {
        nav.style.transform = 'translateY(-100%)';
      } else {
        nav.style.transform = 'translateY(0)';
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Add CSS for scroll effects and particles
    const style = document.createElement('style');
    style.textContent = `
      .landing-nav {
        transition: transform 0.3s ease, background-color 0.3s ease;
      }
      
      .landing-nav.scrolled {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      }
      
      html[data-theme='dark'] .landing-nav.scrolled {
        background: rgba(52, 53, 65, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      @keyframes floatUp {
        0% {
          transform: translateY(0px) translateX(0px) rotate(0deg);
          opacity: 1;
        }
        50% {
          transform: translateY(-50vh) translateX(20px) rotate(180deg);
        }
        100% {
          transform: translateY(-100vh) translateX(-20px) rotate(360deg);
          opacity: 0;
        }
      }
      
      @keyframes trailFade {
        0% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0.3);
        }
      }
      
      @keyframes themeParticleBurst {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(
            calc(-50% + cos(var(--angle)) * var(--velocity) * 1px),
            calc(-50% + sin(var(--angle)) * var(--velocity) * 1px)
          ) scale(0.3);
        }
      }
      
      .theme-transitioning * {
        transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease !important;
      }
      
      @keyframes cardParticleBurst {
        0% {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(
            calc(-50% + cos(var(--angle)) * var(--velocity) * 1px),
            calc(-50% + sin(var(--angle)) * var(--velocity) * 1px)
          ) scale(0.2);
        }
      }
      
      .agent-card-entrance {
        animation: cardEntrance 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        opacity: 0;
        transform: translateY(40px) scale(0.9);
      }
      
      @keyframes cardEntrance {
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Start landing page animations with particle system
   */
  function startAnimations() {
    // Animate elements on scroll
    setupScrollAnimations();
    
    // Start flowing chat animation
    startChatPreviewAnimation();
    
    // Initialize particle system
    initParticleSystem();
    
    // Start animated counters
    startAnimatedCounters();
  }

  /**
   * Initialize floating particle system
   */
  function initParticleSystem() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-system';
    particleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;
    
    document.body.appendChild(particleContainer);
    
    // Create particles
    for (let i = 0; i < 30; i++) {
      setTimeout(() => createParticle(particleContainer), i * 200);
    }
  }

  /**
   * Create floating particles
   */
  function createParticle(container) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 2;
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight + 20;
    const opacity = Math.random() * 0.4 + 0.1;
    const duration = Math.random() * 15 + 10;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, ${opacity});
      border-radius: 50%;
      left: ${x}px;
      top: ${y}px;
      animation: floatUp ${duration}s linear infinite;
      backdrop-filter: blur(1px);
      -webkit-backdrop-filter: blur(1px);
      box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, ${opacity * 0.5});
    `;
    
    container.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
        createParticle(container); // Create new particle
      }
    }, duration * 1000);
  }

  /**
   * Set up scroll-triggered animations
   */
  function setupScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .hero-stats, .cta-content').forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });

    // Add CSS for scroll animations
    const style = document.createElement('style');
    style.textContent = `
      .animate-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      
      .animate-on-scroll.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
      
      .feature-card.animate-on-scroll {
        transition-delay: var(--delay, 0s);
      }
    `;
    document.head.appendChild(style);

    // Add staggered delays to feature cards
    document.querySelectorAll('.feature-card').forEach((card, index) => {
      card.style.setProperty('--delay', `${index * 0.1}s`);
    });
    
    // Set up agent showcase effects
    setupAgentShowcase();
  }

  /**
   * Add text scramble effect for agent cards
   */
  function addScrambleEffect(element) {
    const originalText = element.textContent;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    let isAnimating = false;
    
    element.addEventListener('mouseenter', () => {
      if (isAnimating) return;
      isAnimating = true;
      
      let iteration = 0;
      const scrambleInterval = setInterval(() => {
        element.textContent = originalText
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return originalText[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        
        if (iteration >= originalText.length) {
          clearInterval(scrambleInterval);
          element.textContent = originalText;
          isAnimating = false;
        }
        
        iteration += 1/3;
      }, 30);
    });
    
    element.addEventListener('mouseleave', () => {
      if (!isAnimating) {
        element.textContent = originalText;
      }
    });
  }

  /**
   * Add agent card showcase effects
   */
  function setupAgentShowcase() {
    document.querySelectorAll('.feature-card').forEach((card, index) => {
      const title = card.querySelector('h3');
      const description = card.querySelector('p');
      const icon = card.querySelector('.feature-icon');
      
      // Add scramble effect to agent titles
      if (title && title.textContent.includes('Agent')) {
        addScrambleEffect(title);
      }
      
      // Add enhanced hover effects
      card.addEventListener('mouseenter', () => {
        // Icon animation
        if (icon) {
          icon.style.transform = 'scale(1.2) rotate(5deg)';
          icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
        
        // Add particle burst effect
        const cardRect = card.getBoundingClientRect();
        createCardHoverParticles(
          cardRect.left + cardRect.width / 2, 
          cardRect.top + cardRect.height / 3
        );
        
        // Glow effect
        card.style.boxShadow = `
          0 24px 48px rgba(0, 0, 0, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          0 0 20px rgba(16, 163, 127, 0.3)
        `;
      });
      
      card.addEventListener('mouseleave', () => {
        if (icon) {
          icon.style.transform = 'scale(1) rotate(0deg)';
        }
        
        card.style.boxShadow = `
          0 8px 32px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `;
      });
      
      // Add staggered entrance animation
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('agent-card-entrance');
    });
  }

  /**
   * Create particle effects for card hover
   */
  function createCardHoverParticles(x, y) {
    const colors = ['#10a37f', '#7c3aed', '#ffffff', '#19c37d'];
    
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 3 + 2;
      const angle = (Math.random() * Math.PI * 2);
      const velocity = Math.random() * 40 + 20;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: cardParticleBurst 1s ease-out forwards;
        --angle: ${angle};
        --velocity: ${velocity};
        opacity: 0.8;
      `;
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1000);
    }
  }

  /**
   * Animate the chat preview with flowing agent explanations
   */
  function startChatPreviewAnimation() {
    const chatMessages = document.querySelector('.chat-messages');
    const typingIndicator = document.querySelector('.typing-indicator');
    
    if (!chatMessages || !typingIndicator) return;

    // Agent conversation scenarios - enhanced for better visibility
    const agentConversations = [
      {
        user: "What AI agents can help with my startup?",
        ai: "As your AI cofounder, I bring multiple specialized agents:\n\n• Strategy Agent - Business planning & market analysis\n• Content Agent - Marketing materials & social media\n• Code Agent - Development & technical solutions\n• Analytics Agent - Data insights & performance metrics\n\nTogether, we'll accelerate your startup's growth with AI-powered expertise in every domain."
      },
      {
        user: "Help me analyze market opportunities in fintech",
        ai: "Research Agent activated! 🔍\n\nAnalyzing fintech landscape:\n• Market size: $312B globally, growing 23.8% YoY\n• Key trends: Embedded finance, DeFi adoption, RegTech\n• Underserved segments: SMB lending, cross-border payments\n• Opportunity: AI-powered personal finance management\n\nRecommendation: Focus on B2B embedded banking solutions - 47% market gap identified."
      },
      {
        user: "Create a go-to-market strategy for our SaaS product",
        ai: "Strategy Agent & Content Agent collaborating! 🚀\n\n**Phase 1: Foundation (Month 1-2)**\n• Define ICP and buyer personas\n• Develop value proposition canvas\n• Create landing page and demo\n\n**Phase 2: Launch (Month 3-4)**\n• Product Hunt launch\n• Content marketing campaign\n• Influencer partnerships\n\n**Phase 3: Scale (Month 5-6)**\n• Performance marketing\n• Sales team expansion\n• Customer success program"
      },
      {
        user: "Review my React component for performance issues",
        ai: "Code Agent analyzing your component... ⚡\n\n**Issues identified:**\n1. Unnecessary re-renders due to object recreation\n2. Missing memoization for expensive calculations\n3. Large bundle size from unused imports\n\n**Optimizations applied:**\n✅ Wrapped with React.memo()\n✅ Added useMemo for derived state\n✅ Implemented lazy loading\n\n**Result:** 73% faster rendering, 45% smaller bundle size"
      },
      {
        user: "What metrics should I track for product-market fit?",
        ai: "Analytics Agent providing PMF framework! 📊\n\n**Leading Indicators:**\n• User engagement: DAU/MAU ratio >40%\n• Retention: Week 1 >40%, Month 1 >15%\n• NPS Score: >50 for sustainable growth\n\n**Product Metrics:**\n• Feature adoption rates\n• Time to first value <15 minutes\n• Support ticket trends\n\n**Business Metrics:**\n• CAC payback period <12 months\n• Organic growth rate >15%\n• Customer satisfaction >4.5/5"
      }
    ];

    let currentIndex = 0;
    let isAnimating = false;

    function animateConversation() {
      if (isAnimating) return;
      isAnimating = true;

      const conversation = agentConversations[currentIndex];
      
      // Create multiple message elements for scroll effect
      const messages = [];
      
      // Add some context messages to show scroll
      const contextMessages = [
        { text: "Hey BUILDWAY! I need help with my startup", type: 'user' },
        { text: "I'm here to help! What specific area would you like to focus on?", type: 'ai' },
        { text: conversation.user, type: 'user' }
      ];
      
      // Clear current messages with smooth fade out
      const existingMessages = chatMessages.querySelectorAll('.message');
      existingMessages.forEach(msg => {
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(-20px)';
      });

      setTimeout(() => {
        chatMessages.innerHTML = '';
        chatMessages.scrollTop = 0;
        
        // Create all messages
        contextMessages.forEach((msg, index) => {
          const messageEl = createMessageElement(msg.text, msg.type);
          messages.push(messageEl);
          chatMessages.appendChild(messageEl);
        });
        
        // Create AI response
        const aiMessage = createMessageElement(conversation.ai, 'ai', true);
        messages.push(aiMessage);
        chatMessages.appendChild(aiMessage);
        
        // Animate messages appearing one by one
        messages.forEach((msg, index) => {
          setTimeout(() => {
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
            
            // Scroll down as messages appear
            if (index >= 2) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, index * 800);
        });

        // Start typing the AI response
        setTimeout(() => {
          const aiTextElement = aiMessage.querySelector('.ai-message-text');
          if (aiTextElement) {
            typeMessage(aiTextElement, conversation.ai);
          }
        }, messages.length * 800 + 500);

        // Reset animation flag
        setTimeout(() => {
          isAnimating = false;
        }, messages.length * 800 + 3000);
      }, 500);

      currentIndex = (currentIndex + 1) % agentConversations.length;
    }

    function createMessageElement(text, type, hasTyping = false) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}-message`;
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = type === 'user' ? 'translateX(20px)' : 'translateX(-20px)';
      messageDiv.style.transition = 'all 0.5s ease';

      if (type === 'user') {
        messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
      } else {
        messageDiv.innerHTML = `
          <div class="message-avatar">B</div>
          <div class="message-content">
            <div class="ai-message-text"></div>
            ${hasTyping ? '<div class="typing-indicator"><span></span><span></span><span></span></div>' : ''}
          </div>
        `;
      }

      return messageDiv;
    }

    function typeMessage(element, text) {
      const typingIndicator = element.parentNode.querySelector('.typing-indicator');
      if (typingIndicator) typingIndicator.style.display = 'flex';
      
      setTimeout(() => {
        if (typingIndicator) typingIndicator.style.display = 'none';
        
        let index = 0;
        const typeChar = () => {
          element.textContent = text.substring(0, index + 1);
          index++;
          if (index < text.length) {
            setTimeout(typeChar, Math.random() * 50 + 20);
          }
        };
        typeChar();
      }, 1500);
    }

    // Start the animation cycle
    animateConversation();
    setInterval(animateConversation, 12000);
  }

  /**
   * Handle keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Enter key on landing page goes to signup
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const activeElement = document.activeElement;
        
        // Don't interfere with form inputs or buttons
        if (activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'BUTTON' || 
            activeElement.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        navigateToSignUp();
      }
    });
  }

  /**
   * Add theme toggle functionality (if theme toggle is present)
   */
  function setupThemeToggle() {
    // This can be extended if we add a theme toggle to the landing page
    // For now, it inherits from the main theme system
  }

  /**
   * Handle browser back button
   */
  function setupBrowserNavigation() {
    window.addEventListener('popstate', (e) => {
      // Handle browser navigation if needed
      // Landing page is typically the root, so this may not be necessary
    });
  }

  /**
   * Error handling for navigation
   */
  function handleNavigationError(error) {
    console.error('Navigation error:', error);
    showLoading(false);
    
    // Show user-friendly error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'navigation-error';
    errorMessage.textContent = 'Something went wrong. Please try again.';
    errorMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(errorMessage);
    
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  }

  /**
   * Performance optimization: Lazy load images
   */
  function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for older browsers
      images.forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }

  /**
   * Initialize everything when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      // Add mouse movement effect for particles
      setupMouseEffects();
    });
  } else {
    init();
    setupMouseEffects();
  }

  /**
   * Set up mouse trail effects
   */
  function setupMouseEffects() {
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Create trail particle occasionally
      if (Math.random() < 0.05) {
        createTrailParticle(mouseX, mouseY);
      }
    });
  }

  /**
   * Create mouse trail particles
   */
  function createTrailParticle(x, y) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 2;
    particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: rgba(16, 163, 127, 0.6);
      border-radius: 50%;
      left: ${x - size/2}px;
      top: ${y - size/2}px;
      pointer-events: none;
      z-index: 9999;
      animation: trailFade 1s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1000);
  }

  /**
   * Start animated counters for stats
   */
  function startAnimatedCounters() {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const statContainer = entry.target;
          const statNumbers = statContainer.querySelectorAll('.stat-number');
          
          statNumbers.forEach((statNumber, index) => {
            animateCounter(statNumber, index);
          });
          
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
      observer.observe(heroStats);
    }
  }

  /**
   * Animate individual counter
   */
  function animateCounter(element, index) {
    if (!element) return;
    
    const targets = ['1M+', '99.9%', '< 1s'];
    const target = targets[index];
    const duration = [2000, 2500, 1800][index];
    
    let startTime = null;
    
    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      if (index === 0) {
        // 1M+ counter
        const currentValue = Math.floor(progress * 1000000);
        if (currentValue < 1000000) {
          element.textContent = (currentValue / 1000).toFixed(0) + 'K+';
        } else {
          element.textContent = '1M+';
        }
      } else if (index === 1) {
        // 99.9% counter
        const currentValue = progress * 99.9;
        element.textContent = currentValue.toFixed(1) + '%';
      } else {
        // < 1s counter
        const currentValue = 5 - (progress * 4); // Count down from 5s to < 1s
        if (currentValue > 1) {
          element.textContent = '< ' + currentValue.toFixed(1) + 's';
        } else {
          element.textContent = '< 1s';
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    // Add a small delay for each counter
    setTimeout(() => {
      requestAnimationFrame(animate);
    }, index * 200);
  }

  // Initialize AuthUtils
  if (window.AuthUtils) {
    window.AuthUtils.init();
  }

  // Initialize landing page
  init();

  // Set up additional functionality
  setupKeyboardShortcuts();
  setupBrowserNavigation();
  setupLazyLoading();

  // Export for testing purposes
  window.LandingPage = {
    navigateToLogin,
    navigateToSignUp,
    showLoading
  };

})();