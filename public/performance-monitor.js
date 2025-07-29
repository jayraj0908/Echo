/**
 * Performance Monitor for ECHO
 * Tracks Core Web Vitals and performance metrics
 */

(function() {
  'use strict';

  // Performance metrics tracking
  const performanceMetrics = {
    startTime: performance.now(),
    marks: new Map(),
    measures: new Map(),
    vitals: {}
  };

  // Mark performance checkpoints
  function mark(name) {
    const timestamp = performance.now();
    performanceMetrics.marks.set(name, timestamp);
    performance.mark(name);
    return timestamp;
  }

  // Measure time between marks
  function measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      performanceMetrics.measures.set(name, measure.duration);
      return measure.duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return 0;
    }
  }

  // Track Core Web Vitals
  function trackWebVitals() {
    // First Contentful Paint (FCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          performanceMetrics.vitals.fcp = entry.startTime;
          console.log('FCP:', entry.startTime);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint observer not supported');
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      performanceMetrics.vitals.lcp = lastEntry.startTime;
      console.log('LCP:', lastEntry.startTime);
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay (FID) - requires user interaction
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceMetrics.vitals.fid = entry.processingStart - entry.startTime;
        console.log('FID:', performanceMetrics.vitals.fid);
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      performanceMetrics.vitals.cls = clsValue;
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS observer not supported');
    }
  }

  // Memory usage tracking
  function trackMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  // Network performance
  function trackNetworkPerformance() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      return {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart
      };
    }
    return null;
  }

  // Resource loading performance
  function trackResourcePerformance() {
    const resources = performance.getEntriesByType('resource');
    const resourceStats = {
      css: [],
      js: [],
      images: [],
      fonts: []
    };

    resources.forEach(resource => {
      const duration = resource.responseEnd - resource.startTime;
      const item = {
        name: resource.name.split('/').pop(),
        duration: duration,
        size: resource.transferSize || 0
      };

      if (resource.name.endsWith('.css')) {
        resourceStats.css.push(item);
      } else if (resource.name.endsWith('.js')) {
        resourceStats.js.push(item);
      } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
        resourceStats.images.push(item);
      } else if (resource.name.match(/\.(woff|woff2|ttf|otf)$/)) {
        resourceStats.fonts.push(item);
      }
    });

    return resourceStats;
  }

  // Generate performance report
  function generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      vitals: performanceMetrics.vitals,
      network: trackNetworkPerformance(),
      memory: trackMemoryUsage(),
      resources: trackResourcePerformance(),
      marks: Object.fromEntries(performanceMetrics.marks),
      measures: Object.fromEntries(performanceMetrics.measures)
    };

    return report;
  }

  // Performance grade calculation
  function calculateGrade() {
    const { fcp, lcp, fid, cls } = performanceMetrics.vitals;
    let score = 100;

    // FCP scoring (good: <1.8s, needs improvement: 1.8-3s, poor: >3s)
    if (fcp > 3000) score -= 25;
    else if (fcp > 1800) score -= 10;

    // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
    if (lcp > 4000) score -= 25;
    else if (lcp > 2500) score -= 10;

    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (fid > 300) score -= 25;
    else if (fid > 100) score -= 10;

    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (cls > 0.25) score -= 25;
    else if (cls > 0.1) score -= 10;

    let grade = 'A';
    if (score < 60) grade = 'F';
    else if (score < 70) grade = 'D';
    else if (score < 80) grade = 'C';
    else if (score < 90) grade = 'B';

    return { score, grade };
  }

  // Initialize performance monitoring
  function init() {
    mark('monitor-start');
    trackWebVitals();

    // Mark when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mark('dom-ready');
      });
    } else {
      mark('dom-ready');
    }

    // Mark when window loads
    window.addEventListener('load', () => {
      mark('window-loaded');
      
      // Generate initial report after load
      setTimeout(() => {
        const report = generateReport();
        const grade = calculateGrade();
        
        console.group('🚀 ECHO Performance Report');
        console.log('Grade:', grade.grade, `(${grade.score}/100)`);
        console.log('Core Web Vitals:', performanceMetrics.vitals);
        console.log('Full Report:', report);
        console.groupEnd();

        // Send to analytics if available
        if (window.gtag) {
          window.gtag('event', 'performance_metrics', {
            fcp: performanceMetrics.vitals.fcp,
            lcp: performanceMetrics.vitals.lcp,
            fid: performanceMetrics.vitals.fid,
            cls: performanceMetrics.vitals.cls,
            grade: grade.grade,
            score: grade.score
          });
        }
      }, 1000);
    });

    // Track performance periodically
    setInterval(() => {
      const memory = trackMemoryUsage();
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('High memory usage detected:', memory);
      }
    }, 30000); // Check every 30 seconds
  }

  // Export to global scope for debugging
  window.PerformanceMonitor = {
    mark,
    measure,
    generateReport,
    calculateGrade,
    getMetrics: () => performanceMetrics
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();