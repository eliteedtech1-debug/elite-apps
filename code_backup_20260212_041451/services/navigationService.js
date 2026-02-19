const axios = require('axios');

class NavigationService {
  constructor() {
    this.menuCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
  }

  async getMenuForUser(userType, token, schoolId, branchId) {
    const cacheKey = `${userType}_${schoolId}_${branchId}`;
    const cached = this.menuCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.menu;
    }

    try {
      const response = await axios.get(`${process.env.API_BASE_URL || 'http://localhost:34567'}/api/rbac/menu?compact=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-School-Id': schoolId,
          'X-Branch-Id': branchId
        }
      });

      if (response.data.success) {
        this.menuCache.set(cacheKey, {
          menu: response.data.data,
          timestamp: Date.now()
        });
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching menu:', error.message);
    }
    return [];
  }

  findNavigationPath(query, menu) {
    const normalizedQuery = query.toLowerCase().trim();
    const results = [];

    const searchMenu = (items, parentPath = []) => {
      for (const section of items) {
        if (section.items) {
          for (const item of section.items) {
            const itemLabel = item.label?.toLowerCase() || '';
            
            if (item.submenu && item.submenuItems) {
              for (const subItem of item.submenuItems) {
                const subLabel = subItem.label?.toLowerCase() || '';
                const fullPath = [...parentPath, section.name, item.label, subItem.label];
                
                if (this.matchesQuery(normalizedQuery, subLabel, subItem.link)) {
                  results.push({
                    label: subItem.label,
                    link: subItem.link,
                    path: fullPath,
                    category: section.name,
                    parent: item.label,
                    score: this.calculateScore(normalizedQuery, subLabel, subItem.link)
                  });
                }
              }
            } else if (item.link) {
              const fullPath = [...parentPath, section.name, item.label];
              
              if (this.matchesQuery(normalizedQuery, itemLabel, item.link)) {
                results.push({
                  label: item.label,
                  link: item.link,
                  path: fullPath,
                  category: section.name,
                  score: this.calculateScore(normalizedQuery, itemLabel, item.link)
                });
              }
            }
          }
        }
      }
    };

    searchMenu(menu);
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  matchesQuery(query, label, link) {
    const queryWords = query.split(/\s+/);
    const labelWords = label.split(/\s+/);
    const linkWords = (link || '').toLowerCase().split(/[/-]/);

    return queryWords.some(qWord => 
      labelWords.some(lWord => lWord.includes(qWord) || qWord.includes(lWord)) ||
      linkWords.some(linkWord => linkWord.includes(qWord) || qWord.includes(linkWord))
    );
  }

  calculateScore(query, label, link) {
    let score = 0;
    const queryWords = query.split(/\s+/);
    const labelWords = label.split(/\s+/);
    
    queryWords.forEach(qWord => {
      labelWords.forEach(lWord => {
        if (lWord === qWord) score += 10;
        else if (lWord.includes(qWord)) score += 5;
        else if (qWord.includes(lWord)) score += 3;
      });
    });

    if (link && link.toLowerCase().includes(query.replace(/\s+/g, '-'))) {
      score += 5;
    }

    return score;
  }

  generateNavigationResponse(results, query) {
    if (results.length === 0) {
      return {
        text: `I couldn't find any pages matching "${query}". Try searching for features like "student list", "attendance", "payments", or "reports".`,
        intent: 'navigation_not_found',
        confidence: 0.5
      };
    }

    const topResult = results[0];
    const directions = topResult.path.join(' → ');
    
    let responseText = `To access **${topResult.label}**, navigate:\n\n📍 ${directions}\n\n`;
    
    if (results.length > 1) {
      responseText += '\n**Other related pages:**\n';
      results.slice(1, 4).forEach((result, idx) => {
        responseText += `${idx + 2}. ${result.label} (${result.category})\n`;
      });
    }

    return {
      text: responseText,
      intent: 'navigation',
      confidence: 0.9,
      navigationResults: results,
      primaryLink: topResult.link
    };
  }

  detectNavigationIntent(message) {
    const navigationKeywords = [
      'where is', 'where can i find', 'where do i find',
      'how do i find', 'how to find', 'how do i access', 'how to access',
      'navigate to', 'navigate', 'go to', 'go', 'take me to', 
      'show me', 'show', 'find', 'find the', 'locate', 'location of',
      'open', 'access'
    ];

    const normalized = message.toLowerCase();
    
    const hasNavigationKeyword = navigationKeywords.some(keyword => normalized.startsWith(keyword + ' '));
    
    const hasEscalationKeyword = normalized.includes('human') || 
                                  normalized.includes('agent') || 
                                  normalized.includes('support team') ||
                                  normalized.includes('contact support');
    
    return hasNavigationKeyword && !hasEscalationKeyword;
  }
}

module.exports = new NavigationService();
