# AI-Powered Web Scraping Strategy for LMS Curriculum Auto-Update

**Implementation Guide for Nigerian Education LMS**  
**Target Sources:** NERDC Portal, StudyZone.ng, and Supplementary Educational Platforms  
**Date:** December 28, 2025  
**Version:** 1.0

---

## Executive Summary

This report outlines a comprehensive strategy for implementing AI-powered web scraping tools to automatically populate and update your Learning Management System (LMS) syllabus module with curriculum data from official Nigerian education sources. The approach combines traditional web scraping with modern AI capabilities to handle dynamic content, unstructured data, and content validation.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Sources and Access Strategy](#2-data-sources-and-access-strategy)
3. [AI Scraping Tools and Technologies](#3-ai-scraping-tools-and-technologies)
4. [Implementation Workflow](#4-implementation-workflow)
5. [Data Extraction and Transformation](#5-data-extraction-and-transformation)
6. [Validation and Quality Assurance](#6-validation-and-quality-assurance)
7. [Real-Time Update Mechanisms](#7-real-time-update-mechanisms)
8. [Security and Compliance](#8-security-and-compliance)
9. [Monitoring and Maintenance](#9-monitoring-and-maintenance)
10. [Code Examples and Templates](#10-code-examples-and-templates)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐        │
│  │  NERDC   │  │StudyZone │  │  Other Educational │        │
│  │  Portal  │  │   .ng    │  │     Platforms      │        │
│  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘        │
└───────┼─────────────┼──────────────────┼───────────────────┘
        │             │                  │
        ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Scraping & Processing Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Scraping   │  │  AI Content  │  │   Data       │      │
│  │   Engine     │  │  Extraction  │  │ Validation   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Transformation & Storage Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Data ETL    │  │  Curriculum  │  │   Version    │      │
│  │  Pipeline    │  │  Mapper      │  │   Control    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   LMS Database Layer                         │
│              (Syllabus Module Schema)                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

- **Modularity:** Each scraping target is an independent module
- **Resilience:** Fault-tolerant with retry mechanisms and fallbacks
- **Scalability:** Can handle multiple simultaneous curriculum updates
- **Auditability:** Complete logging of all data sources and transformations
- **Compliance:** Respects robots.txt and terms of service

---

## 2. Data Sources and Access Strategy

### 2.1 Primary Sources

#### A. NERDC e-Curriculum Portal (nerdc.gov.ng)

**Access Method:**
- Official portal requires institutional authentication
- Public pages available for subject listings and policy documents
- PDF curriculum documents available through direct links

**Scraping Approach:**
- Session-based scraping with authentication tokens
- PDF extraction using AI-powered document parsing
- Quarterly full refresh with weekly change detection

**Data to Extract:**
- Official subject codes and names
- Learning outcomes per subject/level
- Competency frameworks
- Assessment guidelines

#### B. StudyZone.ng (studyzone.ng)

**Access Method:**
- Publicly accessible lesson plans and schemes of work
- Organized by term, level, and subject
- Mix of HTML pages and downloadable PDFs

**Scraping Approach:**
- Direct HTML parsing for structured content
- Weekly topic extraction with AI semantic analysis
- Lesson objective and activity extraction

**Data to Extract:**
- Weekly lesson topics
- Learning objectives per week
- Classroom activities
- Assessment items
- Term-by-term schemes of work

#### C. Supplementary Platforms

- Government education portals
- State-level curriculum adaptations
- Private educational content providers

### 2.2 Access Authentication Strategy

```python
# Sample authentication configuration
AUTH_CONFIG = {
    "nerdc": {
        "method": "session_cookie",
        "credentials_source": "env_vars",
        "refresh_interval": 3600,  # 1 hour
        "fallback": "public_pages_only"
    },
    "studyzone": {
        "method": "public_access",
        "rate_limit": 10,  # requests per minute
        "user_agent": "LMS-Curriculum-Bot/1.0"
    }
}
```

---

## 3. AI Scraping Tools and Technologies

### 3.1 Recommended Technology Stack

#### A. Web Scraping Framework
- **Scrapy** (Python): Industrial-strength scraping with built-in scheduling
- **Playwright/Puppeteer**: For JavaScript-heavy dynamic content
- **BeautifulSoup4**: For simple HTML parsing tasks

#### B. AI-Powered Extraction Tools
- **OpenAI GPT-4 API**: For unstructured content interpretation
- **Anthropic Claude API**: For document analysis and validation
- **LangChain**: For building extraction chains with LLMs
- **LlamaIndex**: For semantic search and document processing

#### C. Document Processing
- **PyMuPDF/pdfplumber**: PDF text extraction
- **Docling**: AI-powered document understanding
- **Tesseract OCR**: For scanned documents (with preprocessing)

#### D. Data Validation and Transformation
- **Pydantic**: Data validation with schema enforcement
- **Pandas**: Data transformation and cleaning
- **Great Expectations**: Data quality testing

#### E. Task Scheduling and Orchestration
- **Apache Airflow**: Workflow orchestration
- **Celery + Redis**: Asynchronous task processing
- **Cron jobs**: Simple scheduled scraping tasks

### 3.2 AI Tool Selection Matrix

| Use Case | Tool | Why |
|----------|------|-----|
| Extracting topics from unstructured lesson text | GPT-4 / Claude | Superior semantic understanding |
| Validating curriculum alignment | Claude API | Strong reasoning for compliance checking |
| Converting PDF tables to structured data | Docling + GPT-4 | Handles complex layouts |
| Identifying changes in curriculum documents | Embeddings + Vector DB | Semantic similarity detection |
| Generating missing learning objectives | GPT-4 with few-shot prompts | Maintains consistency with examples |

---

## 4. Implementation Workflow

### 4.1 Phase 1: Initial Data Population

```
Step 1: Crawl NERDC Portal
  ├─> Extract subject taxonomy
  ├─> Download curriculum PDFs
  ├─> Parse learning outcomes
  └─> Store as baseline curriculum structure

Step 2: Scrape StudyZone Content
  ├─> Iterate through levels (P1-P6, JSS1-JSS3)
  ├─> For each subject: Extract 3 terms
  ├─> Parse weekly topics, objectives, activities
  └─> Map to NERDC subject codes

Step 3: AI-Powered Validation
  ├─> Cross-reference StudyZone topics with NERDC outcomes
  ├─> Identify gaps or misalignments
  ├─> Generate alignment confidence scores
  └─> Flag content for manual review

Step 4: Database Population
  ├─> Transform to LMS schema
  ├─> Insert with version tags
  ├─> Create audit trail
  └─> Trigger curriculum sync
```

### 4.2 Phase 2: Continuous Monitoring

```
Daily Tasks:
  └─> Check for new StudyZone content (lightweight HTML diff)

Weekly Tasks:
  ├─> Deep crawl StudyZone for updated lesson plans
  └─> Compare against existing database

Monthly Tasks:
  ├─> Full NERDC portal scan
  ├─> PDF document change detection
  └─> Curriculum version comparison

Quarterly Tasks:
  ├─> Complete data validation audit
  ├─> AI-powered quality assessment
  └─> Stakeholder compliance review
```

### 4.3 Change Detection Algorithm

```python
# Pseudo-code for intelligent change detection
def detect_curriculum_changes(source, last_scraped_data):
    """
    Uses embeddings and semantic similarity to detect meaningful changes
    """
    current_data = scrape_source(source)
    
    # Generate embeddings for comparison
    last_embeddings = generate_embeddings(last_scraped_data)
    current_embeddings = generate_embeddings(current_data)
    
    # Calculate similarity scores
    similarity_matrix = cosine_similarity(last_embeddings, current_embeddings)
    
    # Identify changes
    changes = []
    for item_idx, similarity_score in enumerate(similarity_matrix):
        if similarity_score < CHANGE_THRESHOLD:  # e.g., 0.95
            changes.append({
                'item': current_data[item_idx],
                'change_type': classify_change(item_idx),
                'confidence': 1 - similarity_score
            })
    
    return changes
```

---

## 5. Data Extraction and Transformation

### 5.1 AI-Powered Content Extraction

#### Example: Extracting Learning Objectives from Lesson Text

```python
from anthropic import Anthropic

def extract_learning_objectives(lesson_text, subject, level):
    """
    Use Claude API to extract structured learning objectives
    """
    client = Anthropic(api_key="your-api-key")
    
    prompt = f"""
    You are analyzing a lesson plan for {subject} at {level} in the Nigerian curriculum.
    
    Extract the learning objectives from this text and format them as a JSON array.
    Each objective should have:
    - objective_text: The specific learning outcome
    - cognitive_level: (Knowledge/Comprehension/Application/Analysis)
    - assessment_type: (Formative/Summative)
    
    Lesson Text:
    {lesson_text}
    
    Return ONLY valid JSON, no additional text.
    """
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return parse_json_response(response.content[0].text)
```

#### Example: Validating Curriculum Alignment

```python
def validate_alignment(studyzone_topic, nerdc_outcomes):
    """
    Use AI to verify StudyZone content aligns with NERDC standards
    """
    prompt = f"""
    Compare this weekly lesson topic from StudyZone with the official NERDC learning outcomes.
    
    StudyZone Topic: {studyzone_topic['title']}
    Activities: {studyzone_topic['activities']}
    
    NERDC Outcomes:
    {nerdc_outcomes}
    
    Provide:
    1. Alignment score (0-100)
    2. Which NERDC outcomes are addressed
    3. Any gaps or missing elements
    4. Recommendations for improvement
    
    Format as JSON.
    """
    
    # Call AI API and return structured validation
    return ai_analyze(prompt)
```

### 5.2 Data Transformation Pipeline

```python
# ETL Pipeline structure
class CurriculumETL:
    def extract(self, source_url):
        """Scrape raw HTML/PDF content"""
        pass
    
    def transform(self, raw_data):
        """
        1. Clean HTML/text
        2. Extract structured fields
        3. Use AI for semantic extraction
        4. Validate against schema
        5. Enrich with metadata
        """
        cleaned = self.clean_html(raw_data)
        structured = self.ai_extract_fields(cleaned)
        validated = self.validate_schema(structured)
        enriched = self.add_metadata(validated)
        return enriched
    
    def load(self, transformed_data):
        """
        Insert into LMS database with:
        - Conflict resolution
        - Version control
        - Audit logging
        """
        pass
```

### 5.3 Schema Mapping

```python
# Map scraped data to LMS schema
SCHEMA_MAPPING = {
    "studyzone_to_lms": {
        "class_level": "Level",
        "subject_name": "SubjectCode",  # Requires lookup
        "term_number": "Term",
        "week_number": "Week",
        "topic_title": "TopicTitle",
        "specific_objectives": "LearningObjectives",
        "lesson_content": "ContentDetails",
        "evaluation_questions": "AssessmentItems",
        "source": lambda: "StudyZone"
    }
}
```

---

## 6. Validation and Quality Assurance

### 6.1 Multi-Layer Validation Strategy

#### Layer 1: Schema Validation
```python
from pydantic import BaseModel, validator

class CurriculumTopic(BaseModel):
    Level: str
    SubjectCode: str
    Term: str
    Week: int
    TopicTitle: str
    LearningObjectives: list
    ContentDetails: str
    AssessmentItems: list
    SourceReference: str
    
    @validator('Week')
    def week_must_be_valid(cls, v):
        if not 1 <= v <= 14:
            raise ValueError('Week must be between 1 and 14')
        return v
```

#### Layer 2: AI-Powered Semantic Validation
```python
def semantic_validation(topic_data):
    """
    Use AI to check:
    - Age-appropriateness of content
    - Clarity of learning objectives
    - Alignment with NERDC standards
    - Completeness of assessment items
    """
    validation_prompt = f"""
    Validate this curriculum topic for Nigerian {topic_data['Level']}:
    
    Topic: {topic_data['TopicTitle']}
    Objectives: {topic_data['LearningObjectives']}
    
    Check:
    1. Age-appropriate language and concepts
    2. Clear, measurable learning objectives
    3. Adequate assessment coverage
    4. Alignment with Nigerian education standards
    
    Return validation report as JSON with pass/fail and issues.
    """
    
    return ai_validate(validation_prompt)
```

#### Layer 3: Cross-Reference Validation
```python
def cross_reference_validation(topic, nerdc_standards):
    """
    Verify topic matches at least one NERDC learning outcome
    """
    matches = []
    for outcome in nerdc_standards:
        similarity = calculate_semantic_similarity(
            topic['LearningObjectives'],
            outcome['description']
        )
        if similarity > 0.7:  # Threshold
            matches.append(outcome)
    
    return {
        'is_valid': len(matches) > 0,
        'matched_outcomes': matches,
        'confidence': max([m['similarity'] for m in matches])
    }
```

### 6.2 Quality Metrics Dashboard

Track these KPIs:
- **Coverage**: % of NERDC outcomes represented in LMS
- **Freshness**: Average age of curriculum content
- **Alignment Score**: AI-calculated alignment with standards
- **Completeness**: % of required fields populated
- **Error Rate**: Failed validations per 100 records

---

## 7. Real-Time Update Mechanisms

### 7.1 Change Detection System

```python
# Using Airflow DAG for scheduled updates
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'curriculum-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'curriculum_update_pipeline',
    default_args=default_args,
    description='Scrape and update curriculum content',
    schedule_interval='@weekly',  # Every Monday
    start_date=datetime(2025, 1, 1),
    catchup=False
)

# Define tasks
check_nerdc = PythonOperator(
    task_id='check_nerdc_changes',
    python_callable=detect_nerdc_changes,
    dag=dag
)

scrape_studyzone = PythonOperator(
    task_id='scrape_studyzone',
    python_callable=scrape_studyzone_content,
    dag=dag
)

validate_data = PythonOperator(
    task_id='validate_scraped_data',
    python_callable=run_validation_pipeline,
    dag=dag
)

update_database = PythonOperator(
    task_id='update_lms_database',
    python_callable=load_to_lms,
    dag=dag
)

# Set dependencies
check_nerdc >> scrape_studyzone >> validate_data >> update_database
```

### 7.2 Webhook-Based Updates

For immediate updates when sources publish new content:

```python
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)

@app.route('/webhook/curriculum-update', methods=['POST'])
def handle_curriculum_update():
    """
    Receive webhook from content providers when they publish updates
    """
    # Verify webhook signature
    signature = request.headers.get('X-Signature')
    if not verify_webhook_signature(request.data, signature):
        return {'error': 'Invalid signature'}, 401
    
    payload = request.json
    source = payload.get('source')
    change_type = payload.get('change_type')
    affected_items = payload.get('items')
    
    # Trigger immediate scraping for affected items
    trigger_targeted_scrape(source, affected_items)
    
    return {'status': 'Update queued'}, 202
```

### 7.3 Incremental Update Strategy

```python
def incremental_update_workflow():
    """
    Only update changed content, not entire curriculum
    """
    # Step 1: Identify changes
    changes = detect_changes_since_last_run()
    
    if not changes:
        log_info("No changes detected")
        return
    
    # Step 2: Scrape only changed pages
    updated_content = []
    for change in changes:
        content = scrape_specific_url(change['url'])
        updated_content.append(content)
    
    # Step 3: Transform and validate
    validated_content = validate_content_batch(updated_content)
    
    # Step 4: Update database with versioning
    for item in validated_content:
        update_curriculum_item(
            item,
            version=generate_version_tag(),
            change_type=item['change_type']
        )
    
    # Step 5: Notify stakeholders
    send_update_notification(changes)
```

---

## 8. Security and Compliance

### 8.1 Ethical Scraping Practices

```python
# Respect robots.txt
from urllib.robotparser import RobotFileParser

def can_scrape_url(url):
    rp = RobotFileParser()
    rp.set_url(url + '/robots.txt')
    rp.read()
    return rp.can_fetch('LMS-Curriculum-Bot', url)

# Rate limiting
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=10, period=60)  # 10 requests per minute
def scrape_with_rate_limit(url):
    return requests.get(url)
```

### 8.2 Data Privacy

- **Remove personal information**: Automatically scrub any teacher names or student data
- **Anonymize examples**: Strip identifying information from lesson examples
- **Secure storage**: Encrypt sensitive curriculum data at rest
- **Access control**: Implement RBAC for curriculum editing

### 8.3 Compliance Checklist

- [ ] Terms of Service review for each source
- [ ] Copyright compliance for educational materials
- [ ] GDPR/data protection if handling EU users
- [ ] Nigerian Data Protection Act compliance
- [ ] Attribution requirements for content sources
- [ ] Fair use assessment for extracted content

---

## 9. Monitoring and Maintenance

### 9.1 Monitoring Dashboard Metrics

```python
# Key metrics to track
MONITORING_METRICS = {
    'scraping_health': {
        'success_rate': 'Percentage of successful scrapes',
        'avg_response_time': 'Average time to scrape source',
        'error_rate': 'Failed requests per 100 attempts'
    },
    'data_quality': {
        'validation_pass_rate': 'Percentage passing validation',
        'alignment_score': 'Average NERDC alignment score',
        'completeness': 'Percentage of required fields filled'
    },
    'freshness': {
        'last_update': 'Time since last successful update',
        'coverage': 'Percentage of curriculum up-to-date',
        'stale_content': 'Items not updated in 90+ days'
    }
}
```

### 9.2 Alert Configuration

```python
# Define alerting rules
ALERT_RULES = {
    'critical': {
        'scraping_down': 'Source unreachable for 24+ hours',
        'validation_failure_spike': 'Validation failure rate > 20%',
        'database_sync_failed': 'Unable to update LMS database'
    },
    'warning': {
        'slow_scraping': 'Average response time > 10 seconds',
        'low_alignment_score': 'New content alignment < 70%',
        'stale_content': 'Content not refreshed in 60 days'
    }
}
```

### 9.3 Logging Strategy

```python
import logging
from datetime import datetime

# Structured logging for audit trail
class CurriculumScraperLogger:
    def __init__(self):
        self.logger = logging.getLogger('curriculum_scraper')
        
    def log_scrape_attempt(self, source, url):
        self.logger.info({
            'event': 'scrape_started',
            'source': source,
            'url': url,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def log_validation_result(self, item_id, result):
        self.logger.info({
            'event': 'validation_completed',
            'item_id': item_id,
            'passed': result['is_valid'],
            'issues': result.get('issues', []),
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def log_database_update(self, items_updated, version):
        self.logger.info({
            'event': 'database_updated',
            'items_count': len(items_updated),
            'version': version,
            'timestamp': datetime.utcnow().isoformat()
        })
```

---

## 10. Code Examples and Templates

### 10.1 Complete Scraper Example (StudyZone)

```python
import scrapy
from scrapy.crawler import CrawlerProcess
import json
from anthropic import Anthropic

class StudyZoneScraper(scrapy.Spider):
    name = 'studyzone_curriculum'
    start_urls = ['https://studyzone.ng/primary-1/']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.anthropic = Anthropic(api_key="your-api-key")
    
    def parse(self, response):
        """Parse main subject listing page"""
        subjects = response.css('.subject-link::attr(href)').getall()
        
        for subject_url in subjects:
            yield scrapy.Request(
                url=response.urljoin(subject_url),
                callback=self.parse_subject
            )
    
    def parse_subject(self, response):
        """Parse subject page to get terms"""
        subject_name = response.css('h1.subject-title::text').get()
        
        # Extract content for each term
        for term_num in [1, 2, 3]:
            term_selector = f'.term-{term_num}'
            term_content = response.css(f'{term_selector}').get()
            
            if term_content:
                yield self.extract_term_data(
                    subject_name, 
                    term_num, 
                    term_content
                )
    
    def extract_term_data(self, subject, term, html_content):
        """Use AI to extract structured data from HTML"""
        prompt = f"""
        Extract curriculum data from this HTML for {subject}, Term {term}.
        
        For each week, extract:
        - Week number
        - Topic title
        - Learning objectives (as array)
        - Activities (as array)
        - Assessment items (as array)
        
        HTML:
        {html_content}
        
        Return as JSON array of weeks.
        """
        
        response = self.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        extracted_data = json.loads(response.content[0].text)
        
        return {
            'subject': subject,
            'term': term,
            'weeks': extracted_data
        }

# Run the scraper
if __name__ == '__main__':
    process = CrawlerProcess({
        'USER_AGENT': 'LMS-Curriculum-Bot/1.0',
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 2
    })
    
    process.crawl(StudyZoneScraper)
    process.start()
```

### 10.2 AI-Powered PDF Extraction

```python
import pdfplumber
from anthropic import Anthropic

def extract_nerdc_curriculum_from_pdf(pdf_path):
    """
    Extract structured curriculum data from NERDC PDF documents
    """
    client = Anthropic(api_key="your-api-key")
    
    # Extract text from PDF
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n\n"
    
    # Use AI to structure the content
    prompt = f"""
    This is a curriculum document from NERDC (Nigerian Educational Research and Development Council).
    
    Extract and structure:
    1. Subject name and code
    2. Target level (e.g., Primary 1-3)
    3. Learning outcomes (grouped by themes/units)
    4. Competencies to be developed
    5. Assessment criteria
    
    Document text:
    {full_text[:15000]}  # Truncate if needed
    
    Return as structured JSON.
    """
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=5000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    structured_data = json.loads(response.content[0].text)
    return structured_data
```

### 10.3 Database Update with Version Control

```python
from sqlalchemy import create_engine, Column, String, Integer, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import hashlib

Base = declarative_base()

class CurriculumTopic(Base):
    __tablename__ = 'curriculum_topics'
    
    id = Column(Integer, primary_key=True)
    level = Column(String)
    subject_code = Column(String)
    term = Column(String)
    week = Column(Integer)
    topic_title = Column(String)
    learning_objectives = Column(JSON)
    content_details = Column(String)
    assessment_items = Column(JSON)
    source_reference = Column(String)
    version_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def update_curriculum_with_versioning(scraped_data):
    """
    Update database with version control to track changes
    """
    engine = create_engine('postgresql://user:pass@localhost/lms_db')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    for item in scraped_data:
        # Generate content hash for change detection
        content_hash = hashlib.sha256(
            json.dumps(item, sort_keys=True).encode()
        ).hexdigest()
        
        # Check if item exists
        existing = session.query(CurriculumTopic).filter_by(
            level=item['Level'],
            subject_code=item['SubjectCode'],
            term=item['Term'],
            week=item['Week']
        ).first()
        
        if existing:
            # Update only if content changed
            if existing.version_hash != content_hash:
                # Archive old version
                archive_version(existing)
                
                # Update current
                existing.topic_title = item['TopicTitle']
                existing.learning_objectives = item['LearningObjectives']
                existing.content_details = item['ContentDetails']
                existing.assessment_items = item['AssessmentItems']
                existing.version_hash = content_hash
                existing.updated_at = datetime.utcnow()
                
                log_change(existing.id, 'updated')
        else:
            # Create new record
            new_topic = CurriculumTopic(
                level=item['Level'],
                subject_code=item['SubjectCode'],
                term=item['Term'],
                week=item['Week'],
                topic_title=item['TopicTitle'],
                learning_objectives=item['LearningObjectives'],
                content_details=item['ContentDetails'],
                assessment_items=item['AssessmentItems'],
                source_reference=item['SourceReference'],
                version_hash=content_hash
            )
            session.add(new_topic)
            log_change(new_topic.id, 'created')
    
    session.commit()
    session.close()
```

### 10.4 Real-Time Notification System

```python
from twilio.rest import Client
import smtplib
from email.mime.