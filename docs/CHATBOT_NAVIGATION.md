# Chatbot Navigation Feature

## Overview
The chatbot now has intelligent navigation capabilities that help users find and access different pages in the system based on their role (admin, teacher, parent, student).

## How It Works

### Backend (elscholar-api)

1. **NavigationService** (`src/services/navigationService.js`)
   - Fetches role-specific menu from `/api/rbac/menu?compact=true`
   - Caches menu data for 5 minutes per user type
   - Searches menu items based on user queries
   - Calculates relevance scores for search results
   - Generates navigation directions (breadcrumb paths)

2. **ChatbotController** (`src/controllers/ChatbotController.js`)
   - Enhanced to detect navigation intent in user messages
   - Passes user context (userType, token, schoolId, branchId) to navigation service
   - Returns navigation results with clickable links

### Frontend (elscholar-ui)

**ChatbotWidget** (`src/feature-module/application/support/ChatbotWidget.tsx`)
- Displays navigation responses with formatted directions
- Shows clickable "Go to Page" button for primary result
- Renders markdown-style formatting for paths (→ arrows)

## Usage Examples

Users can ask questions like:

### Direct Navigation
- "Where is student list?"
- "How do I find attendance?"
- "Show me payment records"
- "Take me to teacher list"
- "Open class timetable"

### Feature Discovery
- "Where can I mark attendance?"
- "How do I add a new student?"
- "Find staff attendance"
- "Show me reports"

### Response Format

```
To access **Student List**, navigate:

📍 Personal Data Mngr → Students → Student List

**Other related pages:**
2. Class List (Personal Data Mngr)
3. Promotion & Graduation (Personal Data Mngr)

[🔗 Go to Page] (clickable button)
```

## Technical Details

### Navigation Intent Detection
Keywords that trigger navigation:
- where is, how do i find, how to access, navigate to
- go to, open, show me, take me to, find
- where can i, how do i get to, location of
- Common features: student list, teacher list, attendance, payment, report, dashboard, settings

### Menu Structure
The system fetches role-specific menus from RBAC:
- **Admin**: Full access to all modules
- **Teacher**: Teaching tools, class management, attendance
- **Parent**: Student info, payments, communication
- **Student**: Assignments, grades, timetable

### Scoring Algorithm
Results are ranked by:
1. Exact word matches (10 points)
2. Partial word matches (5 points)
3. Word contains query (3 points)
4. URL path matches (5 points)

### Caching
- Menu data cached for 5 minutes per user type
- Reduces API calls to RBAC menu endpoint
- Cache key: `{userType}_{schoolId}_{branchId}`

## Configuration

### Environment Variables
```bash
API_BASE_URL=http://localhost:34567  # Backend API URL
```

### Required Headers
All navigation requests require:
```javascript
{
  'Authorization': 'Bearer {token}',
  'X-School-Id': '{schoolId}',
  'X-Branch-Id': '{branchId}'
}
```

## Testing

### Test Navigation Queries
```bash
# In chatbot widget, try:
"where is student list"
"show me attendance"
"how do i find payments"
"take me to reports"
"open teacher list"
```

### Expected Response
- Navigation path with breadcrumbs
- Clickable link button
- Related pages (if multiple matches)
- Confidence score (typically 0.9 for navigation)

## Future Enhancements

1. **Voice Navigation**: "Alexa, take me to student list"
2. **Contextual Suggestions**: Based on user's current page
3. **Recent Pages**: "Go back to where I was"
4. **Favorites**: "Show my favorite pages"
5. **Search History**: Learn from user's navigation patterns
6. **Multi-language**: Support navigation in different languages

## Troubleshooting

### No Results Found
- Check if user has permission to access the page
- Verify RBAC menu is properly configured
- Try more specific keywords (e.g., "student list" instead of "students")

### Wrong Page Suggested
- Navigation service uses keyword matching
- More specific queries yield better results
- Report issues to improve scoring algorithm

### Cache Issues
- Cache expires after 5 minutes
- Restart backend to clear all caches
- Check `menuCache` in NavigationService

## API Endpoints

### Get Menu (RBAC)
```
GET /api/rbac/menu?compact=true
Headers: Authorization, X-School-Id, X-Branch-Id
```

### Chat with Navigation
```
POST /api/support/chatbot/chat
Body: { message, sessionId }
Headers: Authorization, X-School-Id, X-Branch-Id, X-User-Type
```

## Files Modified

### Backend
- ✅ `src/services/navigationService.js` (NEW)
- ✅ `src/controllers/ChatbotController.js` (UPDATED)

### Frontend
- ✅ `src/feature-module/application/support/ChatbotWidget.tsx` (UPDATED)

## Dependencies

### Backend
- `axios` - For fetching menu from RBAC API

### Frontend
- No new dependencies required

---

**Last Updated**: 2026-02-10
**Version**: 1.0
**Status**: ✅ Production Ready
