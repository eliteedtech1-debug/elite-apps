-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: elite_test_db
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `lessons`
--

DROP TABLE IF EXISTS `lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lessons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_name` varchar(255) DEFAULT NULL,
  `class_code` varchar(30) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `lesson_date` date DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `content` mediumtext DEFAULT NULL,
  `materials` text DEFAULT NULL,
  `objectives` text DEFAULT NULL,
  `teacher` varchar(100) DEFAULT NULL,
  `teacher_id` varchar(15) NOT NULL,
  `title` varchar(259) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `term` varchar(50) NOT NULL,
  `duration` int(11) NOT NULL,
  `status` enum('Draft','Published','Completed') NOT NULL DEFAULT 'Draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`,`created_at`),
  KEY `school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lessons`
--

LOCK TABLES `lessons` WRITE;
/*!40000 ALTER TABLE `lessons` DISABLE KEYS */;
/*!40000 ALTER TABLE `lessons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_comments`
--

DROP TABLE IF EXISTS `lesson_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(15) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lesson_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_comments`
--

LOCK TABLES `lesson_comments` WRITE;
/*!40000 ALTER TABLE `lesson_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_notes`
--

DROP TABLE IF EXISTS `lesson_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lesson_plan_id` int(11) NOT NULL,
  `note_type` enum('reflection','feedback','improvement','observation') DEFAULT 'reflection',
  `content` text NOT NULL,
  `created_by` int(11) NOT NULL,
  `is_private` tinyint(1) DEFAULT 0,
  `school_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lesson_notes_lesson_plan_id` (`lesson_plan_id`),
  KEY `lesson_notes_created_by` (`created_by`),
  KEY `lesson_notes_school_id` (`school_id`),
  KEY `lesson_notes_note_type` (`note_type`),
  KEY `lesson_notes_created_by_created_at` (`created_by`,`created_at`),
  CONSTRAINT `lesson_notes_ibfk_1` FOREIGN KEY (`lesson_plan_id`) REFERENCES `lesson_plans` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `lesson_notes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_notes`
--

LOCK TABLES `lesson_notes` WRITE;
/*!40000 ALTER TABLE `lesson_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_plans`
--

DROP TABLE IF EXISTS `lesson_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `class_code` varchar(50) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `lesson_date` datetime NOT NULL,
  `duration_minutes` int(11) DEFAULT 40,
  `objectives` text DEFAULT NULL,
  `content` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `assessment_methods` text DEFAULT NULL,
  `homework` text DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `syllabus_id` varchar(50) DEFAULT NULL,
  `syllabus_topic` varchar(255) DEFAULT NULL,
  `nerdc_alignment` text DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT 0,
  `ai_model_used` varchar(50) DEFAULT NULL,
  `ai_prompt_version` varchar(20) DEFAULT NULL,
  `teacher_edit_percentage` int(11) DEFAULT NULL,
  `syllabus_topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`syllabus_topics`)),
  `curriculum_alignment_percentage` int(11) DEFAULT 0,
  `syllabus_coverage_tags` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lesson_plans_school_id` (`school_id`),
  KEY `lesson_plans_teacher_id` (`teacher_id`),
  KEY `lesson_plans_subject_code` (`subject_code`),
  KEY `lesson_plans_class_code` (`class_code`),
  KEY `lesson_plans_lesson_date` (`lesson_date`),
  KEY `lesson_plans_status` (`status`),
  CONSTRAINT `lesson_plans_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_plans`
--

LOCK TABLES `lesson_plans` WRITE;
/*!40000 ALTER TABLE `lesson_plans` DISABLE KEYS */;
INSERT INTO `lesson_plans` (`id`, `title`, `subject_code`, `class_code`, `teacher_id`, `lesson_date`, `duration_minutes`, `objectives`, `content`, `activities`, `resources`, `assessment_methods`, `homework`, `status`, `school_id`, `branch_id`, `created_at`, `updated_at`, `syllabus_id`, `syllabus_topic`, `nerdc_alignment`, `ai_generated`, `ai_model_used`, `ai_prompt_version`, `teacher_edit_percentage`, `syllabus_topics`, `curriculum_alignment_percentage`, `syllabus_coverage_tags`) VALUES (2,'Understanding Living Things','Basic Science & Technology','JSS1',1013,'2026-01-01 01:11:20',40,NULL,NULL,NULL,NULL,NULL,NULL,'draft','SCH/20',NULL,'2026-01-01 01:11:20',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'[1]',85,NULL);
/*!40000 ALTER TABLE `lesson_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_time_table`
--

DROP TABLE IF EXISTS `lesson_time_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_time_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `day` varchar(20) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section` varchar(50) NOT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `class_code` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lesson_time_table_school_id` (`school_id`),
  KEY `lesson_time_table_section` (`section`),
  KEY `lesson_time_table_class_name` (`class_name`),
  KEY `lesson_time_table_teacher_id` (`teacher_id`),
  KEY `lesson_time_table_day` (`day`),
  KEY `lesson_time_table_school_id_section_class_name` (`school_id`,`section`,`class_name`)
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_time_table`
--

LOCK TABLES `lesson_time_table` WRITE;
/*!40000 ALTER TABLE `lesson_time_table` DISABLE KEYS */;
INSERT INTO `lesson_time_table` (`id`, `day`, `class_name`, `subject`, `teacher_id`, `section`, `school_location`, `start_time`, `end_time`, `status`, `school_id`, `branch_id`, `class_code`, `created_at`, `updated_at`) VALUES (4,'Monday','Nursery 1','English Language',2,'','BRCH00001','8:00: AM','8:45: AM','Active','SCH/1','BRCH00001','CLS0001','2025-09-23 13:16:29','2025-09-23 13:16:29'),(5,'Monday','Nursery 1','DRAWING',11,'Nursery','BRCH00003','7:30 PM','1:40 PM','Active','SCH/12','BRCH00003','CLS0239','2025-09-29 15:17:25','2025-09-29 15:17:25'),(6,'Monday','SS1 A','English Language',137,'SS','BRCH00027','08:00','08:45','Active','SCH/20','BRCH00027','CLS0560','2025-11-17 11:22:04','2025-11-17 11:22:04'),(80,'Monday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(81,'Monday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(82,'Monday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(83,'Monday','Nursery 1 A','Personal & Social Development',277,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:35','2025-12-31 17:18:35'),(84,'Monday','Pre-Nursery','Knowledge & Undestanding',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(85,'Monday','Nursery 2 A','Physical Development',271,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:35','2025-12-31 17:18:35'),(86,'Monday','Pre-Nursery','Numeracy',265,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(87,'Tuesday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(88,'Tuesday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(89,'Tuesday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(90,'Tuesday','Nursery 2 A','Rhymes',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:35','2025-12-31 17:18:35'),(91,'Tuesday','Nursery 1 B','Literacy',278,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:35','2025-12-31 17:18:35'),(92,'Tuesday','Nursery 1 A','Knowledge & Undestanding',277,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:35','2025-12-31 17:18:35'),(93,'Tuesday','Pre-Nursery','Literacy',265,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(94,'Wednesday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(95,'Wednesday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(96,'Wednesday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(97,'Wednesday','Nursery 2 A','Knowledge & Undestanding',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(98,'Wednesday','Pre-Nursery','Numeracy',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(99,'Wednesday','Nursery 2 A','Numeracy',271,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(100,'Wednesday','Nursery 1 A','Numeracy',277,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:36','2025-12-31 17:18:36'),(101,'Thursday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(102,'Thursday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(103,'Thursday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(104,'Thursday','Nursery 2 A','Personal & Social Development',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(105,'Thursday','Nursery 1 B','Jolly Phonics',278,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(106,'Thursday','Nursery 1 B','Creative Development',278,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(107,'Thursday','Nursery 1 B','Handwriting',278,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(108,'Friday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(109,'Friday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(110,'Friday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(111,'Friday','Nursery 1 B','Literacy',278,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(112,'Friday','Pre-Nursery','Creative Development',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(113,'Friday','Nursery 1 B','Handwriting',278,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(114,'Friday','Nursery 2 A','Jolly Phonics',271,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(185,'Monday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(186,'Monday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(187,'Monday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(188,'Monday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(189,'Monday','Primary 5 A','National Value',266,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(190,'Monday','Primary 4 A','Basic Science & Technology (BST)',272,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(191,'Monday','Primary 5 A','Pre-Vocational Studies',266,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(192,'Tuesday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(193,'Tuesday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(194,'Tuesday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(195,'Tuesday','Primary 3 A','Hand Writing',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(196,'Tuesday','Primary 4 A','Verbal Reasoning',272,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(197,'Tuesday','Primary 1 A','Mathematics',270,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(198,'Tuesday','Primary 1 A','Pre-Vocational Studies',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(199,'Wednesday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(200,'Wednesday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(201,'Wednesday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(202,'Wednesday','Primary 3 A','English Language',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(203,'Wednesday','Primary 3 A','Quantitative Reasoning',264,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(204,'Wednesday','Primary 1 A','Creative Art',270,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(205,'Wednesday','Primary 1 A','Hand Writing',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(206,'Thursday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(207,'Thursday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(208,'Thursday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(209,'Thursday','Primary 3 A','English Language',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(210,'Thursday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(211,'Thursday','Primary 5 A','Hand Writing',266,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(212,'Thursday','Primary 2 A','English Language',267,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0578','2025-12-31 18:32:15','2025-12-31 18:32:15'),(213,'Friday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(214,'Friday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(215,'Friday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(216,'Friday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(217,'Friday','Primary 3 A','National Value',264,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(218,'Friday','Primary 4 A','English Language',272,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(219,'Friday','Primary 1 A','Verbal Reasoning',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15');
/*!40000 ALTER TABLE `lesson_time_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_time_table_backup`
--

DROP TABLE IF EXISTS `lesson_time_table_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_time_table_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `day` varchar(20) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section` varchar(50) NOT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `class_code` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_time_table_backup`
--

LOCK TABLES `lesson_time_table_backup` WRITE;
/*!40000 ALTER TABLE `lesson_time_table_backup` DISABLE KEYS */;
INSERT INTO `lesson_time_table_backup` (`id`, `day`, `class_name`, `subject`, `teacher_id`, `section`, `school_location`, `start_time`, `end_time`, `status`, `school_id`, `branch_id`, `class_code`, `created_at`, `updated_at`) VALUES (4,'Monday','Nursery 1','English Language',2,'','BRCH00001','8:00: AM','8:45: AM','Active','SCH/1','BRCH00001','CLS0001','2025-09-23 13:16:29','2025-09-23 13:16:29'),(5,'Monday','Nursery 1','DRAWING',11,'Nursery','BRCH00003','7:30 PM','1:40 PM','Active','SCH/12','BRCH00003','CLS0239','2025-09-29 15:17:25','2025-09-29 15:17:25'),(6,'Monday','SS1 A','English Language',137,'SS','BRCH00027','08:00','08:45','Active','SCH/20','BRCH00027','CLS0560','2025-11-17 11:22:04','2025-11-17 11:22:04');
/*!40000 ALTER TABLE `lesson_time_table_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus`
--

DROP TABLE IF EXISTS `syllabus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(100) NOT NULL,
  `global_subject_code` varchar(50) DEFAULT NULL,
  `class_code` varchar(30) NOT NULL,
  `global_level_code` varchar(10) DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `week` tinyint(2) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `content` text NOT NULL,
  `status` enum('Pending','Ongoing','Onhold','Deleted') NOT NULL DEFAULT 'Pending',
  `created_by` varchar(50) DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `scraped_source` varchar(100) DEFAULT NULL,
  `is_global_content` tinyint(1) DEFAULT 0,
  `scraped_at` timestamp NULL DEFAULT NULL,
  `objectives` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `assessment` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus`
--

LOCK TABLES `syllabus` WRITE;
/*!40000 ALTER TABLE `syllabus` DISABLE KEYS */;
INSERT INTO `syllabus` (`id`, `subject`, `global_subject_code`, `class_code`, `global_level_code`, `term`, `week`, `title`, `content`, `status`, `created_by`, `school_id`, `branch_id`, `created_at`, `updated_at`, `scraped_source`, `is_global_content`, `scraped_at`, `objectives`, `activities`, `assessment`, `resources`, `source_url`) VALUES (1,'AGRIC SCIENCE',NULL,'JS0003',NULL,'First Term',1,'I NEED MONEY','<p>I NEED THE FIND TO MONEY</p>','Pending',NULL,NULL,NULL,'2025-06-30 15:09:56','2025-06-30 15:09:56',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(2,'AGRIC SCIENCE',NULL,'JS0003',NULL,'First Term',1,'I NEED MONEY','<p>I NEED THE FIND TO MONEY</p>','Pending',NULL,NULL,NULL,'2025-06-30 15:09:56','2025-06-30 15:09:56',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(3,'Mathematics',NULL,'CLS0007',NULL,'First Term',1,'Numbers 1-10','Introduction to counting and number recognition (2026-01-05 - 2026-01-11)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(4,'Mathematics',NULL,'CLS0007',NULL,'First Term',2,'Addition Basics','Simple addition using objects and fingers (2026-01-12 - 2026-01-18)','Ongoing','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(5,'Mathematics',NULL,'CLS0007',NULL,'First Term',3,'Subtraction Basics','Simple subtraction using objects (2026-01-19 - 2026-01-25)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(6,'English Language',NULL,'CLS0007',NULL,'First Term',1,'Alphabet A-E','Learning letters A to E with sounds (2026-01-05 - 2026-01-11)','Ongoing','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(7,'English Language',NULL,'CLS0007',NULL,'First Term',2,'Alphabet F-J','Learning letters F to J with sounds (2026-01-12 - 2026-01-18)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(8,'Social Studies',NULL,'CLS0007',NULL,'First Term',1,'My Family','Understanding family members and relationships (2026-01-05 - 2026-01-11)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(9,'Basic Science',NULL,'Primary 1',NULL,'First Term',1,'Living Things I','Living things are things that are alive. They can move, eat, grow, and have babies (reproduce).','Pending',NULL,NULL,NULL,'2025-12-29 00:29:58','2025-12-29 00:29:58','StudyZone',0,NULL,'[\"Explain the meaning of living things.\",\"Identify examples of living things around them.\",\"Mention the characteristics of living things.\"]','[\"Teacher shows pictures or real objects of people, animals, and plants, then asks pupils: \'Can you tell me what all these things have in common?\'\",\"Class exercises to identify oneself as a living thing and match living things to their characteristics.\"]','Multiple-choice questions related to the characteristics and examples of living things.','[\"Flashcards showing living things (human, animals, plants)\",\"Charts of living and non-living things\",\"Real objects (leaves, insects, etc.)\",\"Video/picture illustrations\"]','https://studyzone.ng/lesson-notes/living-things-meaning-examples-and-characteristics/'),(10,'Mathematics',NULL,'P1',NULL,'First Term',1,'Number Recognition','Introduction to numbers, place value, and counting.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Identify and write numbers from 1 to 100\",\"Understand the concept of place value\"]','[\"Number matching game\",\"Place value chart activity\"]','Observation and number writing exercise','[\"Number cards\",\"Place value charts\"]','https://studyzone.ng/primary-3/'),(11,'Mathematics',NULL,'P1',NULL,'First Term',2,'Addition and Subtraction','Basic addition and subtraction concepts, strategies for solving problems.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Perform addition and subtraction of numbers up to 50\",\"Solve word problems involving addition and subtraction\"]','[\"Addition and subtraction bingo\",\"Word problem solving in pairs\"]','Quiz on addition and subtraction','[\"Bingo cards\",\"Word problem worksheets\"]','https://studyzone.ng/primary-3/'),(12,'Mathematics',NULL,'P1',NULL,'First Term',3,'Multiplication Basics','Introduction to multiplication, using arrays and groups.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Understand the concept of multiplication as repeated addition\",\"Multiply numbers up to 10\"]','[\"Array building with counters\",\"Group multiplication games\"]','Worksheet on multiplication problems','[\"Counters\",\"Multiplication worksheets\"]','https://studyzone.ng/primary-3/'),(13,'Mathematics',NULL,'P1',NULL,'First Term',4,'Shapes and Geometry','Introduction to shapes, their properties, and real-life examples.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Identify and describe basic 2D shapes\",\"Understand the properties of shapes\"]','[\"Shape scavenger hunt\",\"Drawing and labeling shapes\"]','Shape identification quiz','[\"Shape cutouts\",\"Drawing materials\"]','https://studyzone.ng/primary-3/'),(14,'Mathematics',NULL,'P1',NULL,'First Term',5,'Measurement','Introduction to measurement, using rulers and measuring tapes.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Understand the concept of length and measurement\",\"Use standard units to measure objects\"]','[\"Measuring classroom objects\",\"Creating a measurement chart\"]','Measurement activity report','[\"Rulers\",\"Measuring tapes\"]','https://studyzone.ng/primary-3/'),(15,'English',NULL,'P1',NULL,'First Term',1,'Introduction to English Language','Students will learn about the English language, its significance in communication, and its basic components including nouns, verbs, and adjectives.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Understand the importance of English language\",\"Identify basic components of English language\"]','[\"Group discussion on the importance of English\",\"Identify and list nouns, verbs, and adjectives from a short text\"]','Participation in group discussion and completion of the noun, verb, and adjective list','[\"Textbook on English language basics\",\"Whiteboard and markers\"]','https://studyzone.ng/primary-3/'),(16,'English',NULL,'P1',NULL,'First Term',2,'Parts of Speech','Focus on nouns, verbs, adjectives, and adverbs. Students will learn definitions and examples of each part of speech.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Identify different parts of speech\",\"Use parts of speech in sentences\"]','[\"Create sentences using different parts of speech\",\"Parts of speech matching game\"]','Sentence creation exercise and participation in the matching game','[\"Parts of speech chart\",\"Flashcards\"]','https://studyzone.ng/primary-3/'),(17,'English',NULL,'P1',NULL,'First Term',3,'Sentence Structure','Introduction to subject, verb, and object in sentence construction. Students will learn how to form simple sentences.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Understand the structure of simple sentences\",\"Construct simple sentences\"]','[\"Sentence building activity using word cards\",\"Peer review of constructed sentences\"]','Quality of constructed sentences and feedback from peer review','[\"Word cards\",\"Sentence structure worksheets\"]','https://studyzone.ng/primary-3/'),(18,'English',NULL,'P1',NULL,'First Term',4,'Reading Comprehension','Students will read a short story and learn to identify main ideas and supporting details.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Develop skills for reading comprehension\",\"Answer questions based on a text\"]','[\"Read a selected story\",\"Group discussion on the story\'s main ideas\",\"Answer comprehension questions\"]','Comprehension questions and group discussion participation','[\"Selected short story\",\"Comprehension question handout\"]','https://studyzone.ng/primary-3/'),(19,'English',NULL,'P1',NULL,'First Term',5,'Creative Writing','Students will learn the basics of creative writing, focusing on using descriptive language to enhance their writing.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Express ideas through creative writing\",\"Use descriptive language in writing\"]','[\"Write a short descriptive paragraph about a favorite place\",\"Share paragraphs with the class\"]','Quality of the descriptive paragraph and participation in sharing','[\"Writing journals\",\"Descriptive language examples\"]','https://studyzone.ng/primary-3/'),(20,'English',NULL,'P2',NULL,'First Term',1,'Introduction to Narrative Writing','Students will learn about the key components of narrative writing, including characters, setting, plot, conflict, and resolution.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Understand the elements of a narrative\",\"Identify the structure of a story\"]','[\"Group discussion on favorite stories\",\"Create a story map for a familiar tale\"]','Participation in group discussion and completion of story map','[\"Story map template\",\"Examples of narrative stories\"]','https://studyzone.ng/primary-3/'),(21,'English',NULL,'P2',NULL,'First Term',2,'Descriptive Writing','Focus on using adjectives and adverbs to create descriptive passages.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Use sensory details to enhance writing\",\"Create vivid imagery in descriptions\"]','[\"Write a descriptive paragraph about a chosen object\",\"Peer review of descriptive paragraphs\"]','Quality of descriptive writing and peer feedback','[\"Descriptive writing checklist\",\"Sample descriptive texts\"]','https://studyzone.ng/primary-3/'),(22,'English',NULL,'P2',NULL,'First Term',3,'Understanding Poetry','Introduction to various forms of poetry, including haikus, acrostics, and free verse.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Identify different types of poetry\",\"Analyze the use of figurative language in poems\"]','[\"Read and discuss selected poems\",\"Write a simple poem using figurative language\"]','Participation in discussions and submission of original poem','[\"Poetry anthology\",\"Figurative language guide\"]','https://studyzone.ng/primary-3/'),(23,'English',NULL,'P2',NULL,'First Term',4,'Grammar: Parts of Speech','Review of the eight parts of speech with examples and exercises.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Identify and use nouns, verbs, adjectives, and adverbs\",\"Construct sentences using different parts of speech\"]','[\"Parts of speech scavenger hunt\",\"Sentence construction exercises\"]','Completion of exercises and accuracy of sentence construction','[\"Parts of speech chart\",\"Worksheet on sentence construction\"]','https://studyzone.ng/primary-3/'),(24,'English',NULL,'P2',NULL,'First Term',5,'Writing a Book Report','Guidelines on how to write an effective book report.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Summarize a book\'s plot and main ideas\",\"Express personal opinions about the book\"]','[\"Choose a book and prepare a report outline\",\"Present book reports to the class\"]','Quality of book report and presentation skills','[\"Book report template\",\"List of suggested books\"]','https://studyzone.ng/primary-3/'),(25,'Mathematics',NULL,'P1',NULL,'First Term',1,'Number Recognition','Introduction to numbers using visual aids and counting objects.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Identify numbers from 1 to 10\",\"Understand the concept of more and less\"]','[\"Counting objects in the classroom\",\"Number matching games\"]','Observation during activities and a short quiz on number recognition.','[\"Counting blocks\",\"Number flashcards\"]','https://studyzone.ng/'),(26,'Mathematics',NULL,'P1',NULL,'First Term',2,'Basic Addition','Teaching addition through practical examples and number lines.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Understand the concept of addition\",\"Add numbers up to 10\"]','[\"Using counters to demonstrate addition\",\"Simple addition worksheets\"]','Completion of addition worksheets and oral quizzes.','[\"Counters\",\"Addition worksheets\"]','https://studyzone.ng/'),(27,'Mathematics',NULL,'P1',NULL,'First Term',3,'Shapes and Patterns','Exploring shapes through drawing and identifying patterns in everyday objects.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Identify basic shapes\",\"Recognize and create patterns\"]','[\"Shape scavenger hunt\",\"Creating patterns with colored blocks\"]','Shape identification quiz and pattern creation project.','[\"Shape cutouts\",\"Colored blocks\"]','https://studyzone.ng/'),(28,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','First Term',8,'Photosynthesis','Process of photosynthesis, chlorophyll, sunlight, carbon dioxide, oxygen','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Students will understand how plants make their own food',NULL,NULL,NULL,NULL),(29,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','First Term',2,'Characteristics of Living Things','Movement, respiration, nutrition, growth, reproduction','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Identify features that distinguish living from non-living things',NULL,NULL,NULL,NULL),(30,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','Second Term',12,'States of Matter','Solid, liquid, gas, changes of state','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Describe the three states of matter',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `syllabus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus_suggestions`
--

DROP TABLE IF EXISTS `syllabus_suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus_suggestions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(50) DEFAULT NULL,
  `class_code` varchar(50) DEFAULT NULL,
  `topic_keywords` text DEFAULT NULL,
  `syllabus_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`syllabus_content`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `prerequisites` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`prerequisites`)),
  `difficulty_level` tinyint(4) DEFAULT 1,
  `estimated_duration` int(11) DEFAULT 40,
  `sequence_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `subject_code` (`subject_code`,`class_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus_suggestions`
--

LOCK TABLES `syllabus_suggestions` WRITE;
/*!40000 ALTER TABLE `syllabus_suggestions` DISABLE KEYS */;
INSERT INTO `syllabus_suggestions` (`id`, `subject_code`, `class_code`, `topic_keywords`, `syllabus_content`, `created_at`, `prerequisites`, `difficulty_level`, `estimated_duration`, `sequence_order`) VALUES (1,'Basic Science & Technology','JSS1','Living things characteristics movement respiration nutrition growth reproduction','{\"topic\": \"Characteristics of Living Things\", \"subtopic\": \"Movement, respiration, nutrition, growth, reproduction\", \"learning_objectives\": \"Identify features that distinguish living from non-living things\", \"week_number\": 2, \"term\": \"First Term\"}','2026-01-01 00:09:17','[]',1,40,2),(2,'Basic Science & Technology','JSS1','Classification living things plants animals microorganisms','{\"topic\": \"Classification of Living Things\", \"subtopic\": \"Plants, animals, microorganisms\", \"learning_objectives\": \"Group living things based on their characteristics\", \"week_number\": 4, \"term\": \"First Term\"}','2026-01-01 00:09:17','[\"Characteristics of Living Things\"]',2,45,4),(3,'Basic Science & Technology','JSS1','Photosynthesis chlorophyll sunlight carbon dioxide oxygen','{\"topic\": \"Photosynthesis\", \"subtopic\": \"Process of photosynthesis, chlorophyll, sunlight, carbon dioxide, oxygen\", \"learning_objectives\": \"Students will understand how plants make their own food\", \"week_number\": 8, \"term\": \"First Term\"}','2026-01-01 00:09:17','[\"Classification of Living Things\"]',2,60,8),(4,'Basic Science & Technology','JSS1','States matter solid liquid gas changes','{\"topic\": \"States of Matter\", \"subtopic\": \"Solid, liquid, gas, changes of state\", \"learning_objectives\": \"Describe the three states of matter\", \"week_number\": 12, \"term\": \"Second Term\"}','2026-01-01 00:09:17','[]',1,45,12),(5,'Basic Science & Technology','JSS1','Simple machines lever pulley inclined plane','{\"topic\": \"Simple Machines\", \"subtopic\": \"Lever, pulley, inclined plane, wheel and axle\", \"learning_objectives\": \"Identify and explain how simple machines work\", \"week_number\": 15, \"term\": \"Second Term\"}','2026-01-01 00:09:17','[\"States of Matter\"]',3,50,15);
/*!40000 ALTER TABLE `syllabus_suggestions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus_tracker`
--

DROP TABLE IF EXISTS `syllabus_tracker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL DEFAULT 1,
  `title` varchar(300) DEFAULT NULL,
  `lesson_date` date DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT 40,
  `objectives` text DEFAULT NULL,
  `lesson_content` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `assessment_methods` text DEFAULT NULL,
  `homework` text DEFAULT NULL,
  `syllabus_id` int(11) DEFAULT NULL,
  `subject` varchar(100) NOT NULL,
  `class_code` varchar(30) DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `week` tinyint(1) DEFAULT NULL,
  `status` enum('draft','submitted','under_review','approved','rejected','archived','Pending','Ongoing','Onhold','Completed') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_comments` text DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT 0,
  `ai_enhancement_type` varchar(50) DEFAULT NULL,
  `ai_confidence_score` decimal(3,2) DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `syllabus_id` (`syllabus_id`),
  KEY `syllabus_tracker_teacher_id_lesson_date` (`teacher_id`,`lesson_date`),
  KEY `syllabus_tracker_syllabus_id` (`syllabus_id`),
  KEY `syllabus_tracker_status` (`status`),
  KEY `syllabus_tracker_ai_generated` (`ai_generated`),
  CONSTRAINT `syllabus_tracker_ibfk_1` FOREIGN KEY (`syllabus_id`) REFERENCES `syllabus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus_tracker`
--

LOCK TABLES `syllabus_tracker` WRITE;
/*!40000 ALTER TABLE `syllabus_tracker` DISABLE KEYS */;
/*!40000 ALTER TABLE `syllabus_tracker` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-04 12:54:12
