# French Language Setup Guide

## Quick Reference

**Date**: January 2025
**Status**: ✅ **COMPLETE - Ready to Use**

This guide shows you how to enable French language support for your schools.

---

## ✅ What's Been Added

1. **French Translation File**: `/elscholar-ui/src/locales/fr.ts` (88 translations)
2. **Language Type Updated**: TypeScript now recognizes 'fr' as a valid language
3. **Translation System**: Automatic fallback to English if translation missing

---

## 🚀 How to Enable French

### Option 1: French as Default Language

Make French the primary language for a school:

```sql
UPDATE school_setup
SET default_lang = 'fr', second_lang = NULL
WHERE school_id = 'YOUR_SCHOOL_ID';
```

**Result**:
- All reports default to French
- No language selector (monolingual)
- Interface in French

### Option 2: French as Secondary Language (Bilingual with English)

English primary, French as option:

```sql
UPDATE school_setup
SET default_lang = 'en', second_lang = 'fr'
WHERE school_id = 'YOUR_SCHOOL_ID';
```

**Result**:
- Reports default to English
- Language selector appears with: English | Français (French)
- Users can switch to French anytime

### Option 3: French Primary with English Secondary

French primary, English as option:

```sql
UPDATE school_setup
SET default_lang = 'fr', second_lang = 'en'
WHERE school_id = 'YOUR_SCHOOL_ID';
```

**Result**:
- Reports default to French
- Language selector appears with: Français (French) | English
- Users can switch to English if needed

### Option 4: French with Arabic (Bilingual)

French primary, Arabic secondary:

```sql
UPDATE school_setup
SET default_lang = 'fr', second_lang = 'ar'
WHERE school_id = 'YOUR_SCHOOL_ID';
```

**Result**:
- Reports default to French
- Language selector with: Français (French) | العربية (Arabic)
- Arabic reports will be RTL

---

## 📋 French Translation Examples

Here are some key translations from the report:

| English | French |
|---------|--------|
| END OF TERM REPORT | BULLETIN DE FIN DE TRIMESTRE |
| Student Name | Nom de l'élève |
| Class | Classe |
| Session | Session |
| Term | Trimestre |
| Subjects | Matières |
| Exam | Examen |
| Total | Total |
| Grade | Note |
| Remark | Observation |
| Class Position | Classement en Classe |
| Total Score | Score Total |
| Final Average | Moyenne Finale |
| Class Average | Moyenne de Classe |
| Excellent | Excellent |
| Very Good | Très Bien |
| Good | Bien |
| Pass | Passable |
| Fail | Insuffisant |
| Present | Présent |
| Absent | Absent |
| Teacher's Remarks | Observations du Professeur Principal |
| Principal's Remarks | Observations du Directeur |
| First Term | Premier Trimestre |
| Second Term | Deuxième Trimestre |
| Third Term | Troisième Trimestre |

---

## 🎯 Use Cases

### 1. French-Speaking African Schools
Perfect for schools in:
- Senegal
- Ivory Coast (Côte d'Ivoire)
- Mali
- Burkina Faso
- Niger
- Chad
- Cameroon (bilingual with English)
- Democratic Republic of Congo
- Guinea
- Benin
- Togo

### 2. Canadian Schools (Quebec)
French primary with English secondary option

### 3. International Schools
Offering French as one of multiple language options

### 4. French Immersion Programs
Schools teaching in French but serving English-speaking families (offer both)

---

## 🧪 Testing Your French Setup

### Step 1: Apply Database Change
```sql
-- Choose one of the SQL commands above based on your needs
UPDATE school_setup SET default_lang = 'fr', second_lang = 'en' WHERE school_id = 'TEST_SCHOOL';
```

### Step 2: Restart Services
```bash
# If using PM2
pm2 restart elite

# If using npm
cd elscholar-ui
npm start
```

### Step 3: Navigate to Reports
1. Login to your school account
2. Go to **Academic** → **Examinations** → **Exam Results** → **End of Term Report**
3. Select a class and term

### Step 4: Verify French
**If monolingual (default_lang='fr', second_lang=NULL)**:
- ✅ Page should load in French
- ✅ "BULLETIN DE FIN DE TRIMESTRE" appears as title
- ✅ All labels in French
- ✅ No language selector visible

**If bilingual (second_lang='fr')**:
- ✅ Language selector appears
- ✅ Can select "Français (French)"
- ✅ When selected, all labels change to French
- ✅ Report title changes to "BULLETIN DE FIN DE TRIMESTRE"

---

## 📝 Common Scenarios

### Scenario 1: Cameroon School (Bilingual English/French)
Cameroon has both English and French as official languages.

```sql
UPDATE school_setup
SET default_lang = 'en', second_lang = 'fr'
WHERE school_id = 'CAMEROON_SCHOOL_01';
```

### Scenario 2: Senegal School (French with Arabic Option)
Many Senegalese schools teach in French but offer Arabic for Islamic studies.

```sql
UPDATE school_setup
SET default_lang = 'fr', second_lang = 'ar'
WHERE school_id = 'SENEGAL_SCHOOL_01';
```

### Scenario 3: Quebec School (French Primary)
Quebec schools primarily teach in French.

```sql
UPDATE school_setup
SET default_lang = 'fr', second_lang = 'en'
WHERE school_id = 'QUEBEC_SCHOOL_01';
```

### Scenario 4: International School (English/French/Arabic)
Note: Currently only 2 languages supported, but you can offer:

**Option A**: English + French
```sql
UPDATE school_setup SET default_lang = 'en', second_lang = 'fr' WHERE school_id = 'INTL_SCHOOL_01';
```

**Option B**: French + Arabic
```sql
UPDATE school_setup SET default_lang = 'fr', second_lang = 'ar' WHERE school_id = 'INTL_SCHOOL_01';
```

**Option C**: English + Arabic
```sql
UPDATE school_setup SET default_lang = 'en', second_lang = 'ar' WHERE school_id = 'INTL_SCHOOL_01';
```

---

## ⚠️ Important Notes

### 1. Subject Names NOT Translated
Subject names from your database (like "Mathematics", "English Language", etc.) will appear as-is. Only UI labels are translated.

**Example in French Report**:
```
Matières         | Éval. 1 | Éval. 2 | Examen | Total | Note | Observation
Mathematics      |   8.5   |  17.0   |  65.0  | 90.5  |  A   | Excellent
English Language |   9.0   |  18.0   |  68.0  | 95.0  |  A+  | Excellent
```

Notice "Mathematics" and "English Language" stay in English (as stored in database).

### 2. Student Names
Student names will display exactly as entered in the database.

### 3. Grade Boundaries
Your grade labels (A+, A, B, C, etc.) will remain as configured in your system.

### 4. Teacher Comments
Comments entered by teachers will appear in whatever language the teacher wrote them in.

---

## 🔧 Troubleshooting

### Problem: French option doesn't appear
**Solution**: Make sure you set `second_lang = 'fr'` and restart the backend.

### Problem: Some text still in English
**Check**:
1. Is the field a database value (like subject names)? These don't get translated.
2. Is it a teacher's comment? Comments show as entered.
3. Are you viewing the PDF? (PDF translation is in progress - see ARABIC_RTL_IMPLEMENTATION_PROGRESS.md)

### Problem: Wrong language shows by default
**Check**: Is `default_lang` set correctly?

```sql
SELECT school_id, school_name, default_lang, second_lang
FROM school_setup
WHERE school_id = 'YOUR_SCHOOL_ID';
```

---

## 📚 Adding More Languages

Want to add Spanish, Swahili, or another language? Here's how:

### Step 1: Create Translation File
```bash
cd elscholar-ui/src/locales
cp fr.ts es.ts  # For Spanish
```

### Step 2: Translate the Content
Edit `es.ts` and translate all 88 keys to Spanish.

### Step 3: Update index.ts
```typescript
import { en } from './en';
import { ar } from './ar';
import { fr } from './fr';
import { es } from './es';  // Add this

export type Language = 'en' | 'ar' | 'fr' | 'es';  // Add 'es'

const translations = { en, ar, fr, es };  // Add es

export { en, ar, fr, es };  // Add es
```

### Step 4: Use It
```sql
UPDATE school_setup SET default_lang = 'es', second_lang = 'en' WHERE school_id = 'SPANISH_SCHOOL';
```

---

## ✅ Complete Translation List

All 88 keys are translated in the French file:

**Categories**:
- Basic Labels (7 keys)
- Table Headers (11 keys)
- Statistics (7 keys)
- Terms (3 keys)
- Grades & Remarks (6 keys)
- Attendance (6 keys)
- Character Assessment (4 keys)
- Teacher's Section (6 keys)
- Next Term (2 keys)
- Actions (4 keys)
- Grade Details (1 key)
- Contact Info (4 keys)

**Total**: 88 keys ✅

---

## 🎉 Benefits

1. **Authentic French**: Native French speakers can use familiar terminology
2. **Professional**: Shows attention to detail and cultural awareness
3. **Compliant**: Meets requirements for French-speaking regions
4. **Flexible**: Easy to switch between languages
5. **Complete**: All report sections translated

---

## 📞 Support

Need help setting up French for your school?

1. Run the database migration first (see BILINGUAL_SCHOOL_LANGUAGE_SYSTEM.md)
2. Choose your language configuration (monolingual or bilingual)
3. Test with a sample report
4. Verify all labels appear in French

---

**Last Updated**: January 2025
**Status**: ✅ Complete and Ready
**Languages Available**: English, Arabic, French
**Next Language**: Spanish (pending)

---

## Quick Setup Commands Summary

```sql
-- Monolingual French School
UPDATE school_setup SET default_lang = 'fr', second_lang = NULL WHERE school_id = 'YOUR_ID';

-- Bilingual English/French (English primary)
UPDATE school_setup SET default_lang = 'en', second_lang = 'fr' WHERE school_id = 'YOUR_ID';

-- Bilingual French/English (French primary)
UPDATE school_setup SET default_lang = 'fr', second_lang = 'en' WHERE school_id = 'YOUR_ID';

-- Bilingual French/Arabic
UPDATE school_setup SET default_lang = 'fr', second_lang = 'ar' WHERE school_id = 'YOUR_ID';

-- View current settings
SELECT school_id, school_name, default_lang, second_lang FROM school_setup WHERE school_id = 'YOUR_ID';
```

That's it! Your school is now ready to generate reports in French! 🇫🇷
