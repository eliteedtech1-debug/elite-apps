const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const db = require('../models');

class StudyZoneScraper {
  constructor() {
    this.currentKeyIndex = 0;
    this.apiKeys = this.loadApiKeys();
    this.genAI = new GoogleGenerativeAI(this.apiKeys[0]);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Initialize OpenAI as fallback
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.baseURL = 'https://studyzone.ng';
  }

  loadApiKeys() {
    const keys = [];
    
    // Add primary key
    if (process.env.GEMINI_API_KEY) {
      keys.push(process.env.GEMINI_API_KEY);
    }
    
    // Add numbered keys
    for (let i = 2; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) keys.push(key);
    }
    
    console.log(`🔑 Loaded ${keys.length} Gemini API keys`);
    return keys;
  }

  switchToNextKey() {
    if (this.apiKeys.length <= 1) return false;
    
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    const newKey = this.apiKeys[this.currentKeyIndex];
    
    this.genAI = new GoogleGenerativeAI(newKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    return true;
  }

  async previewUrl(url) {
    let browser;
    try {
      console.log(`👀 Previewing URL: ${url}`);
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Determine URL type and extract relevant content
      if (url.includes('studyzone.ng')) {
        if (url === 'https://studyzone.ng/' || url.endsWith('studyzone.ng/')) {
          // Level 1: Homepage - extract classes with URLs
          const classes = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="primary-"], a[href*="secondary-"], a[href*="jss-"], a[href*="sss-"]');
            const classMap = new Map();
            
            links.forEach(link => {
              const href = link.href;
              const classMatch = href.match(/(primary-\d+|secondary-\d+|jss-\d+|sss-\d+)/i);
              if (classMatch) {
                const className = classMatch[1];
                if (!classMap.has(className)) {
                  classMap.set(className, {
                    class: className,
                    url: `https://studyzone.ng/${className}/`
                  });
                }
              }
            });
            
            return Array.from(classMap.values()).sort((a, b) => a.class.localeCompare(b.class));
          });
          
          return { type: 'Homepage (Level 1)', classes };
          
        } else if (url.match(/primary-\d+\/$|secondary-\d+\/$|jss-\d+\/$|sss-\d+\/$/)) {
          // Level 2: Class page - show all relevant links
          const pageInfo = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            const relevantLinks = [];
            
            links.forEach(link => {
              const text = link.textContent.trim();
              const href = link.href;
              
              // Show links that might be subjects
              if (text && href && href.includes('studyzone.ng') && text.length > 5 && text.length < 100) {
                relevantLinks.push({ text, href });
              }
            });
            
            return relevantLinks.slice(0, 15); // Show first 15 relevant links
          });
          
          return { 
            type: 'Class Page (Level 2)', 
            subjects: [],
            links: pageInfo
          };
          
        } else if (url.includes('scheme-of-work') || url.includes('lesson-notes')) {
          // Level 3: Subject page - extract weeks OR Level 4: Individual lesson - extract content
          if (url.includes('/lesson-notes/') && url.split('/').length > 5) {
            // Level 4: Individual lesson page - preview the content that would be scraped
            const content = await page.evaluate(() => {
              const scripts = document.querySelectorAll('script, style');
              scripts.forEach(el => el.remove());
              return document.body.innerText;
            });
            
            // Use AI to extract curriculum data (same as actual scraping)
            const extractedData = await this.extractCurriculumData(content, {
              ...options,
              preview: true
            });
            
            return { 
              type: 'Individual Lesson (Level 4)', 
              preview_data: extractedData,
              url: url
            };
            
          } else {
            // Level 3: Subject page - extract weekly lesson links
            const weekInfo = await page.evaluate(() => {
              const allLinks = document.querySelectorAll('a');
              const weekList = [];
              const debugLinks = [];
              
              allLinks.forEach(link => {
                const text = link.textContent.trim();
                const href = link.href;
                
                // Collect all links for debugging
                if (text && href && href.includes('studyzone.ng') && text.length > 10) {
                  debugLinks.push({ text, href });
                }
                
                // Look for week patterns - be more flexible
                const weekMatch = text.match(/week\s*(\d+)|(\d+)\s*week|lesson\s*(\d+)/i);
                if (weekMatch && href && href.includes('studyzone.ng')) {
                  const weekNum = weekMatch[1] || weekMatch[2] || weekMatch[3];
                  weekList.push({
                    week: parseInt(weekNum),
                    title: text,
                    url: href
                  });
                }
              });
              
              return {
                weeks: weekList.sort((a, b) => a.week - b.week),
                debug: debugLinks.slice(0, 20) // First 20 links for debugging
              };
            });
            
            return { 
              type: 'Subject Page (Level 3)', 
              weeks: weekInfo.weeks,
              debug_links: weekInfo.debug
            };
          }
        }
      }
      
      return { type: 'Unknown', message: 'Could not determine page type' };
      
    } catch (error) {
      console.error('URL preview error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async discoverClasses(url) {
    let browser;
    try {
      console.log(`🔍 Discovering classes from: ${url}`);
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const classes = await page.evaluate(() => {
        const classLinks = [];
        const links = document.querySelectorAll('a[href*="primary-"], a[href*="secondary-"], a[href*="jss-"], a[href*="sss-"]');
        
        links.forEach(link => {
          const href = link.href;
          const text = link.textContent.trim();
          
          const classMatch = href.match(/(primary-\d+|secondary-\d+|jss-\d+|sss-\d+)/i);
          if (classMatch && !classLinks.includes(classMatch[1])) {
            classLinks.push(classMatch[1]);
          }
        });
        
        return classLinks.sort();
      });
      
      console.log(`✅ Discovered ${classes.length} classes: ${classes.join(', ')}`);
      return classes;
      
    } catch (error) {
      console.error('Class discovery error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async scrapeFromUrl(url, options = {}) {
    let browser;
    try {
      console.log(`🚀 Starting StudyZone scraping from: ${url}`);
      
      // Extract class and subject from URL
      const urlParts = url.split('/');
      let extractedClass = options.class_code || 'Unknown';
      let extractedSubject = options.subject || 'Unknown';
      
      // Parse StudyZone URL structure
      if (url.includes('studyzone.ng')) {
        const classMatch = url.match(/primary-(\d+)|secondary-(\d+)|jss-(\d+)|sss-(\d+)/i);
        if (classMatch) {
          if (classMatch[1]) extractedClass = `P${classMatch[1]}`;
          else if (classMatch[2]) extractedClass = `S${classMatch[2]}`;
          else if (classMatch[3]) extractedClass = `JSS${classMatch[3]}`;
          else if (classMatch[4]) extractedClass = `SSS${classMatch[4]}`;
        }
        
        // Extract subject from URL path
        const subjectMatch = url.match(/(mathematics|english|basic-science|social-studies|computer|french|igbo|hausa|yoruba|christian-religious-studies|islamic-religious-studies)/i);
        if (subjectMatch) {
          const subjectMap = {
            'mathematics': 'Mathematics',
            'english': 'English Language',
            'basic-science': 'Basic Science',
            'social-studies': 'Social Studies',
            'computer': 'Computer Studies',
            'french': 'French',
            'igbo': 'Igbo',
            'hausa': 'Hausa',
            'yoruba': 'Yoruba',
            'christian-religious-studies': 'Christian Religious Studies',
            'islamic-religious-studies': 'Islamic Religious Studies'
          };
          extractedSubject = subjectMap[subjectMatch[1].toLowerCase()] || subjectMatch[1];
        }
      }
      
      // Launch headless browser with better settings
      browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      
      console.log('📄 Navigating to page...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log('⏳ Waiting for content to load...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Wait longer for JS to render
      
      // Extract weekly lesson links from the Level 3 subject page
      const weeklyLinks = await page.evaluate(() => {
        const links = [];
        const weekLinks = document.querySelectorAll('a[href*="lesson-notes"], a[href*="week"]');
        
        weekLinks.forEach(link => {
          const text = link.textContent.trim();
          const href = link.href;
          
          // Look for week patterns in the link text
          const weekMatch = text.match(/week\s*(\d+)/i);
          if (weekMatch && href) {
            links.push({
              week: parseInt(weekMatch[1]),
              title: text,
              url: href
            });
          }
        });
        
        return links.sort((a, b) => a.week - b.week);
      });
      
      console.log(`📄 Found ${weeklyLinks.length} weekly lesson links`);
      
      // If no weekly links found, fall back to content extraction
      if (weeklyLinks.length === 0) {
        const content = await page.evaluate(() => {
          const scripts = document.querySelectorAll('script, style');
          scripts.forEach(el => el.remove());
          return document.body.innerText;
        });
        
        console.log(`📄 No weekly links found, using content extraction (${content.length} chars)`);
        const extractedData = await this.extractCurriculumData(content, options);
        const savedData = await this.saveCurriculumData(extractedData, {
          source_url: url,
          class_code: extractedClass,
          subject: extractedSubject,
          ...options
        });
        return savedData;
      }
      
      // Process each weekly lesson link
      const allExtractedData = [];
      for (const weekLink of weeklyLinks) {
        try {
          console.log(`📖 Processing ${weekLink.title} (${weekLink.url})`);
          
          await page.goto(weekLink.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const lessonContent = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            return document.body.innerText;
          });
          
          const weekData = await this.extractCurriculumData(lessonContent, {
            ...options,
            week: weekLink.week,
            title: weekLink.title
          });
          
          allExtractedData.push(...weekData);
          
        } catch (error) {
          console.error(`❌ Error processing ${weekLink.title}:`, error.message);
        }
      }

      
      console.log(`🤖 AI extracted ${allExtractedData.length} total items from ${weeklyLinks.length} weeks`);
      
      // Save to database
      const savedData = await this.saveCurriculumData(allExtractedData, {
        source_url: url,
        class_code: extractedClass,
        subject: extractedSubject,
        ...options
      });

      console.log(`✅ Successfully scraped ${savedData.length} curriculum items`);
      return savedData;
    } catch (error) {
      console.error('StudyZone scraping error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async scrapePrimary1Mathematics() {
    try {
      console.log('🚀 Starting StudyZone scraping for Primary 1 Mathematics...');
      
      const url = `${this.baseURL}/primary-1-mathematics-first-term/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'LMS-Curriculum-Bot/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const content = $('body').text();

      // Use AI to extract structured curriculum data
      const extractedData = await this.extractCurriculumData(content);
      
      // Save to database
      const savedRecords = await this.saveToDB(extractedData);
      
      console.log(`✅ Scraped and saved ${savedRecords.length} curriculum topics`);
      return savedRecords;

    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      throw error;
    }
  }

  async extractCurriculumData(htmlContent, options = {}) {
    const { subject = 'Mathematics', class_code = 'Primary 1', term = 'First Term' } = options;
    
    const prompt = `
    Extract ${class_code} ${subject} curriculum data from this content for ${term}.
    
    CONTENT:
    ${htmlContent.substring(0, 8000)}
    
    Extract and structure the following information:
    1. Weekly topics/themes
    2. Learning objectives for each topic
    3. Lesson content and activities
    4. Assessment methods
    5. Resources needed
    
    Return as JSON array:
    [
      {
        "week": 1,
        "topic": "Topic name",
        "objectives": ["objective 1", "objective 2"],
        "content": "Detailed lesson content",
        "activities": ["activity 1", "activity 2"],
        "assessment": "Assessment method",
        "resources": ["resource 1", "resource 2"]
      }
    ]
    `;

    // Try OpenAI first (better rate limits)
    try {
      console.log('🤖 Trying OpenAI GPT-4...');
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });
      
      const text = completion.choices[0].message.content;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        console.log('✅ OpenAI extraction successful');
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('OpenAI error:', error.message);
      console.log('🔄 Falling back to Gemini...');
    }

    // Fallback to Gemini with rotation
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Gemini error:', error.message);
      
      // Check if it's a rate limit error and try next key
      if (error.status === 429 && this.switchToNextKey()) {
        console.log('🔄 Retrying with new Gemini key...');
        return this.extractCurriculumData(htmlContent, options);
      }
      
      return [];
    }
  }

  async saveCurriculumData(extractedData, options = {}) {
    const savedRecords = [];
    
    for (const weekData of extractedData) {
      try {
        const [result] = await db.sequelize.query(`
          INSERT INTO syllabus (
            class_code, subject, term, week, title, content, 
            objectives, activities, assessment, resources,
            scraped_source, source_url, scraped_at, created_at
          ) VALUES (
            :class_code, :subject, :term, :week, :title, :content,
            :objectives, :activities, :assessment, :resources,
            'StudyZone', :source_url, NOW(), NOW()
          )
        `, {
          replacements: {
            class_code: options.class_code,
            subject: options.subject,
            term: options.term || 'First Term',
            week: weekData.week,
            title: weekData.topic,
            content: weekData.content,
            objectives: JSON.stringify(weekData.objectives),
            activities: JSON.stringify(weekData.activities),
            assessment: weekData.assessment,
            resources: JSON.stringify(weekData.resources),
            source_url: options.source_url
          },
          type: db.Sequelize.QueryTypes.INSERT
        });
        
        savedRecords.push({ id: result, ...weekData });
      } catch (error) {
        console.error('Save curriculum error:', error);
      }
    }
    
    return savedRecords;
  }

  async saveToDB(extractedData) {
    const savedRecords = [];
    
    for (const weekData of extractedData) {
      try {
        // Check if record exists
        const existing = await db.sequelize.query(`
          SELECT id FROM syllabus 
          WHERE class_code = 'P1' 
          AND subject = 'Mathematics' 
          AND term = 'First Term' 
          AND week = :week
        `, {
          replacements: { week: weekData.week },
          type: db.Sequelize.QueryTypes.SELECT
        });

        if (existing.length === 0) {
          // Insert new record
          const [insertResult] = await db.sequelize.query(`
            INSERT INTO syllabus (
              subject, class_code, term, week, title, content, 
              status, scraped_source, scraped_at, created_at
            ) VALUES (
              'Mathematics', 'P1', 'First Term', :week, :title, :content,
              'active', 'StudyZone', NOW(), NOW()
            )
          `, {
            replacements: {
              week: weekData.week,
              title: weekData.title,
              content: JSON.stringify({
                objectives: weekData.objectives,
                activities: weekData.activities
              })
            },
            type: db.Sequelize.QueryTypes.INSERT
          });

          savedRecords.push({
            id: insertResult,
            week: weekData.week,
            title: weekData.title,
            source: 'StudyZone'
          });
        }
      } catch (error) {
        console.error(`Failed to save week ${weekData.week}:`, error.message);
      }
    }

    return savedRecords;
  }

  async validateAlignment(scrapedData) {
    // Simple validation - check if we have reasonable data
    const validationResults = scrapedData.map(item => ({
      week: item.week,
      isValid: item.title && item.objectives && item.objectives.length > 0,
      score: item.objectives ? Math.min(item.objectives.length * 25, 100) : 0
    }));

    return validationResults;
  }
}

module.exports = StudyZoneScraper;
