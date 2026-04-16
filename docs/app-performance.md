our clients are complaining about our app performance and some times some pages freezes 

⏺ I'll help you investigate and address the performance issues and freezing pages. Let me start by exploring the codebase to understand the application architecture and identify potential performance
  bottlenecks.

⏺ Explore(Analyze app architecture and performance)
  ⎿  Done (33 tool uses · 101.7k tokens · 10m 22s)                                                                                                                                                     

⏺ Performance Analysis Complete

  I've identified the root causes of your performance issues and page freezing. Here's what I found:

  Critical Issues Causing Freezing:

  1. Massive React Components (2,000-3,000 lines)
    - BillClasses.tsx: 2,964 lines with 16+ useState hooks
    - ParentPaymentsPage.tsx: 2,850 lines with 31+ async operations
    - Every state change re-renders thousands of lines of code
  2. Almost Zero Performance Optimization
    - Only 527 useMemo/useCallback for 3,290 array operations (6:1 ratio - should be 1:1)
    - Almost NO React.memo usage
    - Result: Massive unnecessary re-computations on every render
  3. Huge Bundle Sizes
    - 33MB total, 2MB react-pdf alone
    - Using 3 UI frameworks (Ant Design + Bootstrap + PrimeReact)
    - Using 3 chart libraries (ApexCharts + ECharts + Recharts)
    - Using 3 PDF libraries
  4. Backend Issues
    - 1,861 SELECT queries without LIMIT clauses
    - N+1 query problems
    - Missing database indexes
    - No pagination on large datasets
  5. Memory Leaks
    - WhatsApp service running Chromium (200-400MB per school)
    - 360 event listeners without proper cleanup
    - 3,575 console.log statements blocking main thread

  Pages Most Affected:

  - Fees/Billing pages (worst offenders)
  - Performance Dashboard (1MB single chunk)
  - Student/Teacher lists
  - Financial reports
  - PDF generation

  Would you like me to:
  1. Start with quick wins - Add memoization to the worst components + database pagination?
  2. Refactor giant components - Break down 3000-line files into smaller pieces?
  3. Optimize bundle size - Remove redundant libraries and add code splitting?
  4. Fix database performance - Add indexes, limits, and caching?

  Which would you like me to tackle first?