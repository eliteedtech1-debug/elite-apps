const axios = require('axios');
const cheerio = require('cheerio');

async function testScraping() {
  try {
    const url = 'https://studyzone.ng/primary-1/basic-science-scheme-of-work-and-lesson-notes-for-primary-1/';
    
    console.log('🚀 Fetching URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'LMS-Curriculum-Bot/1.0'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📄 Content length:', response.data.length);
    
    const $ = cheerio.load(response.data);
    
    // Extract text content
    const bodyText = $('body').text();
    console.log('📝 Body text length:', bodyText.length);
    console.log('📝 First 500 chars:', bodyText.substring(0, 500));
    
    // Look for specific content patterns
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push($(el).text().trim());
    });
    
    console.log('📋 Headings found:', headings.slice(0, 10));
    
    // Look for week/lesson patterns
    const weekMatches = bodyText.match(/week\s+\d+/gi) || [];
    console.log('📅 Week mentions:', weekMatches.slice(0, 5));
    
    // Look for topic patterns
    const topicMatches = bodyText.match(/topic\s*:?\s*[^\n]+/gi) || [];
    console.log('📚 Topic mentions:', topicMatches.slice(0, 5));
    
  } catch (error) {
    console.error('❌ Scraping test failed:', error.message);
  }
}

testScraping();
